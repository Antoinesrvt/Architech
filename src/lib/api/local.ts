import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Framework, Module } from '../store/framework-store';
import { 
  FrameworkService, 
  ProjectConfig, 
  GenerationProgress, 
  ValidationResult 
} from './types';

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

// Helper methods for TaskStatus
export const TaskStatusHelpers = {
  isFailed: (status: TaskStatus): boolean => {
    return typeof status === 'string' && status.startsWith('Failed:');
  },
  isSkipped: (status: TaskStatus): boolean => {
    return typeof status === 'string' && status.startsWith('Skipped:');
  },
  getReason: (status: TaskStatus): string | null => {
    if (typeof status !== 'string') {
      return null;
    }
    
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

// Task result from backend
export interface TaskResult {
  task_id: string;
  project_id: string;
  state: TaskStatus;
}

// Helper to convert backend TaskState to frontend TaskResult
export function convertTaskEvent(event: any): TaskResult {
  console.log('Converting task event:', event);
  return {
    task_id: event.task_id,
    project_id: event.project_id,
    state: event.state
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
      return await safeInvoke<ValidationResult>('validate_project_config', { config });
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
      const projectId = await safeInvoke<string>('generate_project', { config: backendConfig });
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
      await safeInvoke<void>('initialize_project_tasks', { 
        param: { project_id: projectId }  // Fix: wrap in param object to match Rust function signature
      });
      console.log('Project tasks initialized successfully for ID:', projectId);
    } catch (error) {
      console.error('Error initializing project tasks:', error);
      throw error;
    }
  }

  async getProjectStatus(projectId: string): Promise<ProjectGenerationState> {
    try {
      // Call the updated backend API with revised parameter structure
      console.log(`Getting project status for ID: ${projectId}`);
      const response = await safeInvoke<ProjectStatusResponse>('get_project_status', { 
        param: { project_id: projectId }
      });
      console.log(`Got project status response:`, response);
      
      // Convert the new response format to the existing ProjectGenerationState format
      // for backward compatibility
      const status: TaskStatus = 
        response.status === 'not_started' ? 'Pending' :
        response.status === 'preparing' ? 'Initializing' :
        response.status === 'generating' ? 'Running' :
        response.status === 'completed' ? 'Completed' :
        response.status === 'cancelled' ? 'Skipped: Cancelled by user' :
        `Failed: ${response.error || 'Unknown error'}`;
      
      // For initializing status, we need to create placeholder tasks
      // This is handled in the frontend store, but we prepare the state here
      const isInitializing = response.status === 'preparing'; 
      
      // Create a synthetic generation state from the new response format
      const projectGenerationState: ProjectGenerationState = {
        id: projectId,
        path: response.path || '',
        name: '', // This will be filled in by the UI if needed
        framework: '',
        tasks: {}, // The UI will create placeholder tasks for initializing state
        current_task: null,
        progress: response.progress / 100, // Convert from 0-100 to 0-1
        status,
        logs: [], // Logs are fetched separately
        resumable: response.resumable
      };
      
      console.log(`Converted to ProjectGenerationState:`, projectGenerationState);
      return projectGenerationState;
    } catch (error) {
      console.error('Error getting project status:', error);
      throw error;
    }
  }

  async getProjectLogs(projectId: string): Promise<string[]> {
    try {
      // Call the updated backend API with revised parameter structure
      const logs = await safeInvoke<LogEntry[]>('get_project_logs', { 
        param: { project_id: projectId }
      });
      
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
      await safeInvoke<void>('cancel_project_generation', { 
        param: { project_id: projectId }
      });
    } catch (error) {
      console.error('Error cancelling project generation:', error);
      throw error;
    }
  }

  // Add a new method for resuming project generation
  async resumeProjectGeneration(projectId: string): Promise<void> {
    try {
      // Call the new backend API for resuming generation
      await safeInvoke<void>('resume_project_generation', { 
        param: { project_id: projectId }
      });
    } catch (error) {
      console.error('Error resuming project generation:', error);
      throw error;
    }
  }

  // Listen for task updates
  listenToTaskUpdates(callback: (result: TaskResult) => void): Promise<() => void> {
    // Check if we're in a Tauri environment
    const isTauri = window && (window as any).__TAURI__;
    
    if (isTauri) {
      try {
        console.log('Setting up listener for task-state-changed event');
        return listen<{project_id: string, task_id: string, state: string}>('task-state-changed', (event) => {
          console.log('Received task-state-changed event:', event);
          
          // Convert the incoming event to the expected TaskResult format
          const taskResult: TaskResult = {
            task_id: event.payload.task_id,
            project_id: event.payload.project_id,
            state: event.payload.state
          };
          
          callback(taskResult);
        });
      } catch (error) {
        console.error('Failed to listen for task updates:', error);
        return Promise.resolve(() => {});
      }
    } else {
      console.warn('Task updates are not available in browser mode');
      return Promise.resolve(() => {});
    }
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
    console.log('Setting up listener for task-initialization-started event');
    
    return listen<{ project_id: string }>('task-initialization-started', (event) => {
      console.log('Task initialization started event received:', event);
      callback(event.payload);
    });
  }
  
  // Listen for task initialization progress
  listenToTaskInitializationProgress(callback: (data: { project_id: string, message: string }) => void): Promise<() => void> {
    console.log('Setting up listener for task-initialization-progress event');
    
    return listen<{ project_id: string, message: string }>('task-initialization-progress', (event) => {
      console.log('Task initialization progress event received:', event);
      callback(event.payload);
    });
  }
  
  // Listen for task initialization completed
  async listenToTaskInitializationCompleted(callback: (data: { 
    project_id: string, 
    task_count: number,
    task_names: Array<[string, string]> // [task_id, task_name]
  }) => void): Promise<() => void> {
    if (isTauri()) {
      console.log('Setting up task-initialization-completed listener (Tauri)');
      
      // For Tauri, use the event system
      const unlisten = await listen('task-initialization-completed', (event: { payload: any }) => {
        console.log('task-initialization-completed event received:', event.payload);
        callback({
          project_id: event.payload.project_id,
          task_count: event.payload.task_count,
          task_names: event.payload.task_names || [] // Use empty array as fallback if not provided
        });
      });
      
      return unlisten;
    } else {
      // For browser, we don't have a real backend, so simulate with localStorage
      console.log('Setting up task-initialization-completed listener (Browser)');
      
      // Create event listener
      const handleEvent = (e: StorageEvent) => {
        if (e.key === 'task-initialization-completed') {
          try {
            const data = JSON.parse(e.newValue || '{}');
            callback({
              project_id: data.project_id,
              task_count: data.task_count,
              task_names: data.task_names || []
            });
          } catch (error) {
            console.error('Error parsing task initialization event', error);
          }
        }
      };
      
      // Add event listener
      window.addEventListener('storage', handleEvent);
      
      // Return cleanup function
      return () => window.removeEventListener('storage', handleEvent);
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