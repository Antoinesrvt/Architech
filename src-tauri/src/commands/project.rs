use serde::{Serialize, Deserialize};
use tauri::command;
use tauri::Manager;
use std::process::{Command as ProcessCommand};
use std::path::{Path, PathBuf};
use std::fs;
use uuid::Uuid;
use std::error::Error;
use regex::Regex;

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

// New function to create directory structure
fn create_directory_structure(project_dir: &Path, directories: &[String]) -> Result<(), String> {
    for dir in directories {
        let dir_path = project_dir.join(dir);
        fs::create_dir_all(&dir_path)
            .map_err(|e| format!("Failed to create directory '{}': {}", dir_path.display(), e))?;
    }
    Ok(())
}

// New function to apply a module to the project
fn apply_module(project_dir: &Path, module: &Module, config: &serde_json::Value) -> Result<(), String> {
    // Step 1: Execute installation commands
    for cmd in &module.installation.commands {
        // Parse command and arguments
        let parts: Vec<&str> = cmd.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }
        
        let mut command = ProcessCommand::new(parts[0]);
        command.args(&parts[1..]);
        command.current_dir(project_dir);
        
        let output = command.output()
            .map_err(|e| format!("Failed to execute command '{}': {}", cmd, e))?;
            
        if !output.status.success() {
            return Err(format!(
                "Command '{}' failed: {}",
                cmd,
                String::from_utf8_lossy(&output.stderr)
            ));
        }
    }
    
    // Step 2: Copy files
    let app_dir = tauri::api::path::app_dir(&tauri::Config::default())
        .ok_or_else(|| "Failed to get app directory".to_string())?;
    
    for file_op in &module.installation.files {
        let source_path = app_dir.join("template-files").join(&file_op.source);
        let dest_path = project_dir.join(&file_op.destination);
        
        // Create parent directories if they don't exist
        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory '{}': {}", parent.display(), e))?;
        }
        
        // Copy the file
        fs::copy(&source_path, &dest_path)
            .map_err(|e| format!(
                "Failed to copy file from '{}' to '{}': {}", 
                source_path.display(), 
                dest_path.display(), 
                e
            ))?;
    }
    
    // Step 3: Apply transformations
    for transform in &module.installation.transforms {
        let file_path = project_dir.join(&transform.file);
        
        // Skip if file doesn't exist
        if !file_path.exists() {
            continue;
        }
        
        // Read file content
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read file '{}': {}", file_path.display(), e))?;
            
        // Apply regex transformation
        let regex = Regex::new(&transform.pattern)
            .map_err(|e| format!("Invalid regex pattern '{}': {}", transform.pattern, e))?;
            
        let new_content = regex.replace_all(&content, &transform.replacement).to_string();
        
        // Write transformed content back
        fs::write(&file_path, new_content)
            .map_err(|e| format!("Failed to write to file '{}': {}", file_path.display(), e))?;
    }
    
    Ok(())
}

// New function to build template/module dependency graph
fn resolve_module_dependencies(selected_modules: &[String], all_modules: &[Module]) -> Result<Vec<Module>, String> {
    let mut result = Vec::new();
    let mut processed = std::collections::HashSet::new();
    
    fn add_module_with_deps(
        module_id: &str, 
        all_modules: &[Module], 
        result: &mut Vec<Module>, 
        processed: &mut std::collections::HashSet<String>
    ) -> Result<(), String> {
        // Skip if already processed
        if processed.contains(module_id) {
            return Ok(());
        }
        
        // Find the module
        let module = all_modules.iter().find(|m| m.id == module_id)
            .ok_or_else(|| format!("Module '{}' not found", module_id))?;
        
        // Process dependencies first
        for dep_id in &module.dependencies {
            add_module_with_deps(dep_id, all_modules, result, processed)?;
        }
        
        // Add this module
        processed.insert(module_id.to_string());
        result.push(module.clone());
        
        Ok(())
    }
    
    // Process each selected module
    for module_id in selected_modules {
        add_module_with_deps(module_id, all_modules, &mut result, &mut processed)?;
    }
    
    Ok(result)
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
    
    // Get template details to enforce structure
    let templates = super::template::get_templates().await?;
    let template = templates.iter()
        .find(|t| t.id == config.template)
        .ok_or_else(|| format!("Template '{}' not found", config.template))?;
    
    // Enforce project structure if required
    if template.structure.enforced {
        emit_progress(&app_handle, "structure", "Setting up project structure...", 30.0);
        create_directory_structure(&project_dir, &template.structure.directories)?;
    }
    
    // Get all modules
    let all_modules = super::template::get_modules().await?;
    
    // Get selected module IDs
    let selected_module_ids: Vec<String> = config.modules.iter()
        .map(|m| m.id.clone())
        .collect();
    
    // Resolve dependencies
    let ordered_modules = resolve_module_dependencies(&selected_module_ids, &all_modules)?;
    
    // Install modules
    emit_progress(&app_handle, "modules", "Installing modules...", 50.0);
    
    for (i, module) in ordered_modules.iter().enumerate() {
        let progress = 50.0 + (40.0 * (i as f32 / ordered_modules.len() as f32));
        emit_progress(
            &app_handle,
            "module",
            &format!("Installing module: {}", module.name),
            progress,
        );
        
        // Find the module config if it exists
        let module_config = config.modules.iter()
            .find(|m| m.id == module.id)
            .map(|m| &m.options)
            .unwrap_or(&serde_json::Value::Null);
        
        // Apply the module
        apply_module(&project_dir, module, module_config)?;
    }
    
    // Finalization
    emit_progress(&app_handle, "finalize", "Finalizing project...", 90.0);
    
    // Generate README.md with project info
    let readme_content = format!(
        "# {}\n\n{}\n\nCreated with ArchiTech.\n",
        config.name,
        template.description
    );
    
    fs::write(project_dir.join("README.md"), readme_content)
        .map_err(|e| format!("Failed to create README.md: {}", e))?;
    
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

// New commands for project file operations
#[command]
pub async fn browse_directory(title: String) -> Result<String, String> {
    // Use Tauri's dialog plugin to open a folder dialog
    let dialog = tauri_plugin_dialog::DialogBuilder::default()
        .title(&title)
        .can_select_directories(true)
        .can_select_files(false)
        .build()
        .map_err(|e| format!("Failed to build dialog: {}", e))?;
    
    let selected = dialog.select_directory()
        .map_err(|e| format!("Failed to open directory dialog: {}", e))?;
    
    match selected {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("No directory selected".to_string()),
    }
}

#[command]
pub async fn open_in_editor(path: String, editor: String) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    
    let app_handle = tauri::AppHandle::get().ok_or("Failed to get app handle")?;
    
    // Set up the command based on the editor
    let (command, args) = match editor.as_str() {
        "code" => ("code", vec![path]), // VS Code
        "atom" => ("atom", vec![path]), // Atom
        "subl" => ("subl", vec![path]), // Sublime Text
        _ => (editor.as_str(), vec![path]), // Use provided editor command
    };
    
    // Execute the command
    app_handle.shell()
        .spawn(command, args)
        .map_err(|e| format!("Failed to open editor: {}", e))?;
    
    Ok(())
} 