//! Task management system for project generation
//! 
//! This module contains the task trait, task registry, and task types
//! used by the project generation system.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::collections::HashSet;

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
            let framework_name = context.config.framework.clone();
            let id = format!("framework:{}", framework_name);
            Box::new(FrameworkTask::new(id, framework_name))
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
        use log::{debug, error, info, warn};
        
        let mut results = Vec::new();
        let max_concurrent_tasks = 4; // Configurable
        let semaphore = Arc::new(Semaphore::new(max_concurrent_tasks));
        
        // Find all root tasks (no dependencies)
        let mut ready_tasks = self.find_ready_tasks().await;
        info!("Initial ready tasks: {:?}", ready_tasks);
        
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
        
        info!("Dependency map: {:?}", pending_tasks);
        
        // Process tasks until all are complete or we can't make progress
        let mut iteration_count = 0;
        let mut completed_tasks = HashSet::new();
        let mut failed_tasks = HashSet::new(); // Track failed tasks to prevent infinite retries
        
        while !ready_tasks.is_empty() {
            iteration_count += 1;
            info!("Starting iteration {} with {} ready tasks", iteration_count, ready_tasks.len());
            debug!("Ready tasks: {:?}", ready_tasks);
            
            // Check for maximum iterations to prevent infinite loops
            if iteration_count > 10 {
                warn!("Reached maximum iterations (10), breaking to prevent infinite loop");
                break;
            }
            
            // Filter out previously failed tasks
            ready_tasks.retain(|task_id| !failed_tasks.contains(task_id));
            
            if ready_tasks.is_empty() {
                info!("No viable ready tasks remain after filtering out failed tasks");
                break;
            }
            
            let task_futures = ready_tasks
                .clone()
                .into_iter()
                .map(|id| {
                    let task = self.tasks.get(&id).unwrap();
                    let sem_permit = semaphore.clone().acquire_owned();
                    let task_id = id.clone();
                    let state = self.state.clone();
                    let context = &self.context;
                    
                    async move {
                        let _permit = sem_permit.await.unwrap();
                        
                        // Update state to running
                        {
                            let mut state_map = state.lock().await;
                            state_map.insert(task_id.clone(), TaskState::Running);
                            info!("Set task {} state to Running", task_id);
                        }
                        
                        // Execute the task
                        info!("Executing task: {}", task_id);
                        let result = task.execute(context).await;
                        
                        // Update state based on result
                        let (new_state, message, success) = match result {
                            Ok(()) => (TaskState::Completed, format!("Task {} completed successfully", task.name()), true),
                            Err(e) => (TaskState::Failed(e.clone()), e, false),
                        };
                        
                        info!("Task {} finished with state: {:?}", task_id, new_state);
                        
                        {
                            let mut state_map = state.lock().await;
                            state_map.insert(task_id.clone(), new_state.clone());
                            debug!("Updated task state in state map");
                        }
                        
                        TaskResult {
                            task_id,
                            success,
                            message,
                        }
                    }
                })
                .collect::<Vec<_>>();
            
            // Wait for all current tasks to complete
            let batch_results = join_all(task_futures).await;
            info!("Completed batch of {} tasks in iteration {}", batch_results.len(), iteration_count);
            
            // Mark completed tasks and add to results
            for result in batch_results {
                info!("Processing result for task {}: success={}", result.task_id, result.success);
                if result.success {
                    completed_tasks.insert(result.task_id.clone());
                } else {
                    failed_tasks.insert(result.task_id.clone());
                    warn!("Task {} failed: {}", result.task_id, result.message);
                }
                results.push(result.clone());
                
                // Check if any tasks are unlocked by this completion
                if let Some(dependents) = pending_tasks.get(&result.task_id) {
                    info!("Task {} has {} dependents", result.task_id, dependents.len());
                    
                    // For each dependent task, check if all its dependencies are now satisfied
                    for dependent_id in dependents {
                        debug!("Checking if task {} can now be executed", dependent_id);
                        let dependent_task = self.tasks.get(dependent_id).unwrap();
                        let deps_satisfied = dependent_task.dependencies().iter().all(|dep| {
                            completed_tasks.contains(dep)
                        });
                        
                        // If all dependencies are satisfied, add to ready tasks
                        if deps_satisfied {
                            info!("All dependencies for task {} are satisfied, adding to ready tasks", dependent_id);
                            ready_tasks.push(dependent_id.clone());
                        } else {
                            debug!("Not all dependencies for task {} are satisfied yet", dependent_id);
                        }
                    }
                }
            }
            
            // Check if we can make progress
            if ready_tasks.is_empty() && !self.can_make_progress().await {
                break;
            }
            
            // Remove already processed tasks from ready tasks to avoid duplicates
            ready_tasks.retain(|id| !completed_tasks.contains(id));
            debug!("After filtering, {} ready tasks remain", ready_tasks.len());
        }
        
        info!("Task execution completed with {} results", results.len());
        Ok(results)
    }
    
    /// Find tasks that are ready to be executed (all dependencies are satisfied)
    async fn find_ready_tasks(&self) -> Vec<String> {
        use log::{debug, info};
        
        // Get the state map to check task statuses
        let state_map = self.state.lock().await;
        let mut ready_tasks = Vec::new();
        
        // Check each task
        for (id, task) in &self.tasks {
            debug!("Checking if task {} is ready", id);
            
            // Skip tasks that are already completed or failed
            if let Some(state) = state_map.get(id) {
                match state {
                    TaskState::Completed => {
                        debug!("Task {} is already completed, skipping", id);
                        continue;
                    },
                    TaskState::Failed(_) => {
                        debug!("Task {} has failed, skipping", id);
                        continue;
                    },
                    TaskState::Running => {
                        debug!("Task {} is currently running, skipping", id);
                        continue;
                    },
                    TaskState::Pending => {
                        debug!("Task {} is pending", id);
                        // Continue checking dependencies
                    },
                }
            }
            
            // Check dependencies
            let mut all_deps_satisfied = true;
            for dep in task.dependencies() {
                debug!("Checking dependency {} for task {}", dep, id);
                
                // Check if the dependency is satisfied
                if let Some(dep_state) = state_map.get(dep) {
                    match dep_state {
                        TaskState::Completed => {
                            debug!("Dependency {} is completed", dep);
                            // This dependency is satisfied
                        },
                        _ => {
                            debug!("Dependency {} is not completed (state: {:?})", dep, dep_state);
                            all_deps_satisfied = false;
                            break;
                        },
                    }
                } else {
                    // Dependency not found in state map
                    debug!("Dependency {} not found in state map", dep);
                    all_deps_satisfied = false;
                    break;
                }
            }
            
            // If all dependencies are satisfied, this task is ready
            if all_deps_satisfied {
                info!("Task {} is ready for execution (all dependencies satisfied)", id);
                ready_tasks.push(id.clone());
            } else {
                debug!("Task {} is not ready (some dependencies not satisfied)", id);
            }
        }
        
        info!("Found {} ready tasks", ready_tasks.len());
        ready_tasks
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