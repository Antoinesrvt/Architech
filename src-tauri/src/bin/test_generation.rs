use std::sync::Arc;
use tailwind_tauri_template::commands::project::{ProjectConfig, ProjectOptions};
use tailwind_tauri_template::state::AppState;
use tailwind_tauri_template::generation::ProjectGenerator;

#[tokio::main]
async fn main() -> Result<(), String> {
    // Setup logging
    env_logger::init();
    
    println!("Starting test generation tool...");
    
    // Create and initialize app state
    let app_state = Arc::new(AppState::new());
    app_state.initialize().await?;
    
    // Create app handle mock
    let config = tauri::Config::default();
    let context = tauri::Context::new(config.clone(), None, None, None, Default::default(), config.package.clone().into(), None);
    let app = tauri::App::new(context);
    let app_handle = app.handle();
    
    // Create a project generator
    let generator = ProjectGenerator::new(app_handle.clone(), app_state.clone());
    
    // Create a test config
    let config = ProjectConfig {
        name: "test-project".to_string(),
        path: "/tmp".to_string(), // Adjust this for your OS
        framework: "nextjs".to_string(),
        modules: vec!["tailwind".to_string()],
        options: ProjectOptions {
            typescript: true,
            app_router: true,
            eslint: true,
        }
    };
    
    println!("Starting generation with config: {:?}", config);
    
    // Start generation
    match generator.start_generation(config).await {
        Ok(project_id) => {
            println!("Generation started successfully with ID: {}", project_id);
            
            // Wait a bit to let tasks execute
            println!("Waiting for tasks to execute...");
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            
            // Get status
            let status = app_state.get_project_status(&project_id).await;
            println!("Current status: {:?}", status);
            
            // Get logs
            let logs = app_state.get_logs(&project_id).await;
            println!("Logs:");
            for log in logs {
                println!("  {}: {}", log.timestamp, log.message);
            }
        },
        Err(e) => {
            println!("Failed to start generation: {}", e);
        }
    }
    
    println!("Test complete.");
    Ok(())
} 