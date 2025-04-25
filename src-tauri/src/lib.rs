// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::time::{SystemTime, UNIX_EPOCH};

// Import our commands
mod commands;
use commands::*;

#[tauri::command]
fn greet() -> String {
  let now = SystemTime::now();
  let epoch_ms = now.duration_since(UNIX_EPOCH).unwrap().as_millis();
  format!("Hello world from Rust! Current epoch: {}", epoch_ms)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      greet,
      // Template commands
      get_templates,
      get_modules,
      // Project commands
      validate_project_config,
      generate_project,
      // System commands
      browse_directory,
      open_in_editor,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
