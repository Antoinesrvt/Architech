//! Task management system for project generation
//! 
//! This module contains the task trait, task registry, and task types
//! used by the project generation system.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use async_trait::async_trait;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

// Re-export task modules
mod framework;
mod module;
mod directory;
mod cleanup;

pub use framework::FrameworkTask;
pub use module::ModuleTask;
pub use directory::DirectoryTask;
pub use cleanup::CleanupTask;

/// Context provided to tasks during execution
#[derive(Clone)]
pub struct TaskContext {
    /// The project ID
    pub project_id: String,
    /// The project directory path
    pub project_dir: Arc<Path>,
    /// The Tauri application handle for event emission
    pub app_handle: AppHandle,
    /// The project configuration
    pub config: Arc<crate::commands::project::ProjectConfig>,
}

/// Represents the result of a task execution
#[derive(Debug, Clone)]
pub struct TaskResult {
    /// The task ID
    pub task_id: String,
    /// Whether the task succeeded
    pub success: bool,
    /// A message describing the result
    pub message: String,
}

/// The state of a task
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TaskState {
    /// The task is waiting to be executed
    Pending,
    /// The task is currently executing
    Running,
    /// The task completed successfully
    Completed,
    /// The task failed
    Failed(String),
}

/// A task that can be executed during project generation
#[async_trait]
pub trait Task: Send + Sync {
    /// The unique identifier for this task
    fn id(&self) -> &str;
    
    /// A human-readable name for this task
    fn name(&self) -> &str;
    
    /// IDs of tasks that must complete before this task can run
    fn dependencies(&self) -> &[String];
    
    /// Execute the task
    async fn execute(&self, context: &TaskContext) -> Result<(), String>;
}

/// A factory function for creating tasks
pub type TaskFactory = Box<dyn Fn(TaskContext) -> Box<dyn Task> + Send + Sync>;

/// Registry for task types
pub struct TaskRegistry {
    factories: HashMap<String, TaskFactory>,
}

impl TaskRegistry {
    /// Create a new task registry
    pub fn new() -> Self {
        let mut registry = Self {
            factories: HashMap::new(),
        };
        
        // Register built-in task types
        registry.register_defaults();
        
        registry
    }
    
    /// Register a task factory
    pub fn register<F>(&mut self, task_type: &str, factory: F)
    where
        F: Fn(TaskContext) -> Box<dyn Task> + Send + Sync + 'static,
    {
        self.factories.insert(task_type.to_string(), Box::new(factory));
    }
    
    /// Create a task from a task type
    pub fn create_task(&self, task_type: &str, context: TaskContext) -> Option<Box<dyn Task>> {
        self.factories.get(task_type).map(|factory| factory(context))
    }
    
    /// Register the default task types
    fn register_defaults(&mut self) {
        self.register("framework", |context| {
            Box::new(FrameworkTask::new(context))
        });
        
        self.register("module", |context| {
            Box::new(ModuleTask::new(context, "default".to_string()))
        });
        
        self.register("cleanup", |context| {
            Box::new(CleanupTask::new(context))
        });
    }
}

/// Task executor that manages task execution with dependencies
pub struct TaskExecutor {
    context: TaskContext,
    tasks: HashMap<String, Box<dyn Task>>,
    state: Arc<Mutex<HashMap<String, TaskState>>>,
}

impl TaskExecutor {
    /// Create a new task executor
    pub fn new(context: TaskContext, tasks: Vec<Box<dyn Task>>) -> Self {
        let mut task_map = HashMap::new();
        let mut state_map = HashMap::new();
        
        for task in tasks {
            let id = task.id().to_string();
            state_map.insert(id.clone(), TaskState::Pending);
            task_map.insert(id, task);
        }
        
        Self {
            context,
            tasks: task_map,
            state: Arc::new(Mutex::new(state_map)),
        }
    }
    
    /// Execute all tasks, respecting dependencies
    pub async fn execute_all(&self) -> Result<Vec<TaskResult>, String> {
        use futures::future::join_all;
        use tokio::sync::Semaphore;
        
        let mut results = Vec::new();
        let max_concurrent_tasks = 4; // Configurable
        let semaphore = Arc::new(Semaphore::new(max_concurrent_tasks));
        
        // Find all root tasks (no dependencies)
        let mut ready_tasks = self.find_ready_tasks().await;
        let mut pending_tasks: HashMap<String, Vec<String>> = HashMap::new();
        
        // Build dependency map for non-ready tasks
        for (id, task) in &self.tasks {
            if !ready_tasks.contains(id) {
                for dep in task.dependencies() {
                    pending_tasks
                        .entry(dep.to_string())
                        .or_default()
                        .push(id.clone());
                }
            }
        }
        
        // Process tasks until all are complete or we can't make progress
        let mut iteration_count = 0;
        while !ready_tasks.is_empty() {
            iteration_count += 1;
            log::info!("Starting iteration {} with {} ready tasks", iteration_count, ready_tasks.len());
            
            let task_futures = ready_tasks
                .into_iter()
                .map(|id| {
                    let task = self.tasks.get(&id).unwrap();
                    let sem_permit = semaphore.clone().acquire_owned();
                    let task_id = id.clone();
                    let state = self.state.clone();
                    let context = &self.context;
                    let _pending_map = pending_tasks.clone();
                    
                    async move {
                        let _permit = sem_permit.await.unwrap();
                        
                        // Update state to running
                        {
                            let mut state_map = state.lock().await;
                            state_map.insert(task_id.clone(), TaskState::Running);
                        }
                        
                        // Execute the task
                        let result = task.execute(context).await;
                        
                        // Update state based on result
                        let (new_state, message) = match result {
                            Ok(()) => (TaskState::Completed, format!("Task {} completed successfully", task.name())),
                            Err(e) => (TaskState::Failed(e.clone()), e),
                        };
                        
                        log::info!("Task {} finished with state: {:?}", task_id, new_state);
                        
                        {
                            let mut state_map = state.lock().await;
                            state_map.insert(task_id.clone(), new_state.clone());
                        }
                        
                        TaskResult {
                            task_id,
                            success: matches!(new_state, TaskState::Completed),
                            message,
                        }
                    }
                })
                .collect::<Vec<_>>();
            
            // Wait for all current tasks to complete
            let batch_results = join_all(task_futures).await;
            results.extend(batch_results);
            
            // Find tasks that are now ready to execute
            ready_tasks = self.find_ready_tasks().await;
            
            // Check if we're making progress
            let can_progress = self.can_make_progress().await;
            if ready_tasks.is_empty() && !can_progress {
                // Break early if we can't make progress and no ready tasks
                log::warn!("No more ready tasks and can't make progress, breaking execution loop");
                break;
            }
        }
        
        // Check the final state to determine what happened
        let state_map = self.state.lock().await;
        
        // Count tasks by state
        let mut pending_count = 0;
        let mut completed_count = 0;
        let mut failed_count = 0;
        let mut failed_tasks = Vec::new();
        
        for (id, state) in state_map.iter() {
            match state {
                TaskState::Pending => pending_count += 1,
                TaskState::Completed => completed_count += 1,
                TaskState::Failed(err) => {
                    failed_count += 1;
                    failed_tasks.push(format!("{} ({})", id, err));
                },
                _ => {}
            }
        }
        
        log::info!("Final task state: {} completed, {} failed, {} pending", 
                  completed_count, failed_count, pending_count);
        
        // If we still have pending tasks, check if it's due to failed dependencies or a cycle
        if pending_count > 0 {
            // Find pending tasks with failed dependencies for better error reporting
            let pending_with_failed_deps: Vec<(String, Vec<String>)> = self.tasks.iter()
                .filter(|(id, task)| {
                    matches!(state_map.get(*id), Some(TaskState::Pending)) && 
                    task.dependencies().iter().any(|dep| {
                        matches!(state_map.get(dep), Some(TaskState::Failed(_)))
                    })
                })
                .map(|(id, task)| {
                    let failed_deps: Vec<String> = task.dependencies().iter()
                        .filter(|dep| matches!(state_map.get(*dep), Some(TaskState::Failed(_))))
                        .map(|s| s.to_string())
                        .collect();
                    (id.clone(), failed_deps)
                })
                .collect();
            
            if !pending_with_failed_deps.is_empty() {
                // This is not a cycle, it's a cascade failure due to a prerequisite task failing
                let mut error_msg = String::from("Execution halted because some tasks couldn't run due to failed dependencies:\n");
                
                for (task_id, deps) in pending_with_failed_deps {
                    let task_name = self.tasks.get(&task_id)
                        .map(|t| t.name())
                        .unwrap_or("Unknown");
                    
                    error_msg.push_str(&format!("  - Task '{}' ({}) is pending because the following dependencies failed:\n", 
                                              task_name, task_id));
                    
                    for dep in deps {
                        let dep_name = self.tasks.get(&dep)
                            .map(|t| t.name())
                            .unwrap_or("Unknown");
                            
                        let failure_reason = state_map.get(&dep)
                            .and_then(|s| if let TaskState::Failed(reason) = s { Some(reason) } else { None })
                            .map_or("Unknown reason", |r| r.as_str());
                            
                        error_msg.push_str(&format!("    - '{}' ({}) failed: {}\n", dep_name, dep, failure_reason));
                    }
                }
                
                return Err(error_msg);
            }
            
            // If we have pending tasks but no failed dependencies, it's a cycle
            let mut pending_tasks: Vec<String> = state_map
                .iter()
                .filter(|(_, state)| matches!(state, TaskState::Pending))
                .map(|(id, _)| id.clone())
                .collect();
            
            if !pending_tasks.is_empty() {
                // Find and print dependency relationships for better debugging
                let mut cycle_details = String::new();
                
                for task_id in &pending_tasks {
                    if let Some(task) = self.tasks.get(task_id) {
                        cycle_details.push_str(&format!("Task '{}' ({}) is pending with dependencies:\n", 
                                                     task.name(), task_id));
                        
                        for dep_id in task.dependencies() {
                            let dep_state = state_map.get(dep_id)
                                .map(|s| format!("{:?}", s))
                                .unwrap_or_else(|| "Missing".to_string());
                                
                            cycle_details.push_str(&format!("  - '{}' with state: {}\n", dep_id, dep_state));
                            
                            // Check for circular dependencies
                            if let Some(dep_task) = self.tasks.get(dep_id) {
                                if dep_task.dependencies().contains(task_id) {
                                    cycle_details.push_str(&format!("    CIRCULAR DEPENDENCY DETECTED: '{}' depends on '{}' and vice versa\n", 
                                                                 task_id, dep_id));
                                }
                            }
                        }
                    }
                }
                
                // Sort tasks for more consistent error reporting
                pending_tasks.sort();
                
                let error_msg = format!("Dependency cycle detected. The following tasks could not be executed:\n{}", cycle_details);
                log::error!("{}", error_msg);
                return Err(error_msg);
            }
        }
        
        // If there are failed tasks but we completed all we could, report it differently
        if failed_count > 0 {
            log::warn!("Some tasks failed during execution: {:?}", failed_tasks);
            // We still return Ok with results so the frontend can see what happened
            // This is handled separately in the state management
        }
        
        Ok(results)
    }
    
    /// Find tasks that are ready to execute (all dependencies satisfied)
    async fn find_ready_tasks(&self) -> Vec<String> {
        let state_map = self.state.lock().await;
        
        self.tasks
            .iter()
            .filter(|(id, task)| {
                // Task must be pending
                matches!(state_map.get(*id), Some(TaskState::Pending)) &&
                // All dependencies must be completed
                task.dependencies().iter().all(|dep| {
                    matches!(state_map.get(dep), Some(TaskState::Completed))
                })
            })
            .map(|(id, _)| id.clone())
            .collect()
    }
    
    /// Check if execution can continue or if we're stuck
    async fn can_make_progress(&self) -> bool {
        let state_map = self.state.lock().await;
        
        // Check if any task is ready to execute
        let ready_tasks = self.find_ready_tasks().await;
        if !ready_tasks.is_empty() {
            return true;
        }
        
        // Check if any task is currently running
        if state_map.values().any(|state| matches!(state, TaskState::Running)) {
            return true;
        }
        
        // Check if all tasks are either completed or failed
        let all_tasks_processed = state_map.values().all(|state| {
            matches!(state, TaskState::Completed) || matches!(state, TaskState::Failed(_))
        });
        
        if all_tasks_processed {
            // If all tasks are processed, we're done (no progress needed)
            return false;
        }
        
        // Check if we have pending tasks with failed dependencies
        let has_failed_dependencies = self.tasks.iter()
            .any(|(id, task)| {
                matches!(state_map.get(id), Some(TaskState::Pending)) && 
                task.dependencies().iter().any(|dep| {
                    matches!(state_map.get(dep), Some(TaskState::Failed(_)))
                })
            });
            
        if has_failed_dependencies {
            // If we have tasks that can't run because of failed dependencies,
            // that's not a cycle - it's a legitimate execution failure
            return false;
        }
        
        // If we have pending tasks but no ready tasks and no failed dependencies,
        // we might have a cycle - can't make progress
        let has_pending = state_map.values().any(|state| matches!(state, TaskState::Pending));
        
        if has_pending {
            log::warn!("Can't make progress: have pending tasks but no ready tasks and no failed dependencies");
            return false; // This suggests a circular dependency
        }
        
        // Default case - we can't make progress if we reach here
        false
    }
    
    /// Get the total number of tasks
    pub fn get_task_count(&self) -> usize {
        self.tasks.len()
    }
    
    /// Get the current state of all tasks
    pub async fn get_states(&self) -> HashMap<String, TaskState> {
        self.state.lock().await.clone()
    }
} 