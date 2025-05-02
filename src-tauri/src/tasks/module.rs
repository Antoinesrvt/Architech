//! Module installation task implementation

use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

use async_trait::async_trait;
use log::{info, error, warn, debug};
use tokio::time::{sleep, Duration};

use crate::commands::command_runner::CommandBuilder;
use crate::commands::framework::{Module as ModuleDetails, get_modules};
use crate::commands::file::modify_file;
use super::{Task, TaskContext};

/// Task for installing a module
pub struct ModuleTask {
    /// The task ID
    id: String,
    /// The task name
    name: String,
    /// The task dependencies
    dependencies: Vec<String>,
    /// The module ID
    module_id: String,
}

impl ModuleTask {
    /// Create a new module task
    pub fn new(context: TaskContext, module_id: String) -> Self {
        Self {
            id: format!("module:{}", module_id),
            name: format!("Install module: {}", module_id),
            dependencies: Vec::new(), // Dependencies are set separately
            module_id,
        }
    }
    
    /// Set the dependencies for this task
    pub fn set_dependencies(&mut self, dependencies: Vec<String>) {
        self.dependencies = dependencies;
    }
    
    /// Create a new module task with specific module ID
    pub fn with_module_id(module_id: String, framework: String, dependencies: Vec<String>) -> Self {
        // Add framework task as a dependency (if not already included)
        let framework_task_id = format!("framework:{}", framework);
        
        let mut all_deps = dependencies;
        
        // Ensure framework task is a dependency
        if !all_deps.contains(&framework_task_id) {
            all_deps.push(framework_task_id);
        }
        
        Self {
            id: format!("module:{}", module_id),
            name: format!("Install module: {}", module_id),
            dependencies: all_deps,
            module_id,
        }
    }
}

#[async_trait]
impl Task for ModuleTask {
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
        let project_dir = &context.project_dir;
        
        // Get module details
        let all_modules = get_modules().await?;
        let module = all_modules.iter()
            .find(|m| m.id == self.module_id)
            .ok_or_else(|| format!("Module not found: {}", self.module_id))?;
        
        // Log the module installation
        info!("Setting up module: {}", module.name);
        app_handle.emit("log-message", format!("Setting up module: {}", module.name)).unwrap();
        
        // Ensure that package.json exists if needed for npm operations
        let package_json_path = project_dir.join("package.json");
        if !package_json_path.exists() && !module.installation.commands.is_empty() {
            let has_npm_commands = module.installation.commands.iter()
                .any(|cmd| cmd.starts_with("npm") || cmd.starts_with("npx"));
                
            if has_npm_commands {
                info!("Creating package.json before npm operations");
                app_handle.emit("log-message", "Creating package.json before npm operations").unwrap();
                
                let default_package = r#"{
  "name": "project",
  "private": true,
  "version": "0.1.0",
  "scripts": {},
  "dependencies": {},
  "devDependencies": {}
}"#;
                
                if let Err(e) = fs::write(&package_json_path, default_package) {
                    let warning = format!("Warning: Failed to create package.json: {}", e);
                    warn!("{}", warning);
                    app_handle.emit("log-message", warning).unwrap();
                } else {
                    // Allow time for the file system to register the new file
                    sleep(Duration::from_millis(500)).await;
                }
            }
        }
        
        // Process each command
        for (i, cmd) in module.installation.commands.iter().enumerate() {
            // Update progress
            let progress_msg = format!("Running command {}/{}", i+1, module.installation.commands.len());
            info!("{}", progress_msg);
            app_handle.emit("task-progress", progress_msg).unwrap();
            
            // Parse the command
            let parts: Vec<&str> = cmd.split_whitespace().collect();
            if parts.is_empty() {
                continue;
            }
            
            let cmd_name = parts[0];
            let cmd_args = &parts[1..];
            
            // Build and execute the command
            let command_log = format!("Executing: {} {}", cmd_name, cmd_args.join(" "));
            app_handle.emit("log-message", &command_log).unwrap();
            
            let command_result = CommandBuilder::new(cmd_name)
                .args(cmd_args.iter().map(|s| s.to_string()))
                .working_dir(project_dir.as_ref())
                .retries(3)
                .retry_delay(2)
                .execute()
                .await;
                
            match command_result {
                Ok(result) => {
                    if !result.success {
                        let error_msg = format!("Command failed: {}", result.stderr);
                        warn!("{}", error_msg);
                        app_handle.emit("log-message", &error_msg).unwrap();
                        
                        // If this is a critical npm/npx command, warn but continue
                        if cmd.contains("npm install") || cmd.contains("npx") || cmd.contains("npm i") {
                            let warning = "Critical command failed, but continuing with file operations";
                            warn!("{}", warning);
                            app_handle.emit("log-message", warning).unwrap();
                        }
                    } else {
                        let success_msg = "Command completed successfully";
                        debug!("{}", success_msg);
                        app_handle.emit("log-message", success_msg).unwrap();
                    }
                },
                Err(e) => {
                    let error_msg = format!("Command execution error: {}", e);
                    warn!("{}", error_msg);
                    app_handle.emit("log-message", &error_msg).unwrap();
                    
                    // If this is a critical npm/npx command, warn but continue
                    if cmd.contains("npm install") || cmd.contains("npx") || cmd.contains("npm i") {
                        let warning = "Critical command failed, but continuing with file operations";
                        warn!("{}", warning);
                        app_handle.emit("log-message", warning).unwrap();
                    }
                }
            }
            
            // Add a delay between commands to ensure file system consistency
            sleep(Duration::from_millis(500)).await;
        }
        
        // Process file operations
        for (i, op) in module.installation.file_operations.iter().enumerate() {
            // Update progress
            let progress_msg = format!("Applying file operation {}/{}", i+1, module.installation.file_operations.len());
            info!("{}", progress_msg);
            app_handle.emit("task-progress", progress_msg).unwrap();
            
            let file_path = project_dir.join(&op.path);
            
            // Ensure parent directory exists
            if let Some(parent) = file_path.parent() {
                if !parent.exists() {
                    if let Err(e) = fs::create_dir_all(parent) {
                        let error_msg = format!("Failed to create directory: {}", e);
                        warn!("{}", error_msg);
                        app_handle.emit("log-message", error_msg).unwrap();
                        // Continue despite error
                    }
                }
            }
            
            // Apply operation
            match op.operation.as_str() {
                "create" => {
                    // Check if file already exists before attempting to create
                    if file_path.exists() {
                        let msg = format!("File already exists, skipping: {}", file_path.display());
                        info!("{}", msg);
                        app_handle.emit("log-message", msg).unwrap();
                    } else {
                        let msg = format!("Creating file: {}", file_path.display());
                        info!("{}", msg);
                        app_handle.emit("log-message", msg).unwrap();
                        
                        if let Err(e) = fs::write(&file_path, &op.content) {
                            let error_msg = format!("Failed to create file: {}", e);
                            warn!("{}", error_msg);
                            app_handle.emit("log-message", error_msg).unwrap();
                        }
                    }
                },
                "modify" => {
                    if !file_path.exists() {
                        let msg = format!("File does not exist, cannot modify: {}", file_path.display());
                        warn!("{}", msg);
                        app_handle.emit("log-message", msg).unwrap();
                    } else {
                        let msg = format!("Modifying file: {}", file_path.display());
                        info!("{}", msg);
                        app_handle.emit("log-message", msg).unwrap();
                        
                        if let Err(e) = modify_file(&file_path, &op.pattern, &op.replacement) {
                            let error_msg = format!("Failed to modify file: {}", e);
                            warn!("{}", error_msg);
                            app_handle.emit("log-message", error_msg).unwrap();
                        }
                    }
                },
                "append" => {
                    if !file_path.exists() {
                        let msg = format!("File does not exist, creating before append: {}", file_path.display());
                        info!("{}", msg);
                        app_handle.emit("log-message", msg).unwrap();
                        
                        if let Err(e) = fs::write(&file_path, &op.content) {
                            let error_msg = format!("Failed to create file: {}", e);
                            warn!("{}", error_msg);
                            app_handle.emit("log-message", error_msg).unwrap();
                            continue;
                        }
                    } else {
                        let msg = format!("Appending to file: {}", file_path.display());
                        info!("{}", msg);
                        app_handle.emit("log-message", msg).unwrap();
                        
                        // Read existing content
                        let existing_content = match fs::read_to_string(&file_path) {
                            Ok(content) => content,
                            Err(e) => {
                                let error_msg = format!("Failed to read file: {}", e);
                                warn!("{}", error_msg);
                                app_handle.emit("log-message", error_msg).unwrap();
                                continue;
                            }
                        };
                        
                        // Append new content
                        let new_content = format!("{}\n{}", existing_content, op.content);
                        if let Err(e) = fs::write(&file_path, new_content) {
                            let error_msg = format!("Failed to write file: {}", e);
                            warn!("{}", error_msg);
                            app_handle.emit("log-message", error_msg).unwrap();
                        }
                    }
                },
                _ => {
                    let msg = format!("Unknown file operation: {}", op.operation);
                    warn!("{}", msg);
                    app_handle.emit("log-message", msg).unwrap();
                }
            }
            
            // Add a delay between file operations to ensure file system consistency
            sleep(Duration::from_millis(100)).await;
        }
        
        // Module installation completed
        let completion_msg = format!("Module {} installed successfully", module.name);
        info!("{}", completion_msg);
        app_handle.emit("log-message", completion_msg).unwrap();
        Ok(())
    }
} 