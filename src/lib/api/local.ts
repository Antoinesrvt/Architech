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
        appRouter: {
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

// Safe invoke function that handles both Tauri and browser environments
const safeInvoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  // Check if we're in a Tauri environment
  const isTauri = window && (window as any).__TAURI__;
  
  if (isTauri) {
    try {
      // Try the core.invoke approach first (newer Tauri versions)
      if ((window as any).__TAURI__.core?.invoke) {
        return await (window as any).__TAURI__.core.invoke(command, args);
      }
      // Try the direct invoke from import
      return await invoke(command, args);
    } catch (error) {
      console.error(`Error invoking ${command}:`, error);
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
    } else {
      console.warn(`Mock for command ${command} not implemented`);
      return {} as T;
    }
  }
};

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
    try {
      // Validate the config first
      const validation = await this.validateProjectConfig(config);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }
      
      // If validation passes, generate the project
      return await safeInvoke<string>('generate_project', { config });
    } catch (error) {
      console.error('Failed to generate project:', error);
      throw error;
    }
  }

  listenToProgress(callback: (progress: GenerationProgress) => void): () => void {
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
      
      return () => clearInterval(interval);
    }
    
    // In Tauri mode, listen to real events
    try {
      const unlisten = listen<GenerationProgress>('generation-progress', (event) => {
        callback(event.payload);
      });
      
      return () => {
        unlisten.then(unlistenFn => unlistenFn());
      };
    } catch (error) {
      console.error('Failed to listen to progress events:', error);
      return () => {};
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
      console.error('Failed to browse for directory:', error);
      return null;
    }
  }
} 