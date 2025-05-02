//! Project state management module.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::fs;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tokio::sync::Mutex;
use tokio::sync::broadcast;
use log::{info, warn, error, debug};

use crate::tasks::{TaskState, TaskResult};

// Define TaskStatus enum for backward compatibility
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed(String),
    Skipped(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationTask {
    pub id: String,
    pub name: String, 
    pub description: String,
    pub status: TaskStatus,
    pub progress: f32,
    pub dependencies: Vec<String>,
}

/// Project generation status enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProjectStatus {
    /// Project is not currently being generated
    NotStarted,
    /// Project is being prepared for generation
    Preparing,
    /// Project is currently being generated
    Generating {
        /// The current step in the generation process
        current_step: String,
        /// The percentage of completion (0-100)
        progress: u8,
    },
    /// Project generation completed successfully
    Completed {
        /// Path to the generated project
        path: String,
    },
    /// Project generation failed
    Failed {
        /// The error message
        error: String,
        /// Whether the generation can be resumed
        resumable: bool,
    },
    /// Project generation was cancelled by the user
    Cancelled,
}

/// Project generation event
#[derive(Debug, Clone)]
pub enum ProjectEvent {
    /// Project generation started
    Started {
        /// Project ID
        project_id: String,
    },
    /// Project generation progress updated
    Progress {
        /// Project ID
        project_id: String,
        /// Current step
        step: String,
        /// Progress percentage (0-100)
        progress: u8,
    },
    /// Project generation completed
    Completed {
        /// Project ID
        project_id: String,
        /// Path to the generated project
        path: String,
    },
    /// Project generation failed
    Failed {
        /// Project ID
        project_id: String, 
        /// Error message
        error: String,
        /// Whether the generation can be resumed
        resumable: bool,
    },
    /// Project generation was cancelled by the user
    Cancelled {
        /// Project ID
        project_id: String,
    },
    /// Task state changed
    TaskStateChanged {
        /// Project ID
        project_id: String,
        /// Task ID
        task_id: String,
        /// New task state
        state: TaskState,
    },
    /// Log message
    LogMessage {
        /// Project ID
        project_id: String,
        /// Log message
        message: String,
    },
    /// Task initialization started
    TaskInitializationStarted {
        /// Project ID 
        project_id: String,
    },
    /// Task initialization progress
    TaskInitializationProgress {
        /// Project ID
        project_id: String,
        /// Progress message
        message: String,
    },
    /// Task initialization completed
    TaskInitializationCompleted {
        /// Project ID
        project_id: String,
        /// Number of tasks created
        task_count: usize,
        /// Task IDs and names (to create proper placeholders)
        task_names: Vec<(String, String)>,
    },
    /// Task initialization failed
    TaskInitializationFailed {
        /// Project ID
        project_id: String,
        /// Error reason
        reason: String,
    },
}

/// Project log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    /// Timestamp of the log entry
    pub timestamp: u64,
    /// Message content
    pub message: String,
}

impl LogEntry {
    /// Create a new log entry
    pub fn new(message: String) -> Self {
        Self {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            message,
        }
    }
}

/// Checkpoint data for resumable generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationCheckpoint {
    /// Project ID
    pub project_id: String,
    /// Configuration
    pub config: crate::commands::project::ProjectConfig,
    /// Completed tasks
    pub completed_tasks: Vec<String>,
    /// Path to the project
    pub project_path: PathBuf,
}

/// Application state
pub struct AppState {
    /// Project statuses
    projects: Mutex<HashMap<String, ProjectStatus>>,
    /// Project logs
    logs: Mutex<HashMap<String, Vec<LogEntry>>>,
    /// Task states
    task_states: Mutex<HashMap<String, HashMap<String, TaskState>>>,
    /// Task metadata 
    task_metadata: Mutex<HashMap<String, HashMap<String, GenerationTask>>>,
    /// Completed tasks (for resumable generation)
    completed_tasks: Mutex<HashMap<String, Vec<String>>>,
    /// Checkpoints for resumable generation
    checkpoints: Mutex<HashMap<String, GenerationCheckpoint>>,
    /// Project configs
    project_configs: Mutex<HashMap<String, crate::commands::project::ProjectConfig>>,
    /// Event broadcaster
    event_tx: broadcast::Sender<ProjectEvent>,
}

impl AppState {
    /// Create a new application state
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(100);
        Self {
            projects: Mutex::new(HashMap::new()),
            logs: Mutex::new(HashMap::new()),
            task_states: Mutex::new(HashMap::new()),
            task_metadata: Mutex::new(HashMap::new()),
            completed_tasks: Mutex::new(HashMap::new()),
            checkpoints: Mutex::new(HashMap::new()),
            project_configs: Mutex::new(HashMap::new()),
            event_tx: tx,
        }
    }
    
    /// Initialize the state
    pub async fn initialize(&self) -> Result<(), String> {
        // Create checkpoints directory if it doesn't exist
        let app_dir = self.get_app_data_dir()?;
        let checkpoints_dir = app_dir.join("checkpoints");
        
        if !checkpoints_dir.exists() {
            fs::create_dir_all(&checkpoints_dir)
                .map_err(|e| format!("Failed to create checkpoints directory: {}", e))?;
        }
        
        // Load any existing checkpoints
        self.load_checkpoints().await?;
        
        Ok(())
    }
    
    /// Get the app data directory
    fn get_app_data_dir(&self) -> Result<PathBuf, String> {
        let app_data_dir = dirs::data_dir()
            .ok_or_else(|| "Could not find app data directory".to_string())?
            .join("tauri-nextjs-template");
            
        if !app_data_dir.exists() {
            fs::create_dir_all(&app_data_dir)
                .map_err(|e| format!("Failed to create app data directory: {}", e))?;
        }
        
        Ok(app_data_dir)
    }
    
    /// Load checkpoints from disk
    async fn load_checkpoints(&self) -> Result<(), String> {
        let app_dir = self.get_app_data_dir()?;
        let checkpoints_dir = app_dir.join("checkpoints");
        
        if !checkpoints_dir.exists() {
            return Ok(());
        }
        
        let entries = fs::read_dir(&checkpoints_dir)
            .map_err(|e| format!("Failed to read checkpoints directory: {}", e))?;
            
        let mut checkpoints = self.checkpoints.lock().await;
        let mut projects = self.projects.lock().await;
        let mut completed = self.completed_tasks.lock().await;
        
        for entry in entries {
            if let Ok(entry) = entry {
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.ends_with(".json") {
                        let project_id = file_name.trim_end_matches(".json");
                        let checkpoint_path = checkpoints_dir.join(file_name);
                        
                        match fs::read_to_string(&checkpoint_path) {
                            Ok(content) => {
                                match serde_json::from_str::<GenerationCheckpoint>(&content) {
                                    Ok(checkpoint) => {
                                        // Add to checkpoints
                                        checkpoints.insert(project_id.to_string(), checkpoint.clone());
                                        
                                        // Add to completed tasks
                                        completed.insert(project_id.to_string(), checkpoint.completed_tasks.clone());
                                        
                                        // Add to projects as failed but resumable
                                        projects.insert(project_id.to_string(), ProjectStatus::Failed {
                                            error: "Project generation was interrupted".to_string(),
                                            resumable: true,
                                        });
                                        
                                        info!("Loaded checkpoint for project: {}", project_id);
                                    },
                                    Err(e) => {
                                        warn!("Failed to parse checkpoint file {}: {}", checkpoint_path.display(), e);
                                    }
                                }
                            },
                            Err(e) => {
                                warn!("Failed to read checkpoint file {}: {}", checkpoint_path.display(), e);
                            }
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Save a checkpoint to disk
    async fn save_checkpoint(&self, checkpoint: &GenerationCheckpoint) -> Result<(), String> {
        let app_dir = self.get_app_data_dir()?;
        let checkpoints_dir = app_dir.join("checkpoints");
        let checkpoint_path = checkpoints_dir.join(format!("{}.json", checkpoint.project_id));
        
        let content = serde_json::to_string_pretty(checkpoint)
            .map_err(|e| format!("Failed to serialize checkpoint: {}", e))?;
            
        fs::write(&checkpoint_path, content)
            .map_err(|e| format!("Failed to write checkpoint file: {}", e))?;
            
        Ok(())
    }
    
    /// Delete a checkpoint from disk
    async fn delete_checkpoint(&self, project_id: &str) -> Result<(), String> {
        let app_dir = self.get_app_data_dir()?;
        let checkpoints_dir = app_dir.join("checkpoints");
        let checkpoint_path = checkpoints_dir.join(format!("{}.json", project_id));
        
        if checkpoint_path.exists() {
            fs::remove_file(&checkpoint_path)
                .map_err(|e| format!("Failed to delete checkpoint file: {}", e))?;
        }
        
        Ok(())
    }
    
    /// Get a subscriber for project events
    pub fn subscribe(&self) -> broadcast::Receiver<ProjectEvent> {
        self.event_tx.subscribe()
    }
    
    /// Set a project's status
    pub async fn set_project_status(&self, project_id: &str, status: ProjectStatus) {
        let mut projects = self.projects.lock().await;
        projects.insert(project_id.to_string(), status.clone());
        
        // Emit event based on status
        match &status {
            ProjectStatus::NotStarted => (),
            ProjectStatus::Preparing => {
                let _ = self.event_tx.send(ProjectEvent::Started {
                    project_id: project_id.to_string(),
                });
            },
            ProjectStatus::Generating { current_step, progress } => {
                let _ = self.event_tx.send(ProjectEvent::Progress {
                    project_id: project_id.to_string(),
                    step: current_step.clone(),
                    progress: *progress,
                });
            },
            ProjectStatus::Completed { path } => {
                let _ = self.event_tx.send(ProjectEvent::Completed {
                    project_id: project_id.to_string(),
                    path: path.clone(),
                });
                
                // Clean up checkpoint if generation was successful
                let _ = self.delete_checkpoint(project_id).await;
            },
            ProjectStatus::Failed { error, resumable } => {
                let _ = self.event_tx.send(ProjectEvent::Failed {
                    project_id: project_id.to_string(),
                    error: error.clone(),
                    resumable: *resumable,
                });
                
                // Create checkpoint if resumable
                if *resumable {
                    if let Some(checkpoint) = self.checkpoints.lock().await.get(project_id) {
                        let _ = self.save_checkpoint(checkpoint).await;
                    }
                }
            },
            ProjectStatus::Cancelled => {
                let _ = self.event_tx.send(ProjectEvent::Cancelled {
                    project_id: project_id.to_string(),
                });
                
                // Clean up checkpoint if generation was cancelled
                let _ = self.delete_checkpoint(project_id).await;
            },
        }
    }
    
    /// Get a project's status
    pub async fn get_project_status(&self, project_id: &str) -> ProjectStatus {
        let projects = self.projects.lock().await;
        projects.get(project_id)
            .cloned()
            .unwrap_or(ProjectStatus::NotStarted)
    }
    
    /// Add a log entry for a project
    pub async fn add_log(&self, project_id: &str, message: &str) {
        let mut logs = self.logs.lock().await;
        let project_logs = logs.entry(project_id.to_string()).or_insert_with(Vec::new);
        let log_entry = LogEntry::new(message.to_string());
        project_logs.push(log_entry);
        
        // Emit log event
        let _ = self.event_tx.send(ProjectEvent::LogMessage {
            project_id: project_id.to_string(),
            message: message.to_string(),
        });
    }
    
    /// Get a project's logs
    pub async fn get_logs(&self, project_id: &str) -> Vec<LogEntry> {
        let logs = self.logs.lock().await;
        logs.get(project_id)
            .cloned()
            .unwrap_or_default()
    }
    
    /// Set a task's state
    pub async fn set_task_state(&self, project_id: &str, task_id: &str, state: TaskState) {
        let mut task_states = self.task_states.lock().await;
        let project_tasks = task_states.entry(project_id.to_string()).or_insert_with(HashMap::new);
        project_tasks.insert(task_id.to_string(), state.clone());
        
        // If task completed, add to completed tasks for checkpoint
        if let TaskState::Completed = state {
            let mut completed = self.completed_tasks.lock().await;
            let project_completed = completed.entry(project_id.to_string()).or_insert_with(Vec::new);
            if !project_completed.contains(&task_id.to_string()) {
                project_completed.push(task_id.to_string());
            }
        }
        
        // Emit task state change event
        let _ = self.event_tx.send(ProjectEvent::TaskStateChanged {
            project_id: project_id.to_string(),
            task_id: task_id.to_string(),
            state,
        });
    }
    
    /// Get a task's state
    pub async fn get_task_state(&self, project_id: &str, task_id: &str) -> Option<TaskState> {
        let task_states = self.task_states.lock().await;
        task_states.get(project_id)
            .and_then(|tasks| tasks.get(task_id))
            .cloned()
    }
    
    /// Get all task states for a project
    pub async fn get_all_task_states(&self, project_id: &str) -> HashMap<String, TaskState> {
        let task_states = self.task_states.lock().await;
        task_states.get(project_id)
            .cloned()
            .unwrap_or_default()
    }
    
    /// Get completed tasks for a project
    pub async fn get_completed_tasks(&self, project_id: &str) -> Vec<String> {
        let completed = self.completed_tasks.lock().await;
        completed.get(project_id)
            .cloned()
            .unwrap_or_default()
    }
    
    /// Create a checkpoint for a project
    pub async fn create_checkpoint(
        &self,
        project_id: &str,
        config: crate::commands::project::ProjectConfig,
        project_path: PathBuf,
    ) -> Result<(), String> {
        let completed_tasks = self.get_completed_tasks(project_id).await;
        
        let checkpoint = GenerationCheckpoint {
            project_id: project_id.to_string(),
            config,
            completed_tasks,
            project_path,
        };
        
        // Add to memory
        {
            let mut checkpoints = self.checkpoints.lock().await;
            checkpoints.insert(project_id.to_string(), checkpoint.clone());
        }
        
        // Save to disk
        self.save_checkpoint(&checkpoint).await
    }
    
    /// Get a checkpoint for a project
    pub async fn get_checkpoint(&self, project_id: &str) -> Option<GenerationCheckpoint> {
        let checkpoints = self.checkpoints.lock().await;
        checkpoints.get(project_id).cloned()
    }
    
    /// Process a task result
    pub async fn process_task_result(&self, project_id: &str, result: TaskResult) {
        // Update task state
        if result.success {
            self.set_task_state(project_id, &result.task_id, TaskState::Completed).await;
        } else {
            self.set_task_state(
                project_id,
                &result.task_id,
                TaskState::Failed(result.message.clone()),
            ).await;
        }
        
        // Add log entry
        self.add_log(project_id, &result.message).await;
    }
    
    /// Check if a project can be resumed
    pub async fn can_resume(&self, project_id: &str) -> bool {
        let status = self.get_project_status(project_id).await;
        
        match status {
            ProjectStatus::Failed { resumable, .. } => resumable,
            _ => false,
        }
    }
    
    /// Add a progress update for a project
    pub async fn update_progress(&self, project_id: &str, step: &str, progress: u8) {
        // Update the project status
        let mut projects = self.projects.lock().await;
        projects.insert(project_id.to_string(), ProjectStatus::Generating { 
            current_step: step.to_string(), 
            progress 
        });
        
        // Also emit a progress event
        let _ = self.event_tx.send(ProjectEvent::Progress {
            project_id: project_id.to_string(),
            step: step.to_string(),
            progress,
        });
        
        // Add to logs as well
        drop(projects); // Release lock before calling add_log
        self.add_log(project_id, &format!("Progress: {}% - {}", progress, step)).await;
    }
    
    /// Store project config
    pub async fn store_project_config(&self, project_id: &str, config: crate::commands::project::ProjectConfig) -> Result<(), String> {
        let mut configs = self.project_configs.lock().await;
        configs.insert(project_id.to_string(), config);
        Ok(())
    }
    
    /// Get project config
    pub async fn get_project_config(&self, project_id: &str) -> Option<crate::commands::project::ProjectConfig> {
        let configs = self.project_configs.lock().await;
        configs.get(project_id).cloned()
    }
    
    /// Register a task
    pub async fn register_task(&self, project_id: &str, task_id: &str, task_name: &str, dependencies: &[String]) {
        let mut metadata = self.task_metadata.lock().await;
        
        // Get or create project task map
        let project_tasks = metadata.entry(project_id.to_string()).or_insert_with(HashMap::new);
        
        // Create task metadata
        let task = GenerationTask {
            id: task_id.to_string(),
            name: task_name.to_string(),
            description: task_name.to_string(), // Could be more detailed
            status: TaskStatus::Pending,
            progress: 0.0,
            dependencies: dependencies.to_vec(),
        };
        
        // Insert task
        project_tasks.insert(task_id.to_string(), task);
    }
    
    /// Get task metadata
    pub async fn get_task_metadata(&self, project_id: &str) -> HashMap<String, GenerationTask> {
        let metadata = self.task_metadata.lock().await;
        metadata.get(project_id).cloned().unwrap_or_default()
    }
    
    /// Emit event
    pub async fn emit_event(&self, event: ProjectEvent) {
        match self.event_tx.send(event.clone()) {
            Ok(_) => {},
            Err(e) => {
                error!("Failed to emit event: {}", e);
            }
        }
    }
}

// Add Default implementation for AppState
impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
} 