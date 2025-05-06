//! Directory structure task implementation

use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

use async_trait::async_trait;
use log::{info, error, warn};

use super::{Task, TaskContext};

// Import the get_frameworks function from the commands module
use crate::commands::framework::get_frameworks;

/// Task for creating directory structure
pub struct DirectoryTask {
    /// The task ID
    id: String,
    /// The task name
    name: String,
    /// The task dependencies
    dependencies: Vec<String>,
}

impl DirectoryTask {
    /// Create a new directory task
    pub fn new(context: TaskContext) -> Self {
        let config = &context.config;
        let framework_name = &config.framework;
        
        Self {
            id: format!("directory:{}", framework_name),
            name: format!("Create directory structure for {}", framework_name),
            dependencies: Vec::new(), // Dependencies will be set separately
        }
    }
    
    /// Set the dependencies for this task
    pub fn set_dependencies(&mut self, dependencies: Vec<String>) {
        self.dependencies = dependencies;
    }
}

#[async_trait]
impl Task for DirectoryTask {
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
        info!("Working directory for directory task: {}", project_dir.display());
        app_handle.emit("log-message", format!("Creating project structure in: {}", project_dir.display())).unwrap();
        
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
        }
        
        // Get framework details
        let frameworks = get_frameworks().await?;
        let framework = frameworks.iter()
            .find(|f| f.id == config.framework)
            .ok_or_else(|| format!("Framework {} not found", config.framework))?;
        
        // Skip this task if the framework doesn't enforce directory structure
        if !framework.directory_structure.enforced {
            info!("Framework does not enforce directory structure, skipping");
            app_handle.emit("log-message", "Framework does not enforce directory structure, skipping").unwrap();
            return Ok(());
        }
        
        // Create enforced directories
        for dir in &framework.directory_structure.directories {
            let dir_path = project_dir.join(dir);
            if !dir_path.exists() {
                info!("Creating directory: {}", dir_path.display());
                app_handle.emit("log-message", format!("Creating directory: {}", dir_path.display())).unwrap();
                
                if let Err(e) = fs::create_dir_all(&dir_path) {
                    let error = format!("Failed to create directory '{}': {}", dir_path.display(), e);
                    error!("{}", error);
                    app_handle.emit("log-message", format!("Failed to create directory: {}", e)).unwrap();
                    return Err(error);
                }
            } else {
                info!("Directory already exists: {}", dir_path.display());
                app_handle.emit("log-message", format!("Directory already exists: {}", dir_path.display())).unwrap();
            }
        }
        
        info!("Directory structure created successfully");
        app_handle.emit("log-message", "Directory structure created successfully").unwrap();
        Ok(())
    }
} 