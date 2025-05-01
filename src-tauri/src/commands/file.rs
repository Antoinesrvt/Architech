use tauri::command;
use std::path::Path;
use tauri::Runtime;
use tauri::AppHandle;
use std::process::Command;

#[command]
pub async fn open_in_folder<R: Runtime>(path: String, _app_handle: AppHandle<R>) -> Result<(), String> {
    // Check if path exists
    let path_buf = Path::new(&path).to_path_buf();
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    // Use platform-specific commands to open the folder
    let result = if cfg!(target_os = "macos") {
        Command::new("open").arg(path).status()
    } else if cfg!(target_os = "windows") {
        Command::new("explorer").arg(path).status()
    } else if cfg!(target_os = "linux") {
        Command::new("xdg-open").arg(path).status()
    } else {
        return Err("Unsupported operating system".to_string());
    };
    
    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open folder: {}", e)),
    }
} 