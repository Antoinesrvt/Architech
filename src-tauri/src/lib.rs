// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::time::{SystemTime, UNIX_EPOCH};

// Import our commands and modules
mod commands;
pub mod state;
pub mod generation;

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
    .manage(state::AppState::default())
    .invoke_handler(tauri::generate_handler![
      greet,
      // Framework commands
      get_templates,
      get_frameworks,
      get_modules,
      // Project commands
      validate_project_config,
      generate_project,
      get_project_status,
      get_project_logs,
      cancel_project_generation,
      // System commands
      browse_directory,
      open_in_editor,
      open_in_folder,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
