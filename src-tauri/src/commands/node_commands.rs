//! Node.js command execution utilities
//! 
//! This module provides utilities for executing Node.js commands via the sidecar

use std::path::Path;
use log::{info, warn};
use tauri::{AppHandle, Manager, Runtime, Emitter, Listener};
use tauri_plugin_shell::ShellExt;
use serde::{Deserialize, Serialize};
use tauri_plugin_shell::process::CommandEvent;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use once_cell::sync::Lazy;

/// Result of a Node.js command execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    /// Standard output
    pub stdout: String,
    /// Standard error
    pub stderr: String,
    /// Exit code
    pub exit_code: i32,
    /// Whether the command succeeded (exit code 0)
    pub success: bool,
}

/// Event emitted during command execution
#[derive(Debug, Clone, Serialize)]
pub enum NodeCommandEvent {
    /// Output from stdout
    Stdout(String),
    /// Output from stderr
    Stderr(String),
    /// Command has completed
    Completed {
        /// Exit code of the command
        exit_code: i32,
        /// Whether the command succeeded
        success: bool,
    },
    /// Command encountered an error
    Error(String),
}

// Track active command processes
static ACTIVE_COMMANDS: Lazy<Arc<Mutex<HashMap<String, CommandTracker>>>> = Lazy::new(|| {
    Arc::new(Mutex::new(HashMap::new()))
});

/// Tracks a command's resources for cleanup
struct CommandTracker {
    unlisten_fn: Box<dyn FnOnce() + Send + 'static>,
}

/// Execute a Node.js command using the sidecar
/// 
/// This function executes a Node.js command using the Node.js sidecar,
/// which allows running Node.js commands without requiring Node.js to be
/// installed on the end user's machine.
/// 
/// # Arguments
/// 
/// * `app_handle` - The Tauri app handle
/// * `working_dir` - The working directory where the command should be executed
/// * `command` - The command to execute (e.g., "npm install", "npx create-next-app", etc.)
/// 
/// # Returns
/// 
/// A result containing the command output or an error message
pub async fn execute_node_command(
    app_handle: &AppHandle,
    working_dir: &Path,
    command: &str,
) -> Result<CommandResult, String> {
    info!("Executing Node.js command: {}", command);
    
    // Validate the working directory
    if !working_dir.exists() {
        let error = format!("Working directory does not exist: {}", working_dir.display());
        warn!("{}", error);
        return Err(error);
    }
    
    // Validate the command
    if command.trim().is_empty() {
        let error = "Command cannot be empty".to_string();
        warn!("{}", error);
        return Err(error);
    }
    
    // Build and execute the sidecar command
    let sidecar = app_handle.shell().sidecar("binaries/nodejs-sidecar")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?;
        
    // Use output() to get the full result
    let output = sidecar
        .args([working_dir.to_string_lossy().to_string(), command.to_string()])
        .output()
        .await
        .map_err(|e| format!("Failed to execute Node.js sidecar: {}", e))?;
    
    let stdout = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to parse stdout: {}", e))?;
    let stderr = String::from_utf8(output.stderr)
        .map_err(|e| format!("Failed to parse stderr: {}", e))?;
    let exit_code = output.status.code().unwrap_or(-1);
    let success = exit_code == 0;
    
    let command_result = CommandResult {
        stdout,
        stderr,
        exit_code,
        success,
    };
    
    Ok(command_result)
}

/// Execute a Node.js command with real-time streaming
/// 
/// This function executes a Node.js command and streams the output
/// in real-time via Tauri events.
/// 
/// # Arguments
/// 
/// * `app_handle` - The Tauri app handle
/// * `working_dir` - The working directory where the command should be executed
/// * `command` - The command to execute (e.g., "npm install", "npx create-next-app", etc.)
/// * `event_name` - The name of the event to emit for streaming output
/// 
/// # Returns
/// 
/// A result containing the command result or an error message
pub async fn execute_node_command_streaming<R: Runtime>(
    app_handle: &AppHandle<R>,
    working_dir: &Path,
    command: &str,
    event_name: &str,
) -> Result<CommandResult, String> {
    info!("Executing Node.js command with streaming: {}", command);
    
    // Validate the working directory
    if !working_dir.exists() {
        let error = format!("Working directory does not exist: {}", working_dir.display());
        warn!("{}", error);
        return Err(error);
    }
    
    // Validate the command
    if command.trim().is_empty() {
        let error = "Command cannot be empty".to_string();
        warn!("{}", error);
        return Err(error);
    }
    
    // Set up cleanup listener for this command
    let listener_id = app_handle.listen("cleanup-resources", {
        let event_name = event_name.to_string();
        let app_handle = app_handle.clone();
        move |_| {
            info!("Cleaning up resources for command event: {}", event_name);
            let mut commands = ACTIVE_COMMANDS.lock().unwrap();
            if let Some(tracker) = commands.remove(&event_name) {
                drop(tracker.unlisten_fn); // Call the unlisten function
            }
        }
    });
    
    // Create the sidecar command
    let sidecar = app_handle.shell().sidecar("binaries/nodejs-sidecar")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?;
        
    // Set up the command with arguments
    let mut command_with_args = sidecar.args([
        working_dir.to_string_lossy().to_string(), 
        command.to_string()
    ]);
    
    // Spawn the command
    let (mut rx, _child) = command_with_args.spawn()
        .map_err(|e| format!("Failed to spawn Node.js sidecar: {}", e))?;
    
    let mut stdout_buffer = String::new();
    let mut stderr_buffer = String::new();
    let mut final_exit_code = -1;
    let mut success = false;
    
    // Process events
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line).to_string();
                stdout_buffer.push_str(&line_str);
                stdout_buffer.push('\n');
                
                // Forward stdout to the event system
                app_handle.emit(
                    event_name,
                    NodeCommandEvent::Stdout(line_str),
                ).map_err(|e| format!("Failed to emit stdout event: {}", e))?;
            },
            CommandEvent::Stderr(line) => {
                let line_str = String::from_utf8_lossy(&line).to_string();
                stderr_buffer.push_str(&line_str);
                stderr_buffer.push('\n');
                
                // Forward stderr to the event system
                app_handle.emit(
                    event_name,
                    NodeCommandEvent::Stderr(line_str),
                ).map_err(|e| format!("Failed to emit stderr event: {}", e))?;
            },
            CommandEvent::Error(err) => {
                app_handle.emit(
                    event_name,
                    NodeCommandEvent::Error(err.to_string()),
                ).map_err(|e| format!("Failed to emit error event: {}", e))?;
            },
            CommandEvent::Terminated(status) => {
                final_exit_code = status.code.unwrap_or(-1);
                success = final_exit_code == 0;
                
                app_handle.emit(
                    event_name,
                    NodeCommandEvent::Completed {
                        exit_code: final_exit_code,
                        success,
                    },
                ).map_err(|e| format!("Failed to emit completion event: {}", e))?;
            },
            _ => {
                // Handle any future variants that might be added to the CommandEvent enum
            }
        }
    }
    
    let command_result = CommandResult {
        stdout: stdout_buffer,
        stderr: stderr_buffer,
        exit_code: final_exit_code,
        success,
    };
    
    // Store the unlisten function for cleanup
    let unlisten_fn = Box::new({
        let app_handle = app_handle.clone();
        move || {
            app_handle.unlisten(listener_id);
        }
    });
    
    // Register this command for cleanup
    {
        let mut commands = ACTIVE_COMMANDS.lock().unwrap();
        commands.insert(event_name.to_string(), CommandTracker {
            unlisten_fn,
        });
    }
    
    // Clean up resources after completion
    {
        let mut commands = ACTIVE_COMMANDS.lock().unwrap();
        commands.remove(event_name);
    }
    
    Ok(command_result)
}

/// Tauri command to execute a Node.js command
/// 
/// This function is exposed as a Tauri command and can be called from the frontend.
#[tauri::command]
pub async fn run_node_command(
    app_handle: AppHandle,
    working_dir: String,
    command: String,
) -> Result<CommandResult, String> {
    execute_node_command(&app_handle, &Path::new(&working_dir), &command).await
}

/// Tauri command to execute a Node.js command with real-time output streaming
/// 
/// This function is exposed as a Tauri command and can be called from the frontend.
/// It streams output in real-time via Tauri events.
/// 
/// The event name will be used as a base for the event, with the provided 
/// command ID appended to make it unique.
#[tauri::command]
pub async fn run_node_command_streaming(
    app_handle: AppHandle,
    working_dir: String,
    command: String,
    command_id: String,
) -> Result<CommandResult, String> {
    let event_name = format!("node-command-{}", command_id);
    execute_node_command_streaming(&app_handle, &Path::new(&working_dir), &command, &event_name).await
}

/// Clean up resources for node commands
/// 
/// This function is exposed as a Tauri command and can be called from the frontend
/// to explicitly clean up resources when needed.
#[tauri::command]
pub fn cleanup_command_resources(command_id: Option<String>) -> Result<(), String> {
    match command_id {
        Some(id) => {
            let event_name = format!("node-command-{}", id);
            let mut commands = ACTIVE_COMMANDS.lock().unwrap();
            if let Some(tracker) = commands.remove(&event_name) {
                drop(tracker.unlisten_fn);
                info!("Cleaned up resources for command: {}", event_name);
            } else {
                warn!("No resources found for command: {}", event_name);
            }
        },
        None => {
            // Clean up all resources
            let mut commands = ACTIVE_COMMANDS.lock().unwrap();
            let count = commands.len();
            commands.clear();
            info!("Cleaned up all resources for {} commands", count);
        }
    }
    
    Ok(())
} 