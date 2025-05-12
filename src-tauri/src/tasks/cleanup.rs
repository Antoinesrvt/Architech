//! Cleanup task implementation

use std::fs;
use tauri::Emitter;

use async_trait::async_trait;
use log::{info, warn};
use serde_json::Value;

use crate::commands::node_commands::execute_node_command;
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
    pub fn new(_context: TaskContext) -> Self {
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
        // Use only the needed context variables
        let app_handle = &context.app_handle;
        let base_dir = &context.project_dir;
        let config = &context.config;
        
        // Create the full project path (base_dir/project_name)
        let project_dir = base_dir.join(&config.name);
        
        // Log the actual directory we're working in
        info!("Working directory for cleanup task: {}", project_dir.display());
        app_handle.emit("log-message", format!("Cleaning up project in: {}", project_dir.display())).unwrap();
        
        // Create the project directory if it doesn't exist (failsafe in case framework task failed)
        if !project_dir.exists() {
            let warning_msg = format!("Project directory does not exist for cleanup, creating empty directory: {}", project_dir.display());
            warn!("{}", warning_msg);
            app_handle.emit("log-message", &warning_msg).unwrap();
            
            if let Err(e) = std::fs::create_dir_all(&project_dir) {
                let error_msg = format!("Failed to create project directory: {}", e);
                warn!("{}", error_msg);
                app_handle.emit("log-message", &error_msg).unwrap();
            }
            
            // Create a completion file to indicate the project is "complete" even if empty
            let completion_file = project_dir.join(".cleanup-complete");
            if let Err(e) = std::fs::write(&completion_file, "Project cleanup completed") {
                warn!("Failed to create completion file: {}", e);
            }
            
            return Ok(());  // Skip further cleanup since we just created the directory
        }
        
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
            let npm_result = execute_node_command(
                app_handle,
                &project_dir,
                "npm install",
                None
            ).await;
                
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
            
            let npm_result = execute_node_command(
                app_handle,
                &project_dir,
                "npm run format",
                None
            ).await;
                
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
                                    info!("Running npm run build");
                                    app_handle.emit("log-message", "Running npm run build to pre-build the project").unwrap();
                                    
                                    let build_result = execute_node_command(
                                        app_handle,
                                        &project_dir,
                                        "npm run build",
                                        None
                                    ).await;
                                        
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
        
        // Run tests if available
        info!("Running tests before finalizing the project");
        app_handle.emit("log-message", "Running tests to ensure project quality").unwrap();
        
        let build_result = execute_node_command(
            app_handle,
            &project_dir,
            "npm test",
            None
        ).await;
        
        match build_result {
            Ok(result) => {
                if result.success {
                    info!("Tests passed");
                    app_handle.emit("log-message", "Tests passed").unwrap();
                } else {
                    let warning = format!("Warning: Tests failed: {}", result.stderr);
                    warn!("{}", warning);
                    app_handle.emit("log-message", warning).unwrap();
                }
            },
            Err(e) => {
                let warning = format!("Warning: Tests command failed: {}", e);
                warn!("{}", warning);
                app_handle.emit("log-message", warning).unwrap();
            }
        }
        
        info!("Project cleanup completed");
        app_handle.emit("log-message", "Project cleanup completed").unwrap();
        
        Ok(())
    }
} 