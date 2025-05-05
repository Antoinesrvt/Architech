#![cfg(feature = "test-binary")]
// Test binary for project generation - excluded from regular builds
// This file needs to be updated to work with the latest Tauri version

#[cfg(feature = "test-binary")]
use std::sync::Arc;
#[cfg(feature = "test-binary")]
use architech::commands::project::{ProjectConfig, ProjectOptions};
#[cfg(feature = "test-binary")]
use architech::state::AppState;
#[cfg(feature = "test-binary")]
use architech::generation::ProjectGenerator;
#[cfg(feature = "test-binary")]
use std::path::PathBuf;
#[cfg(feature = "test-binary")]
use log::LevelFilter;
#[cfg(feature = "test-binary")]
use log::{info, debug, warn, error};

#[cfg(feature = "test-binary")]
#[tokio::main]
async fn main() {
    // Set up logging
    env_logger::builder()
        .filter_level(LevelFilter::Debug)
        .init();
    
    info!("Starting project generation test");
    
    // Create app state
    let app_state = Arc::new(AppState::new());
    app_state.initialize().await.expect("Failed to initialize app state");
    
    // Create a temporary tauri app handle for testing
    // We won't actually use the handle's features, but we need it for the API
    let context = tauri::generate_context!();
    let app = tauri::Builder::default()
        .manage(app_state.clone())
        .build(context)
        .expect("Failed to build test app");
    let app_handle = app.app_handle();
    
    // Create test project config
    let test_dir = std::env::current_dir().expect("Failed to get current directory");
    let project_path = test_dir.join("test-projects").join("test-app");
    
    info!("Creating test project at: {}", project_path.display());
    
    let project_config = ProjectConfig {
        name: "test-app".to_string(),
        path: project_path.to_string_lossy().to_string(),
        framework: "nextjs".to_string(),
        modules: vec!["base".to_string()],
        options: ProjectOptions::default(),
    };
    
    // Create project generator
    let generator = ProjectGenerator::new(app_handle.clone(), app_state.clone());
    
    // Generate a project ID
    let project_id = uuid::Uuid::new_v4().to_string();
    info!("Project ID: {}", project_id);
    
    // Store the config
    app_state.set_project_config(&project_id, project_config).await;
    
    // Initialize and run tasks
    match generator.initialize_and_start(&project_id).await {
        Ok(_) => {
            info!("Project generation started successfully");
            
            // Wait for completion (this is a hack for testing)
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
            
            // Check final status
            let status = app_state.get_project_status(&project_id).await;
            info!("Final project status: {:?}", status);
            
            // Get task states
            let task_states = app_state.get_all_task_states(&project_id).await;
            info!("Task states: {:#?}", task_states);
        },
        Err(e) => {
            error!("Project generation failed: {}", e);
        }
    }
}

#[cfg(not(feature = "test-binary"))]
fn main() {
    // Empty main function for when the feature is not enabled
} 