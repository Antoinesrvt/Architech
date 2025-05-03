//! Framework setup task implementation

use std::path::Path;
use tauri::{AppHandle, Manager, Emitter};
use async_trait::async_trait;
use log::info;
use crate::commands::framework::{get_frameworks, Framework};
use crate::commands::node_commands::execute_node_command;
use crate::tasks::{Task, TaskContext, TaskState};

/// Task for setting up the framework
pub struct FrameworkTask {
    /// The task ID
    id: String,
    /// The task name
    name: String,
    /// The task dependencies
    dependencies: Vec<String>,
    /// The task state
    state: TaskState,
}

impl FrameworkTask {
    /// Create a new framework task
    pub fn new(id: String, framework_name: String) -> Self {
        Self {
            id,
            name: format!("Setup {} framework", framework_name),
            dependencies: Vec::new(),
            state: TaskState::Pending,
        }
    }
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
        info!("Executing framework task");
        
        let config = &context.config;
        let app_handle = &context.app_handle;
        
        // Get the framework config
        let frameworks = get_frameworks().await?;
        let framework = frameworks.iter()
            .find(|f| f.id == config.framework)
            .ok_or_else(|| format!("Framework {} not found", config.framework))?;
        
        // Get the project directory
        let project_dir = &context.project_dir;
        
        // Log the task start
        info!("Setting up {} framework", framework.name);
        app_handle.emit("log-message", format!("Setting up {} framework", framework.name))
            .map_err(|e| format!("Failed to emit log message: {}", e))?;
        
        // Check if this is a Next.js project
        if framework.id == "nextjs" {
            info!("Setting up Next.js project");
            app_handle.emit("log-message", "Setting up Next.js project")
                .map_err(|e| format!("Failed to emit log message: {}", e))?;
            
            // Build the Next.js command
            let typescript = config.options.typescript;
            let app_router = config.options.app_router;
            let eslint = config.options.eslint;
            
            let mut next_command = String::from("npx create-next-app@latest");
            next_command.push_str(&format!(" {} ", config.name));
            next_command.push_str(&format!("--ts={} ", typescript));
            next_command.push_str(&format!("--app={} ", app_router));
            next_command.push_str(&format!("--eslint={} ", eslint));
            next_command.push_str("--src-dir=true --import-alias=@/* --no-tailwind --no-git");
            
            info!("Executing Next.js command: {}", next_command);
            app_handle.emit("log-message", format!("Creating Next.js project with command: {}", next_command))
                .map_err(|e| format!("Failed to emit log message: {}", e))?;
            
            // Execute the command
            let result = execute_node_command(
                app_handle,
                project_dir,
                &next_command
            ).await?;
            
            // Check if the command was successful
            if !result.success {
                let error_msg = format!("Failed to set up Next.js project: {}", result.stderr);
                app_handle.emit("log-message", format!("Error: {}", error_msg))
                    .map_err(|e| format!("Failed to emit log message: {}", e))?;
                return Err(error_msg);
            }
            
            // Check if the project folder exists
            let project_folder = project_dir.join(&config.name);
            if !project_folder.exists() {
                let error_msg = format!("Project folder was not created: {}", project_folder.display());
                app_handle.emit("log-message", format!("Error: {}", error_msg))
                    .map_err(|e| format!("Failed to emit log message: {}", e))?;
                return Err(error_msg);
            }
            
            // Check for critical files
            let package_json = project_folder.join("package.json");
            if !package_json.exists() {
                let error_msg = format!("Project was not set up correctly, missing package.json");
                app_handle.emit("log-message", format!("Error: {}", error_msg))
                    .map_err(|e| format!("Failed to emit log message: {}", e))?;
                return Err(error_msg);
            }
            
            app_handle.emit("log-message", "Next.js project setup successful")
                .map_err(|e| format!("Failed to emit log message: {}", e))?;
            
            return Ok(());
        } else {
            // Handle other framework types
            let error_msg = format!("Framework {} is not directly supported with Node.js sidecar", framework.id);
            app_handle.emit("log-message", format!("Error: {}", error_msg))
                .map_err(|e| format!("Failed to emit log message: {}", e))?;
            
            return Err(error_msg);
        }
    }
} 