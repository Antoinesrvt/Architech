//! Cleanup task implementation

use std::fs;
use tauri::Emitter;

use async_trait::async_trait;
use log::{info, warn};
use serde_json::Value;

use crate::commands::node_commands::NodeCommandBuilder;
use super::{Task, TaskContext};

/// Task for project cleanup
pub struct CleanupTask {
    /// The task ID
    id: String,
    /// The task name
    name: String,
    /// The task dependencies
    dependencies: Vec<String>,
}

impl CleanupTask {
    /// Create a new cleanup task
    pub fn new(context: TaskContext) -> Self {
        Self {
            id: "cleanup".to_string(),
            name: "Project cleanup".to_string(),
            dependencies: Vec::new(), // Will be populated later
        }
    }
    
    /// Set the dependencies for this task
    pub fn set_dependencies(&mut self, dependencies: Vec<String>) {
        self.dependencies = dependencies;
    }
}

#[async_trait]
impl Task for CleanupTask {
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
        let app_handle = &context.app_handle;
        let project_dir = &context.project_dir;
        
        // Start the cleanup phase
        info!("Starting project cleanup phase");
        app_handle.emit("log-message", "Starting project cleanup phase").unwrap();
        
        // Check if we need to install dependencies
        let package_json_path = project_dir.join("package.json");
        let node_modules_path = project_dir.join("node_modules");
        let package_lock_path = project_dir.join("package-lock.json");
        
        // If we have a package.json but no node_modules, we need to run npm install
        if package_json_path.exists() && (!node_modules_path.exists() || !package_lock_path.exists()) {
            info!("Installing npm dependencies");
            app_handle.emit("log-message", "Installing npm dependencies...").unwrap();
            
            // Run npm install with retry logic
            let npm_result = NodeCommandBuilder::new("npm")
                .arg("install")
                .current_dir(project_dir.to_string_lossy().to_string())
                .execute(&app_handle)
                .await;
                
            match npm_result {
                Ok(result) => {
                    if result.success {
                        info!("NPM dependencies installed successfully");
                        app_handle.emit("log-message", "NPM dependencies installed successfully").unwrap();
                    } else {
                        let warning = format!("Warning: NPM install failed: {}", result.stderr);
                        warn!("{}", warning);
                        app_handle.emit("log-message", warning).unwrap();
                    }
                },
                Err(e) => {
                    let warning = format!("Warning: NPM install error: {}", e);
                    warn!("{}", warning);
                    app_handle.emit("log-message", warning).unwrap();
                }
            }
        } else if package_json_path.exists() && node_modules_path.exists() {
            info!("Node modules already installed, skipping npm install");
            app_handle.emit("log-message", "Node modules already installed, skipping npm install").unwrap();
        }
        
        // Check for formatter configurations like prettier
        let prettier_path = project_dir.join(".prettierrc");
        let eslint_path = project_dir.join(".eslintrc");
        
        if prettier_path.exists() || eslint_path.exists() {
            info!("Running code formatting");
            app_handle.emit("log-message", "Running code formatting...").unwrap();
            
            // Format the project code if possible
            info!("Running npm format");
            app_handle.emit("log-message", "Running npm format").unwrap();
            
            let npm_result = NodeCommandBuilder::new("npm")
                .args(["run", "format"])
                .current_dir(project_dir.to_string_lossy().to_string())
                .execute(&app_handle)
                .await;
                
            match npm_result {
                Ok(result) => {
                    if !result.success {
                        let warning = "Warning: Code formatting failed, but continuing";
                        warn!("{}", warning);
                        app_handle.emit("log-message", warning).unwrap();
                    } else {
                        info!("Code formatting completed successfully");
                        app_handle.emit("log-message", "Code formatting completed successfully").unwrap();
                    }
                },
                Err(e) => {
                    let warning = format!("Warning: Code formatting command failed: {}", e);
                    warn!("{}", warning);
                    app_handle.emit("log-message", warning).unwrap();
                }
            }
        }
        
        // Final validation - ensure the project appears to be valid
        info!("Validating project structure");
        app_handle.emit("log-message", "Validating project structure...").unwrap();
        
        // If we have a package.json, verify it's valid JSON
        if package_json_path.exists() {
            match fs::read_to_string(&package_json_path) {
                Ok(contents) => {
                    match serde_json::from_str::<Value>(&contents) {
                        Ok(_) => {
                            info!("package.json validation successful");
                            app_handle.emit("log-message", "package.json validation successful").unwrap();
                        },
                        Err(e) => {
                            let warning = format!("Warning: package.json contains invalid JSON: {}", e);
                            warn!("{}", warning);
                            app_handle.emit("log-message", warning).unwrap();
                        }
                    }
                },
                Err(e) => {
                    let warning = format!("Warning: Failed to read package.json: {}", e);
                    warn!("{}", warning);
                    app_handle.emit("log-message", warning).unwrap();
                }
            }
        }
        
        // Try to run a development build if possible
        if package_json_path.exists() {
            // Check if package.json has a build script
            match fs::read_to_string(&package_json_path) {
                Ok(contents) => {
                    match serde_json::from_str::<Value>(&contents) {
                        Ok(json) => {
                            if let Some(scripts) = json.get("scripts").and_then(|s| s.as_object()) {
                                if scripts.contains_key("build") {
                                    info!("Running development build");
                                    app_handle.emit("log-message", "Running development build...").unwrap();
                                    
                                    // Run the build command
                                    info!("Building the project");
                                    app_handle.emit("log-message", "Building the project").unwrap();
                                    
                                    let build_result = NodeCommandBuilder::new("npm")
                                        .args(["run", "build"])
                                        .current_dir(project_dir.to_string_lossy().to_string())
                                        .execute(&app_handle)
                                        .await;
                                        
                                    match build_result {
                                        Ok(result) => {
                                            if result.success {
                                                info!("Development build successful");
                                                app_handle.emit("log-message", "Development build successful").unwrap();
                                            } else {
                                                let warning = format!("Warning: Development build failed: {}", result.stderr);
                                                warn!("{}", warning);
                                                app_handle.emit("log-message", warning).unwrap();
                                            }
                                        },
                                        Err(e) => {
                                            let warning = format!("Warning: Development build command failed: {}", e);
                                            warn!("{}", warning);
                                            app_handle.emit("log-message", warning).unwrap();
                                        }
                                    }
                                }
                            }
                        },
                        Err(_) => {
                            // Already warned about invalid JSON above
                        }
                    }
                },
                Err(_) => {
                    // Already warned about read failure above
                }
            }
        }
        
        // Cleanup completed successfully
        info!("Project cleanup completed successfully");
        app_handle.emit("log-message", "Project cleanup completed successfully").unwrap();
        Ok(())
    }
} 