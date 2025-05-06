// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
use std::sync::Arc;
use crate::commands::*;
use crate::commands::node_commands::*;
use crate::state::AppState;
use tauri::{Emitter, Manager};
use tauri_plugin_log::Builder as LogBuilder;
use std::sync::Once;
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use tauri_plugin_shell::process::{Command, CommandEvent};
use tauri_plugin_log::{Target as LogTarget};
use chrono::{Duration, Utc};

mod commands;
mod state;
mod generation;
mod tasks;

// Add a one-time debug flag to log detailed event info
static DETAILED_DEBUG: Once = Once::new();

async fn initialize_app_state() -> Result<Arc<AppState>, String> {
    // Create and initialize app state
    let app_state = Arc::new(AppState::new());
    app_state.initialize().await?;
    Ok(app_state)
}

#[tauri::command]
async fn test_node_sidecar(app_handle: tauri::AppHandle) -> Result<String, String> {
    // Use the current working directory instead of app_dir which doesn't exist
    let working_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    log::info!("Testing Node.js sidecar with working directory: {}", working_dir.display());
    log::info!("Executing 'node -v' command to test sidecar");
    
    // Try to look for the sidecar file
    let expected_sidecar_path = working_dir.join("binaries").join("nodejs-sidecar");
    log::info!("Expected sidecar path: {}", expected_sidecar_path.display());
    if !expected_sidecar_path.exists() {
        log::warn!("Sidecar file not found at expected path!");
    } else {
        log::info!("Sidecar file found at expected path, size: {} bytes", 
            std::fs::metadata(&expected_sidecar_path).map(|m| m.len()).unwrap_or(0));
    }
    
    let result = commands::node_commands::execute_node_command(
        &app_handle,
        &working_dir,
        "node -v",
        None
    ).await?;
    
    if result.success {
        Ok(format!("Node.js version: {}", result.stdout.trim()))
    } else {
        Err(format!("Error: {} (exit code: {})", result.stderr, result.exit_code))
    }
}

#[tauri::command]
async fn get_task_diagnostic(app_handle: tauri::AppHandle, project_id: String) -> Result<String, String> {
    // Get the AppState from manage
    let app_state = app_handle.state::<Arc<AppState>>();
    
    // Build diagnostic information using app_state public methods
    let mut result = String::new();
    result.push_str(&format!("Project ID: {}\n", project_id));
    
    // Get project status
    let status = app_state.get_project_status(&project_id).await;
    result.push_str(&format!("Project status: {:?}\n", status));
    
    // Get task states
    let task_states = app_state.get_all_task_states(&project_id).await;
    result.push_str(&format!("Total tasks: {}\n\n", task_states.len()));
    
    // Get task metadata
    let task_metadata = app_state.get_task_metadata(&project_id).await;
    
    // List all tasks with their states
    for (task_id, state) in &task_states {
        result.push_str(&format!("Task ID: {}\n", task_id));
        
        if let Some(metadata) = task_metadata.get(task_id) {
            result.push_str(&format!("  Name: {}\n", metadata.name));
            result.push_str(&format!("  Dependencies: {:?}\n", metadata.dependencies));
        } else {
            result.push_str("  Metadata: Not found\n");
        }
        
        result.push_str(&format!("  State: {:?}\n", state));
        result.push_str("\n");
    }
    
    Ok(result)
}

// Add this helper function before main
fn log_event_emission(event_name: &str, data: &impl std::fmt::Debug) {
    log::info!("🔔 EMITTING EVENT: {} with data: {:?}", event_name, data);
}

// Register the event listeners
fn register_event_listeners(app_handle: &tauri::AppHandle, app_state: Arc<AppState>) {
    // Create a channel for events
    let mut rx = app_state.subscribe();
    let handle = app_handle.clone();
    
    // Spawn a background task to listen for events
    tauri::async_runtime::spawn(async move {
        while let Ok(event) = rx.recv().await {
            match event {
                crate::state::ProjectEvent::TaskStateChanged { project_id, task_id, state } => {
                    // Convert state to a format suitable for JSON
                    let state_str = match &state {
                        crate::tasks::TaskState::Pending => "Pending".to_string(),
                        crate::tasks::TaskState::Running => "Running".to_string(),
                        crate::tasks::TaskState::Completed => "Completed".to_string(),
                        crate::tasks::TaskState::Failed(msg) => format!("Failed: {}", msg),
                    };
                    
                    // Emit the event to the frontend
                    log::debug!("Emitting task-state-changed event for task {} with state {}", task_id, state_str);
                    
                    if let Err(e) = handle.emit("task-state-changed", serde_json::json!({
                        "project_id": project_id,
                        "task_id": task_id,
                        "state": state_str
                    })) {
                        log::error!("Failed to emit task-state-changed event: {}", e);
                    }
                },
                crate::state::ProjectEvent::Started { project_id } => {
                    if let Err(e) = handle.emit("generation-started", project_id) {
                        log::error!("Failed to emit generation-started event: {}", e);
                    }
                },
                crate::state::ProjectEvent::Progress { project_id, step, progress } => {
                    if let Err(e) = handle.emit("generation-progress", serde_json::json!({
                        "project_id": project_id,
                        "step": step,
                        "progress": progress as f32 / 100.0,
                        "message": format!("{}% - {}", progress, step)
                    })) {
                        log::error!("Failed to emit generation-progress event: {}", e);
                    }
                },
                crate::state::ProjectEvent::Completed { project_id, path } => {
                    if let Err(e) = handle.emit("generation-complete", project_id) {
                        log::error!("Failed to emit generation-complete event: {}", e);
                    }
                },
                crate::state::ProjectEvent::Failed { project_id, error, resumable } => {
                    if let Err(e) = handle.emit("generation-failed", serde_json::json!([project_id, error])) {
                        log::error!("Failed to emit generation-failed event: {}", e);
                    }
                },
                crate::state::ProjectEvent::Cancelled { project_id } => {
                    if let Err(e) = handle.emit("generation-cancelled", project_id) {
                        log::error!("Failed to emit generation-cancelled event: {}", e);
                    }
                },
                crate::state::ProjectEvent::LogMessage { project_id, message } => {
                    if let Err(e) = handle.emit("log-message", serde_json::json!({
                        "project_id": project_id,
                        "message": message
                    })) {
                        log::error!("Failed to emit log-message event: {}", e);
                    }
                },
                crate::state::ProjectEvent::TaskInitializationStarted { project_id } => {
                    if let Err(e) = handle.emit("task-initialization-started", serde_json::json!({
                        "project_id": project_id
                    })) {
                        log::error!("Failed to emit task-initialization-started event: {}", e);
                    }
                },
                crate::state::ProjectEvent::TaskInitializationProgress { project_id, message } => {
                    if let Err(e) = handle.emit("task-initialization-progress", serde_json::json!({
                        "project_id": project_id,
                        "message": message
                    })) {
                        log::error!("Failed to emit task-initialization-progress event: {}", e);
                    }
                },
                crate::state::ProjectEvent::TaskInitializationCompleted { project_id, task_count, task_names } => {
                    if let Err(e) = handle.emit("task-initialization-completed", serde_json::json!({
                        "project_id": project_id,
                        "task_count": task_count,
                        "task_names": task_names
                    })) {
                        log::error!("Failed to emit task-initialization-completed event: {}", e);
                    }
                },
                crate::state::ProjectEvent::TaskInitializationFailed { project_id, reason } => {
                    if let Err(e) = handle.emit("task-initialization-failed", serde_json::json!({
                        "project_id": project_id,
                        "reason": reason
                    })) {
                        log::error!("Failed to emit task-initialization-failed event: {}", e);
                    }
                },
            }
        }
    });
}

fn main() {
    // Remove manual env var setting and use the plugin properly
    // std::env::set_var("RUST_LOG", "debug,tailwind_tauri_template=debug");
    // env_logger::init();
    
    log::info!("Starting Tauri application");
    
    // Initialize the app state in the main thread
    log::debug!("Initializing app state");
    let app_state = match tauri::async_runtime::block_on(initialize_app_state()) {
        Ok(state) => {
            log::info!("App state initialized successfully");
            state
        },
        Err(e) => {
            eprintln!("Failed to initialize app state: {}", e);
            return;
        }
    };
    
    tauri::Builder::default()
        .plugin(
            LogBuilder::new()
                .level(log::LevelFilter::Debug)
                .build()
        )
        .manage(app_state.clone())
        .setup(move |app| {
            // Set up event listeners for debugging
            let app_handle = app.handle().clone();
            let state_clone = app_state.clone();
            
            // Register event listeners
            register_event_listeners(&app_handle, state_clone.clone());
            
            // Add window event handlers for resource cleanup
            let app_handle = app.handle();
            
            // Set up once the main window is created
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            let app_handle_clone = app_handle.clone();
            
            // Set up cleanup on window close
            window.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::CloseRequested { .. } => {
                        // Clean up event listeners and resources
                        let _ = app_handle_clone.emit("cleanup-resources", ());
                    },
                    // Also clean up on navigation
                    tauri::WindowEvent::Destroyed => {
                        let _ = app_handle_clone.emit("cleanup-resources", ());
                    },
                    _ => {}
                }
            });
            
            // No need for separate on_navigation since we're handling it in window events
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Framework/Module commands
            get_frameworks,
            get_templates,
            get_modules,
            
            // Project commands
            validate_project_config,
            generate_project,
            initialize_project_tasks,
            get_project_status,
            get_project_logs,
            cancel_project_generation,
            resume_project_generation,
            check_directory_exists,
            
            // System commands
            browse_directory,
            open_in_editor,
            open_in_folder,
            
            // Node.js commands
            run_node_command,
            run_node_command_streaming,
            cleanup_command_resources,
            test_node_sidecar,
            get_task_diagnostic,
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
