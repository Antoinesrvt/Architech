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
            
            // Subscribe to project events from state
            let mut event_receiver = app_state.subscribe();
            
            tauri::async_runtime::spawn(async move {
                while let Ok(event) = event_receiver.recv().await {
                    // Log the event
                    log::debug!("PROJECT EVENT: {:?}", event);
                    
                    // Forward events to frontend
                    match &event {
                        crate::state::ProjectEvent::Progress { project_id, step, progress } => {
                            let payload = serde_json::json!({
                                "step": step,
                                "message": format!("Progress: {}% - {}", progress, step),
                                "progress": *progress as f32 / 100.0
                            });
                            log_event_emission("generation-progress", &payload);
                            let result = app_handle.emit("generation-progress", payload);
                            if let Err(e) = &result {
                                log::error!("❌ Failed to emit generation-progress event: {:?}", e);
                            } else {
                                log::debug!("✅ Successfully emitted generation-progress event");
                            }
                        },
                        crate::state::ProjectEvent::Completed { project_id, path } => {
                            log::debug!("Emitting generation-complete event to frontend: {}", project_id);
                            let _ = app_handle.emit("generation-complete", project_id);
                        },
                        crate::state::ProjectEvent::Failed { project_id, error, resumable } => {
                            log::debug!("Emitting generation-failed event to frontend: {} - {}", project_id, error);
                            let _ = app_handle.emit("generation-failed", (project_id, error));
                        },
                        crate::state::ProjectEvent::LogMessage { project_id, message } => {
                            log::debug!("Emitting log-message event to frontend: {}", message);
                            let _ = app_handle.emit("log-message", message);
                        },
                        crate::state::ProjectEvent::Started { project_id } => {
                            log::debug!("Emitting project-started event to frontend: {}", project_id);
                            let _ = app_handle.emit("project-started", project_id);
                        },
                        crate::state::ProjectEvent::TaskStateChanged { project_id, task_id, state } => {
                            log::debug!("Task state changed: {} - {}: {:?}", project_id, task_id, state);
                            // Convert the task state to a format the frontend understands
                            let task_state_json = match state {
                                crate::tasks::TaskState::Pending => "Pending",
                                crate::tasks::TaskState::Running => "Running",
                                crate::tasks::TaskState::Completed => "Completed",
                                crate::tasks::TaskState::Failed(ref msg) => "Failed",
                            };
                            
                            // Emit both events - one for the global system, and one specific for task state changes
                            let payload = serde_json::json!({
                                "project_id": project_id,
                                "task_id": task_id,
                                "state": task_state_json
                            });
                            log_event_emission("task-state-changed", &payload);
                            let result = app_handle.emit("task-state-changed", payload);
                            if let Err(e) = &result {
                                log::error!("❌ Failed to emit task-state-changed event: {:?}", e);
                            } else {
                                log::debug!("✅ Successfully emitted task-state-changed event");
                            }
                        },
                        crate::state::ProjectEvent::TaskInitializationStarted { project_id } => {
                            DETAILED_DEBUG.call_once(|| {
                                println!("===== DETAILED EVENT DEBUGGING ENABLED =====");
                            });
                            
                            println!("EVENT: TaskInitializationStarted for project: {}", project_id);
                            log::info!("Task initialization started for project: {}", project_id);
                            
                            if app_handle.emit("task-initialization-started", 
                                serde_json::json!({ "project_id": project_id })).is_err() {
                                log::error!("Failed to emit task-initialization-started event");
                            } else {
                                println!("SUCCESS: Emitted task-initialization-started to frontend");
                            }
                        },
                        crate::state::ProjectEvent::TaskInitializationProgress { project_id, message } => {
                            println!("EVENT: TaskInitializationProgress for project: {} - {}", project_id, message);
                            log::info!("Task initialization progress for project {}: {}", project_id, message);
                            
                            if app_handle.emit("task-initialization-progress", 
                                serde_json::json!({ "project_id": project_id, "message": message })).is_err() {
                                log::error!("Failed to emit task-initialization-progress event");
                            } else {
                                println!("SUCCESS: Emitted task-initialization-progress to frontend");
                            }
                        },
                        crate::state::ProjectEvent::TaskInitializationCompleted { project_id, task_count, task_names } => {
                            println!("EVENT: TaskInitializationCompleted for project: {} with {} tasks", project_id, task_count);
                            log::info!("Task initialization completed for project {} with {} tasks", project_id, task_count);
                            
                            if app_handle.emit("task-initialization-completed", 
                                serde_json::json!({ "project_id": project_id, "task_count": task_count, "task_names": task_names })).is_err() {
                                log::error!("Failed to emit task-initialization-completed event");
                            } else {
                                println!("SUCCESS: Emitted task-initialization-completed to frontend with {} tasks", task_count);
                            }
                        },
                        crate::state::ProjectEvent::TaskInitializationFailed { project_id, reason } => {
                            println!("EVENT: TaskInitializationFailed for project: {} - {}", project_id, reason);
                            log::error!("Task initialization failed for project {}: {}", project_id, reason);
                            
                            if app_handle.emit("task-initialization-failed", 
                                serde_json::json!({ "project_id": project_id, "reason": reason })).is_err() {
                                log::error!("Failed to emit task-initialization-failed event");
                            } else {
                                println!("SUCCESS: Emitted task-initialization-failed to frontend");
                            }
                        },
                        _ => {
                            log::debug!("Other event: {:?}", event);
                        }
                    }
                }
            });
            
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
