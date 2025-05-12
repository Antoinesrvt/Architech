/**
 * Command Types
 * 
 * This file defines the exact parameter structure for all Tauri commands.
 * Follow these patterns exactly when making API calls to ensure correct parameter passing.
 */

// Project Config
export interface ProjectConfig {
  name: string;
  path: string;
  framework: string;
  modules: string[];
  setup_command?: string;
  options: {
    typescript: boolean;
    app_router: boolean;
    eslint: boolean;
    cli_execution?: boolean;
    verbose_logging?: boolean;
  };
}

// Command parameter patterns
export const COMMAND_PATTERNS = {
  // Commands that take direct parameters (no 'param' wrapper)
  DIRECT_PARAMS: {
    // Command: validate_project_config
    // Usage: { config: ProjectConfig }
    validate_project_config: (config: ProjectConfig) => ({ config }),
    
    // Command: generate_project
    // Usage: { config: ProjectConfig }
    generate_project: (config: ProjectConfig) => ({ config }),
    
    // Command: check_directory_exists
    // Usage: { name: string, path: string }
    check_directory_exists: (name: string, path: string) => ({ name, path }),
    
    // Command: browse_directory
    // Usage: { title: string }
    browse_directory: (title: string) => ({ title }),
    
    // Command: open_in_editor
    // Usage: { path: string, editor: string }
    open_in_editor: (path: string, editor: string) => ({ path, editor }),
    
    // Command: open_in_folder
    // Usage: { path: string }
    open_in_folder: (path: string) => ({ path }),
  },
  
  // Commands that require 'param' wrapper
  PARAM_WRAPPER: {
    // Command: get_project_status
    // Usage: { param: { project_id: string } }
    get_project_status: (projectId: string) => ({ 
      param: { project_id: projectId } 
    }),
    
    // Command: initialize_project_tasks
    // Usage: { param: { project_id: string } }
    initialize_project_tasks: (projectId: string) => ({ 
      param: { project_id: projectId } 
    }),
    
    // Command: get_project_logs
    // Usage: { param: { project_id: string } }
    get_project_logs: (projectId: string) => ({ 
      param: { project_id: projectId } 
    }),
    
    // Command: cancel_project_generation
    // Usage: { param: { project_id: string } }
    cancel_project_generation: (projectId: string) => ({ 
      param: { project_id: projectId } 
    }),
    
    // Command: resume_project_generation
    // Usage: { param: { project_id: string } }
    resume_project_generation: (projectId: string) => ({ 
      param: { project_id: projectId } 
    }),
  }
};

// Response types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ProjectStatusResponse {
  status: string;
  progress: number;
  current_step: string;
  path: string | null;
  error: string | null;
  resumable: boolean;
  tasks?: Record<string, any>;
}

export interface LogEntry {
  timestamp: number;
  message: string;
}

// Example usage:
// 
// import { COMMAND_PATTERNS } from './command-types';
// 
// // For direct params:
// const args = COMMAND_PATTERNS.DIRECT_PARAMS.generate_project(config);
// await safeInvoke('generate_project', args);
// 
// // For param wrapper:
// const args = COMMAND_PATTERNS.PARAM_WRAPPER.get_project_status(projectId);
// await safeInvoke('get_project_status', args); 