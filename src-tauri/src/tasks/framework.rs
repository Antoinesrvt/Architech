//! Framework setup task implementation

use tauri::{AppHandle, Emitter};
use std::path::Path;

use async_trait::async_trait;
use log::{info, debug, warn};
use crate::commands::framework::{get_frameworks, Framework};
use crate::commands::node_commands::{execute_node_command, NodeCommandType, NodeCommandOptions};
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
    
    /// Create a new framework task from the task context
    pub fn from_context(context: TaskContext) -> Self {
        let framework_id = context.config.framework.clone();
        Self {
            id: format!("framework:{}", framework_id),
            name: format!("Setup {} framework", framework_id),
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
        
        // Use the command from the frontend configuration
        if let Some(setup_command) = &config.setup_command {
            info!("Executing framework setup command: {}", setup_command);
            app_handle.emit("log-message", format!("Setting up framework with command: {}", setup_command))
                .map_err(|e| format!("Failed to emit log message: {}", e))?;
            
            // Execute the command using the consolidated API
            let result = execute_node_command(
                app_handle,
                project_dir,
                setup_command,
                None,
            ).await?;
            
            // Check if the command was successful
            if !result.success {
                let error_msg = format!("Failed to set up framework: {}", result.stderr);
                app_handle.emit("log-message", format!("Error: {}", error_msg))
                    .map_err(|e| format!("Failed to emit log message: {}", e))?;
                return Err(error_msg);
            }
            
            // Verify the project was created
            let project_folder = project_dir.join(&config.name);
            if !project_folder.exists() {
                let error_msg = format!("Project folder was not created: {}", project_folder.display());
                app_handle.emit("log-message", format!("Error: {}", error_msg))
                    .map_err(|e| format!("Failed to emit log message: {}", e))?;
                return Err(error_msg);
            }
            
            app_handle.emit("log-message", format!("{} framework setup successful", framework.name))
                .map_err(|e| format!("Failed to emit log message: {}", e))?;
            
            Ok(())
        } else {
            // No setup command provided
            let error_msg = format!("No setup command provided for framework {}", framework.id);
            app_handle.emit("log-message", format!("Error: {}", error_msg))
                .map_err(|e| format!("Failed to emit log message: {}", e))?;
            
            Err(error_msg)
        }
    }
} 