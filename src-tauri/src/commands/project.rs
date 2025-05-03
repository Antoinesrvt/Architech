use serde::{Serialize, Deserialize};
use tauri::{command, State};
use std::path::Path;
use std::sync::Arc;
use uuid::Uuid;
use log::info;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectConfig {
    pub name: String,
    pub path: String,
    pub framework: String,
    pub modules: Vec<String>,
    pub options: ProjectOptions,
    pub setup_command: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectOptions {
    pub typescript: bool,
    pub app_router: bool,
    pub eslint: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

// Command parameter structs
#[derive(Deserialize)]
pub struct ProjectIdParam {
    pub project_id: String,
}

// Responses
#[derive(Serialize, Deserialize, Debug)]
pub struct ProjectStatusResponse {
    pub status: String,
    pub progress: u8,
    pub current_step: String,
    pub path: Option<String>,
    pub error: Option<String>,
    pub resumable: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ProjectLogResponse {
    pub timestamp: u64,
    pub message: String,
}

#[command]
pub async fn validate_project_config(config: ProjectConfig) -> Result<ValidationResult, String> {
    let mut errors = Vec::new();
    
    // Basic validation
    if config.name.trim().is_empty() {
        errors.push("Project name cannot be empty".to_string());
    }
    
    if config.path.trim().is_empty() {
        errors.push("Project path cannot be empty".to_string());
    } else {
        let path = Path::new(&config.path);
        
        // Check if path exists
        if !path.exists() {
            errors.push(format!("Directory '{}' does not exist", config.path));
        }
        
        // Check if target project directory already exists
        let project_path = path.join(&config.name);
        if project_path.exists() {
            errors.push(format!("Project directory '{}' already exists", project_path.display()));
        }
    }
    
    Ok(ValidationResult {
        valid: errors.is_empty(),
        errors,
    })
}

#[command]
pub async fn generate_project(
    config: ProjectConfig,
    app_handle: tauri::AppHandle,
    state: State<'_, Arc<crate::state::AppState>>,
) -> Result<String, String> {
    // Add extensive debug logs
    println!("=============================================");
    println!("GENERATE_PROJECT COMMAND CALLED");
    println!("Project name: {}", config.name);
    println!("Project path: {}", config.path);
    println!("Framework: {}", config.framework);
    println!("Modules: {:?}", config.modules);
    println!("=============================================");
    
    // Add debug logs
    log::debug!("generate_project command called with config: {:#?}", config);
    log::info!("Starting project generation with name: {}, framework: {}", config.name, config.framework);
    
    // Create a new project_id
    let project_id = Uuid::new_v4().to_string();
    
    println!("Generated new project ID: {}", project_id);
    log::debug!("Generated new project ID: {}", project_id);
    
    // Set project status to preparing
    println!("Setting project status to Preparing");
    state.set_project_status(&project_id, crate::state::ProjectStatus::Preparing).await;
    
    // Log the start of generation
    info!("Starting project generation: {}", project_id);
    println!("Adding log entry for project generation start");
    state.add_log(&project_id, &format!("Starting generation of {} project with framework {}", 
        config.name, config.framework)).await;
    
    // Create project generator
    let generator = crate::generation::ProjectGenerator::new(
        app_handle.clone(),
        state.inner().clone()
    );
    
    // Store the config for task initialization
    match generator.store_config(&project_id, config).await {
        Ok(_) => {
            // Return the project ID immediately
            log::info!("Project initialized successfully with ID: {}", project_id);
            log::debug!("Returning project ID to frontend");
            Ok(project_id)
        },
        Err(e) => {
            println!("PROJECT INITIALIZATION FAILED: {}", e);
            log::error!("Failed to initialize project: {}", e);
            Err(e)
        }
    }
}

#[command]
pub async fn initialize_project_tasks(
    param: ProjectIdParam,
    app_handle: tauri::AppHandle,
    state: State<'_, Arc<crate::state::AppState>>,
) -> Result<(), String> {
    println!("=============================================");
    println!("INITIALIZE_PROJECT_TASKS COMMAND CALLED");
    println!("Project ID: {}", param.project_id);
    println!("=============================================");
    
    log::debug!("initialize_project_tasks command called for project ID: {}", param.project_id);
    
    // Create project generator
    let generator = crate::generation::ProjectGenerator::new(
        app_handle.clone(),
        state.inner().clone()
    );
    
    // Initialize tasks and start generation
    match generator.initialize_and_start(&param.project_id).await {
        Ok(_) => {
            println!("PROJECT TASKS INITIALIZED: {}", param.project_id);
            log::info!("Project tasks initialized successfully for ID: {}", param.project_id);
            Ok(())
        },
        Err(e) => {
            println!("PROJECT TASK INITIALIZATION FAILED: {}", e);
            log::error!("Failed to initialize project tasks: {}", e);
            Err(e)
        }
    }
}

#[command]
pub async fn get_project_status(
    param: ProjectIdParam,
    state: State<'_, Arc<crate::state::AppState>>,
) -> Result<ProjectStatusResponse, String> {
    let status = state.get_project_status(&param.project_id).await;
    
    // Convert internal status to response
    let response = match status {
        crate::state::ProjectStatus::NotStarted => ProjectStatusResponse {
            status: "not_started".to_string(),
            progress: 0,
            current_step: "".to_string(),
            path: None,
            error: None,
            resumable: false,
        },
        crate::state::ProjectStatus::Preparing => ProjectStatusResponse {
            status: "preparing".to_string(),
            progress: 0,
            current_step: "Preparing".to_string(),
            path: None,
            error: None,
            resumable: false,
        },
        crate::state::ProjectStatus::Generating { current_step, progress } => ProjectStatusResponse {
            status: "generating".to_string(),
            progress,
            current_step,
            path: None,
            error: None,
            resumable: false,
        },
        crate::state::ProjectStatus::Completed { path } => ProjectStatusResponse {
            status: "completed".to_string(),
            progress: 100,
            current_step: "Completed".to_string(),
            path: Some(path),
            error: None,
            resumable: false,
        },
        crate::state::ProjectStatus::Failed { error, resumable } => ProjectStatusResponse {
            status: "failed".to_string(),
            progress: 0,
            current_step: "Failed".to_string(),
            path: None,
            error: Some(error),
            resumable,
        },
        crate::state::ProjectStatus::Cancelled => ProjectStatusResponse {
            status: "cancelled".to_string(),
            progress: 0,
            current_step: "Cancelled".to_string(),
            path: None,
            error: Some("Project generation was cancelled".to_string()),
            resumable: false,
        },
    };
    
    Ok(response)
}

#[command]
pub async fn get_project_logs(
    param: ProjectIdParam,
    state: State<'_, Arc<crate::state::AppState>>,
) -> Result<Vec<ProjectLogResponse>, String> {
    let logs = state.get_logs(&param.project_id).await;
    
    // Convert internal logs to response
    let response = logs.into_iter()
        .map(|log| ProjectLogResponse {
            timestamp: log.timestamp,
            message: log.message,
        })
        .collect();
    
    Ok(response)
}

#[command]
pub async fn cancel_project_generation(
    param: ProjectIdParam,
    app_handle: tauri::AppHandle,
    state: State<'_, Arc<crate::state::AppState>>,
) -> Result<(), String> {
    // Create project generator
    let generator = crate::generation::ProjectGenerator::new(
        app_handle.clone(),
        state.inner().clone()
    );
    
    // Cancel generation
    generator.cancel_generation(&param.project_id).await
}

#[command]
pub async fn resume_project_generation(
    param: ProjectIdParam,
    app_handle: tauri::AppHandle,
    state: State<'_, Arc<crate::state::AppState>>,
) -> Result<(), String> {
    // Check if project can be resumed
    if !state.can_resume(&param.project_id).await {
        return Err("Project cannot be resumed".to_string());
    }
    
    // Create project generator
    let generator = crate::generation::ProjectGenerator::new(
        app_handle.clone(),
        state.inner().clone()
    );
    
    // Resume generation
    generator.resume_generation(&param.project_id).await
} 