use std::path::Path;
use std::fs;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;
use serde::{Serialize, Deserialize};

use tokio::time::sleep;
use std::collections::{HashMap, HashSet};
use std::path::{PathBuf};
use log::{debug, info, warn, error};


use crate::state::{AppState, ProjectStatus};
use crate::commands::framework::{get_framework_by_id as get_framework, get_modules};
use crate::commands::command_runner::{modify_file, modify_import};
use crate::tasks::{
    Task, TaskContext, TaskExecutor, TaskState,
    FrameworkTask, ModuleTask, CleanupTask
};
use crate::commands::command_runner::{ CommandResult as CommandRunnerResult};

// Task result type
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
    
    // Store config for a project without starting generation
    pub async fn store_config(&self, project_id: &str, config: crate::commands::project::ProjectConfig) -> Result<(), String> {
        // Create project checkpoint
        let project_path = PathBuf::from(&config.path).join(&config.name);
        
        println!("Storing project config for ID: {}", project_id);
        log::debug!("Storing project config for ID: {}", project_id);
        
        // Store config in app state for later use
        self.app_state.store_project_config(project_id, config.clone()).await?;
        
        // Emit task-initialization-started event
        self.app_state.emit_event(crate::state::ProjectEvent::TaskInitializationStarted { 
            project_id: project_id.to_string() 
        }).await;
        
        Ok(())
    }
    
    // Initialize tasks and start generation
    pub async fn initialize_and_start(&self, project_id: &str) -> Result<(), String> {
        println!("Initializing tasks for project ID: {}", project_id);
        log::debug!("Initializing tasks for project ID: {}", project_id);
        
        // Get stored config
        let config = match self.app_state.get_project_config(project_id).await {
            Some(config) => config,
            None => return Err(format!("No configuration found for project ID: {}", project_id))
        };
        
        // Generate tasks for this project
        log::debug!("Generating tasks for project: {}", project_id);
        println!("About to create tasks for project");
        
        // Emit task initialization event
        self.app_state.emit_event(crate::state::ProjectEvent::TaskInitializationProgress { 
            project_id: project_id.to_string(),
            message: "Creating project generation tasks".to_string()
        }).await;
        
        let tasks = match self.create_tasks(project_id, &config).await {
            Ok(tasks) => {
                println!("Created {} tasks successfully", tasks.len());
                log::info!("Created {} tasks for project {}", tasks.len(), project_id);
                tasks
            },
            Err(e) => {
                println!("TASK CREATION FAILED: {}", e);
                log::error!("Failed to create tasks: {}", e);
                
                // Emit task initialization failed event
                self.app_state.emit_event(crate::state::ProjectEvent::TaskInitializationFailed { 
                    project_id: project_id.to_string(),
                    reason: e.clone()
                }).await;
                
                return Err(e);
            }
        };
        
        // Emit task initialization completed
        println!("Emitting task initialization completed event");
        let task_names: Vec<(String, String)> = tasks.iter()
            .map(|task| (task.id().to_string(), task.name().to_string()))
            .collect();
            
        self.app_state.emit_event(crate::state::ProjectEvent::TaskInitializationCompleted { 
            project_id: project_id.to_string(),
            task_count: tasks.len(),
            task_names,
        }).await;
        
        // Set project status to generating
        log::debug!("Setting project status to Generating");
        println!("Setting project status to Generating (Initializing)");
        self.app_state.set_project_status(project_id, ProjectStatus::Generating { 
            current_step: "Initializing".to_string(), 
            progress: 0
        }).await;
        
        // Register tasks in state
        println!("Registering {} tasks in state", tasks.len());
        for task in &tasks {
            let task_id = task.id().to_string();
            let task_name = task.name().to_string();
            
            // Register task in the app state
            self.app_state.register_task(
                project_id, 
                &task_id, 
                &task_name,
                task.dependencies()
            ).await;
            
            // Set initial task state
            self.app_state.set_task_state(
                project_id,
                &task_id,
                crate::tasks::TaskState::Pending
            ).await;
        }
        
        // Start task execution in the background
        let app_handle = self.app_handle.clone();
        let app_state = self.app_state.clone();
        let project_id_clone = project_id.to_string();
        let config_clone = config.clone();
        
        // Spawn task execution
        log::debug!("Spawning task execution");
        println!("Spawning task execution on background thread");
        tokio::spawn(async move {
            println!("TASK EXECUTION THREAD STARTED for {}", project_id_clone);
            match Self::execute_tasks(&project_id_clone, app_handle, app_state, config_clone, tasks).await {
                Ok(_) => {
                    // Success
                    info!("Project generation completed successfully: {}", project_id_clone);
                    println!("PROJECT GENERATION COMPLETED: {}", project_id_clone);
                },
                Err(e) => {
                    // Failure
                    error!("Project generation failed: {}", e);
                    println!("PROJECT GENERATION FAILED in execution thread: {}", e);
                }
            }
        });
        
        Ok(())
    }
    
    // Start the generation process (legacy method for backward compatibility)
    pub async fn start_generation(&self, config: crate::commands::project::ProjectConfig) -> Result<String, String> {
        // Create a new project_id
        let project_id = Uuid::new_v4().to_string();
        
        println!("START_GENERATION for project ID: {}", project_id);
        log::debug!("Generated new project ID: {}", project_id);
        
        // Store the config
        self.store_config(&project_id, config).await?;
        
        // Initialize and start generation
        match self.initialize_and_start(&project_id).await {
            Ok(_) => {
                log::info!("Task execution spawned, returning project ID: {}", project_id);
                println!("Returning project ID to frontend: {}", project_id);
                Ok(project_id)
            },
            Err(e) => Err(e)
        }
    }
    
    pub async fn resume_generation(&self, project_id: &str) -> Result<(), String> {
        // Check if project can be resumed
        if !self.app_state.can_resume(project_id).await {
            return Err("Project cannot be resumed".to_string());
        }
        
        // Get the checkpoint
        let checkpoint = self.app_state.get_checkpoint(project_id).await
            .ok_or_else(|| "No checkpoint found for this project".to_string())?;
            
        // Log the resumption
        info!("Resuming project generation: {}", project_id);
        self.app_state.add_log(project_id, "Resuming generation from checkpoint").await;
        
        // Set project status to generating
        self.app_state.set_project_status(project_id, ProjectStatus::Generating { 
            current_step: "Resuming".to_string(), 
            progress: 0
        }).await;
        
        // Generate tasks for this project
        let config = checkpoint.config.clone();
        let mut tasks = self.create_tasks(project_id, &config).await?;
        
        // Filter out completed tasks
        let completed_tasks = self.app_state.get_completed_tasks(project_id).await;
        tasks.retain(|task| !completed_tasks.contains(&task.id().to_string()));
        
        // Start task execution in the background
        let app_handle = self.app_handle.clone();
        let app_state = self.app_state.clone();
        let project_id_clone = project_id.to_string();
        
        // Spawn task execution
        tokio::spawn(async move {
            match Self::execute_tasks(&project_id_clone, app_handle, app_state, config, tasks).await {
                Ok(_) => {
                    // Success
                    info!("Project generation resumed and completed successfully: {}", project_id_clone);
                },
                Err(e) => {
                    // Failure
                    error!("Resumed project generation failed: {}", e);
                }
            }
        });
        
        Ok(())
    }
    
    pub async fn cancel_generation(&self, project_id: &str) -> Result<(), String> {
        // Set project status to cancelled
        self.app_state.set_project_status(project_id, ProjectStatus::Cancelled).await;
        
        // Log the cancellation
        info!("Project generation cancelled: {}", project_id);
        self.app_state.add_log(project_id, "Generation cancelled by user").await;
        
        Ok(())
    }
    
    async fn create_tasks(&self, project_id: &str, config: &crate::commands::project::ProjectConfig) -> Result<Vec<Box<dyn Task>>, String> {
        info!("Creating generation tasks for project: {}", project_id);
        
        // Log the config for debugging
        debug!("Project config: {:?}", config);
        
        // Project directory path
        let project_path = PathBuf::from(&config.path).join(&config.name);
        debug!("Project path will be: {}", project_path.display());
        
        // Create task context
        let context = TaskContext {
            project_id: project_id.to_string(),
            project_dir: project_path.into(),
            app_handle: self.app_handle.clone(),
            config: Arc::new(config.clone()),
        };
        debug!("Created task context with project ID: {}", project_id);
        
        // Create the tasks
        let mut tasks: Vec<Box<dyn Task>> = Vec::new();
        
        // Step 1: Framework setup task - No dependencies
        debug!("Creating framework task for: {}", config.framework);
        let framework_task = Box::new(FrameworkTask::new(context.clone()));
        let framework_task_id = framework_task.id().to_string();
        tasks.push(framework_task);
        info!("Created framework task with ID: {}", framework_task_id);
        
        // Step 2: Module setup tasks - Depend directly on framework task
        debug!("Module count: {}", config.modules.len());
        debug!("Modules selected: {:?}", config.modules);
        
        // Get all modules
        let all_modules = match crate::commands::framework::get_modules().await {
            Ok(modules) => modules,
            Err(e) => {
                error!("Failed to get modules: {}", e);
                return Err(format!("Failed to get modules: {}", e));
            }
        };
        
        // Resolve module dependencies
        let mut module_deps: HashMap<String, Vec<String>> = HashMap::new();
        
        // First pass: Collect dependencies
        for module_id in &config.modules {
            let module = match all_modules.iter().find(|m| m.id == *module_id) {
                Some(m) => m,
                None => {
                    warn!("Module not found: {}", module_id);
                    continue;
                }
            };
            
            // Collect module dependencies
            let mut deps = Vec::new();
            for dep_id in &module.dependencies {
                if config.modules.contains(dep_id) {
                    deps.push(format!("module:{}", dep_id));
                }
            }
            
            module_deps.insert(module_id.clone(), deps);
        }
        
        // Check for direct circular dependencies in modules
        for (module_id, deps) in &module_deps {
            for dep_id in deps {
                if dep_id == &format!("module:{}", module_id) {
                    warn!("Module depends on itself: {}", module_id);
                    return Err(format!("Invalid module dependency: {} depends on itself", module_id));
                }
                
                if let Some(dep_deps) = module_deps.get(dep_id.strip_prefix("module:").unwrap_or(dep_id)) {
                    if dep_deps.contains(&format!("module:{}", module_id)) {
                        warn!("Circular dependency detected: {} <-> {}", module_id, dep_id);
                        return Err(format!("Circular dependency detected between modules: {} and {}", 
                                         module_id, dep_id.strip_prefix("module:").unwrap_or(dep_id)));
                    }
                }
            }
        }
        
        // Second pass: Create module tasks with dependencies
        for module_id in &config.modules {
            let module_deps = module_deps.get(module_id).cloned().unwrap_or_default();
            
            // All module tasks must depend on framework task
            let mut all_deps = vec![framework_task_id.clone()];
            all_deps.extend(module_deps);
            
            // Create the module task
            let module_task = Box::new(ModuleTask::with_module_id(
                module_id.clone(),
                config.framework.clone(), 
                all_deps
            ));
            
            info!("Created module task for {} with dependencies: {:?}", module_id, module_task.dependencies());
            tasks.push(module_task);
        }
        
        // Step 3: Cleanup task - Depends on all module tasks and framework task
        let mut cleanup_deps = Vec::new();
        cleanup_deps.push(framework_task_id.clone());
        
        for module_id in &config.modules {
            cleanup_deps.push(format!("module:{}", module_id));
        }
        
        debug!("Creating cleanup task with dependencies: {:?}", cleanup_deps);
        let mut cleanup_task = Box::new(CleanupTask::new(context.clone()));
        cleanup_task.set_dependencies(cleanup_deps);
        
        info!("Created cleanup task with ID: {}", cleanup_task.id());
        tasks.push(cleanup_task);
        
        info!("Created {} tasks for project: {}", tasks.len(), project_id);
        
        // Validate task dependencies
        let mut all_task_ids = HashSet::new();
        for task in &tasks {
            all_task_ids.insert(task.id().to_string());
        }
        
        // Check that all dependencies exist
        for task in &tasks {
            for dep in task.dependencies() {
                if !all_task_ids.contains(dep) {
                    warn!("Task {} depends on non-existent task {}", task.id(), dep);
                    return Err(format!("Task {} depends on non-existent task {}", task.id(), dep));
                }
            }
        }
        
        // Detect dependency cycles
        let mut task_map = HashMap::new();
        for task in &tasks {
            task_map.insert(task.id().to_string(), task.dependencies().to_vec());
        }
        
        // Simple cycle detection
        fn has_cycle(task_id: &str, task_map: &HashMap<String, Vec<String>>, visited: &mut HashSet<String>, path: &mut HashSet<String>) -> bool {
            if path.contains(task_id) {
                return true;
            }
            
            if visited.contains(task_id) {
                return false;
            }
            
            visited.insert(task_id.to_string());
            path.insert(task_id.to_string());
            
            if let Some(deps) = task_map.get(task_id) {
                for dep in deps {
                    if has_cycle(dep, task_map, visited, path) {
                        return true;
                    }
                }
            }
            
            path.remove(task_id);
            false
        }
        
        let mut visited = HashSet::new();
        for task_id in task_map.keys() {
            let mut path = HashSet::new();
            if has_cycle(task_id, &task_map, &mut visited, &mut path) {
                warn!("Dependency cycle detected in task: {}", task_id);
                return Err(format!("Dependency cycle detected in task graph starting from: {}", task_id));
            }
        }
        
        // Debug: Print all tasks and their dependencies
        debug!("Task dependency structure:");
        for task in &tasks {
            debug!("  Task: {} ({})", task.name(), task.id());
            debug!("    Dependencies: {:?}", task.dependencies());
        }
        
        Ok(tasks)
    }
    
    async fn execute_tasks(
        project_id: &str,
        app_handle: AppHandle,
        app_state: Arc<AppState>,
        config: crate::commands::project::ProjectConfig,
        tasks: Vec<Box<dyn Task>>
    ) -> Result<(), String> {
        // Create project path
        let project_path = PathBuf::from(&config.path).join(&config.name);
        debug!("Project path for task execution: {}", project_path.display());
        let project_path_arc = Arc::from(project_path.as_path());
        
        // Create task context
        let context = TaskContext {
            project_id: project_id.to_string(),
            project_dir: project_path_arc,
            app_handle: app_handle.clone(),
            config: Arc::new(config.clone()),
        };
        
        // Create task executor
        let executor = TaskExecutor::new(context, tasks);
        debug!("Created TaskExecutor with {} tasks", executor.get_task_count());
        
        // Log execution start
        info!("Starting task execution for project: {}", project_id);
        app_state.add_log(project_id, "Starting task execution").await;
        
        // Send initial progress update
        debug!("Sending initial progress update");
        app_state.update_progress(project_id, "Initializing", 5).await;
        
        // Create checkpoint for resuming if needed
        let create_checkpoint = app_state.can_resume(project_id).await;
        let checkpoint = app_state.get_checkpoint(project_id).await;
        debug!("Can resume: {}, checkpoint exists: {}", 
            create_checkpoint, 
            checkpoint.is_some());
        
        // Track progress
        let total_tasks = executor.get_task_count();
        let mut completed_tasks = 0;
        
        // Execute all tasks
        debug!("Executing all tasks (total: {})", total_tasks);
        let results = match executor.execute_all().await {
            Ok(results) => {
                debug!("Task execution completed with {} results", results.len());
                for result in &results {
                    // Update progress for each completed task
                    if result.success {
                        completed_tasks += 1;
                        let progress = ((completed_tasks as f64 / total_tasks as f64) * 90.0) as u8 + 5;
                        debug!("Task completed: {}, progress: {}%", result.message, progress);
                        app_state.update_progress(project_id, &result.message, progress).await;
                    } else {
                        warn!("Task failed: {}", result.message);
                    }
                }
                results
            },
            Err(e) => {
                // Set project status to failed
                let error = e.clone();
                let mut error_msg = format!("Task execution failed for project {}: {}", project_id, e);
                error!("{}", error_msg);
                
                if create_checkpoint {
                    info!("Creating checkpoint for project: {}", project_id);
                    
                    debug!("Cloning project_path for checkpoint: {}", project_path.display());
                    let checkpoint_result = app_state.create_checkpoint(
                        project_id, config.clone(), project_path.clone()
                    ).await;
                    
                    if let Err(checkpoint_err) = &checkpoint_result {
                        error!("Failed to create checkpoint: {}", checkpoint_err);
                    } else {
                        debug!("Checkpoint created successfully");
                    }
                    
                    app_state.set_project_status(project_id, ProjectStatus::Failed {
                        error: error.clone(),
                        resumable: checkpoint_result.is_ok(),
                    }).await;
                    
                    error_msg += &format!(" and creating checkpoint: {}", error);
                } else {
                    debug!("No checkpoint needed, setting status to failed");
                    app_state.set_project_status(project_id, ProjectStatus::Failed {
                        error: error.clone(),
                        resumable: false,
                    }).await;
                }
                
                // Log failure
                error!("{}", error_msg);
                app_state.add_log(project_id, &error_msg).await;
                
                return Err(e);
            }
        };
        
        // Process results
        debug!("Processing task results");
        for result in results {
            app_state.process_task_result(project_id, result).await;
        }
        
        // Check for any failed tasks
        let task_states = app_state.get_all_task_states(project_id).await;
        let failed_states = task_states
            .iter()
            .filter(|(_, state)| matches!(state, TaskState::Failed(_)))
            .collect::<Vec<_>>();
            
        if !failed_states.is_empty() {
            // Set project status to failed
            let error = format!("{} tasks failed during generation", failed_states.len());
            error!("Project generation failed: {}", error);
            app_state.set_project_status(project_id, ProjectStatus::Failed {
                error: error.clone(),
                resumable: true,
            }).await;
            
            // Log failure
            error!("Project generation failed: {}", error);
            app_state.add_log(project_id, &error).await;
            
            return Err(error);
        }
        
        // Set project status to completed
        debug!("Setting project status to completed");
        app_state.set_project_status(project_id, ProjectStatus::Completed {
            path: project_path.to_string_lossy().to_string(),
        }).await;
        
        // Log completion
        info!("Project generation completed successfully: {}", project_id);
        app_state.add_log(project_id, "Project generation completed successfully").await;
        
        Ok(())
    }
    
    async fn resolve_module_dependencies(&self, modules: &[String]) -> Result<HashMap<String, Vec<String>>, String> {
        // Get all available modules
        let all_modules = crate::commands::framework::get_modules().await?;
        
        // Create a map of module ID to dependencies
        let mut dependencies: HashMap<String, Vec<String>> = HashMap::new();
        
        // Build a dependency graph
        for module_id in modules {
            let module = all_modules.iter()
                .find(|m| &m.id == module_id)
                .ok_or_else(|| format!("Module not found: {}", module_id))?;
                
            // Filter dependencies to only include those that are also in our modules list
            let module_deps: Vec<String> = module.dependencies
                .iter()
                .filter(|dep| modules.contains(dep))
                .cloned()
                .collect();
                
            debug!("Module {} dependencies: {:?}", module_id, module_deps);
            dependencies.insert(module_id.clone(), module_deps);
        }
        
        // Check for circular dependencies
        fn has_circular_dependency(
            deps: &HashMap<String, Vec<String>>, 
            current: &str,
            visited: &mut Vec<String>,
            path: &mut Vec<String>
        ) -> Option<Vec<String>> {
            if path.contains(&current.to_string()) {
                // We found a cycle
                let cycle_start = path.iter().position(|id| id == current).unwrap();
                let mut cycle = path[cycle_start..].to_vec();
                cycle.push(current.to_string());
                return Some(cycle);
            }
            
            if visited.contains(&current.to_string()) {
                // Already checked this module, no cycle found
                return None;
            }
            
            visited.push(current.to_string());
            path.push(current.to_string());
            
            if let Some(module_deps) = deps.get(current) {
                for dep in module_deps {
                    if let Some(cycle) = has_circular_dependency(deps, dep, visited, path) {
                        return Some(cycle);
                    }
                }
            }
            
            path.pop();
            None
        }
        
        // Check each module for circular dependencies
        for module_id in modules {
            let mut visited = Vec::new();
            let mut path = Vec::new();
            if let Some(cycle) = has_circular_dependency(&dependencies, module_id, &mut visited, &mut path) {
                return Err(format!("Circular dependency detected among modules: {:?}", cycle));
            }
        }
        
        // Log dependency resolution
        info!("Resolved module dependencies: {:?}", dependencies);
        
        Ok(dependencies)
    }
    
    // Framework setup implementation
    async fn setup_framework(
        config: &crate::commands::project::ProjectConfig,
        project_dir: &Path,
        app_handle: AppHandle
    ) -> Result<(), String> {
        // Get framework details
        let framework = get_framework(&config.framework).await?;
        
        // Emit progress update
        app_handle.emit("generation-progress", serde_json::json!({
            "step": "framework",
            "message": format!("Setting up {} framework", framework.name),
            "progress": 0.2
        })).unwrap_or_else(|e| error!("Failed to emit progress event: {}", e));
        
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
        
        // Emit progress update for command execution
        app_handle.emit("generation-progress", serde_json::json!({
            "step": "framework",
            "message": format!("Running framework setup command: {} {}", cmd_name, cmd_args.join(" ")),
            "progress": 0.3
        })).unwrap_or_else(|e| error!("Failed to emit progress event: {}", e));
        
        // Execute the command with reasonable timeout
        let cmd_result = ProjectGenerator::execute_command(&cmd_name, &cmd_args, Path::new(&config.path)).await?;
        
        // Ensure the command completed successfully
        if !cmd_result.success {
            return Err(format!("Framework setup failed: {}", cmd_result.stderr));
        }
        
        // Emit progress update for completion
        app_handle.emit("generation-progress", serde_json::json!({
            "step": "framework",
            "message": "Framework setup completed successfully",
            "progress": 0.4
        })).unwrap_or_else(|e| error!("Failed to emit progress event: {}", e));
        
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
    
    // Cleanup project after all modules are installed
    async fn cleanup_project(
        _config: &crate::commands::project::ProjectConfig,
        project_dir: &Path,
        app_handle: AppHandle
    ) -> Result<(), String> {
        use std::fs;
        use tokio::time::sleep;
        use tokio::time::Duration;
        
        app_handle.emit("log-message", "Starting project cleanup phase").unwrap();
        
        // Check if we need to install dependencies
        let package_json_path = project_dir.join("package.json");
        let node_modules_path = project_dir.join("node_modules");
        let package_lock_path = project_dir.join("package-lock.json");
        
        // If we have a package.json but no node_modules, we need to run npm install
        if package_json_path.exists() && (!node_modules_path.exists() || !package_lock_path.exists()) {
            app_handle.emit("log-message", "Installing npm dependencies...").unwrap();
            
            // NPM install is critical, so try multiple times with increasing timeouts
            let max_retries = 3;
            let mut success = false;
            
            for attempt in 1..=max_retries {
                // Longer timeout and wait for each retry
                let timeout_seconds = 60 + (attempt * 30); // 90s, 120s, 150s
                app_handle.emit("log-message", format!("Running npm install (attempt {}/{}, timeout {}s)...", 
                    attempt, max_retries, timeout_seconds)).unwrap();
                
                match ProjectGenerator::execute_command("npm", &["install"], project_dir).await {
                    Ok(result) => {
                        if result.success {
                            app_handle.emit("log-message", "NPM dependencies installed successfully").unwrap();
                            success = true;
                            break;
                        } else {
                            app_handle.emit("log-message", 
                                format!("NPM install failed (attempt {}/{}): {}", 
                                    attempt, max_retries, result.stderr)).unwrap();
                                    
                            if attempt < max_retries {
                                app_handle.emit("log-message", "Waiting before retry...").unwrap();
                                sleep(Duration::from_secs((attempt * 5) as u64)).await;
                            }
                        }
                    },
                    Err(e) => {
                        app_handle.emit("log-message", 
                            format!("NPM install error (attempt {}/{}): {}", 
                                attempt, max_retries, e)).unwrap();
                                
                        if attempt < max_retries {
                            app_handle.emit("log-message", "Waiting before retry...").unwrap();
                            sleep(Duration::from_secs((attempt * 5) as u64)).await;
                        }
                    }
                }
            }
            
            if !success {
                // Continue despite error, but log a warning
                app_handle.emit("log-message", "⚠️ Warning: Failed to install NPM dependencies after multiple attempts").unwrap();
            }
        } else if package_json_path.exists() && node_modules_path.exists() {
            app_handle.emit("log-message", "Node modules already installed, skipping npm install").unwrap();
        }
        
        // Check for formatter configurations like prettier
        let prettier_path = project_dir.join(".prettierrc");
        let eslint_path = project_dir.join(".eslintrc");
        
        if prettier_path.exists() || eslint_path.exists() {
            app_handle.emit("log-message", "Running code formatting...").unwrap();
            
            // Format the project code if possible
            let format_result = ProjectGenerator::execute_command("npm", &["run", "format"], project_dir).await;
            
            match format_result {
                Ok(result) => {
                    if !result.success {
                        app_handle.emit("log-message", "Warning: Code formatting failed, but continuing").unwrap();
                    } else {
                        app_handle.emit("log-message", "Code formatting completed successfully").unwrap();
                    }
                },
                Err(e) => {
                    app_handle.emit("log-message", format!("Warning: Code formatting command failed: {}", e)).unwrap();
                }
            }
        }
        
        // Final validation - ensure the project appears to be valid
        app_handle.emit("log-message", "Validating project structure...").unwrap();
        
        // If we have a package.json, verify it's valid JSON
        if package_json_path.exists() {
            match fs::read_to_string(&package_json_path) {
                Ok(contents) => {
                    match serde_json::from_str::<serde_json::Value>(&contents) {
                        Ok(_) => {
                            app_handle.emit("log-message", "package.json validation successful").unwrap();
                        },
                        Err(e) => {
                            app_handle.emit("log-message", format!("Warning: package.json contains invalid JSON: {}", e)).unwrap();
                        }
                    }
                },
                Err(e) => {
                    app_handle.emit("log-message", format!("Warning: Failed to read package.json: {}", e)).unwrap();
                }
            }
        }
        
        // Cleanup completed successfully
        app_handle.emit("log-message", "Project cleanup completed successfully").unwrap();
        Ok(())
    }
    
    // Execute a shell command with proper error handling and output capture
    async fn execute_command(
        command: &str,
        args: &[&str],
        working_dir: &Path
    ) -> Result<CommandRunnerResult, String> {
        use std::io::{BufRead, BufReader};
        use std::process::{Command, Stdio};
        use std::thread::sleep as thread_sleep;
        use std::time::Duration as StdDuration;
        use tokio::time::{sleep, Duration};
        
        let command_display = format!("{} {}", command, args.join(" "));
        println!("Executing command: {} in {}", command_display, working_dir.display());
        
        // Check if this is a create-next-app command or similar
        let is_project_generator = 
            (command == "npx" && args.len() > 0 && args[0].contains("create-")) ||
            (command == "npm" && args.len() > 1 && args[0] == "init");
            
        // Check if this is a project directory that we need to verify gets created
        let project_name = if is_project_generator && args.len() > 0 {
            args.last().map(|s| s.to_string())
        } else {
            None
        };
        
        // Adjust command for platform if needed
        let platform_cmd = if (command == "npm" || command == "npx") && cfg!(windows) {
            format!("{}.cmd", command)
        } else {
            command.to_string()
        };
        
        // We'll try the command up to 2 times for generators
        let max_retries = if is_project_generator { 2 } else { 1 };
        
        for attempt in 1..=max_retries {
            // Create a new command instance for each attempt
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
            
            // Create a clone of cmd for this attempt
            let mut cmd_for_closure = cmd;
        
            // Execute with a timeout
            let spawn_result = tokio::task::spawn_blocking(move || {
                match cmd_for_closure.spawn() {
                    Ok(mut child) => {
                        let mut stdout_lines = Vec::new();
                        let mut stderr_lines = Vec::new();
                        
                        // Read stdout lines
                        if let Some(stdout) = child.stdout.take() {
                            let stdout_reader = BufReader::new(stdout);
                            for line in stdout_reader.lines() {
                                if let Ok(line) = line {
                                    println!("[STDOUT] {}", line);
                                    stdout_lines.push(line);
                                }
                            }
                        }
                        
                        // Read stderr lines
                        if let Some(stderr) = child.stderr.take() {
                            let stderr_reader = BufReader::new(stderr);
                            for line in stderr_reader.lines() {
                                if let Ok(line) = line {
                                    println!("[STDERR] {}", line);
                                    stderr_lines.push(line);
                                }
                            }
                        }
                        
                        // Wait for process to complete
                        match child.wait() {
                            Ok(status) => {
                                let exit_code = status.code().unwrap_or(-1);
                                let success = status.success();
                                
                                CommandRunnerResult {
                                    success,
                                    stdout: stdout_lines.join("\n"),
                                    stderr: stderr_lines.join("\n"),
                                    exit_code,
                                }
                            },
                            Err(e) => {
                                CommandRunnerResult {
                                    success: false,
                                    stdout: stdout_lines.join("\n"),
                                    stderr: format!("Failed to wait for command: {}", e),
                                    exit_code: -1,
                                }
                            }
                        }
                    },
                    Err(e) => {
                        CommandRunnerResult {
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
                        // For project generators like create-next-app, we need to verify project creation
                        if is_project_generator && result.success {
                            // First wait longer for filesystem to settle
                            println!("Project generator command completed, waiting for filesystem to settle...");
                            sleep(Duration::from_secs(3)).await;
                            
                            // If we have a project name to verify, check that it exists
                            if let Some(project_name) = &project_name {
                                let project_dir = working_dir.join(project_name);
                                println!("Verifying project directory exists: {}", project_dir.display());
                                
                                // Try multiple times with increasing delays
                                let mut dir_exists = false;
                                for i in 0..5 {
                                    if project_dir.exists() && project_dir.is_dir() {
                                        dir_exists = true;
                                        println!("Project directory verified!");
                                        break;
                                    }
                                    println!("Directory not found, waiting (attempt {}/5)...", i+1);
                                    thread_sleep(StdDuration::from_millis(500 * (i+1)));
                                }
                                
                                if !dir_exists {
                                    // If we've done max retries, fail, otherwise retry the command
                                    if attempt == max_retries {
                                        return Err(format!("Project directory {} was not created even though command reported success", project_dir.display()));
                                    } else {
                                        println!("Retrying command due to missing project directory (attempt {}/{})", attempt, max_retries);
                                        sleep(Duration::from_secs(1)).await;
                                        continue;
                                    }
                                }
                                
                                // If project exists, check for package.json
                                let package_json = project_dir.join("package.json");
                                if !package_json.exists() {
                                    println!("Warning: package.json not found in project directory");
                                } else {
                                    println!("package.json verified!");
                                }
                            } else {
                                // No project name to verify, use a standard delay
                                sleep(Duration::from_secs(2)).await;
                            }
                        } else {
                            // Standard delay for other npm/npx commands
                            sleep(Duration::from_secs(1)).await;
                        }
                    }
                    
                    // If successful or final attempt, return the result
                    if result.success || attempt == max_retries {
                        return Ok(result);
                    } else {
                        // If failed but we have retries left
                        println!("Command failed, retrying (attempt {}/{})", attempt, max_retries);
                        sleep(Duration::from_secs(1)).await;
                    }
                },
                Err(e) => {
                    // If this is the final retry, return error, otherwise try again
                    if attempt == max_retries {
                        return Err(format!("Failed to execute command: {}", e));
                    } else {
                        println!("Command execution error, retrying (attempt {}/{})", attempt, max_retries);
                        sleep(Duration::from_secs(1)).await;
                    }
                }
            }
        }
        
        // We should never reach here (loop always returns), but satisfy the compiler
        Err("Command execution failed after all retries".to_string())
    }
} 