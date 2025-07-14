use std::process::{Command, Stdio};
use std::path::{Path, PathBuf};
use std::fs;
use std::io::{Read, BufRead, BufReader};
use std::thread::sleep as thread_sleep;
use std::time::Duration as StdDuration;
use regex::Regex;
use tauri::AppHandle;
use tauri::Emitter;
use tokio::time::{sleep, Duration};

use serde::{Deserialize, Serialize};
use tauri::async_runtime::spawn_blocking;
use tokio::time::{timeout};
use log::{debug, info, warn};

/// Options for command execution
#[derive(Debug, Clone)]
pub struct CommandOptions {
    /// Maximum number of retries for failed commands
    pub max_retries: u32,
    /// Delay between retries in seconds
    pub retry_delay: u32,
    /// Whether to verify the command output
    pub verify_output: bool,
    /// Timeout for command execution in seconds
    pub timeout: u64,
    /// Whether to check for project directory creation
    pub verify_project_dir: bool,
    /// Custom environment variables
    pub env_vars: Vec<(String, String)>,
}

impl Default for CommandOptions {
    fn default() -> Self {
        Self {
            max_retries: 1,
            retry_delay: 2,
            verify_output: true,
            timeout: 120,
            verify_project_dir: false,
            env_vars: Vec::new(),
        }
    }
}

/// Result of executing a command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    /// Whether the command executed successfully
    pub success: bool,
    /// Standard output from the command
    pub stdout: String,
    /// Standard error from the command
    pub stderr: String,
    /// Exit code from the command
    pub exit_code: i32,
}

/// Builder for creating and executing commands
#[derive(Clone)]
pub struct CommandBuilder {
    /// The command to execute
    command: String,
    /// Arguments for the command
    args: Vec<String>,
    /// Working directory for the command
    working_dir: PathBuf,
    /// Options for command execution
    options: CommandOptions,
}

impl CommandBuilder {
    /// Create a new command builder
    pub fn new<S: Into<String>>(command: S) -> Self {
        Self {
            command: command.into(),
            args: Vec::new(),
            working_dir: PathBuf::from("."),
            options: CommandOptions::default(),
        }
    }
    
    /// Add an argument to the command
    pub fn arg<S: Into<String>>(mut self, arg: S) -> Self {
        self.args.push(arg.into());
        self
    }
    
    /// Add multiple arguments to the command
    pub fn args<I, S>(mut self, args: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        for arg in args {
            self.args.push(arg.into());
        }
        self
    }
    
    /// Set the working directory for the command
    pub fn working_dir<P: Into<PathBuf>>(mut self, dir: P) -> Self {
        self.working_dir = dir.into();
        self
    }
    
    /// Set the maximum number of retries for the command
    pub fn retries(mut self, retries: u32) -> Self {
        self.options.max_retries = retries;
        self
    }
    
    /// Set the delay between retries in seconds
    pub fn retry_delay(mut self, delay: u32) -> Self {
        self.options.retry_delay = delay;
        self
    }
    
    /// Set the timeout for the command in seconds
    pub fn timeout(mut self, timeout: u64) -> Self {
        self.options.timeout = timeout;
        self
    }
    
    /// Set whether to verify the command output
    pub fn verify_output(mut self, verify: bool) -> Self {
        self.options.verify_output = verify;
        self
    }
    
    /// Set whether to check for project directory creation
    pub fn verify_project_dir(mut self, verify: bool) -> Self {
        self.options.verify_project_dir = verify;
        self
    }
    
    /// Add an environment variable to the command
    pub fn env<K, V>(mut self, key: K, value: V) -> Self
    where
        K: Into<String>,
        V: Into<String>,
    {
        self.options.env_vars.push((key.into(), value.into()));
        self
    }
    
    /// Get a display string for the arguments
    pub fn args_display(&self) -> String {
        self.args.join(" ")
    }
    
    /// Execute the command
    pub async fn execute(self) -> Result<CommandResult, String> {
        // Check if this is a create-next-app command or similar
        let is_project_generator = 
            (self.command == "npx" && !self.args.is_empty() && self.args[0].contains("create-")) ||
            (self.command == "npm" && self.args.len() > 1 && self.args[0] == "init");
            
        // Check if this is a project directory that we need to verify gets created
        let project_name = if is_project_generator && self.options.verify_output && !self.args.is_empty() {
            self.args.last().map(|s| s.to_string())
        } else {
            None
        };
        
        // Adjust command for platform if needed
        let platform_cmd = if (self.command == "npm" || self.command == "npx") && cfg!(windows) {
            format!("{}.cmd", self.command)
        } else {
            self.command.clone()
        };
        
        info!("Executing command: {} {} in {}", 
            platform_cmd,
            self.args.join(" "),
            self.working_dir.display()
        );
        
        for attempt in 1..=self.options.max_retries {
            // Create command
            let mut cmd = Command::new(&platform_cmd);
            cmd.args(&self.args)
                .current_dir(&self.working_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            
            // Set environment variables
            if let Ok(path) = std::env::var("PATH") {
                cmd.env("PATH", path);
            }
            
            // Add custom environment variables
            for (key, value) in &self.options.env_vars {
                cmd.env(key, value);
            }
            
            // Force interactive mode for npm
            if self.command == "npm" || self.command == "npx" {
                cmd.env("CI", "false");
                cmd.env("NODE_ENV", "development");
            }
            
            let options = self.options.clone();
            let working_dir = self.working_dir.clone();
            
            // Execute with a timeout
            let cmd_future = spawn_blocking(move || {
                match cmd.spawn() {
                    Ok(mut child) => {
                        let mut stdout_lines = Vec::new();
                        let mut stderr_lines = Vec::new();
                        
                        // Read stdout lines
                        if let Some(stdout) = child.stdout.take() {
                            let stdout_reader = BufReader::new(stdout);
                            for line in stdout_reader.lines() {
                                if let Ok(line) = line {
                                    debug!("[STDOUT] {}", line);
                                    stdout_lines.push(line);
                                }
                            }
                        }
                        
                        // Read stderr lines
                        if let Some(stderr) = child.stderr.take() {
                            let stderr_reader = BufReader::new(stderr);
                            for line in stderr_reader.lines() {
                                if let Ok(line) = line {
                                    debug!("[STDERR] {}", line);
                                    stderr_lines.push(line);
                                }
                            }
                        }
                        
                        // Wait for process to complete
                        match child.wait() {
                            Ok(status) => {
                                let exit_code = status.code().unwrap_or(-1);
                                let success = status.success();
                                
                                CommandResult {
                                    success,
                                    stdout: stdout_lines.join("\n"),
                                    stderr: stderr_lines.join("\n"),
                                    exit_code,
                                }
                            },
                            Err(e) => {
                                CommandResult {
                                    success: false,
                                    stdout: stdout_lines.join("\n"),
                                    stderr: format!("Failed to wait for command: {}", e),
                                    exit_code: -1,
                                }
                            }
                        }
                    },
                    Err(e) => {
                        CommandResult {
                            success: false,
                            stdout: String::new(),
                            stderr: format!("Failed to execute command: {}", e),
                            exit_code: -1,
                        }
                    }
                }
            });
            
            let result = match timeout(Duration::from_secs(options.timeout), cmd_future).await {
                Ok(Ok(result)) => result,
                Ok(Err(e)) => {
                    return Err(format!("Failed to execute command: {}", e));
                },
                Err(_) => {
                    return Err(format!("Command timed out after {} seconds", options.timeout));
                }
            };
            
            // Special handling for npm/npx commands - we need to ensure filesystem sync
            if (self.command == "npm" || self.command == "npx") && result.success {
                // For project generators like create-next-app, we need to verify project creation
                if is_project_generator && self.options.verify_project_dir {
                    // First wait longer for filesystem to settle
                    info!("Project generator command completed, waiting for filesystem to settle...");
                    sleep(Duration::from_secs(3)).await;
                    
                    // If we have a project name to verify, check that it exists
                    if let Some(project_name) = &project_name {
                        let project_dir = working_dir.join(project_name);
                        info!("Verifying project directory exists: {}", project_dir.display());
                        
                        // Try multiple times with increasing delays
                        let mut dir_exists = false;
                        for i in 0..5 {
                            if project_dir.exists() && project_dir.is_dir() {
                                dir_exists = true;
                                info!("Project directory verified!");
                                break;
                            }
                            warn!("Directory not found, waiting (attempt {}/5)...", i+1);
                            thread_sleep(StdDuration::from_millis(500 * (i+1)));
                        }
                        
                        if !dir_exists {
                            // If we've done max retries, fail, otherwise retry the command
                            if attempt == self.options.max_retries {
                                return Err(format!("Project directory {} was not created even though command reported success", project_dir.display()));
                            } else {
                                warn!("Retrying command due to missing project directory (attempt {}/{})", attempt, self.options.max_retries);
                                sleep(Duration::from_secs(1)).await;
                                continue;
                            }
                        }
                        
                        // If project exists, check for package.json
                        let package_json = project_dir.join("package.json");
                        if !package_json.exists() {
                            warn!("Warning: package.json not found in project directory");
                        } else {
                            info!("package.json verified!");
                        }
                    } else {
                        // No project name to verify, use a standard delay
                        sleep(Duration::from_secs(2)).await;
                    }
                } else {
                    // Standard delay for other npm/npx commands
                    sleep(Duration::from_secs(1)).await;
                }
            }
            
            // If successful or final attempt, return the result
            if result.success || attempt == self.options.max_retries {
                return Ok(result);
            } else {
                // If failed but we have retries left
                warn!("Command failed, retrying (attempt {}/{})", attempt, self.options.max_retries);
                sleep(Duration::from_secs(self.options.retry_delay.into())).await;
            }
        }
        
        // We should never reach here (loop always returns), but satisfy the compiler
        Err("Command execution failed after all retries".to_string())
    }
}

/// Verify that a file exists, with retries
pub async fn verify_file_exists(path: &Path, retries: u32, delay_ms: u64) -> bool {
    for i in 0..retries {
        if path.exists() {
            return true;
        }
        
        if i < retries - 1 {
            sleep(Duration::from_millis(delay_ms)).await;
        }
    }
    
    path.exists()
}

/// Run a command and return the result
/// 
/// This is a simplified version of CommandBuilder for basic usage
pub async fn run_command(
    command: &str,
    args: &[&str],
    working_dir: &Path,
) -> Result<CommandResult, String> {
    let args_owned: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    
    CommandBuilder::new(command)
        .args(args_owned)
        .working_dir(working_dir)
        .execute()
        .await
}

/// Run a command with options and return the result
pub async fn run_command_with_options(
    command: &str,
    args: &[&str],
    working_dir: &Path,
    options: CommandOptions,
) -> Result<CommandResult, String> {
    let args_owned: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    let mut builder = CommandBuilder::new(command)
        .args(args_owned)
        .working_dir(working_dir)
        .retries(options.max_retries)
        .retry_delay(options.retry_delay)
        .timeout(options.timeout)
        .verify_output(options.verify_output)
        .verify_project_dir(options.verify_project_dir);
    
    for (key, value) in options.env_vars {
        builder = builder.env(key, value);
    }
    
    builder.execute().await
}

/// Runs an interactive command asynchronously with the given arguments and working directory
pub async fn run_interactive_command(
    command: &str, 
    args: &[&str], 
    working_dir: &Path,
    env_vars: Option<Vec<(String, String)>>
) -> Result<(), String> {
    println!("Running interactive command: {} {:?} in {}", command, args, working_dir.display());
    
    // Create the command
    let mut cmd = Command::new(command);
    cmd.args(args)
       .current_dir(working_dir)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    // Add environment variables if provided
    if let Some(vars) = env_vars {
        for (key, value) in vars {
            cmd.env(key, value);
        }
    }
    
    match cmd.spawn() {
        Ok(mut child) => {
            let stdout = child.stdout.take().expect("Failed to capture stdout");
            let stderr = child.stderr.take().expect("Failed to capture stderr");
            
            let mut reader = std::io::BufReader::new(stdout);
            let mut err_reader = std::io::BufReader::new(stderr);
            
            let mut buffer = [0; 1024];
            let mut err_buffer = [0; 1024];
            
            loop {
                // Check if child process has exited
                match child.try_wait() {
                    Ok(Some(status)) => {
                        if !status.success() {
                            let error_msg = format!("Command exited with non-zero status: {}", status);
                            println!("{}", error_msg);
                            return Err(error_msg);
                        }
                        break;
                    },
                    Ok(None) => {}, // Child still running
                    Err(e) => {
                        let error_msg = format!("Error checking child process status: {}", e);
                        println!("{}", error_msg);
                        return Err(error_msg);
                    }
                }
                
                // Read from stdout
                if let Ok(n) = reader.read(&mut buffer) {
                    if n > 0 {
                        let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                        println!("{}", output);
                    }
                }
                
                // Read from stderr
                if let Ok(n) = err_reader.read(&mut err_buffer) {
                    if n > 0 {
                        let output = String::from_utf8_lossy(&err_buffer[..n]).to_string();
                        println!("{}", output);
                    }
                }
                
                // Small sleep to prevent tight CPU loops
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
            
            // Wait for the child process to finish if it hasn't already
            match child.wait() {
                Ok(status) => {
                    if status.success() {
                        let success_msg = "Command completed successfully";
                        println!("{}", success_msg);
                        Ok(())
                    } else {
                        let error_msg = format!("Command exited with non-zero status: {}", status);
                        println!("{}", error_msg);
                        Err(error_msg)
                    }
                },
                Err(e) => {
                    let error_msg = format!("Failed to wait for command: {}", e);
                    println!("{}", error_msg);
                    Err(error_msg)
                },
            }
        },
        Err(e) => {
            let error_msg = format!("Failed to spawn command: {}", e);
            println!("{}", error_msg);
            Err(error_msg)
        },
    }
}

/// Emit progress events to the frontend
pub fn emit_progress(app_handle: &AppHandle, step: &str, message: &str, progress: f32) {
    let payload = serde_json::json!({
        "step": step,
        "message": message,
        "progress": progress,
    });
    
    // In Tauri v2, we use the emit method from the Emitter trait
    if let Err(e) = app_handle.emit("generation-progress", payload) {
        println!("Failed to emit progress event: {}", e);
    }
}

/// Creates a file with the given content
pub fn create_file(path: &Path, content: &str) -> Result<(), String> {
    // Ensure parent directories exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory '{}': {}", parent.display(), e))?;
    }
    
    fs::write(path, content)
        .map_err(|e| format!("Failed to create file '{}': {}", path.display(), e))
}

/// Modifies a file using regex pattern replacement
pub fn modify_file(path: &Path, pattern: &str, replacement: &str) -> Result<(), String> {
    // Check if file exists
    if !path.exists() {
        // If it's a config file that might be created by command but not found yet, 
        // try to create an empty one with default content
        if path.file_name().map_or(false, |f| f == "tailwind.config.js") {
            let default_content = "module.exports = {\n  content: [],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n}";
            create_file(path, default_content)?;
            println!("Created empty tailwind.config.js because it didn't exist");
        } else {
        return Err(format!("File not found: {}", path.display()));
        }
    }
    
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file '{}': {}", path.display(), e))?;
    
    // Attempt to create the regex pattern
    let regex = match Regex::new(pattern) {
        Ok(r) => r,
        Err(e) => {
            // Log the error but try to gracefully handle it
            println!("Invalid regex pattern '{}': {}", pattern, e);
            
            // If the pattern is just a string literal, try to find it directly
            if content.contains(pattern.replace("\\", "").as_str()) {
                // Simple string replacement
                let new_content = content.replace(pattern.replace("\\", "").as_str(), replacement);
                return fs::write(path, new_content)
                    .map_err(|e| format!("Failed to write to file '{}': {}", path.display(), e));
            } else {
                return Err(format!("Invalid regex pattern and string not found: {}", pattern));
            }
        }
    };
    
    // Perform the regex replacement
    let new_content = regex.replace_all(&content, replacement).to_string();
    
    // Check if any replacements were actually made
    if new_content == content {
        println!("Warning: No replacements made in '{}' for pattern '{}'", path.display(), pattern);
    }
    
    fs::write(path, new_content)
        .map_err(|e| format!("Failed to write to file '{}': {}", path.display(), e))
}

/// Adds an import statement to a file
pub fn modify_import(path: &Path, action: &str, import: &str) -> Result<(), String> {
    // Check if file exists
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }
    
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file '{}': {}", path.display(), e))?;
    
    let mut new_content = content.clone();
    
    match action {
        "add" => {
            // Check if import already exists
            let import_stmt = format!("import {}", import);
            if !content.contains(&import_stmt) {
                // Find the last import statement
                let import_section_regex = Regex::new(r"(?m)^import.*$").unwrap();
                let last_import_match = import_section_regex.find_iter(&content).last();
                
                if let Some(last_import) = last_import_match {
                    // Insert after the last import
                    let insert_position = last_import.end();
                    new_content.insert_str(insert_position, &format!("\nimport {};", import));
                } else {
                    // No imports found, add at the beginning
                    new_content = format!("import {};\n\n{}", import, content);
                }
            }
        },
        "remove" => {
            // Remove the import statement
            let import_regex = Regex::new(&format!(r"(?m)^import {}.*$\n?", regex::escape(import))).unwrap();
            new_content = import_regex.replace_all(&content, "").to_string();
        },
        _ => return Err(format!("Unknown import action: {}", action)),
    }
    
    fs::write(path, new_content)
        .map_err(|e| format!("Failed to write to file '{}': {}", path.display(), e))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_echo_command() {
        let result = CommandBuilder::new("echo")
            .arg("hello world")
            .execute()
            .await
            .unwrap();
        
        assert!(result.success);
        assert!(result.stdout.contains("hello world"));
        assert_eq!(result.exit_code, 0);
    }
} 