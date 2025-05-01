use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};
use tauri::State as TauriState;
use uuid::Uuid;

// Generation task status enum
#[derive(Debug, Clone, Deserialize)]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed(String),
    Skipped(String),
}

// Implement custom Serialize for TaskStatus to ensure consistency with frontend
impl Serialize for TaskStatus {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // Convert enum to string representation
        match self {
            TaskStatus::Pending => serializer.serialize_str("Pending"),
            TaskStatus::Running => serializer.serialize_str("Running"),
            TaskStatus::Completed => serializer.serialize_str("Completed"),
            TaskStatus::Failed(reason) => serializer.serialize_str(&format!("Failed: {}", reason)),
            TaskStatus::Skipped(reason) => serializer.serialize_str(&format!("Skipped: {}", reason)),
        }
    }
}

// Generation task definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationTask {
    pub id: String,
    pub name: String,
    pub description: String,
    pub status: TaskStatus,
    pub progress: f32,
    pub dependencies: Vec<String>,
}

// Project generation state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectGenerationState {
    pub id: String,
    pub path: String,
    pub name: String,
    pub framework: String,
    pub tasks: HashMap<String, GenerationTask>,
    pub current_task: Option<String>,
    pub progress: f32,
    pub status: TaskStatus,
    pub logs: Vec<String>,
}

// Application state manager
#[derive(Clone)]
pub struct AppState {
    pub projects: Arc<Mutex<HashMap<String, ProjectGenerationState>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            projects: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl AppState {
    // Initialize a new project generation state
    pub fn init_project(&self, name: String, path: String, framework: String) -> Result<String, String> {
        let project_id = Uuid::new_v4().to_string();
        
        let project_state = ProjectGenerationState {
            id: project_id.clone(),
            path,
            name,
            framework,
            tasks: HashMap::new(),
            current_task: None,
            progress: 0.0,
            status: TaskStatus::Pending,
            logs: Vec::new(),
        };
        
        let mut projects = self.projects.lock().map_err(|e| format!("Failed to lock projects state: {}", e))?;
        projects.insert(project_id.clone(), project_state);
        
        Ok(project_id)
    }
    
    // Add a generation task
    pub fn add_task(&self, project_id: &str, task: GenerationTask) -> Result<(), String> {
        let mut projects = self.projects.lock().map_err(|e| format!("Failed to lock projects state: {}", e))?;
        
        let project = projects.get_mut(project_id).ok_or_else(|| format!("Project not found: {}", project_id))?;
        project.tasks.insert(task.id.clone(), task);
        
        Ok(())
    }
    
    // Update task status
    pub fn update_task_status(&self, project_id: &str, task_id: &str, status: TaskStatus) -> Result<(), String> {
        let mut projects = self.projects.lock().map_err(|e| format!("Failed to lock projects state: {}", e))?;
        
        let project = projects.get_mut(project_id).ok_or_else(|| format!("Project not found: {}", project_id))?;
        let task = project.tasks.get_mut(task_id).ok_or_else(|| format!("Task not found: {}", task_id))?;
        
        task.status = status;
        
        // Update project progress
        Self::update_project_progress(project);
        
        Ok(())
    }
    
    // Update task progress
    pub fn update_task_progress(&self, project_id: &str, task_id: &str, progress: f32) -> Result<(), String> {
        let mut projects = self.projects.lock().map_err(|e| format!("Failed to lock projects state: {}", e))?;
        
        let project = projects.get_mut(project_id).ok_or_else(|| format!("Project not found: {}", project_id))?;
        let task = project.tasks.get_mut(task_id).ok_or_else(|| format!("Task not found: {}", task_id))?;
        
        task.progress = progress;
        
        // Update project progress
        Self::update_project_progress(project);
        
        Ok(())
    }
    
    // Set current active task
    pub fn set_current_task(&self, project_id: &str, task_id: &str) -> Result<(), String> {
        let mut projects = self.projects.lock().map_err(|e| format!("Failed to lock projects state: {}", e))?;
        
        let project = projects.get_mut(project_id).ok_or_else(|| format!("Project not found: {}", project_id))?;
        project.current_task = Some(task_id.to_string());
        
        Ok(())
    }
    
    // Add a log message
    pub fn add_log(&self, project_id: &str, message: &str) -> Result<(), String> {
        let mut projects = self.projects.lock().map_err(|e| format!("Failed to lock projects state: {}", e))?;
        
        let project = projects.get_mut(project_id).ok_or_else(|| format!("Project not found: {}", project_id))?;
        project.logs.push(message.to_string());
        
        Ok(())
    }
    
    // Get project generation state
    pub fn get_project(&self, project_id: &str) -> Result<ProjectGenerationState, String> {
        let projects = self.projects.lock().map_err(|e| format!("Failed to lock projects state: {}", e))?;
        
        projects.get(project_id)
            .cloned()
            .ok_or_else(|| format!("Project not found: {}", project_id))
    }
    
    // Calculate and update project progress based on task statuses
    fn update_project_progress(project: &mut ProjectGenerationState) {
        if project.tasks.is_empty() {
            project.progress = 0.0;
            return;
        }
        
        let total_tasks = project.tasks.len() as f32;
        let mut completed_weight = 0.0;
        
        for task in project.tasks.values() {
            match task.status {
                TaskStatus::Completed => completed_weight += 1.0,
                TaskStatus::Running => completed_weight += task.progress,
                TaskStatus::Skipped(_) => completed_weight += 1.0,
                _ => {}
            }
        }
        
        project.progress = completed_weight / total_tasks;
        
        // Update overall project status
        let all_completed = project.tasks.values().all(|t| 
            matches!(t.status, TaskStatus::Completed | TaskStatus::Skipped(_))
        );
        
        let any_failed = project.tasks.values().any(|t| 
            matches!(t.status, TaskStatus::Failed(_))
        );
        
        if all_completed {
            project.status = TaskStatus::Completed;
        } else if any_failed {
            project.status = TaskStatus::Failed("One or more tasks failed".to_string());
        } else if project.progress > 0.0 {
            project.status = TaskStatus::Running;
        }
    }
}

// Helper functions for cleaner Tauri state management
pub fn get_app_state(state: TauriState<AppState>) -> Arc<Mutex<HashMap<String, ProjectGenerationState>>> {
    state.projects.clone()
} 