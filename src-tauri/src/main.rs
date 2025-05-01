// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
use crate::commands::*;

mod commands;
mod state;
mod generation;

fn main() {
    tauri::Builder::default()
        .manage(state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            // Framework/Module commands
            get_frameworks,
            get_templates,
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
