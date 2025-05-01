use serde::{Serialize, Deserialize};
use tauri::command;
use std::path::Path;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectConfig {
    pub name: String,
    pub path: String,
    pub framework: String,
    pub modules: Vec<ModuleConfig>,
    pub options: ProjectOptions,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModuleConfig {
    pub id: String,
    pub options: serde_json::Value,
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
    pub projectId: String,
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

// Function to resolve module dependencies
#[doc(hidden)]
pub async fn resolve_module_dependencies(selected_module_ids: &[String]) -> Result<Vec<super::framework::Module>, String> {
    // Get all available modules
    let all_modules = match super::framework::get_modules().await {
        Ok(modules) => modules,
        Err(e) => return Err(format!("Failed to get modules: {}", e)),
    };
    
    let mut result = Vec::new();
    let mut processed = std::collections::HashSet::new();
    
    fn add_module_with_deps(
        module_id: &str,
        all_modules: &[super::framework::Module],
        result: &mut Vec<super::framework::Module>,
        processed: &mut std::collections::HashSet<String>,
    ) -> Result<(), String> {
        if processed.contains(module_id) {
            return Ok(());
        }
        
        // Find module by id
        let module = all_modules.iter()
            .find(|m| m.id == module_id)
            .ok_or_else(|| format!("Module '{}' not found", module_id))?
            .clone();
        
        // Add dependencies first
        for dep_id in &module.dependencies {
            add_module_with_deps(dep_id, all_modules, result, processed)?;
        }
        
        // Add the module itself if not already added
        if !processed.contains(module_id) {
            result.push(module);
            processed.insert(module_id.to_string());
        }
        
        Ok(())
    }
    
    for module_id in selected_module_ids {
        add_module_with_deps(module_id, &all_modules, &mut result, &mut processed)?;
    }
    
    Ok(result)
}

#[command]
pub async fn generate_project(
    config: ProjectConfig,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<String, String> {
    // Create project generator with cloned state
    let app_state = state.inner().clone();
    let generator = crate::generation::ProjectGenerator::new(
        app_handle.clone(),
        std::sync::Arc::new(app_state)
    );
    
    // Start generation
    generator.start_generation(config).await
}

#[command]
pub async fn get_project_status(
    param: ProjectIdParam,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<crate::state::ProjectGenerationState, String> {
    state.get_project(&param.projectId)
}

#[command]
pub async fn get_project_logs(
    param: ProjectIdParam,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<Vec<String>, String> {
    let project = state.get_project(&param.projectId)?;
    Ok(project.logs)
}

#[command]
pub async fn cancel_project_generation(
    param: ProjectIdParam,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    // Get project state
    let mut projects = state.projects.lock().map_err(|e| format!("Failed to lock projects state: {}", e))?;
    
    // Check if project exists
    if let Some(project) = projects.get_mut(&param.projectId) {
        // Mark as cancelled - this will stop future tasks from running
        project.status = crate::state::TaskStatus::Failed("Generation cancelled by user".to_string());
        
        // Mark all pending tasks as skipped
        for task in project.tasks.values_mut() {
            if matches!(task.status, crate::state::TaskStatus::Pending) {
                task.status = crate::state::TaskStatus::Skipped("Generation cancelled by user".to_string());
            }
        }
        
        Ok(())
    } else {
        Err(format!("Project not found: {}", param.projectId))
    }
} 