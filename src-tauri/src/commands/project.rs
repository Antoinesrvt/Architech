use serde::{Serialize, Deserialize};
use tauri::command;
use std::path::Path;
use std::fs;
use uuid::Uuid;

use super::command_runner::{run_command, run_interactive_command, create_file, modify_file, modify_import, emit_progress};
use super::framework::get_framework_by_id;
use tauri::async_runtime;

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
#[allow(dead_code)]
fn create_directory_structure(project_dir: &Path, directories: &[String]) -> Result<(), String> {
    for dir in directories {
        let dir_path = project_dir.join(dir);
        fs::create_dir_all(&dir_path)
            .map_err(|e| format!("Failed to create directory '{}': {}", dir_path.display(), e))?;
    }
    Ok(())
}

// Function to resolve module dependencies
fn resolve_module_dependencies(selected_module_ids: &[String]) -> Result<Vec<super::framework::Module>, String> {
    // Get all available modules
    let all_modules = match async_runtime::block_on(super::framework::get_modules()) {
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

async fn generate_project_with_cli(
    config: &ProjectConfig,
    app_handle: &tauri::AppHandle
) -> Result<(), String> {
    // Get the base path
    let base_path = Path::new(&config.path);
    let project_dir = base_path.join(&config.name);
    
    // Get framework details
    let framework = get_framework_by_id(&config.framework)?;
    
    // Emit initial progress
    emit_progress(app_handle, "init", "Initializing project generation", 0.0);
    
    // Extract the base command and parse into individual parts
    let base_cmd_parts: Vec<&str> = framework.cli.base_command.split_whitespace().collect();
    if base_cmd_parts.is_empty() {
        return Err("Invalid base command in framework".to_string());
    }
    
    // Get the command name and arguments
    let cmd_name = base_cmd_parts[0];
    let mut cmd_args: Vec<&str> = base_cmd_parts[1..].to_vec();
    
    // Add project name as the last argument if it's not an interactive CLI
    if !framework.cli.interactive {
        // Add arguments based on the config
        for (arg_name, arg_value) in &framework.cli.arguments {
            if let Some(arg_obj) = arg_value.as_object() {
                // Check if this argument has a flag
                if let Some(flag) = arg_obj.get("flag").and_then(|f| f.as_str()) {
                    // Check if the option is enabled in the project config
                    let option_name = arg_name.to_string();
                    let option_enabled = config.options.typescript && option_name == "typescript"
                        || config.options.app_router && option_name == "app_router"
                        || config.options.eslint && option_name == "eslint";
                    
                    if option_enabled {
                        cmd_args.push(flag);
                    }
                }
            }
        }
        
        // Add project name as the last argument
        cmd_args.push(&config.name);
        
        // Execute the command
        emit_progress(app_handle, "create", &format!("Creating {} project", framework.name), 0.2);
        run_command(cmd_name, &cmd_args, base_path, None).await?;
    } else {
        // For interactive CLIs, we need to handle prompts and responses
        emit_progress(app_handle, "create", &format!("Creating {} project with interactive CLI", framework.name), 0.2);
        
        // Prepare responses for interactive prompts
        let mut responses: Vec<(&str, &str)> = Vec::new();
        
        for response_config in &framework.cli.responses {
            let response_value = if response_config.use_project_name {
                &config.name
            } else {
                &response_config.response
            };
            
            responses.push((&response_config.prompt, response_value));
        }
        
        // For position-based arguments, add them to cmd_args
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
                    cmd_args[position as usize - 1] = value; // Adjust for 0-based indexing
                }
            }
        }
        
        // Add project name as a positional argument for some CLIs that need it
        cmd_args.push(&config.name);
        
        // Execute the interactive command
        run_interactive_command(cmd_name, &cmd_args, base_path, &responses).await?;
    }
    
    // Step 4: Enforce the directory structure from the framework definition
    if framework.directory_structure.enforced {
        emit_progress(app_handle, "structure", "Enforcing project structure", 0.3);
        
        for dir in &framework.directory_structure.directories {
            let dir_path = project_dir.join(dir);
            fs::create_dir_all(&dir_path)
                .map_err(|e| format!("Failed to create directory '{}': {}", dir_path.display(), e))?;
        }
    }
    
    // Step 5: Resolve module dependencies
    emit_progress(app_handle, "dependencies", "Resolving module dependencies", 0.4);
    
    let module_ids = config.modules.iter().map(|m| m.id.clone()).collect::<Vec<String>>();
    let ordered_modules = resolve_module_dependencies(&module_ids)?;
    
    // Step 6: Install and configure each module
    let total_modules = ordered_modules.len();
    for (index, module) in ordered_modules.iter().enumerate() {
        let progress = 0.5 + (0.5 * (index as f32 / total_modules as f32));
        emit_progress(
            app_handle,
            "modules", 
            &format!("Installing module {} ({}/{})", module.name, index + 1, total_modules),
            progress
        );
        
        // Find the module config from the user selections
        let _module_config = config.modules.iter()
            .find(|m| m.id == module.id)
            .map(|m| &m.options)
            .unwrap_or(&serde_json::json!({}));
        
        // Apply the module commands
        for cmd in &module.installation.commands {
            let parts: Vec<&str> = cmd.split_whitespace().collect();
            if parts.is_empty() {
                continue;
            }
            
            let cmd_name = parts[0];
            let cmd_args = &parts[1..];
            
            run_command(cmd_name, cmd_args, &project_dir, None).await?;
        }
        
        // Apply file operations
        for op in &module.installation.file_operations {
            let file_path = project_dir.join(&op.path);
            
            match op.operation.as_str() {
                "create" => {
                    create_file(&file_path, &op.content)?;
                },
                "modify" => {
                    modify_file(&file_path, &op.pattern, &op.replacement)?;
                },
                "modify_import" => {
                    modify_import(&file_path, &op.action, &op.import)?;
                },
                _ => {
                    println!("Warning: Unknown file operation: {}", op.operation);
                }
            }
        }
    }
    
    // Final step: Mark as complete
    emit_progress(app_handle, "complete", "Project generation complete", 1.0);
    
    Ok(())
}

#[command]
pub async fn generate_project(
    config: ProjectConfig,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    // Generate unique ID for the project
    let project_id = Uuid::new_v4().to_string();
    
    // Validate project config
    let validation = validate_project_config(config.clone()).await?;
    if !validation.valid {
        return Err(validation.errors.join(", "));
    }
    
    // Use the new CLI-based generation
    generate_project_with_cli(&config, &app_handle).await?;
    
    Ok(project_id)
} 