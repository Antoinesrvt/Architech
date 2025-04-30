use tauri::command;
use std::process::{Command as ProcessCommand};
use tauri::Runtime;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use std::sync::{Arc, Mutex};

#[command]
pub async fn browse_directory<R: Runtime>(title: String, app_handle: AppHandle<R>) -> Result<String, String> {
    // Use a synchronization mechanism
    let result = Arc::new(Mutex::new(None));
    let result_clone = result.clone();
    
    // Use the dialog API through the app_handle
    app_handle.dialog()
        .file()
        .set_title(title)
        .pick_folder(move |path_opt| {
            let mut result_guard = result_clone.lock().unwrap();
            *result_guard = path_opt;
        });
    
    // Let's give the dialog some time to complete
    std::thread::sleep(std::time::Duration::from_millis(500));
    
    // Get the result
    let path_opt = result.lock().unwrap().clone();
    
    match path_opt {
        Some(path) => Ok(path.to_string()),
        None => Err("No directory selected".to_string())
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