use std::process::{Command, Output, Stdio};
use std::path::Path;
use std::fs;
use std::io::{self, Write};
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
    println!("Running command: {} {:?}", command, args);
    
    let mut cmd = Command::new(command);
    cmd.args(args).current_dir(working_dir);
    
    // Add environment variables if provided
    if let Some(vars) = env_vars {
        for (key, value) in vars {
            cmd.env(key, value);
        }
    }
    
    // Run the command
    match cmd.output() {
        Ok(output) => {
            if !output.status.success() {
                let error = String::from_utf8_lossy(&output.stderr).to_string();
                return Err(format!("Command failed: {}", error));
            }
            Ok(output)
        },
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}

/// Runs an interactive command, handling stdin/stdout for automated interactions
pub async fn run_interactive_command(
    command: &str,
    args: &[&str],
    working_dir: &Path,
    responses: &[(&str, &str)]
) -> Result<(), String> {
    println!("Running interactive command: {} {:?}", command, args);
    
    // Create command with piped stdin/stdout
    let mut cmd = Command::new(command);
    cmd.args(args)
        .current_dir(working_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    // Spawn the command
    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(e) => return Err(format!("Failed to execute command: {}", e)),
    };
    
    // Get handles to stdin and stdout
    let mut stdin = child.stdin.take().expect("Failed to open stdin");
    let mut stdout = io::BufReader::new(child.stdout.take().expect("Failed to open stdout"));
    
    // Buffer for reading stdout
    let mut buffer = [0; 1024];
    
    // Process each expected prompt and provide the response
    for (prompt, response) in responses {
        // Read until we find the prompt
        let mut found_prompt = false;
        let mut output_str = String::new();
        
        while !found_prompt {
            match stdout.read(&mut buffer) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buffer[0..n]);
                    output_str.push_str(&chunk);
                    
                    // Check if our prompt is in the output
                    if output_str.contains(prompt) {
                        found_prompt = true;
                    }
                },
                Err(e) => return Err(format!("Error reading from stdout: {}", e)),
            }
        }
        
        // Write our response
        if found_prompt {
            writeln!(stdin, "{}", response).map_err(|e| format!("Failed to write to stdin: {}", e))?;
        }
    }
    
    // Wait for the process to complete
    let status = child.wait().map_err(|e| format!("Error waiting for command to complete: {}", e))?;
    
    if status.success() {
        Ok(())
    } else {
        Err(format!("Command failed with exit code: {:?}", status.code()))
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

/// Emit progress events to the frontend
pub fn emit_progress(app_handle: &AppHandle, step: &str, message: &str, progress: f32) {
    let _ = app_handle.emit("generation-progress", serde_json::json!({
        "step": step,
        "message": message,
        "progress": progress,
    }));
} 