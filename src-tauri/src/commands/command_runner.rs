use std::process::{Command, Output, Stdio};
use std::path::Path;
use std::fs;
use std::io::Read;
use regex::Regex;
use tauri::AppHandle;
use tauri::Emitter;

/// Runs a command asynchronously with the given arguments and working directory
pub async fn run_command(
    command: &str, 
    args: &[&str], 
    working_dir: &Path,
    env_vars: Option<Vec<(String, String)>>
) -> Result<Output, String> {
    let path = working_dir;
    
    // Create the command
    println!("Running command: {} {:?} in {}", command, args, working_dir.display());
    let mut cmd = Command::new(command);
    cmd.args(args)
       .current_dir(path)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
       
    // Add environment variables if provided
    if let Some(vars) = env_vars {
        for (key, value) in vars {
            cmd.env(key, value);
        }
    }
    
    match cmd.output() {
        Ok(output) => {
            // Log stdout and stderr
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            
            if !stdout.is_empty() {
                println!("Command stdout: {}", stdout);
            }
            
            if !stderr.is_empty() {
                println!("Command stderr: {}", stderr);
            }
            
            if output.status.success() {
                println!("Command completed successfully");
            } else {
                let error_msg = format!("Command exited with non-zero status: {}", output.status);
                println!("{}", error_msg);
            }
            
            Ok(output)
        },
        Err(e) => {
            let error_msg = format!("Failed to execute command: {}", e);
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

/// Runs an interactive command asynchronously with the given arguments and working directory
pub async fn run_interactive_command(
    command: &str, 
    args: &[&str], 
    working_dir: &Path,
    env_vars: Option<Vec<(String, String)>>
) -> Result<(), String> {
    println!("Running interactive command: {} {:?} in {}", command, args, working_dir.display());
    
    // Create the command
    let mut cmd = Command::new(command);
    cmd.args(args)
       .current_dir(working_dir)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    // Add environment variables if provided
    if let Some(vars) = env_vars {
        for (key, value) in vars {
            cmd.env(key, value);
        }
    }
    
    match cmd.spawn() {
        Ok(mut child) => {
            let stdout = child.stdout.take().expect("Failed to capture stdout");
            let stderr = child.stderr.take().expect("Failed to capture stderr");
            
            let mut reader = std::io::BufReader::new(stdout);
            let mut err_reader = std::io::BufReader::new(stderr);
            
            let mut buffer = [0; 1024];
            let mut err_buffer = [0; 1024];
            
            loop {
                // Check if child process has exited
                match child.try_wait() {
                    Ok(Some(status)) => {
                        if !status.success() {
                            let error_msg = format!("Command exited with non-zero status: {}", status);
                            println!("{}", error_msg);
                            return Err(error_msg);
                        }
                        break;
                    },
                    Ok(None) => {}, // Child still running
                    Err(e) => {
                        let error_msg = format!("Error checking child process status: {}", e);
                        println!("{}", error_msg);
                        return Err(error_msg);
                    }
                }
                
                // Read from stdout
                if let Ok(n) = reader.read(&mut buffer) {
                    if n > 0 {
                        let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                        println!("{}", output);
                    }
                }
                
                // Read from stderr
                if let Ok(n) = err_reader.read(&mut err_buffer) {
                    if n > 0 {
                        let output = String::from_utf8_lossy(&err_buffer[..n]).to_string();
                        println!("{}", output);
                    }
                }
                
                // Small sleep to prevent tight CPU loops
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
            
            // Wait for the child process to finish if it hasn't already
            match child.wait() {
                Ok(status) => {
                    if status.success() {
                        let success_msg = "Command completed successfully";
                        println!("{}", success_msg);
                        Ok(())
                    } else {
                        let error_msg = format!("Command exited with non-zero status: {}", status);
                        println!("{}", error_msg);
                        Err(error_msg)
                    }
                },
                Err(e) => {
                    let error_msg = format!("Failed to wait for command: {}", e);
                    println!("{}", error_msg);
                    Err(error_msg)
                },
            }
        },
        Err(e) => {
            let error_msg = format!("Failed to spawn command: {}", e);
            println!("{}", error_msg);
            Err(error_msg)
        },
    }
}

/// Emit progress events to the frontend
pub fn emit_progress(app_handle: &AppHandle, step: &str, message: &str, progress: f32) {
    let payload = serde_json::json!({
        "step": step,
        "message": message,
        "progress": progress,
    });
    
    // In Tauri v2, we use the emit method from the Emitter trait
    if let Err(e) = app_handle.emit("generation-progress", payload) {
        println!("Failed to emit progress event: {}", e);
    }
}

/// Creates a file with the given content
pub fn create_file(path: &Path, content: &str) -> Result<(), String> {
    // Ensure parent directories exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory '{}': {}", parent.display(), e))?;
    }
    
    fs::write(path, content)
        .map_err(|e| format!("Failed to create file '{}': {}", path.display(), e))
}

/// Modifies a file using regex pattern replacement
pub fn modify_file(path: &Path, pattern: &str, replacement: &str) -> Result<(), String> {
    // Check if file exists
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }
    
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file '{}': {}", path.display(), e))?;
    
    let regex = Regex::new(pattern)
        .map_err(|e| format!("Invalid regex pattern '{}': {}", pattern, e))?;
    
    let new_content = regex.replace_all(&content, replacement).to_string();
    
    fs::write(path, new_content)
        .map_err(|e| format!("Failed to write to file '{}': {}", path.display(), e))
}

/// Adds an import statement to a file
pub fn modify_import(path: &Path, action: &str, import: &str) -> Result<(), String> {
    // Check if file exists
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }
    
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file '{}': {}", path.display(), e))?;
    
    let mut new_content = content.clone();
    
    match action {
        "add" => {
            // Check if import already exists
            let import_stmt = format!("import {}", import);
            if !content.contains(&import_stmt) {
                // Find the last import statement
                let import_section_regex = Regex::new(r"(?m)^import.*$").unwrap();
                let last_import_match = import_section_regex.find_iter(&content).last();
                
                if let Some(last_import) = last_import_match {
                    // Insert after the last import
                    let insert_position = last_import.end();
                    new_content.insert_str(insert_position, &format!("\nimport {};", import));
                } else {
                    // No imports found, add at the beginning
                    new_content = format!("import {};\n\n{}", import, content);
                }
            }
        },
        "remove" => {
            // Remove the import statement
            let import_regex = Regex::new(&format!(r"(?m)^import {}.*$\n?", regex::escape(import))).unwrap();
            new_content = import_regex.replace_all(&content, "").to_string();
        },
        _ => return Err(format!("Unknown import action: {}", action)),
    }
    
    fs::write(path, new_content)
        .map_err(|e| format!("Failed to write to file '{}': {}", path.display(), e))
} 