use tauri::command;
use std::process::{Command as ProcessCommand};
use tauri::Runtime;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use std::sync::{Arc, Mutex};

#[command]
pub async fn browse_directory<R: Runtime>(title: String, app_handle: AppHandle<R>) -> Result<String, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    
    // Use the dialog API through the app_handle
    app_handle.dialog()
        .file()
        .set_directory("/") // Set a default starting directory
        .set_title(title)
        .pick_folder(move |path_opt| {
            // Send the result through the channel
            let _ = tx.send(path_opt);
        });
    
    // Wait for the result from the channel with a longer timeout
    // Use a timeout to avoid deadlocks if the dialog is closed without selection
    let timeout = std::time::Duration::from_secs(60); // 60 second timeout
    match rx.recv_timeout(timeout) {
        Ok(Some(path)) => Ok(path.to_string()),
        Ok(None) => Err("No directory selected".to_string()),
        Err(_) => Err("Directory selection timed out or was cancelled".to_string()),
    }
}

#[command]
pub async fn open_in_editor(path: String, editor: Option<String>) -> Result<bool, String> {
    let editor_cmd = editor.unwrap_or_else(|| "code".to_string());
    
    let status = ProcessCommand::new(editor_cmd)
        .arg(path)
        .status()
        .map_err(|e| format!("Failed to open editor: {}", e))?;
    
    Ok(status.success())
} 