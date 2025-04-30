// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
use crate::commands::*;

mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_projects,
            add_project,
            edit_project,
            delete_project,
            get_frameworks,
            get_templates,
            get_modules,
            validate_project_config,
            generate_project,
            get_system_info,
            browse_directory,
            open_in_editor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
