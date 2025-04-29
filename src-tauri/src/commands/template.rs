use serde::{Serialize, Deserialize};
use tauri::command;
use std::fs;
use std::path::Path;
use std::error::Error;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Framework {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub type_: String,
    #[serde(rename = "type")]
    pub framework_type: String,
    pub tags: Vec<String>,
    pub base_command: String,
    pub compatible_modules: Vec<String>,
    pub structure: FrameworkStructure,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FrameworkStructure {
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
    pub files: Vec<FileOperation>,
    pub transforms: Vec<Transform>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileOperation {
    pub source: String,
    pub destination: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Transform {
    pub file: String,
    pub pattern: String,
    pub replacement: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModuleConfiguration {
    pub options: Vec<ModuleOption>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModuleOption {
    pub name: String,
    #[serde(rename = "type")]
    pub option_type: String,
    pub description: String,
    pub default: Option<serde_json::Value>,
    pub options: Option<Vec<String>>,
}

fn read_directory<T: for<'de> serde::Deserialize<'de>>(dir_path: &str) -> Result<Vec<T>, Box<dyn Error>> {
    let mut items = Vec::new();
    
    // Get the application directory from Tauri
    let app_dir = tauri::api::path::app_dir(&tauri::Config::default())
        .ok_or("Failed to get app directory")?;
    
    // Construct the full path to the target directory
    let target_dir = app_dir.join(dir_path);
    
    if !target_dir.exists() {
        return Err(format!("Directory not found: {}", target_dir.display()).into());
    }
    
    for entry in fs::read_dir(target_dir)? {
        let entry = entry?;
        let path = entry.path();
        
        if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
            let content = fs::read_to_string(&path)?;
            let items_from_file: Vec<T> = serde_json::from_str(&content)?;
            items.extend(items_from_file);
        }
    }
    
    Ok(items)
}

#[command]
pub async fn get_frameworks() -> Result<Vec<Framework>, String> {
    match read_directory::<Framework>("template-data/frameworks") {
        Ok(frameworks) => Ok(frameworks),
        Err(e) => {
            // Fallback to default framework if error
            eprintln!("Error reading frameworks: {}", e);
            
            let framework = Framework {
                id: "nextjs".to_string(),
                name: "Next.js".to_string(),
                description: "React framework for production".to_string(),
                version: "1.0.0".to_string(),
                type_: "web".to_string(),
                framework_type: "web".to_string(),
                tags: vec!["react".to_string(), "typescript".to_string(), "frontend".to_string()],
                base_command: "npx create-next-app@latest".to_string(),
                compatible_modules: vec!["tailwind".to_string(), "i18n".to_string()],
                structure: FrameworkStructure {
                    enforced: true,
                    directories: vec!["src".to_string(), "public".to_string()],
                },
            };
            
            Ok(vec![framework])
        }
    }
}

#[command]
pub async fn get_modules() -> Result<Vec<Module>, String> {
    match read_directory::<Module>("template-data/modules") {
        Ok(modules) => Ok(modules),
        Err(e) => {
            // Fallback to default module if error
            eprintln!("Error reading modules: {}", e);
            
            let module = Module {
                id: "daisyui".to_string(),
                name: "DaisyUI".to_string(),
                description: "Component library for Tailwind CSS".to_string(),
                version: "1.0.0".to_string(),
                category: "ui".to_string(),
                dependencies: vec!["tailwind".to_string()],
                incompatible_with: vec![],
                installation: ModuleInstallation {
                    commands: vec!["npm install daisyui".to_string()],
                    files: vec![],
                    transforms: vec![Transform {
                        file: "tailwind.config.js".to_string(),
                        pattern: "plugins: \\[.*\\]".to_string(),
                        replacement: "plugins: [require(\"daisyui\")]".to_string(),
                    }],
                },
                configuration: ModuleConfiguration {
                    options: vec![ModuleOption {
                        name: "themes".to_string(),
                        option_type: "select".to_string(),
                        description: "DaisyUI themes to include".to_string(),
                        default: Some(serde_json::json!(["light", "dark"])),
                        options: Some(vec![
                            "light".to_string(), 
                            "dark".to_string(), 
                            "corporate".to_string(),
                            "business".to_string(),
                        ]),
                    }],
                },
            };
            
            Ok(vec![module])
        }
    }
} 