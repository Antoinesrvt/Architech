use serde::{Serialize, Deserialize};
use tauri::command;
use tauri::Manager;
use std::process::{Command as ProcessCommand};
use std::path::{Path, PathBuf};
use std::fs;
use uuid::Uuid;
use std::error::Error;
use regex::Regex;

use super::template::{Module, Framework};

#[derive(Serialize, Deserialize, Debug)]
pub struct ProjectConfig {
    pub name: String,
    pub path: String,
    pub framework: String,
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
        
        let command_name = parts[0];
        let args = &parts[1..];
        
        let mut command = ProcessCommand::new(command_name);
        command.args(args);
        command.current_dir(project_dir);
        
        // Set timeout for the command (5 minutes)
        // command.timeout(std::time::Duration::from_secs(300));
        
        let output = match command.output() {
            Ok(output) => output,
            Err(e) => return Err(format!("Failed to execute command '{}': {}", cmd, e)),
        };
            
        if !output.status.success() {
            return Err(format!(
                "Command '{}' failed: {}",
                cmd,
                String::from_utf8_lossy(&output.stderr)
            ));
        }
    }
    
    // Step 2: Copy files
    let app_dir = match tauri::api::path::app_dir(&tauri::Config::default()) {
        Some(dir) => dir,
        None => return Err("Failed to get app directory".to_string()),
    };
    
    for file_op in &module.installation.files {
        let source_path = app_dir.join("template-files").join(&file_op.source);
        let dest_path = project_dir.join(&file_op.destination);
        
        // Create parent directories if they don't exist
        if let Some(parent) = dest_path.parent() {
            match fs::create_dir_all(parent) {
                Ok(_) => {},
                Err(e) => return Err(format!("Failed to create directory '{}': {}", parent.display(), e)),
            }
        }
        
        // Handle file not found error
        if !source_path.exists() {
            return Err(format!("Source file '{}' not found", source_path.display()));
        }
        
        // Copy the file
        match fs::copy(&source_path, &dest_path) {
            Ok(_) => {},
            Err(e) => return Err(format!(
                "Failed to copy file from '{}' to '{}': {}", 
                source_path.display(), 
                dest_path.display(), 
                e
            )),
        }
    }
    
    // Step 3: Apply transformations
    for transform in &module.installation.transforms {
        let file_path = project_dir.join(&transform.file);
        
        // Skip if file doesn't exist but don't fail
        if !file_path.exists() {
            println!("Warning: File '{}' not found for transformation", file_path.display());
            continue;
        }
        
        // Read file content
        let content = match fs::read_to_string(&file_path) {
            Ok(content) => content,
            Err(e) => return Err(format!("Failed to read file '{}': {}", file_path.display(), e)),
        };
            
        // Apply regex transformation
        let regex = match Regex::new(&transform.pattern) {
            Ok(regex) => regex,
            Err(e) => return Err(format!("Invalid regex pattern '{}': {}", transform.pattern, e)),
        };
            
        let new_content = regex.replace_all(&content, &transform.replacement).to_string();
        
        // Write transformed content back
        match fs::write(&file_path, new_content) {
            Ok(_) => {},
            Err(e) => return Err(format!("Failed to write to file '{}': {}", file_path.display(), e)),
        }
    }
    
    Ok(())
}

// New function to build framework/module dependency graph
fn resolve_module_dependencies(selected_modules: &[String], all_modules: &[Module]) -> Result<Vec<Module>, String> {
    let mut result = Vec::new();
    let mut processed = std::collections::HashSet::new();
    
    fn add_module_with_deps(
        module_id: &str, 
        all_modules: &[Module], 
        result: &mut Vec<Module>,
        processed: &mut std::collections::HashSet<String>
    ) -> Result<(), String> {
        if processed.contains(module_id) {
            return Ok(());
        }
        
        // Find module by id
        let module = all_modules.iter()
            .find(|m| m.id == module_id)
            .ok_or_else(|| format!("Module '{}' not found", module_id))?;
        
        // Add dependencies first
        for dep_id in &module.dependencies {
            add_module_with_deps(dep_id, all_modules, result, processed)?;
        }
        
        // Add the module itself if not already added
        if !processed.contains(module_id) {
            result.push(module.clone());
            processed.insert(module_id.to_string());
        }
        
        Ok(())
    }
    
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
    // Step 0: Generate a unique ID for the project
    let project_id = Uuid::new_v4().to_string();
    
    // Create project path
    let base_path = Path::new(&config.path);
    let project_dir = base_path.join(&config.name);
    
    // Validate project path
    let validation = validate_project_config(config.clone()).await?;
    if !validation.valid {
        return Err(validation.errors.join(", "));
    }
    
    // Emit initial progress
    emit_progress(&app_handle, "init", "Initializing project generation", 0.0);
    
    // Step 1: Get all modules from the database
    emit_progress(&app_handle, "modules", "Loading modules", 0.05);
    let all_modules = super::template::get_modules().await?;
    
    // Step 2: Get the selected framework from database
    emit_progress(&app_handle, "framework", "Loading framework definition", 0.1);
    let frameworks = super::template::get_frameworks().await?;
    let framework = frameworks.iter()
        .find(|t| t.id == config.framework)
        .ok_or_else(|| format!("Framework '{}' not found", config.framework))?;
        
    // Step 3: Create a base project using the framework command
    emit_progress(&app_handle, "create", "Creating base project", 0.15);
    
    // Extract base command from the framework
    let mut base_cmd_parts = framework.base_command.split_whitespace().collect::<Vec<&str>>();
    if base_cmd_parts.is_empty() {
        return Err("Invalid base command in framework".to_string());
    }
    
    // Create the command
    let cmd_name = base_cmd_parts[0];
    let mut cmd_args = base_cmd_parts[1..].to_vec();
    
    // Add project name and configuration options
    cmd_args.push(&config.name);
    
    if config.options.typescript {
        cmd_args.push("--typescript");
    }
    
    if config.options.app_router {
        cmd_args.push("--app");
    }
    
    if config.options.eslint {
        cmd_args.push("--eslint");
    }
    
    // Execute the command
    let mut cmd = ProcessCommand::new(cmd_name);
    cmd.args(cmd_args);
    cmd.current_dir(base_path);
    
    println!("Executing command: {:?} {:?}", cmd_name, cmd_args);
    
    let output = match cmd.output() {
        Ok(output) => output,
        Err(e) => return Err(format!("Failed to execute command: {}", e)),
    };
        
    if !output.status.success() {
        return Err(format!(
            "Command failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    
    // Step 4: Enforce the directory structure from the framework definition
    if framework.structure.enforced {
        emit_progress(&app_handle, "structure", "Enforcing project structure", 0.3);
        create_directory_structure(&project_dir, &framework.structure.directories)?;
    }
    
    // Step 5: Resolve module dependencies
    emit_progress(&app_handle, "dependencies", "Resolving module dependencies", 0.4);
    let module_ids = config.modules.iter().map(|m| m.id.clone()).collect::<Vec<String>>();
    let ordered_modules = resolve_module_dependencies(&module_ids, &all_modules)?;
    
    // Step 6: Install and configure each module
    let total_modules = ordered_modules.len();
    for (index, module) in ordered_modules.iter().enumerate() {
        let progress = 0.5 + (0.5 * (index as f32 / total_modules as f32));
        emit_progress(
            &app_handle,
            "modules", 
            &format!("Installing module {} ({}/{})", module.name, index + 1, total_modules),
            progress
        );
        
        // Find the module config from the user selections
        let module_config = config.modules.iter()
            .find(|m| m.id == module.id)
            .map(|m| &m.options)
            .unwrap_or(&serde_json::json!({}));
            
        // Apply the module
        apply_module(&project_dir, module, module_config)?;
    }
    
    // Final step: Mark as complete
    emit_progress(&app_handle, "complete", "Project generation complete", 1.0);
    
    Ok(project_id)
}

fn emit_progress(app_handle: &tauri::AppHandle, step: &str, message: &str, progress: f32) {
    let _ = app_handle.emit_all("generation-progress", GenerationProgress {
        step: step.to_string(),
        message: message.to_string(),
        progress,
    });
}

#[command]
pub async fn browse_directory(title: String) -> Result<String, String> {
    let options = tauri::api::dialog::FileDialogBuilder::new()
        .set_title(&title)
        .set_directory_only(true);
        
    match options.pick_folder() {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            Ok(path_str)
        },
        None => Err("No directory selected".to_string()),
    }
}

#[command]
pub async fn open_in_editor(path: String, editor: String) -> Result<(), String> {
    // Default to 'code' (VS Code) if empty
    let editor_command = if editor.trim().is_empty() { "code" } else { &editor };
    
    let result = ProcessCommand::new(editor_command)
        .arg(path)
        .spawn();
        
    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open in editor: {}", e)),
    }
} 