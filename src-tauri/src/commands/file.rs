use tauri::command;
use std::path::Path;
use tauri::Runtime;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

#[command]
pub async fn open_in_folder<R: Runtime>(path: String, app_handle: AppHandle<R>) -> Result<(), String> {
    // Check if path exists
    if !Path::new(&path).exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    // Use the shell plugin through the app_handle to open the folder
    app_handle.shell().open(path, None)
        .map_err(|e| format!("Failed to open folder: {}", e))
} 