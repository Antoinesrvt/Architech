use tauri::command;
use std::path::PathBuf;
use std::process::{Command as ProcessCommand};

#[command]
pub async fn browse_directory(title: String) -> Result<Option<PathBuf>, String> {
    // In a real implementation, we would use tauri's dialog API here
    // For now, we'll just return None as this functionality depends on the frontend
    Ok(None)
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