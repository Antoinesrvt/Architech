use serde::{Serialize, Deserialize};
use tauri::command;
use tauri::async_runtime::block_on;
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
    let mut paths = Vec::new();
    
    // Try standard directories for resources
    // 1. Use the resources directory (next to the executable)
    if let Some(exe_dir) = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf())) {
        paths.push(exe_dir.join("resources").join("data").join(file_path));
    }
    
    // 2. Use the app config directory
    if let Some(config_dir) = dirs::config_dir() {
        let app_name = tauri::Config::default().identifier.clone();
        paths.push(config_dir.join(app_name).join("data").join(file_path));
    }
    
    // 3. Current directory fallback
    paths.push(current_dir.join("data").join(file_path));
    
    for path in paths {
        if path.exists() {
            println!("Reading from path: {}", path.display());
            let content = fs::read_to_string(&path)?;
            let data: Vec<T> = serde_json::from_str(&content)?;
            return Ok(data);
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
    match read_json_from_data::<Module>("modules/modules.json") {
        Ok(modules) => Ok(modules),
        Err(e) => {
            // Fallback to default module if error
            eprintln!("Error reading modules: {}", e);
            
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
            
            Ok(vec![module])
        }
    }
}

// Helper function to get a specific framework by ID
pub fn get_framework_by_id(id: &str) -> Result<Framework, String> {
    match block_on(get_frameworks()) {
        Ok(frameworks) => {
            frameworks.into_iter()
                .find(|f| f.id == id)
                .ok_or_else(|| format!("Framework with ID '{}' not found", id))
        },
        Err(e) => Err(e),
    }
}

// Helper function to get a specific module by ID
pub fn get_module_by_id(id: &str) -> Result<Module, String> {
    match block_on(get_modules()) {
        Ok(modules) => {
            modules.into_iter()
                .find(|m| m.id == id)
                .ok_or_else(|| format!("Module with ID '{}' not found", id))
        },
        Err(e) => Err(e),
    }
}

// For backward compatibility: rename of get_frameworks
#[command]
pub async fn get_templates() -> Result<Vec<Framework>, String> {
    get_frameworks().await
} 