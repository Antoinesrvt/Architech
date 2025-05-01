use serde::{Serialize, Deserialize};
use tauri::command;
use std::fs;
use std::error::Error;
use dirs;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Framework {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    #[serde(rename = "type")]
    pub framework_type: String,
    pub tags: Vec<String>,
    pub cli: FrameworkCli,
    pub compatible_modules: Vec<String>,
    pub directory_structure: DirectoryStructure,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FrameworkCli {
    pub base_command: String,
    #[serde(default)]
    pub arguments: serde_json::Map<String, serde_json::Value>,
    #[serde(default)]
    pub interactive: bool,
    #[serde(default)]
    pub responses: Vec<CliResponse>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CliResponse {
    pub prompt: String,
    #[serde(default)]
    pub response: String,
    #[serde(default)]
    pub use_project_name: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DirectoryStructure {
    pub enforced: bool,
    pub directories: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Module {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub category: String,
    pub dependencies: Vec<String>,
    pub incompatible_with: Vec<String>,
    pub installation: ModuleInstallation,
    pub configuration: ModuleConfiguration,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModuleInstallation {
    pub commands: Vec<String>,
    pub file_operations: Vec<FileOperation>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileOperation {
    pub operation: String,
    pub path: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub pattern: String,
    #[serde(default)]
    pub replacement: String,
    #[serde(default)]
    pub action: String,
    #[serde(default)]
    pub import: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModuleConfiguration {
    pub options: Vec<ModuleOption>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModuleOption {
    pub id: String,
    #[serde(rename = "type")]
    pub option_type: String,
    pub label: String,
    pub description: String,
    pub default: serde_json::Value,
    #[serde(default)]
    pub choices: Vec<OptionChoice>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OptionChoice {
    pub value: String,
    pub label: String,
}

fn read_json_from_data<T: for<'de> serde::Deserialize<'de>>(file_path: &str) -> Result<Vec<T>, Box<dyn Error>> {
    // Use current dir as a fallback
    let current_dir = std::env::current_dir().unwrap_or_default();
    println!("Current directory: {}", current_dir.display());
    let mut paths = Vec::new();
    
    // Try standard directories for resources
    // 1. Use the resources directory (next to the executable)
    if let Some(exe_dir) = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf())) {
        let resource_path = exe_dir.join("resources").join("data").join(file_path);
        println!("Checking executable resources path: {}", resource_path.display());
        paths.push(resource_path);
    }
    
    // 2. Use the app config directory
    if let Some(config_dir) = dirs::config_dir() {
        let app_name = tauri::Config::default().identifier.clone();
        let config_path = config_dir.join(app_name).join("data").join(file_path);
        println!("Checking config directory path: {}", config_path.display());
        paths.push(config_path);
    }
    
    // 3. Look for a parent directory in dev mode
    // When running in dev mode, the current directory might be src-tauri
    // So we need to check one level up
    let parent_dir = current_dir.parent().unwrap_or(&current_dir);
    let parent_path = parent_dir.join("data").join(file_path);
    println!("Checking parent directory path: {}", parent_path.display());
    paths.push(parent_path);
    
    // 4. Current directory fallback
    let current_path = current_dir.join("data").join(file_path);
    println!("Checking current directory path: {}", current_path.display());
    paths.push(current_path);
    
    for path in paths {
        println!("Attempting to read from: {}", path.display());
        if path.exists() {
            println!("Found file at path: {}", path.display());
            let content = fs::read_to_string(&path)?;
            let data: Vec<T> = serde_json::from_str(&content)?;
            return Ok(data);
        } else {
            println!("File not found at: {}", path.display());
        }
    }
    
    Err(format!("Could not find file: {}", file_path).into())
}

#[command]
pub async fn get_frameworks() -> Result<Vec<Framework>, String> {
    // Look in all framework files in the data/frameworks directory
    // Each file can contain multiple frameworks
    let mut all_frameworks = Vec::new();
    
    // List of framework files to try
    let framework_files = vec![
        "frameworks/web.json",
        "frameworks/app.json",
        "frameworks/desktop.json"
    ];
    
    for file in framework_files {
        match read_json_from_data::<Framework>(file) {
            Ok(frameworks) => {
                all_frameworks.extend(frameworks);
            },
            Err(e) => {
                println!("Warning: Failed to read {}: {}", file, e);
                // Continue trying other files
            }
        }
    }
    
    if all_frameworks.is_empty() {
        // Fallback to default framework if no frameworks found
        let framework = Framework {
            id: "nextjs".to_string(),
            name: "Next.js".to_string(),
            description: "React framework for production".to_string(),
            version: "13.4.0".to_string(),
            framework_type: "web".to_string(),
            tags: vec!["react".to_string(), "typescript".to_string(), "frontend".to_string()],
            cli: FrameworkCli {
                base_command: "npx create-next-app@latest".to_string(),
                arguments: serde_json::Map::new(),
                interactive: false,
                responses: Vec::new(),
            },
            compatible_modules: vec!["tailwind".to_string(), "i18n".to_string()],
            directory_structure: DirectoryStructure {
                enforced: true,
                directories: vec!["src".to_string(), "public".to_string()],
            },
        };
        
        all_frameworks.push(framework);
    }
    
    Ok(all_frameworks)
}

#[command]
pub async fn get_modules() -> Result<Vec<Module>, String> {
    // Look in all module files in the data/modules directory
    // Each file can contain multiple modules for a specific category
    let mut all_modules = Vec::new();
    
    // List of module files to try
    let module_files = vec![
        "modules/styling.json",
        "modules/ui.json",
        "modules/state.json",
        "modules/i18n.json",
        "modules/forms.json",
        "modules/testing.json",
        "modules/advanced.json",
    ];
    
    for file in module_files {
        match read_json_from_data::<Module>(file) {
            Ok(modules) => {
                all_modules.extend(modules);
            },
            Err(e) => {
                println!("Warning: Failed to read {}: {}", file, e);
                // Continue trying other files
            }
        }
    }
    
    if all_modules.is_empty() {
        // Fallback to default module if no modules found
        eprintln!("Warning: No modules found, using fallback module");
        
        let module = Module {
            id: "tailwind".to_string(),
            name: "Tailwind CSS".to_string(),
            description: "A utility-first CSS framework".to_string(),
            version: "3.3.2".to_string(),
            category: "styling".to_string(),
            dependencies: vec![],
            incompatible_with: vec![],
            installation: ModuleInstallation {
                commands: vec![
                    "npm install -D tailwindcss postcss autoprefixer".to_string(),
                    "npx tailwindcss init -p".to_string(),
                ],
                file_operations: vec![
                    FileOperation {
                        operation: "create".to_string(),
                        path: "src/styles/globals.css".to_string(),
                        content: "@tailwind base;\n@tailwind components;\n@tailwind utilities;".to_string(),
                        pattern: "".to_string(),
                        replacement: "".to_string(),
                        action: "".to_string(),
                        import: "".to_string(),
                    }
                ],
            },
            configuration: ModuleConfiguration {
                options: vec![
                    ModuleOption {
                        id: "jit".to_string(),
                        option_type: "boolean".to_string(),
                        label: "JIT Mode".to_string(),
                        description: "Enable JIT mode".to_string(),
                        default: serde_json::json!(true),
                        choices: vec![],
                    }
                ],
            },
        };
        
        all_modules.push(module);
    }
    
    Ok(all_modules)
}

// Helper function to get a specific framework by ID
pub async fn get_framework_by_id(id: &str) -> Result<Framework, String> {
    let frameworks = get_frameworks().await?;
    frameworks.into_iter()
        .find(|f| f.id == id)
        .ok_or_else(|| format!("Framework with ID '{}' not found", id))
}

// Helper function to get a specific module by ID
#[allow(dead_code)]
pub async fn get_module_by_id(id: &str) -> Result<Module, String> {
    let modules = get_modules().await?;
    modules.into_iter()
        .find(|m| m.id == id)
        .ok_or_else(|| format!("Module with ID '{}' not found", id))
}

// For backward compatibility: rename of get_frameworks
#[command]
pub async fn get_templates() -> Result<Vec<Framework>, String> {
    get_frameworks().await
} 