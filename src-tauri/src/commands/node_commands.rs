//! Node.js command execution utilities
//! 
//! This module provides utilities for executing Node.js commands via the sidecar

use std::path::Path;
use log::{warn, debug};
use tauri::{AppHandle, Runtime, Emitter};
use tauri_plugin_shell::ShellExt;
use serde::{Deserialize, Serialize};
use tauri_plugin_shell::process::CommandEvent;
use std::collections::HashMap;
use std::sync::Mutex;
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
type CommandId = String;
type CleanupFn = Box<dyn FnOnce() + Send + 'static>;

static ACTIVE_COMMANDS: Lazy<Mutex<HashMap<CommandId, CleanupFn>>> = Lazy::new(|| {
    Mutex::new(HashMap::new())
});

/// Add a command to the active commands map
fn add_command(id: String, cleanup_fn: CleanupFn) {
    let mut commands = ACTIVE_COMMANDS.lock().unwrap();
    commands.insert(id, cleanup_fn);
}

/// Remove a command from the active commands map
fn remove_command(id: &str) -> Result<(), String> {
    let mut commands = ACTIVE_COMMANDS.lock().unwrap();
    if let Some(cleanup_fn) = commands.remove(id) {
        cleanup_fn();
        Ok(())
    } else {
        Err(format!("Command with ID {} not found", id))
    }
}

/// Clear all active commands
fn clear_commands() {
    let mut commands = ACTIVE_COMMANDS.lock().unwrap();
    // Take all cleanup functions and execute them
    let all_commands = std::mem::take(&mut *commands);
    for (_, cleanup_fn) in all_commands {
        cleanup_fn();
    }
}

/// Options for executing a Node.js command
#[derive(Debug, Clone, Default)]
pub struct NodeCommandOptions {
    /// Environment variables to set for the command
    pub env_vars: Option<HashMap<String, String>>,
    /// Whether to use streaming output
    pub streaming: bool,
    /// Event name for streaming output
    pub event_name: Option<String>,
}

/// Validate command inputs
/// 
/// This is a helper function to validate the working directory and command
/// for Node.js command execution.
fn validate_command_inputs(working_dir: &Path, command: &str) -> Result<(), String> {
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
    
    // Validate command security
    validate_command_security(command)?;
    
    Ok(())
}

/// Validate command for security
/// 
/// This checks if the command starts with allowed prefixes and doesn't contain
/// potentially dangerous patterns.
fn validate_command_security(command: &str) -> Result<(), String> {
    // Check if the command starts with an allowed prefix
    let allowed_prefixes = ["npm ", "npx ", "yarn ", "pnpm ", "node "];
    let is_allowed = allowed_prefixes.iter().any(|prefix| command.starts_with(prefix));
    
    if !is_allowed {
        return Err(format!("Command not allowed: {}. Only npm, npx, yarn, pnpm, and node commands are permitted.", command));
    }
    
    // Check for potentially dangerous patterns
    let dangerous_patterns = [
        "&&", "||", ";", "|", ">", "<", "`", "$(",
        "eval", "exec", "system", "spawn"
    ];
    
    for pattern in dangerous_patterns {
        if command.contains(pattern) {
            return Err(format!("Command contains forbidden pattern '{}': {}", pattern, command));
        }
    }
    
    Ok(())
}

/// Prepare a command for execution
/// 
/// This helper function validates and prepares a command for execution,
/// setting up environment variables and the sidecar.
fn prepare_command<R: Runtime>(
    app_handle: &AppHandle<R>,
    working_dir: &Path,
    command: &str,
    env_vars: Option<HashMap<String, String>>
) -> Result<tauri_plugin_shell::process::Command, String> {
    // Validate inputs
    validate_command_inputs(working_dir, command)?;
    
    // Set up environment variables
    let env_vars = env_vars.unwrap_or_default();
    let mut env = HashMap::new();
    
    // Always set CI=true to prevent interactive prompts
    env.insert("CI".to_string(), "true".to_string());
    
    // Add custom environment variables
    for (key, value) in env_vars {
        env.insert(key, value);
    }
    
    // Create and configure the command
    let sidecar = app_handle.shell().sidecar("nodejs-sidecar")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?;
    
    let cmd = sidecar
        .args([working_dir.to_string_lossy().to_string(), command.to_string()])
        .envs(env);
    
    Ok(cmd)
}

/// Execute a Node.js command
/// 
/// This is the main function for executing Node.js commands, handling both basic and streaming execution.
/// 
/// # Arguments
/// 
/// * `app_handle` - The Tauri app handle
/// * `working_dir` - The working directory where the command should be executed
/// * `command` - The command to execute
/// * `options` - Options for command execution
/// 
/// # Returns
/// 
/// Command execution result or error message
pub async fn execute_node_command<R: Runtime>(
    app_handle: &AppHandle<R>,
    working_dir: &Path,
    command: &str,
    options: Option<NodeCommandOptions>,
) -> Result<CommandResult, String> {
    let options = options.unwrap_or_default();
    
    debug!("Executing Node.js command: {} in directory: {}", command, working_dir.display());
    
    // Use streaming if requested
    if options.streaming && options.event_name.is_some() {
        return execute_node_command_streaming(
            app_handle,
            working_dir,
            command,
            options.event_name.as_ref().unwrap(),
        ).await;
    }
    
    // Prepare the command
    let cmd = prepare_command(
        app_handle, 
        working_dir, 
        command, 
        options.env_vars
    )?;
    
    // Execute the command and capture its output
    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to get command output: {}", e))?;
    
    // Parse the output
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);
    let success = exit_code == 0;
    
    Ok(CommandResult {
        stdout,
        stderr,
        exit_code,
        success,
    })
}

/// Execute a Node.js command with streaming output
async fn execute_node_command_streaming<R: Runtime>(
    app_handle: &AppHandle<R>,
    working_dir: &Path,
    command: &str,
    event_name: &str,
) -> Result<CommandResult, String> {
    debug!("Executing Node.js command with streaming: {} in directory: {}", command, working_dir.display());
    
    // Prepare the command
    let cmd = prepare_command(app_handle, working_dir, command, None)?;
    
    // Build output
    let mut stdout_output = String::new();
    let mut stderr_output = String::new();
    
    // Execute the command and collect output
    let (mut rx, mut child) = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn command: {}", e))?;
    
    // Register command for cleanup
    let command_id = event_name.replace("node-command-", "");
    
    // Use the PID as a marker
    let pid = child.pid();
    debug!("Process ID for command: {}", pid);
    
    add_command(command_id.clone(), Box::new(move || {
        if let Err(e) = child.kill() {
            warn!("Failed to kill process {}: {}", pid, e);
        } else {
            debug!("Successfully killed process {}", pid);
        }
    }));
    
    let mut exit_code = 1;
    let mut success = false;
    
    // Process events
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line).to_string();
                stdout_output.push_str(&line_str);
                stdout_output.push('\n');
                app_handle.emit(event_name, NodeCommandEvent::Stdout(line_str))
                    .map_err(|e| format!("Failed to emit stdout event: {}", e))?;
            }
            CommandEvent::Stderr(line) => {
                let line_str = String::from_utf8_lossy(&line).to_string();
                stderr_output.push_str(&line_str);
                stderr_output.push('\n');
                app_handle.emit(event_name, NodeCommandEvent::Stderr(line_str))
                    .map_err(|e| format!("Failed to emit stderr event: {}", e))?;
            }
            CommandEvent::Error(err) => {
                let error_message = format!("Command error: {}", err);
                stderr_output.push_str(&error_message);
                stderr_output.push('\n');
                app_handle.emit(event_name, NodeCommandEvent::Error(error_message))
                    .map_err(|e| format!("Failed to emit error event: {}", e))?;
            }
            CommandEvent::Terminated(terminated) => {
                exit_code = terminated.code.unwrap_or(-1);
                success = exit_code == 0;
                
                // Emit a completion event
                app_handle.emit(
                    event_name,
                    NodeCommandEvent::Completed {
                        exit_code,
                        success,
                    },
                )
                .map_err(|e| format!("Failed to emit completion event: {}", e))?;
                
                debug!("Command completed with exit code: {}", exit_code);
                break;
            }
            _ => {}
        }
    }
    
    // Clean up resources
    remove_command(&command_id).ok();
    
    Ok(CommandResult {
        stdout: stdout_output,
        stderr: stderr_output,
        exit_code,
        success,
    })
}

#[tauri::command]
pub async fn run_node_command(
    app_handle: AppHandle,
    working_dir: String,
    command: String,
) -> Result<CommandResult, String> {
    execute_node_command(
        &app_handle,
        Path::new(&working_dir),
        &command,
        None,
    ).await
}

#[tauri::command]
pub async fn run_node_command_streaming(
    app_handle: AppHandle,
    working_dir: String,
    command: String,
    command_id: String,
) -> Result<CommandResult, String> {
    let event_name = format!("node-command-{}", command_id);
    
    execute_node_command(
        &app_handle,
        Path::new(&working_dir),
        &command,
        Some(NodeCommandOptions {
            streaming: true,
            event_name: Some(event_name),
            env_vars: None,
        }),
    ).await
}

#[tauri::command]
pub fn cleanup_command_resources(command_id: Option<String>) -> Result<(), String> {
    if let Some(id) = command_id {
        remove_command(&id)
    } else {
        clear_commands();
        Ok(())
    }
} 