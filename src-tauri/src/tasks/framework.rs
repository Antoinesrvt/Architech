//! Framework setup task implementation

use std::path::{Path, PathBuf};
use std::fs;
use tauri::{AppHandle, Emitter};

use async_trait::async_trait;
use log::{info, error, warn};

use crate::commands::command_runner::CommandBuilder;
use crate::commands::framework::{Framework as FrameworkDetails, get_frameworks};
use super::{Task, TaskContext};

use std::collections::HashMap;
use std::time::Duration;

/// Task for setting up the framework
pub struct FrameworkTask {
    /// The task ID
    id: String,
    /// The task name
    name: String,
    /// The task dependencies
    dependencies: Vec<String>,
}

impl FrameworkTask {
    /// Create a new framework task
    pub fn new(context: TaskContext) -> Self {
        let framework_name = &context.config.framework;
        Self {
            id: format!("framework:{}", framework_name),
            name: format!("Setup {} framework", framework_name),
            dependencies: Vec::new(), // Framework task has no dependencies
        }
    }
}

// Function to get a framework by ID
pub async fn get_framework(id: &str) -> Result<FrameworkDetails, String> {
    let frameworks = get_frameworks().await?;
    frameworks.into_iter()
        .find(|f| f.id == id)
        .ok_or_else(|| format!("Framework not found: {}", id))
}

#[async_trait]
impl Task for FrameworkTask {
    fn id(&self) -> &str {
        &self.id
    }
    
    fn name(&self) -> &str {
        &self.name
    }
    
    fn dependencies(&self) -> &[String] {
        &self.dependencies
    }
    
    async fn execute(&self, context: &TaskContext) -> Result<(), String> {
        let config = &context.config;
        let app_handle = &context.app_handle;
        let base_path = &context.project_dir;
        
        // Get framework details
        let framework = get_framework(&config.framework).await?;
        
        info!("Setting up {} framework at {}", framework.name, base_path.display());
        app_handle.emit("log-message", format!("Setting up {} framework", framework.name)).unwrap();
        
        // Get CLI details
        let cli = &framework.cli;
        
        // Add flag arguments from CLI arguments
        let mut args = Vec::new();
        for (key, value) in &cli.arguments {
            if let Some(value_str) = value.as_str() {
                if value_str == "true" {
                    args.push(format!("--{}", key));
                } else if value_str != "false" {
                    args.push(format!("--{}", key));
                    args.push(value_str.to_string());
                }
            }
        }
        
        // Add the project name as the last argument
        args.push(config.name.clone());
        
        // Save args display string before passing to command_builder
        let args_display = args.join(" ");
        
        // Execute the framework setup command
        let mut command_builder = CommandBuilder::new(&cli.base_command)
            .args(args)
            .working_dir(base_path.as_ref())
            .retries(2)
            .verify_project_dir(true);
        
        // Add specific options for CLI framework tools
        if framework.id == "nextjs" || framework.id == "vite-react" {
            // For Next.js and Vite-React, set environment variables to handle prompts
            command_builder = command_builder
                .env("CI", "true")
                .env("NEXT_TELEMETRY_DISABLED", "1")
                .env("NODE_ENV", "development");
                
            // Note: We can't set interactive mode with the current CommandBuilder API
            // This will need to be handled by the environment variables above
        }
        
        // Set a timeout for the command (5 minutes)
        command_builder = command_builder.timeout(300); // 300 seconds = 5 minutes
        
        info!("Executing framework setup command: {} {}", cli.base_command, args_display);
        app_handle.emit("log-message", format!("Running: {} {}", cli.base_command, args_display)).unwrap();
        
        match command_builder.execute().await {
            Ok(output) => {
                info!("Framework setup command completed with exit code: {}", output.exit_code);
                app_handle.emit("log-message", format!("Framework setup command completed with exit code: {}", output.exit_code)).unwrap();
                
                // Check for success - we want to specifically verify a few critical things
                if !output.success {
                    let error_msg = format!("Framework setup command failed with exit code: {}", output.exit_code);
                    error!("{}", error_msg);
                    app_handle.emit("log-message", &error_msg).unwrap();
                    
                    // Include stderr output in the error for better diagnostics
                    let stderr = output.stderr.clone();
                    if !stderr.is_empty() {
                        let stderr_msg = format!("Framework setup error output: {}", stderr);
                        error!("{}", stderr_msg);
                        app_handle.emit("log-message", &stderr_msg).unwrap();
                        return Err(format!("Framework setup failed: {}\n\nError details: {}", error_msg, stderr));
                    }
                    
                    return Err(error_msg);
                }
                
                // Check for critical files
                let package_json = base_path.join(&config.name).join("package.json");
                
                if !package_json.exists() {
                    let warning = format!("Warning: package.json not found after framework setup at {}", package_json.display());
                    warn!("{}", warning);
                    app_handle.emit("log-message", warning).unwrap();
                    
                    // This is critical - most frameworks should create a package.json
                    if framework.name.to_lowercase().contains("next") || 
                       framework.name.to_lowercase().contains("react") {
                        // For critical frameworks, this is an error
                        let error = format!("Framework setup failed: package.json not found at {}", package_json.display());
                        app_handle.emit("log-message", &error).unwrap();
                        return Err(error);
                    }
                    
                    // For other frameworks, just warn
                    app_handle.emit("log-message", "Continuing despite missing package.json - this may cause issues later").unwrap();
                } else {
                    info!("Verified package.json exists at {}", package_json.display());
                    app_handle.emit("log-message", format!("Verified package.json exists at {}", package_json.display())).unwrap();
                }
                
                // Check for correct project folder structure
                let project_folder = base_path.join(&config.name);
                if !project_folder.exists() || !project_folder.is_dir() {
                    let error = format!("Framework setup failed: project folder not created at {}", project_folder.display());
                    error!("{}", error);
                    app_handle.emit("log-message", &error).unwrap();
                    return Err(error);
                }
                
                // Check for essential files based on framework type
                if framework.id == "nextjs" {
                    let next_config = project_folder.join("next.config.js");
                    if !next_config.exists() {
                        let error = format!("Framework setup appears incomplete: next.config.js not found at {}", next_config.display());
                        warn!("{}", error);
                        app_handle.emit("log-message", &error).unwrap();
                    }
                } else if framework.id == "vite-react" {
                    let vite_config = project_folder.join("vite.config.ts");
                    if !vite_config.exists() && !project_folder.join("vite.config.js").exists() {
                        let error = format!("Framework setup appears incomplete: vite.config.ts/js not found");
                        warn!("{}", error);
                        app_handle.emit("log-message", &error).unwrap();
                    }
                }
                
                info!("Framework setup completed successfully");
                app_handle.emit("log-message", "Framework setup completed successfully").unwrap();
                Ok(())
            },
            Err(e) => {
                error!("Framework setup command failed: {}", e);
                app_handle.emit("log-message", format!("Framework setup failed: {}", e)).unwrap();
                Err(format!("Failed to set up framework: {}", e))
            }
        }
    }
} 