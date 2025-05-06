#![cfg_attr(feature = "test-binary", allow(dead_code))]
// Test binary for project generation - excluded from regular builds
// This file needs to be updated to work with the latest Tauri version

// Import common libraries regardless of feature flag
use std::sync::Arc;
use architech::state::AppState;

#[cfg(feature = "test-binary")]
use architech::commands::project::{ProjectConfig, ProjectOptions};
#[cfg(feature = "test-binary")]
use architech::generation::ProjectGenerator;
#[cfg(feature = "test-binary")]
use std::path::PathBuf;
#[cfg(feature = "test-binary")]
use log::LevelFilter;
#[cfg(feature = "test-binary")]
use log::{info, debug, warn, error};
#[cfg(feature = "test-binary")]
use tauri::generate_context;
#[cfg(feature = "test-binary")]
use uuid::Uuid;

// The test_generation function is only compiled with test-binary feature
#[cfg(feature = "test-binary")]
async fn test_generation(app_state: Arc<AppState>) {
    // Set up logging
    env_logger::builder()
        .filter_level(LevelFilter::Debug)
        .init();
    
    info!("Starting project generation test");
    
    // Create a temporary tauri app handle for testing
    let context = generate_context!();
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
        path: project_path.parent().unwrap().to_string_lossy().to_string(),
        framework: "nextjs".to_string(),
        modules: vec!["base".to_string()],
        options: ProjectOptions::default(),
        setup_command: None,
    };
    
    // Create project generator
    let generator = ProjectGenerator::new(app_handle.clone(), app_state.clone());
    
    // Generate a project ID
    let project_id = Uuid::new_v4().to_string();
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

// Mock implementation when test-binary feature is not enabled
#[cfg(not(feature = "test-binary"))]
async fn test_generation(_app_state: Arc<AppState>) {
    println!("Test generation disabled. Enable with feature 'test-binary'");
}

// Main function is always compiled, regardless of feature flag
#[tokio::main]
async fn main() {
    println!("Starting test generation application");
    
    // Create app state
    let app_state = Arc::new(AppState::new());
    
    // Initialize state
    let _ = app_state.initialize().await;
    
    // Run test
    test_generation(Arc::clone(&app_state)).await;
    
    println!("Test generation completed");
} 