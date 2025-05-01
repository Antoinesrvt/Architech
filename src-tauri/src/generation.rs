use std::path::Path;
use std::fs;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use tokio::sync::mpsc;
use tokio::time::sleep;

use crate::state::{AppState, TaskStatus, GenerationTask};
use crate::commands::framework::{get_framework_by_id as get_framework, get_modules};
use crate::commands::command_runner::{modify_file, modify_import};

// Task result type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResult {
    pub task_id: String,
    pub success: bool,
    pub message: String,
}

// Command execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

// Project generator
pub struct ProjectGenerator {
    app_handle: AppHandle,
    app_state: Arc<AppState>,
}

impl ProjectGenerator {
    // Create a new generator
    pub fn new(app_handle: AppHandle, app_state: Arc<AppState>) -> Self {
        Self {
            app_handle,
            app_state,
        }
    }
    
    // Start the generation process
    pub async fn start_generation(&self, config: crate::commands::project::ProjectConfig) -> Result<String, String> {
        // Validate the config
        let validation = crate::commands::project::validate_project_config(config.clone()).await?;
        if !validation.valid {
            return Err(validation.errors.join(", "));
        }
        
        // Initialize project state
        let project_id = self.app_state.init_project(
            config.name.clone(), 
            config.path.clone(), 
            config.framework.clone()
        )?;
        
        // Add a log message
        self.app_state.add_log(&project_id, &format!("Starting project generation for {}", config.name))?;
        
        // Create the task sequence
        self.create_generation_tasks(&project_id, &config).await?;
        
        // Launch the generation process in the background
        let app_handle_clone = self.app_handle.clone();
        let app_state = self.app_state.clone();
        let _config_clone = config.clone();
        let project_id_clone = project_id.clone();
        
        // Create channel for task execution
        let (tx, mut rx) = mpsc::channel(32);
        
        // Spawn task executor
        tokio::spawn(async move {
            // Execute all tasks
            ProjectGenerator::execute_tasks(&project_id_clone, app_handle_clone.clone(), app_state.clone(), tx.clone()).await;
            
            // Final processing
            if let Ok(project) = app_state.get_project(&project_id_clone) {
                match project.status {
                    TaskStatus::Completed => {
                        app_state.add_log(&project_id_clone, "🎉 Project generation completed successfully!").ok();
                        
                        // Emit completion event
                        let _ = app_handle_clone.emit("generation-complete", project_id_clone.clone());
                    },
                    TaskStatus::Failed(reason) => {
                        app_state.add_log(&project_id_clone, &format!("❌ Project generation failed: {}", reason)).ok();
                        
                        // Emit failure event
                        let _ = app_handle_clone.emit("generation-failed", (project_id_clone.clone(), reason));
                    },
                    _ => {
                        // This shouldn't happen, but handle it anyway
                        app_state.add_log(&project_id_clone, "⚠️ Project generation ended in an unexpected state").ok();
                    }
                }
            }
        });
        
        // Listen for task results and emit events
        let app_handle_clone2 = self.app_handle.clone();
        tokio::spawn(async move {
            while let Some(result) = rx.recv().await {
                let _ = app_handle_clone2.emit("task-update", result);
            }
        });
        
        Ok(project_id)
    }
    
    // Create all required generation tasks
    async fn create_generation_tasks(&self, project_id: &str, config: &crate::commands::project::ProjectConfig) -> Result<(), String> {
        // Get the framework details
        let framework = get_framework(&config.framework).await?;
        
        // Project directory
        let project_dir = Path::new(&config.path).join(&config.name);
        
        // Get all modules with their dependencies resolved
        let module_ids = config.modules.iter().map(|m| m.id.clone()).collect::<Vec<String>>();
        let ordered_modules = crate::commands::project::resolve_module_dependencies(&module_ids).await?;
        
        // Log the resolved modules
        self.app_state.add_log(project_id, &format!("Resolved {} modules with dependencies", ordered_modules.len()))?;
        for module in &ordered_modules {
            self.app_state.add_log(project_id, &format!("- {} ({})", module.name, module.id))?;
        }
        
        // Create tasks with the correct dependencies
        
        // Task 1: Create Project Directory
        let dir_task_id = format!("create_directory_{}", Uuid::new_v4());
        let dir_task = GenerationTask {
            id: dir_task_id.clone(),
            name: "Create Project Directory".to_string(),
            description: format!("Creating project directory at {}", project_dir.display()),
            status: TaskStatus::Pending,
            progress: 0.0,
            dependencies: Vec::new(),
        };
        self.app_state.add_task(project_id, dir_task)?;
        
        // Task 2: Framework Installation
        let framework_task_id = format!("framework_setup_{}", Uuid::new_v4());
        let framework_task = GenerationTask {
            id: framework_task_id.clone(),
            name: format!("Setup {} Framework", framework.name),
            description: format!("Setting up the {} framework using CLI tools", framework.name),
            status: TaskStatus::Pending,
            progress: 0.0,
            dependencies: vec![dir_task_id.clone()],
        };
        self.app_state.add_task(project_id, framework_task)?;
        
        // Task 3: Create Directory Structure
        let structure_task_id = format!("directory_structure_{}", Uuid::new_v4());
        let structure_task = GenerationTask {
            id: structure_task_id.clone(),
            name: "Create Directory Structure".to_string(),
            description: "Creating the project directory structure".to_string(),
            status: TaskStatus::Pending,
            progress: 0.0,
            dependencies: vec![framework_task_id.clone()],
        };
        self.app_state.add_task(project_id, structure_task)?;
        
        // Create module dependency map - we'll use this to ensure each module's dependencies are installed first
        let mut module_task_ids = std::collections::HashMap::new();
        
        // First pass: Create a task for each module but make all depend on the structure task for now
        for module in &ordered_modules {
            let module_task_id = format!("module_{}_{}", module.id, Uuid::new_v4());
            let module_task = GenerationTask {
                id: module_task_id.clone(),
                name: format!("Install {} Module", module.name),
                description: format!("Installing and configuring the {} module", module.name),
                status: TaskStatus::Pending,
                progress: 0.0,
                // Start with just depending on directory structure
                dependencies: vec![structure_task_id.clone()],
            };
            self.app_state.add_task(project_id, module_task.clone())?;
            
            // Store the task ID for this module
            module_task_ids.insert(module.id.clone(), module_task_id.clone());
        }
        
        // Second pass: Update dependencies for each module based on their actual dependencies
        for module in &ordered_modules {
            if let Some(task_id) = module_task_ids.get(&module.id) {
                // Get current task
                if let Ok(project) = self.app_state.get_project(project_id) {
                    if let Some(mut task) = project.tasks.get(task_id).cloned() {
                        // Start with framework structure dependency
                        let mut deps = vec![structure_task_id.clone()];
                        
                        // Add dependencies for each module dependency
                        for dep_id in &module.dependencies {
                            if let Some(dep_task_id) = module_task_ids.get(dep_id) {
                                deps.push(dep_task_id.clone());
                            }
                        }
                        
                        // Update the task dependencies
                        task.dependencies = deps;
                        
                        // Update the task in the state
                        let mut projects = self.app_state.projects.lock().map_err(|e| format!("Failed to lock projects: {}", e))?;
                        if let Some(project) = projects.get_mut(project_id) {
                            project.tasks.insert(task_id.clone(), task);
                        }
                    }
                }
            }
        }
        
        // Log the created tasks with their dependencies
        if let Ok(project) = self.app_state.get_project(project_id) {
            self.app_state.add_log(project_id, "Created the following generation tasks:")?;
            for task in project.tasks.values() {
                let deps = task.dependencies.iter()
                    .filter_map(|dep_id| project.tasks.get(dep_id).map(|t| t.name.clone()))
                    .collect::<Vec<_>>()
                    .join(", ");
                
                self.app_state.add_log(project_id, &format!("- {} (depends on: {})", task.name, deps))?;
            }
        }
        
        // Add final cleanup task - it depends on all module tasks
        let cleanup_task_id = format!("cleanup_{}", Uuid::new_v4());
        let module_task_ids_vec: Vec<String> = module_task_ids.values().cloned().collect();
        
        let cleanup_task = GenerationTask {
            id: cleanup_task_id.clone(),
            name: "Project Cleanup".to_string(),
            description: "Performing final cleanup and optimization".to_string(),
            status: TaskStatus::Pending,
            progress: 0.0,
            dependencies: if !module_task_ids_vec.is_empty() {
                module_task_ids_vec
            } else {
                // If no modules, depend on structure task
                vec![structure_task_id.clone()]
            },
        };
        self.app_state.add_task(project_id, cleanup_task)?;
        
        Ok(())
    }
    
    // Execute all tasks with dependency tracking
    async fn execute_tasks(
        project_id: &str,
        app_handle: AppHandle,
        app_state: Arc<AppState>,
        tx: mpsc::Sender<TaskResult>
    ) {
        // Get all tasks
        let tasks = match app_state.get_project(project_id) {
            Ok(project) => project.tasks,
            Err(e) => {
                let _ = tx.send(TaskResult {
                    task_id: "unknown".to_string(),
                    success: false,
                    message: format!("Failed to get project tasks: {}", e),
                }).await;
                return;
            }
        };
        
        // Create a Vec of tasks to process
        let mut task_queue: Vec<_> = tasks.values().cloned().collect();
        
        // Process tasks until the queue is empty
        while !task_queue.is_empty() {
            // Find tasks with all dependencies satisfied
            let executable_tasks: Vec<_> = task_queue.iter()
                .filter(|task| {
                    // Check if all dependencies are completed
                    task.dependencies.iter().all(|dep_id| {
                        if let Ok(project) = app_state.get_project(project_id) {
                            project.tasks.get(dep_id)
                                .map(|dep| matches!(dep.status, TaskStatus::Completed | TaskStatus::Skipped(_)))
                                .unwrap_or(false)
                        } else {
                            false
                        }
                    })
                })
                .cloned()
                .collect();
            
            if executable_tasks.is_empty() {
                // No tasks can be executed, check for circular dependencies
                if task_queue.iter().all(|task| 
                    matches!(task.status, TaskStatus::Pending)
                ) {
                    // All remaining tasks are pending but none can be executed
                    for task in &task_queue {
                        let _ = app_state.update_task_status(
                            project_id, 
                            &task.id, 
                            TaskStatus::Failed("Circular dependency detected".to_string())
                        );
                        
                        let _ = tx.send(TaskResult {
                            task_id: task.id.clone(),
                            success: false,
                            message: "Circular dependency detected".to_string(),
                        }).await;
                    }
                    break;
                }
                
                // Wait a bit before checking again
                sleep(Duration::from_millis(100)).await;
                continue;
            }
            
            // Execute all executable tasks
            for task in executable_tasks {
                // Set as current task
                let _ = app_state.set_current_task(project_id, &task.id);
                
                // Mark task as running
                let _ = app_state.update_task_status(project_id, &task.id, TaskStatus::Running);
                
                // Log start
                let _ = app_state.add_log(project_id, &format!("Starting task: {}", task.name));
                
                // Send initial task update
                let _ = tx.send(TaskResult {
                    task_id: task.id.clone(),
                    success: true,
                    message: format!("Started task: {}", task.name),
                }).await;
                
                // Execute the task
                let result = ProjectGenerator::execute_task(project_id, &task, app_handle.clone(), app_state.clone()).await;
                
                // Update task status based on result
                if result.success {
                    let _ = app_state.update_task_status(project_id, &task.id, TaskStatus::Completed);
                    let _ = app_state.add_log(project_id, &format!("Completed task: {}", task.name));
                } else {
                    let _ = app_state.update_task_status(project_id, &task.id, TaskStatus::Failed(result.message.clone()));
                    let _ = app_state.add_log(project_id, &format!("Failed task: {} - {}", task.name, result.message));
                }
                
                // Send task result update
                let _ = tx.send(result).await;
                
                // Remove task from queue
                task_queue.retain(|t| t.id != task.id);
            }
        }
    }
    
    // Execute a single task
    async fn execute_task(
        project_id: &str,
        task: &GenerationTask,
        app_handle: AppHandle,
        app_state: Arc<AppState>
    ) -> TaskResult {
        // Get project details
        let project = match app_state.get_project(project_id) {
            Ok(p) => p,
            Err(e) => {
                return TaskResult {
                    task_id: task.id.clone(),
                    success: false,
                    message: format!("Failed to get project details: {}", e),
                };
            }
        };
        
        // Get project config
        let config = crate::commands::project::ProjectConfig {
            name: project.name.clone(),
            path: project.path.clone(),
            framework: project.framework.clone(),
            modules: Vec::new(), // We'll populate this as needed
            options: crate::commands::project::ProjectOptions {
                typescript: true,
                app_router: true,
                eslint: true,
            },
        };
        
        let project_dir = Path::new(&project.path).join(&project.name);
        
        // Dispatch based on task ID prefix
        let task_type = task.id.split('_').next().unwrap_or("");
        
        match task_type {
            "create" => {
                // Create project directory
                if let Err(e) = fs::create_dir_all(&project_dir) {
                    return TaskResult {
                        task_id: task.id.clone(),
                        success: false,
                        message: format!("Failed to create project directory: {}", e),
                    };
                }
                
                TaskResult {
                    task_id: task.id.clone(),
                    success: true,
                    message: format!("Created project directory at {}", project_dir.display()),
                }
            },
            "framework" => {
                // Set up the framework
                match ProjectGenerator::setup_framework(&config, &project_dir, app_handle).await {
                    Ok(_) => TaskResult {
                        task_id: task.id.clone(),
                        success: true,
                        message: format!("Successfully set up {} framework", project.framework),
                    },
                    Err(e) => TaskResult {
                        task_id: task.id.clone(),
                        success: false,
                        message: format!("Failed to set up framework: {}", e),
                    },
                }
            },
            "directory" => {
                // Create directory structure
                match ProjectGenerator::create_directory_structure(&config, &project_dir, app_handle).await {
                    Ok(_) => TaskResult {
                        task_id: task.id.clone(),
                        success: true,
                        message: "Successfully created directory structure".to_string(),
                    },
                    Err(e) => TaskResult {
                        task_id: task.id.clone(),
                        success: false,
                        message: format!("Failed to create directory structure: {}", e),
                    },
                }
            },
            "module" => {
                // Extract module ID from task ID
                let module_id = task.id.split('_').nth(1).unwrap_or("");
                
                // Set up module
                match ProjectGenerator::setup_module(module_id, &config, &project_dir, app_handle).await {
                    Ok(_) => TaskResult {
                        task_id: task.id.clone(),
                        success: true,
                        message: format!("Successfully installed module {}", module_id),
                    },
                    Err(e) => TaskResult {
                        task_id: task.id.clone(),
                        success: false,
                        message: format!("Failed to install module {}: {}", module_id, e),
                    },
                }
            },
            "cleanup" => {
                // Perform cleanup operations
                match ProjectGenerator::cleanup_project(&config, &project_dir, app_handle).await {
                    Ok(_) => TaskResult {
                        task_id: task.id.clone(),
                        success: true,
                        message: "Successfully completed project cleanup".to_string(),
                    },
                    Err(e) => TaskResult {
                        task_id: task.id.clone(),
                        success: false,
                        message: format!("Failed to clean up project: {}", e),
                    },
                }
            },
            _ => TaskResult {
                task_id: task.id.clone(),
                success: false,
                message: format!("Unknown task type: {}", task_type),
            },
        }
    }
    
    // Framework setup implementation
    async fn setup_framework(
        config: &crate::commands::project::ProjectConfig,
        project_dir: &Path,
        app_handle: AppHandle
    ) -> Result<(), String> {
        // Get framework details
        let framework = get_framework(&config.framework).await?;
        
        // Prepare CLI arguments
        let cmd_name = framework.cli.base_command.clone();
        let mut cmd_args = Vec::new();
        
        // Add flag arguments
        for (arg_name, arg_value) in &framework.cli.arguments {
            if let Some(arg_obj) = arg_value.as_object() {
                if let Some(flag) = arg_obj.get("flag").and_then(|f| f.as_str()) {
                    // Check if the argument is enabled
                    let enabled = match arg_name.as_str() {
                        "typescript" => config.options.typescript,
                        "eslint" => config.options.eslint,
                        "app_router" => config.options.app_router,
                        _ => {
                            if let Some(default) = arg_obj.get("default").and_then(|d| d.as_bool()) {
                                default
                            } else {
                                false
                            }
                        }
                    };
                    
                    if enabled {
                        cmd_args.push(flag);
                    }
                }
            }
        }
        
        // For position-based arguments
        for (_arg_name, arg_value) in &framework.cli.arguments {
            if let Some(arg_obj) = arg_value.as_object() {
                if let (Some(position), Some(value)) = (
                    arg_obj.get("position").and_then(|p| p.as_u64()),
                    arg_obj.get("value").and_then(|v| v.as_str())
                ) {
                    // Ensure cmd_args has enough space
                    while cmd_args.len() < position as usize {
                        cmd_args.push("");
                    }
                    
                    // Insert the value at the specified position
                    cmd_args[position as usize - 1] = value;
                }
            }
        }
        
        // Add project name as a positional argument
        cmd_args.push(&config.name);
        
        // Log what we're about to do
        app_handle.emit("log-message", format!("Setting up framework with command: {} {}", cmd_name, cmd_args.join(" "))).unwrap();
        
        // Execute the command with reasonable timeout
        let cmd_result = ProjectGenerator::execute_command(&cmd_name, &cmd_args, Path::new(&config.path)).await?;
        
        // Ensure the command completed successfully
        if !cmd_result.success {
            return Err(format!("Framework setup failed: {}", cmd_result.stderr));
        }
        
        // Additional processing if needed
        if framework.cli.interactive {
            // Handle interactive command if needed
        }
        
        // Return success
        Ok(())
    }
    
    // Directory structure creation
    async fn create_directory_structure(
        config: &crate::commands::project::ProjectConfig,
        project_dir: &Path,
        app_handle: AppHandle
    ) -> Result<(), String> {
        // Get framework details
        let framework = get_framework(&config.framework).await?;
        
        // Create enforced directories
        if framework.directory_structure.enforced {
            for dir in &framework.directory_structure.directories {
                let dir_path = project_dir.join(dir);
                if !dir_path.exists() {
                    app_handle.emit("log-message", format!("Creating directory: {}", dir_path.display())).unwrap();
                    
                    if let Err(e) = fs::create_dir_all(&dir_path) {
                        app_handle.emit("log-message", format!("Failed to create directory: {}", e)).unwrap();
                        return Err(format!("Failed to create directory '{}': {}", dir_path.display(), e));
                    }
                }
            }
        }
        
        Ok(())
    }
    
    // Module setup implementation
    async fn setup_module(
        module_id: &str,
        config: &crate::commands::project::ProjectConfig,
        project_dir: &Path,
        app_handle: AppHandle
    ) -> Result<(), String> {
        // Get module details
        let all_modules = get_modules().await?;
        let module = all_modules.iter()
            .find(|m| m.id == module_id)
            .ok_or_else(|| format!("Module not found: {}", module_id))?;
        
        // Log
        app_handle.emit("log-message", format!("Setting up module: {}", module.name)).unwrap();
        
        // Ensure that package.json exists if needed for npm operations
        let package_json_path = project_dir.join("package.json");
        if !package_json_path.exists() && !module.installation.commands.is_empty() {
            let has_npm_commands = module.installation.commands.iter()
                .any(|cmd| cmd.starts_with("npm") || cmd.starts_with("npx"));
                
            if has_npm_commands {
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
                    app_handle.emit("log-message", format!("Warning: Failed to create package.json: {}", e)).unwrap();
                } else {
                    // Allow time for the file system to register the new file
                    sleep(Duration::from_millis(500)).await;
                }
            }
        }
        
        // Process each command
        for (i, cmd) in module.installation.commands.iter().enumerate() {
            // Update progress
            app_handle.emit("task-progress", format!("Running command {}/{}", i+1, module.installation.commands.len())).unwrap();
            
            // Parse the command
            let parts: Vec<&str> = cmd.split_whitespace().collect();
            if parts.is_empty() {
                continue;
            }
            
            let cmd_name = parts[0];
            let cmd_args = &parts[1..];
            
            // Add retry logic for commands that might fail due to timing issues
            let max_retries = 3;
            let mut success = false;
            
            for attempt in 1..=max_retries {
                match ProjectGenerator::execute_command(cmd_name, cmd_args, project_dir).await {
                    Ok(result) => {
                        if result.success {
                            success = true;
                            break;
                        } else {
                            let error_msg = format!("Command failed (attempt {}/{}): {}", attempt, max_retries, result.stderr);
                            app_handle.emit("log-message", &error_msg).unwrap();
                            
                            if attempt == max_retries {
                                app_handle.emit("log-message", "All attempts failed, continuing with next command").unwrap();
                            } else {
                                // Wait longer between retries
                                sleep(Duration::from_secs(1)).await;
                            }
                        }
                    },
                    Err(e) => {
                        let error_msg = format!("Command execution error (attempt {}/{}): {}", attempt, max_retries, e);
                        app_handle.emit("log-message", &error_msg).unwrap();
                        
                        if attempt == max_retries {
                            app_handle.emit("log-message", "All attempts failed, continuing with next command").unwrap();
                        } else {
                            // Wait longer between retries
                            sleep(Duration::from_secs(1)).await;
                        }
                    }
                }
            }
            
            // If all retries failed but this is a critical command, we might want to fail the entire module setup
            if !success && (cmd.contains("npm install") || cmd.contains("npx") || cmd.contains("npm i")) {
                app_handle.emit("log-message", "Critical command failed after all retries").unwrap();
                // We'll still try the file operations, but log a warning
            }
            
            // Add a delay between commands to ensure file system consistency
            sleep(Duration::from_millis(500)).await;
        }
        
        // Process file operations
        for (i, op) in module.installation.file_operations.iter().enumerate() {
            // Update progress
            app_handle.emit("task-progress", format!("Applying file operation {}/{}", i+1, module.installation.file_operations.len())).unwrap();
            
            let file_path = project_dir.join(&op.path);
            
            // Ensure parent directory exists
            if let Some(parent) = file_path.parent() {
                if !parent.exists() {
                    if let Err(e) = fs::create_dir_all(parent) {
                        app_handle.emit("log-message", format!("Failed to create directory: {}", e)).unwrap();
                        // Continue despite error
                    }
                }
            }
            
            // Apply operation
            match op.operation.as_str() {
                "create" => {
                    // Check if file already exists before attempting to create
                    if file_path.exists() {
                        app_handle.emit("log-message", format!("File already exists, skipping: {}", file_path.display())).unwrap();
                    } else {
                        if let Err(e) = fs::write(&file_path, &op.content) {
                            app_handle.emit("log-message", format!("Failed to create file: {}", e)).unwrap();
                        } else {
                            app_handle.emit("log-message", format!("Created file: {}", file_path.display())).unwrap();
                        }
                    }
                },
                "modify" => {
                    if !file_path.exists() {
                        app_handle.emit("log-message", format!("File does not exist, cannot modify: {}", file_path.display())).unwrap();
                    } else {
                        if let Err(e) = modify_file(&file_path, &op.pattern, &op.replacement) {
                            app_handle.emit("log-message", format!("Failed to modify file: {}", e)).unwrap();
                        } else {
                            app_handle.emit("log-message", format!("Modified file: {}", file_path.display())).unwrap();
                        }
                    }
                },
                "modify_import" => {
                    if !file_path.exists() {
                        app_handle.emit("log-message", format!("File does not exist, cannot modify imports: {}", file_path.display())).unwrap();
                    } else {
                        if let Err(e) = modify_import(&file_path, &op.action, &op.import) {
                            app_handle.emit("log-message", format!("Failed to modify import: {}", e)).unwrap();
                        } else {
                            app_handle.emit("log-message", format!("Modified imports in: {}", file_path.display())).unwrap();
                        }
                    }
                },
                _ => {
                    app_handle.emit("log-message", format!("Unknown file operation: {}", op.operation)).unwrap();
                }
            }
            
            // Add a small delay between file operations
            sleep(Duration::from_millis(100)).await;
        }
        
        app_handle.emit("log-message", format!("Module {} setup completed", module.name)).unwrap();
        Ok(())
    }
    
    // Project cleanup implementation
    async fn cleanup_project(
        _config: &crate::commands::project::ProjectConfig,
        project_dir: &Path,
        app_handle: AppHandle
    ) -> Result<(), String> {
        // Perform any final cleanup operations here
        app_handle.emit("log-message", "Performing project cleanup").unwrap();
        
        // Example: Install dependencies if needed
        match ProjectGenerator::execute_command("npm", &["install"], project_dir).await {
            Ok(_) => app_handle.emit("log-message", "Installed dependencies").unwrap(),
            Err(e) => app_handle.emit("log-message", format!("Failed to install dependencies: {}", e)).unwrap(),
        }
        
        // Example: Format code
        match ProjectGenerator::execute_command("npm", &["run", "format"], project_dir).await {
            Ok(_) => app_handle.emit("log-message", "Formatted code").unwrap(),
            Err(e) => app_handle.emit("log-message", format!("Failed to format code: {}", e)).unwrap(),
        }
        
        Ok(())
    }
    
    // Execute a shell command with proper error handling and output capture
    async fn execute_command(
        command: &str,
        args: &[&str],
        working_dir: &Path
    ) -> Result<CommandResult, String> {
        use std::io::{BufRead, BufReader};
        use std::process::{Command, Stdio};
        
        let command_display = format!("{} {}", command, args.join(" "));
        println!("Executing command: {} in {}", command_display, working_dir.display());
        
        // Adjust command for platform if needed
        let platform_cmd = if (command == "npm" || command == "npx") && cfg!(windows) {
            format!("{}.cmd", command)
        } else {
            command.to_string()
        };
        
        // Create command
        let mut cmd = Command::new(&platform_cmd);
        cmd.args(args)
            .current_dir(working_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        
        // Set environment variables
        if let Ok(path) = std::env::var("PATH") {
            cmd.env("PATH", path);
        }
        
        // Force interactive mode for npm
        if command == "npm" || command == "npx" {
            cmd.env("CI", "false");
            cmd.env("NODE_ENV", "development");
        }
        
        // Execute with a timeout
        let spawn_result = tokio::task::spawn_blocking(move || {
            match cmd.spawn() {
                Ok(mut child) => {
                    let mut stdout_lines = Vec::new();
                    let mut stderr_lines = Vec::new();
                    
                    // Read stdout lines
                    if let Some(stdout) = child.stdout.take() {
                        let stdout_reader = BufReader::new(stdout);
                        for line in stdout_reader.lines() {
                            if let Ok(line) = line {
                                stdout_lines.push(line);
                            }
                        }
                    }
                    
                    // Read stderr lines
                    if let Some(stderr) = child.stderr.take() {
                        let stderr_reader = BufReader::new(stderr);
                        for line in stderr_reader.lines() {
                            if let Ok(line) = line {
                                stderr_lines.push(line);
                            }
                        }
                    }
                    
                    // Wait for process to complete
                    match child.wait() {
                        Ok(status) => {
                            let exit_code = status.code().unwrap_or(-1);
                            let success = status.success();
                            
                            CommandResult {
                                success,
                                stdout: stdout_lines.join("\n"),
                                stderr: stderr_lines.join("\n"),
                                exit_code,
                            }
                        },
                        Err(e) => {
                            CommandResult {
                                success: false,
                                stdout: stdout_lines.join("\n"),
                                stderr: format!("Failed to wait for command: {}", e),
                                exit_code: -1,
                            }
                        }
                    }
                },
                Err(e) => {
                    CommandResult {
                        success: false,
                        stdout: String::new(),
                        stderr: format!("Failed to execute command: {}", e),
                        exit_code: -1,
                    }
                }
            }
        }).await;
        
        match spawn_result {
            Ok(result) => {
                // Special handling for npm/npx commands - we need to ensure filesystem sync
                if command == "npm" || command == "npx" {
                    // Add a small delay for filesystem synchronization
                    sleep(Duration::from_secs(1)).await;
                }
                
                Ok(result)
            },
            Err(e) => Err(format!("Failed to execute command: {}", e)),
        }
    }
} 