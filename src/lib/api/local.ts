import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Framework, Module } from '../store/framework-store';
import { 
  FrameworkService, 
  GenerationProgress, 
  ValidationResult 
} from './types';
import { COMMAND_PATTERNS, ProjectConfig } from './command-types';

// Add mock flag at the top of the file
const isMockEnabled = false;

// Mock data for frameworks when running in browser mode
const mockFrameworks: Framework[] = [
  {
    id: "nextjs",
    name: "Next.js",
    description: "React framework for production-grade applications",
    version: "13.4.0",
    type: "web",
    tags: ["react", "frontend", "ssr", "ssg"],
    cli: {
      base_command: "npx create-next-app@latest",
      arguments: {
        typescript: {
          flag: "--typescript",
          default: true
        },
        app_router: {
          flag: "--app",
          default: true
        }
      },
      interactive: false
    },
    compatible_modules: ["tailwind", "daisyui", "i18n", "zustand", "forms", "auth", "testing"],
    directory_structure: {
      enforced: true,
      directories: ["src", "public", "app", "components", "lib"]
    }
  },
  {
    id: "vite-react",
    name: "Vite + React",
    description: "Lightweight React setup with Vite",
    version: "4.3.2",
    type: "web",
    tags: ["react", "frontend", "spa", "vite"],
    cli: {
      base_command: "npm create vite@latest",
      arguments: {
        template: {
          flag: "--template react-ts",
          default: true
        }
      },
      interactive: true,
      responses: [
        {
          prompt: "Project name",
          use_project_name: true
        }
      ]
    },
    compatible_modules: ["tailwind", "daisyui", "i18n", "zustand", "forms", "testing"],
    directory_structure: {
      enforced: true,
      directories: ["src", "public", "src/components", "src/assets"]
    }
  }
];

// Mock data for modules when running in browser mode
const mockModules: Module[] = [
  {
    id: "tailwind",
    name: "Tailwind CSS",
    description: "A utility-first CSS framework",
    version: "3.3.2",
    category: "styling",
    dependencies: [],
    incompatible_with: [],
    installation: {
      commands: ["npm install -D tailwindcss postcss autoprefixer", "npx tailwindcss init -p"],
      file_operations: [
        {
          operation: "create",
          path: "tailwind.config.js",
          content: "module.exports = {\n  content: ['./src/**/*.{js,jsx,ts,tsx}'],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n}"
        },
        {
          operation: "create",
          path: "src/styles/globals.css",
          content: "@tailwind base;\n@tailwind components;\n@tailwind utilities;"
        },
        {
          operation: "modify",
          path: "src/app/layout.tsx",
          pattern: "import",
          replacement: "import '../styles/globals.css';\nimport"
        }
      ]
    },
    configuration: {
      options: [
        {
          id: "darkMode",
          type: "select",
          label: "Dark Mode",
          description: "Dark mode configuration",
          default: "class",
          choices: [
            { value: "media", label: "System Preference" },
            { value: "class", label: "Manual Toggle" }
          ]
        }
      ]
    }
  },
  {
    id: "daisyui",
    name: "DaisyUI",
    description: "Component library for Tailwind CSS",
    version: "3.1.0",
    category: "ui",
    dependencies: ["tailwind"],
    incompatible_with: [],
    installation: {
      commands: ["npm install daisyui"],
      file_operations: [
        {
          operation: "modify",
          path: "tailwind.config.js",
          pattern: "plugins: \\[.*\\]",
          replacement: "plugins: [require(\"daisyui\")]"
        }
      ]
    },
    configuration: {
      options: [
        {
          id: "themes",
          type: "select",
          label: "Themes",
          description: "DaisyUI themes to include",
          default: "light",
          choices: [
            { value: "light", label: "Light Theme" },
            { value: "dark", label: "Dark Theme" },
            { value: "corporate", label: "Corporate Theme" }
          ]
        }
      ]
    }
  },
  {
    id: "recharts",
    name: "Recharts",
    description: "Redefined chart library built with React and D3",
    version: "2.7.2",
    category: "ui",
    dependencies: [],
    incompatible_with: [],
    installation: {
      commands: ["npm install recharts"],
      file_operations: []
    },
    configuration: {
      options: []
    }
  }
];

// Helper function to check if we're running in a Tauri environment
function isTauri(): boolean {
  return typeof window !== 'undefined' && 
    window !== undefined && 
    // @ts-ignore - window.__TAURI__ exists in Tauri apps
    window.__TAURI__ !== undefined;
}

// Safe invoke function that handles both Tauri and browser environments
const safeInvoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  // Check if we're in a Tauri environment
  const isTauri = window && (window as any).__TAURI__;
  
  // Debug logging - better format for readability
  console.log(`Invoking ${command} with args:`, args ? JSON.stringify(args, null, 2) : 'undefined');
  
  // Validate command structure according to our patterns - DEV mode only
  if (process.env.NODE_ENV === 'development') {
    if (Object.keys(COMMAND_PATTERNS.PARAM_WRAPPER).includes(command)) {
      // Should have param wrapper
      if (args && !('param' in args)) {
        console.warn(`Warning: Command ${command} should use param wrapper pattern`);
      }
    } else if (Object.keys(COMMAND_PATTERNS.DIRECT_PARAMS).includes(command)) {
      // Should NOT have param wrapper
      if (args && 'param' in args) {
        console.warn(`Warning: Command ${command} should NOT use param wrapper pattern`);
      }
    }
  }
  
  if (isTauri) {
    try {
      console.log(`[${new Date().toISOString()}] Invoking ${command} in Tauri environment`);
      let result;
      
      // Make sure args is not undefined before invoking
      const safeArgs = args || {};
      
      // Try the core.invoke approach first (newer Tauri versions)
      if ((window as any).__TAURI__.core?.invoke) {
        console.log('Using core.invoke');
        result = await (window as any).__TAURI__.core.invoke(command, safeArgs);
      } else {
        // Try the direct invoke from import
        console.log('Using @tauri-apps/api/invoke');
        result = await invoke(command, safeArgs);
      }
      
      console.log(`${command} result:`, typeof result === 'object' ? JSON.stringify(result, null, 2) : result);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ERROR invoking ${command}:`, error);
      console.error(`Args were:`, args ? JSON.stringify(args, null, 2) : 'undefined');
      
      // Enhanced error reporting
      if (error instanceof Error) {
        console.error(`Error details: ${error.name} - ${error.message}`);
        console.error(`Stack trace: ${error.stack}`);
      }
      
      console.error(`Command context:`, { command, commandType: typeof command, argsType: typeof args });
      throw error;
    }
  } else {
    console.warn("Tauri API is not available in this environment. Running in mock mode.");
    // Provide mock implementations for browser environment
    if (command === 'get_frameworks') {
      return mockFrameworks as T;
    } else if (command === 'get_templates') {
      // For backward compatibility
      return mockFrameworks as T;
    } else if (command === 'get_modules') {
      return mockModules as T;
    } else if (command === 'get_project_status') {
      // Mock project status
      return {
        id: '123',
        path: '/mock/path',
        name: 'mock-project',
        framework: 'nextjs',
        tasks: {
          '1': { id: '1', name: 'Task 1', description: 'Mock task', status: 'Completed', progress: 1.0, dependencies: [] }
        },
        current_task: null,
        progress: 1.0,
        status: 'Completed',
        logs: ['Mock log 1', 'Mock log 2']
      } as T;
    } else if (command === 'get_project_logs') {
      return ['Mock log 1', 'Mock log 2'] as T;
    } else if (command === 'generate_project') {
      // Return a mock project ID
      return 'mock-project-' + Date.now() as T;
    } else if (command === 'initialize_project_tasks') {
      // Mock successful initialization
      return undefined as T;
    } else {
      console.warn(`Mock for command ${command} not implemented`);
    return {} as T;
    }
  }
};

// Project generation state type from Rust backend
export interface ProjectGenerationState {
  id: string;
  path: string;
  name: string;
  framework: string;
  tasks: Record<string, GenerationTask>;
  current_task: string | null;
  progress: number;
  status: TaskStatus;
  logs: string[];
  resumable?: boolean;
}

// Generation task status
export type TaskStatus = 
  | 'Pending'
  | 'Running'
  | 'Completed'
  | string; // For "Failed: reason" and "Skipped: reason" formats

// Constants for task status values
export const TASK_STATUS = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
} as const;

// Helper functions for task status
export const TaskStatusHelpers = {
  isFailed: (status: string): boolean => {
    return status.startsWith('Failed:') || status === 'Failed';
  },
  isSkipped: (status: string): boolean => {
    return status.startsWith('Skipped:') || status === 'Skipped';
  },
  isCompleted: (status: string): boolean => {
    return status === 'Completed';
  },
  isRunning: (status: string): boolean => {
    return status === 'Running';
  },
  isPending: (status: string): boolean => {
    return status === 'Pending';
  },
  getReason: (status: string): string | null => {
    if (status.startsWith('Failed:')) {
      return status.substring('Failed:'.length).trim();
    }
    if (status.startsWith('Skipped:')) {
      return status.substring('Skipped:'.length).trim();
    }
    return null;
  }
};

// Generation task
export interface GenerationTask {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  progress: number;
  dependencies: string[];
}

// Update the TaskResult interface to include status
export interface TaskResult {
  task_id: string;
  project_id: string;
  status: string;
  message?: string;
}

// Helper to convert backend TaskState to frontend TaskResult
export function convertTaskEvent(event: any): TaskResult {
  return {
    task_id: event.task_id,
    project_id: event.project_id,
    status: event.status || 'pending',
    message: event.message || `Task ${event.task_id} update`
  };
}

// Update the project status and log response types to match our new backend
export interface ProjectStatusResponse {
  status: string;
  progress: number;
  current_step: string;
  path: string | null;
  error: string | null;
  resumable: boolean;
}

export interface LogEntry {
  timestamp: number;
  message: string;
}

export class LocalFrameworkService implements FrameworkService {
  async getFrameworks(): Promise<Framework[]> {
    try {
      return await safeInvoke<Framework[]>('get_frameworks');
    } catch (error) {
      console.error('Failed to get frameworks:', error);
      // Return mock frameworks if there's an error
      return mockFrameworks;
    }
  }

  async getModules(): Promise<Module[]> {
    try {
      return await safeInvoke<Module[]>('get_modules');
    } catch (error) {
      console.error('Failed to get modules:', error);
      // Return mock modules if there's an error
      return mockModules;
    }
  }

  async validateProjectConfig(config: ProjectConfig): Promise<ValidationResult> {
    try {
      return await safeInvoke<ValidationResult>(
        'validate_project_config', 
        COMMAND_PATTERNS.DIRECT_PARAMS.validate_project_config(config)
      );
    } catch (error) {
      console.error('Failed to validate project config:', error);
      
      // Provide a more user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { 
        valid: false, 
        errors: [`Validation failed: ${errorMessage}`] 
      };
    }
  }

  async checkDirectoryExists(name: string, path: string): Promise<{ exists: boolean, error?: string }> {
    try {
      const exists = await safeInvoke<boolean>(
        'check_directory_exists', 
        COMMAND_PATTERNS.DIRECT_PARAMS.check_directory_exists(name, path)
      );
      return { exists };
    } catch (error) {
      console.error('Failed to check directory:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { 
        exists: false, 
        error: errorMessage 
      };
    }
  }

  async generateProject(config: ProjectConfig): Promise<string> {
    console.log('Generating project with config:', JSON.stringify(config, null, 2));
    
    try {
      // Validate project config
      const validation = await this.validateProjectConfig(config);
      if (!validation.valid) {
        console.error('Project config validation failed:', validation.errors);
        throw new Error(`Project validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Get the framework details to build the setup command
      const frameworks = await this.getFrameworks();
      const framework = frameworks.find(f => f.id === config.framework);
      
      if (!framework) {
        throw new Error(`Framework ${config.framework} not found`);
      }
      
      // Generate the framework setup command
      let setupCommand = framework.cli.base_command;
      
      // Add the project name
      setupCommand += ` ${config.name}`;
      
      // Add typescript flag if specified
      if (framework.id === 'nextjs') {
        // Add Next.js specific flags
        setupCommand += ` --ts=${config.options?.typescript !== false}`;
        setupCommand += ` --app=${config.options?.app_router !== false}`;
        setupCommand += ` --eslint=${config.options?.eslint !== false}`;
        setupCommand += ` --src-dir=true --import-alias=@/* --no-tailwind --no-git`;
      } else if (config.options?.typescript !== false) {
        // Generic typescript flag for other frameworks
        setupCommand += ` --typescript`;
      }
      
      console.log('Generated setup command:', setupCommand);
      
      // Create backend config object 
      const backendConfig = {
        name: config.name,
        path: config.path,
        framework: config.framework,
        modules: config.modules || [],
        setup_command: setupCommand,
        options: {
          typescript: config.options?.typescript !== false,
          app_router: config.options?.app_router !== false,
          eslint: config.options?.eslint !== false,
        }
      };
      
      console.log('Sending final config to backend:', JSON.stringify(backendConfig, null, 2));
      
      // Call generate_project to get the ID (first phase)
      const projectId = await safeInvoke<string>(
        'generate_project',
        COMMAND_PATTERNS.DIRECT_PARAMS.generate_project(backendConfig)
      );
      console.log('Backend returned project ID:', projectId);
      
      if (!projectId) {
        throw new Error('Backend returned empty project ID');
      }
      
      // Return the project ID immediately
      return projectId;
    } catch (error) {
      console.error('Error generating project:', error);
      throw error;
    }
  }
  
  async initializeProjectTasks(projectId: string): Promise<void> {
    console.log('Initializing project tasks for ID:', projectId);
    
    if (!projectId) {
      console.error('Cannot initialize tasks: Empty project ID');
      throw new Error('Cannot initialize tasks: Empty project ID');
    }
    
    try {
      // Call initialize_project_tasks (second phase)
      console.log('Calling initialize_project_tasks with project_id:', projectId);
      await safeInvoke<void>(
        'initialize_project_tasks', 
        COMMAND_PATTERNS.PARAM_WRAPPER.initialize_project_tasks(projectId)
      );
      console.log('Project tasks initialized successfully for ID:', projectId);
    } catch (error) {
      console.error('Error initializing project tasks:', error);
      throw error;
    }
  }

  // Get project status from the backend
  async getProjectStatus(projectId: string): Promise<ProjectGenerationState> {
    console.log(`Getting project status for ${projectId}`);
    
    try {
      // Use safeInvoke to handle both Tauri and browser environments
      const response = await safeInvoke<any>(
        'get_project_status', 
        COMMAND_PATTERNS.PARAM_WRAPPER.get_project_status(projectId)
      );
      
      console.log(`Project status response for ${projectId}:`, response);
      
      // Create a simplified response object that matches our expected format
      const simpleResponse: ProjectGenerationState = {
        id: projectId,
        path: response.path || "",
        name: response.name || "",
        framework: response.framework || "",
        tasks: {},
        current_task: response.current_task || null,
        progress: response.progress ? (response.progress / 100) : 0, // Convert 0-100 to 0-1
        status: response.status || "NotStarted",
        logs: [],
        resumable: response.resumable || false
      };
      
      // If we have existing tasks in the global store, use them to preserve state
      const existingTasks = (typeof window !== 'undefined' && window.__PROJECT_STORE_TASKS) || {};
      console.log(`Found ${Object.keys(existingTasks).length} existing tasks in global store`);
      
      // If we have tasks in the response, merge with existing
      if (response.tasks && Object.keys(response.tasks).length > 0) {
        console.log(`Merging ${Object.keys(response.tasks).length} tasks from response with ${Object.keys(existingTasks).length} existing tasks`);
        
        // For each task in the response
        for (const [taskId, taskDataRaw] of Object.entries(response.tasks)) {
          // Type assertion for taskData
          const taskData = taskDataRaw as Record<string, any>;
          
          // If we already have this task, update it
          if (existingTasks[taskId]) {
            existingTasks[taskId] = {
              ...existingTasks[taskId],
              status: taskData.status || existingTasks[taskId].status,
              name: taskData.name || existingTasks[taskId].name,
              description: taskData.description || existingTasks[taskId].description,
              // Ensure progress is between 0-1
              progress: taskData.progress !== undefined ? 
                (taskData.progress > 1 ? taskData.progress / 100 : taskData.progress) : 
                existingTasks[taskId].progress
            };
          } 
          // Otherwise add it as a new task
          else {
            existingTasks[taskId] = {
              id: taskId,
              name: taskData.name || `Task ${taskId}`,
              description: taskData.description || `Task ${taskId}`,
              status: taskData.status || "Pending",
              progress: taskData.progress !== undefined ? 
                (taskData.progress > 1 ? taskData.progress / 100 : taskData.progress) : 
                0,
              dependencies: taskData.dependencies || []
            };
          }
          
          // Log task status for debugging
          console.log(`Task ${taskId} (${existingTasks[taskId].name}) status: ${existingTasks[taskId].status}`);
        }
      }
      
      // Store the updated tasks globally
      if (typeof window !== 'undefined') {
        window.__PROJECT_STORE_TASKS = existingTasks;
      }
      
      // Add the tasks to the response
      simpleResponse.tasks = existingTasks;
      
      // Add the logs if they exist
      if (response.logs && Array.isArray(response.logs)) {
        simpleResponse.logs = response.logs;
      }
      
      return simpleResponse;
    } catch (error) {
      console.error('Error getting project status:', error);
      throw new Error(`Failed to get project status: ${String(error)}`);
    }
  }

  async getProjectLogs(projectId: string): Promise<string[]> {
    try {
      // Call the updated backend API with revised parameter structure
      const logs = await safeInvoke<LogEntry[]>(
        'get_project_logs', 
        COMMAND_PATTERNS.PARAM_WRAPPER.get_project_logs(projectId)
      );
      
      // Convert the new log format to the existing string array format
      // for backward compatibility
      return logs.map(log => log.message);
    } catch (error) {
      console.error('Error getting project logs:', error);
      throw error;
    }
  }

  async cancelProjectGeneration(projectId: string): Promise<void> {
    try {
      // Call the updated backend API with revised parameter structure
      await safeInvoke<void>(
        'cancel_project_generation', 
        COMMAND_PATTERNS.PARAM_WRAPPER.cancel_project_generation(projectId)
      );
    } catch (error) {
      console.error('Error cancelling project generation:', error);
      throw error;
    }
  }

  // Add a new method for resuming project generation
  async resumeProjectGeneration(projectId: string): Promise<void> {
    try {
      // Call the new backend API for resuming generation
      await safeInvoke<void>(
        'resume_project_generation', 
        COMMAND_PATTERNS.PARAM_WRAPPER.resume_project_generation(projectId)
      );
    } catch (error) {
      console.error('Error resuming project generation:', error);
      throw error;
    }
  }

  /**
   * Listen to task updates
   */
  listenToTaskUpdates(callback: (update: TaskResult) => void): Promise<() => void> {
    console.log("Setting up task state change listener");
    return listen<any>('task-state-changed', (event) => {
      console.log("Task state changed event received:", event);
      try {
        const { project_id, task_id, state: taskState } = event.payload;
        
        // Map backend task states to frontend statuses
        let status: string;
        
        // Handle different task state formats
        if (typeof taskState === 'string') {
          // Direct string format - normalize case
          status = taskState === 'Completed' ? 'Completed' : 
                  taskState === 'Running' ? 'Running' : 
                  taskState === 'Pending' ? 'Pending' : 
                  taskState.toLowerCase();
        } else if (taskState && typeof taskState === 'object') {
          // Object with type field
          if (taskState.type === 'Completed') {
            status = 'Completed';
          } else if (taskState.type === 'Running') {
            status = 'Running';
          } else if (taskState.type === 'Failed') {
            status = 'Failed:' + (taskState.reason || '');
          } else if (taskState.type === 'Skipped') {
            status = 'Skipped:' + (taskState.reason || '');
          } else {
            status = 'Pending';
          }
        } else {
          // Default status if we can't determine
          console.warn("Unknown task state format:", taskState);
          status = 'Pending';
        }
        
        console.log(`Task ${task_id} state changed to ${status} (from ${JSON.stringify(taskState)})`);
        
        // Store tasks globally for API access
        if (typeof window !== 'undefined' && window.__PROJECT_STORE_TASKS) {
          const existingTask = window.__PROJECT_STORE_TASKS[task_id];
          if (existingTask) {
            window.__PROJECT_STORE_TASKS[task_id] = {
              ...existingTask,
              status: status,
              progress: status === 'Completed' ? 1.0 : 
                        status === 'Running' ? 0.5 : 
                        existingTask.progress
            };
            console.log(`Updated global task ${task_id} status to:`, window.__PROJECT_STORE_TASKS[task_id].status);
          }
        }
        
        // Convert the event to a TaskResult
        const taskResult: TaskResult = {
          project_id,
          task_id,
          status,
          message: `Task ${task_id} ${status}`
        };
        
        callback(taskResult);
      } catch (error) {
        console.error("Error handling task state change:", error);
      }
    });
  }

  // Listen for generation completion
  listenToGenerationComplete(callback: (projectId: string) => void): Promise<() => void> {
    const isTauri = window && (window as any).__TAURI__;
    
    if (isTauri) {
      try {
        return listen<string>('generation-complete', (event) => {
          callback(event.payload);
        });
      } catch (error) {
        console.error('Failed to listen for generation completion:', error);
        return Promise.resolve(() => {});
      }
    } else {
      console.warn('Generation completion events are not available in browser mode');
      return Promise.resolve(() => {});
    }
  }

  // Listen for generation failure
  listenToGenerationFailed(callback: (data: { projectId: string, reason: string }) => void): Promise<() => void> {
    const isTauri = window && (window as any).__TAURI__;
    
    if (isTauri) {
      try {
        return listen<[string, string]>('generation-failed', (event) => {
          const [projectId, reason] = event.payload;
          callback({ projectId, reason });
        });
      } catch (error) {
        console.error('Failed to listen for generation failure:', error);
        return Promise.resolve(() => {});
      }
    } else {
      console.warn('Generation failure events are not available in browser mode');
      return Promise.resolve(() => {});
    }
  }

  listenToProgress(callback: (progress: GenerationProgress) => void): Promise<() => void> {
    // In browser mode, simulate progress
    if (!(window as any).__TAURI__) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.05;
        if (progress <= 1) {
          const stepNames = ['init', 'framework', 'create', 'structure', 'dependencies', 'modules', 'complete'];
          const step = stepNames[Math.min(Math.floor(progress * stepNames.length), stepNames.length - 1)];
          callback({
            step,
            message: `Mock ${step} step`,
            progress,
          });
        } else {
          clearInterval(interval);
        }
      }, 500);
      
      return Promise.resolve(() => clearInterval(interval));
    }
    
    // In Tauri mode, listen to real events
    try {
      return listen<GenerationProgress>('generation-progress', (event) => {
        callback(event.payload);
      });
    } catch (error) {
      console.error('Failed to listen to progress events:', error);
      return Promise.resolve(() => {});
    }
  }

  async openInEditor(path: string, editor = 'code'): Promise<boolean> {
    try {
      await safeInvoke<void>('open_in_editor', { path, editor });
      return true;
    } catch (error) {
      console.error('Failed to open in editor:', error);
      return false;
    }
  }

  async browseForDirectory(): Promise<string | null> {
    try {
      const path = await safeInvoke<string>('browse_directory', { 
        title: 'Select Project Location' 
      });
      return path;
    } catch (error) {
      // Log the error for debugging
      console.error('Failed to browse for directory:', error);
      
      // If this is a "No directory selected" error, return null instead of throwing
      if (error instanceof Error && error.message.includes('No directory selected')) {
        return null;
      }
      
      // For other errors, still return null but log it
      return null;
    }
  }

  async openInFolder(path: string): Promise<boolean> {
    try {
      // Use shell plugin to open the folder
      await safeInvoke<void>('open_in_folder', { path });
      return true;
    } catch (error) {
      console.error('Failed to open folder:', error);
      return false;
    }
  }

  // Listen for task initialization started
  listenToTaskInitializationStarted(callback: (data: { project_id: string }) => void): Promise<() => void> {
    if (isTauri()) {
      return listen('task-initialization-started', (event: any) => {
        callback(event.payload as { project_id: string });
      });
    } else {
      console.warn('Task initialization started listener not available in browser mode');
      // Return a promise that resolves to a no-op function
      return Promise.resolve(() => {});
    }
  }
  
  // Listen for task initialization progress
  listenToTaskInitializationProgress(callback: (data: { project_id: string, message: string }) => void): Promise<() => void> {
    if (isTauri()) {
      return listen('task-initialization-progress', (event: any) => {
        callback(event.payload as { project_id: string, message: string });
      });
    } else {
      console.warn('Task initialization progress listener not available in browser mode');
      // Return a promise that resolves to a no-op function
      return Promise.resolve(() => {});
    }
  }
  
  // Listen for task initialization completed
  async listenToTaskInitializationCompleted(callback: (data: { 
    project_id: string, 
    task_count: number,
    task_names: Array<[string, string]> // [task_id, task_name]
  }) => void): Promise<() => void> {
    if (isTauri()) {
      return listen('task-initialization-completed', (event: any) => {
        callback(event.payload as { 
          project_id: string, 
          task_count: number,
          task_names: Array<[string, string]>
        });
      });
    } else {
      console.warn('Task initialization completed listener not available in browser mode');
      
      // Mock implementation for browser testing
      setTimeout(() => {
        callback({
          project_id: '123',
          task_count: 3,
          task_names: [
            ['framework:mock', 'Setup Framework'],
            ['module:mock1', 'Install Module 1'],
            ['cleanup', 'Project Cleanup']
          ]
        });
      }, 2000);
      
      // Return a promise that resolves to a no-op function
      return Promise.resolve(() => {});
    }
  }
  
  // Listen for task initialization failed
  listenToTaskInitializationFailed(callback: (data: { project_id: string, reason: string }) => void): Promise<() => void> {
    console.log('Setting up listener for task-initialization-failed event');
    
    return listen<{ project_id: string, reason: string }>('task-initialization-failed', (event) => {
      console.log('Task initialization failed event received:', event);
      callback(event.payload);
    });
  }
} 