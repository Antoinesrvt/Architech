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
#[tokio::main]
async fn main() {
    println!("This test binary is currently disabled");
}

// For conditional compilation when the feature is not enabled
#[cfg(not(feature = "test-binary"))]
fn main() {} 