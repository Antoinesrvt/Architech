use serde::{Serialize, Deserialize};
use tauri::command;
use tauri::Manager;
use std::process::{Command as ProcessCommand};
use std::path::Path;
use std::fs;
use uuid::Uuid;

use super::template::{Module, Template};

#[derive(Serialize, Deserialize, Debug)]
pub struct ProjectConfig {
    pub name: String,
    pub path: String,
    pub template: String,
    pub modules: Vec<ModuleConfig>,
    pub options: ProjectOptions,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ModuleConfig {
    pub id: String,
    pub options: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug)]
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GenerationProgress {
    pub step: String,
    pub message: String,
    pub progress: f32,
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
) -> Result<String, String> {
    // Send initial progress
    emit_progress(&app_handle, "init", "Preparing project generation...", 0.0);
    
    // Validate the configuration
    let validation = validate_project_config(config.clone()).await?;
    if !validation.valid {
        return Err(validation.errors.join(", "));
    }
    
    let project_dir = Path::new(&config.path).join(&config.name);
    
    // Create project directory
    fs::create_dir_all(&project_dir)
        .map_err(|e| format!("Failed to create project directory: {}", e))?;
    
    // Generate base project
    emit_progress(&app_handle, "base", "Creating base Next.js project...", 10.0);
    
    // Construct create-next-app command
    let mut args = vec![
        "create-next-app@latest".to_string(),
        project_dir.to_string_lossy().to_string(),
        "--use-npm".to_string(),
    ];
    
    if config.options.typescript {
        args.push("--typescript".to_string());
    } else {
        args.push("--no-typescript".to_string());
    }
    
    if config.options.app_router {
        args.push("--app".to_string());
    } else {
        args.push("--no-app".to_string());
    }
    
    if config.options.eslint {
        args.push("--eslint".to_string());
    } else {
        args.push("--no-eslint".to_string());
    }
    
    // Always add tailwind as it's our base
    args.push("--tailwind".to_string());
    
    // Execute npx command
    let output = ProcessCommand::new("npx")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute create-next-app: {}", e))?;
    
    if !output.status.success() {
        return Err(format!(
            "create-next-app failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    
    // Install modules
    emit_progress(&app_handle, "modules", "Installing modules...", 50.0);
    
    // For each module, we would perform the module installation
    // This is simplified for now
    for (i, module_config) in config.modules.iter().enumerate() {
        let progress = 50.0 + (40.0 * (i as f32 / config.modules.len() as f32));
        emit_progress(
            &app_handle,
            "module",
            &format!("Installing module: {}", module_config.id),
            progress,
        );
        
        // In a real implementation, we would:
        // 1. Fetch the module details
        // 2. Run installation commands
        // 3. Copy files
        // 4. Apply transformations
    }
    
    // Finalization
    emit_progress(&app_handle, "finalize", "Finalizing project...", 90.0);
    
    // In a real implementation, we would:
    // 1. Generate README.md with project info
    // 2. Initialize git if configured
    // 3. Clean up any temporary files
    
    emit_progress(&app_handle, "complete", "Project generation complete!", 100.0);
    
    Ok(project_dir.to_string_lossy().to_string())
}

fn emit_progress(app_handle: &tauri::AppHandle, step: &str, message: &str, progress: f32) {
    let progress_event = GenerationProgress {
        step: step.to_string(),
        message: message.to_string(),
        progress,
    };
    
    let _ = app_handle.emit_all("generation-progress", progress_event);
} 