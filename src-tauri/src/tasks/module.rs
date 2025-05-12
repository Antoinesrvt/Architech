//! Module installation task implementation

use std::fs;
use std::path::PathBuf;
use tauri::Emitter;

use async_trait::async_trait;
use log::{info, warn, debug};
use tokio::time::{sleep, Duration};

use crate::commands::framework::get_modules;
use crate::commands::file::modify_file;
use crate::commands::node_commands::execute_node_command;
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
    pub fn new(_context: TaskContext, module_id: String) -> Self {
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
        // Use only the needed context variables
        let app_handle = &context.app_handle;
        let base_dir = &context.project_dir;
        let config = &context.config;
        
        // Create the full project path (base_dir/project_name)
        let project_dir = base_dir.join(&config.name);
        
        // Log the actual directory we're working in
        info!("Working directory for module {}: {}", self.module_id, project_dir.display());
        app_handle.emit("log-message", format!("Working in directory: {}", project_dir.display())).unwrap();
        
        // Create the project directory if it doesn't exist (failsafe in case framework task failed)
        if !project_dir.exists() {
            let warning_msg = format!("Project directory does not exist, creating it now: {}", project_dir.display());
            warn!("{}", warning_msg);
            app_handle.emit("log-message", &warning_msg).unwrap();
            
            if let Err(e) = std::fs::create_dir_all(&project_dir) {
                let error_msg = format!("Failed to create project directory: {}", e);
                warn!("{}", error_msg);
                app_handle.emit("log-message", &error_msg).unwrap();
                return Err(error_msg);
            }
            
            // Create a package.json file if it doesn't exist
            let package_json_path = project_dir.join("package.json");
            if !package_json_path.exists() {
                info!("Creating default package.json file");
                app_handle.emit("log-message", "Creating default package.json file").unwrap();
                
                let default_package = r#"{
  "name": "project",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "echo \"No tests configured\" && exit 0"
  },
  "dependencies": {},
  "devDependencies": {}
}"#;
                
                if let Err(e) = std::fs::write(&package_json_path, default_package) {
                    let warning = format!("Warning: Failed to create package.json: {}", e);
                    warn!("{}", warning);
                    app_handle.emit("log-message", &warning).unwrap();
                }
            }
        }
        
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
            
            // Execute the command using the new API
            let command_log = format!("Executing: {}", cmd);
            app_handle.emit("log-message", &command_log).unwrap();
            
            let command_result = execute_node_command(
                app_handle,
                &project_dir,
                cmd,
                None
            ).await;
                
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
                        app_handle.emit("log-message", &error_msg).unwrap();
                        continue;
                    }
                }
            }
            
            // Handle different operation types
            match op.operation.as_str() {
                "create" => {
                    // Create a new file
                    let content = op.content.as_str();
                    if let Err(e) = fs::write(&file_path, content) {
                        let error_msg = format!("Failed to create file '{}': {}", op.path, e);
                        warn!("{}", error_msg);
                        app_handle.emit("log-message", &error_msg).unwrap();
                    } else {
                        let success_msg = format!("Created file: {}", op.path);
                        debug!("{}", success_msg);
                        app_handle.emit("log-message", &success_msg).unwrap();
                    }
                },
                "modify" => {
                    // Modify an existing file
                    if !file_path.exists() {
                        let warning = format!("Cannot modify non-existent file: {}", op.path);
                        warn!("{}", warning);
                        app_handle.emit("log-message", &warning).unwrap();
                        continue;
                    }
                    
                    // Check if pattern and replacement are available
                    if !op.pattern.is_empty() && !op.replacement.is_empty() {
                        match modify_file(&file_path, &op.pattern, &op.replacement) {
                            Ok(_) => {
                                let success_msg = format!("Modified file: {}", op.path);
                                debug!("{}", success_msg);
                                app_handle.emit("log-message", &success_msg).unwrap();
                            },
                            Err(e) => {
                                let error_msg = format!("Failed to modify file '{}': {}", op.path, e);
                                warn!("{}", error_msg);
                                app_handle.emit("log-message", &error_msg).unwrap();
                            }
                        }
                    } else {
                        let warning = "Missing pattern or replacement for file modification";
                        warn!("{}", warning);
                        app_handle.emit("log-message", warning).unwrap();
                    }
                },
                _ => {
                    let warning = format!("Unknown file operation: {}", op.operation);
                    warn!("{}", warning);
                    app_handle.emit("log-message", &warning).unwrap();
                }
            }
            
            // Add a delay between file operations to ensure consistency
            sleep(Duration::from_millis(200)).await;
        }
        
        Ok(())
    }
} 