                        crate::state::ProjectEvent::TaskInitializationStarted { project_id } => {
                            log::debug!("Task initialization started: {}", project_id);
                            println!("EMITTING task-initialization-started for project {}", project_id);
                            let _ = app_handle.emit("task-initialization-started", serde_json::json!({
                                "project_id": project_id
                            }));
                        },
                        crate::state::ProjectEvent::TaskInitializationProgress { project_id, message } => {
                            log::debug!("Task initialization progress: {} - {}", project_id, message);
                            println!("EMITTING task-initialization-progress for project {}: {}", project_id, message);
                            let _ = app_handle.emit("task-initialization-progress", serde_json::json!({
                                "project_id": project_id,
                                "message": message
                            }));
                        },
                        crate::state::ProjectEvent::TaskInitializationCompleted { project_id, task_count, task_names } => {
                            log::debug!("Task initialization completed: {} - {} tasks", project_id, task_count);
                            println!("EMITTING task-initialization-completed for project {}: {} tasks", project_id, task_count);
                            let _ = app_handle.emit("task-initialization-completed", serde_json::json!({
                                "project_id": project_id,
                                "task_count": task_count,
                                "task_names": task_names
                            }));
                        },
                        crate::state::ProjectEvent::TaskInitializationFailed { project_id, reason } => {
                            log::debug!("Task initialization failed: {} - {}", project_id, reason);
                            println!("EMITTING task-initialization-failed for project {}: {}", project_id, reason);
                            let _ = app_handle.emit("task-initialization-failed", serde_json::json!({
                                "project_id": project_id,
                                "reason": reason
                            }));
                        }, 
#[tauri::command]
async fn test_node_sidecar(app_handle: tauri::AppHandle) -> Result<String, String> {
    // Use the current working directory instead of app_dir which doesn't exist
    let working_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
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
