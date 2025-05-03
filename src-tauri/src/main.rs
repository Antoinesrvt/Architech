// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
use std::sync::Arc;
use crate::commands::*;
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
                            log::debug!("Emitting generation-progress event to frontend: {}% - {}", progress, step);
                            let _ = app_handle.emit("generation-progress", serde_json::json!({
                                "step": step,
                                "message": format!("Progress: {}% - {}", progress, step),
                                "progress": *progress as f32 / 100.0
                            }));
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
                            let _ = app_handle.emit("task-state-changed", serde_json::json!({
                                "project_id": project_id,
                                "task_id": task_id,
                                "state": task_state_json
                            }));
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
            
            // System commands
            browse_directory,
            open_in_editor,
            open_in_folder,
            
            // Node.js commands
            run_node_command,
            run_node_command_streaming,
            cleanup_command_resources,
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
