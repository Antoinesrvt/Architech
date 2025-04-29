import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Template, Module } from '../store/template-store';
import { 
  TemplateService, 
  ProjectConfig, 
  GenerationProgress, 
  ValidationResult 
} from './types';

// Mock data for templates when running in browser mode
const mockTemplates: Template[] = [
  {
    id: "nextjs-base",
    name: "Next.js Base Template",
    description: "A basic Next.js template with TypeScript support",
    version: "1.0.0",
    tags: ["frontend", "react", "typescript"],
    screenshot: undefined,
    baseCommand: "npx create-next-app@latest",
    recommendedModules: ["tailwind", "daisyui"],
    structure: {
      enforced: true,
      directories: ["src", "public", "components"]
    }
  },
  {
    id: "nextjs-dashboard",
    name: "Next.js Dashboard Template",
    description: "A template for admin dashboards with Next.js",
    version: "1.0.0",
    tags: ["frontend", "react", "dashboard"],
    screenshot: undefined,
    baseCommand: "npx create-next-app@latest",
    recommendedModules: ["tailwind", "recharts"],
    structure: {
      enforced: true,
      directories: ["src", "public", "components", "pages", "dashboard"]
    }
  }
];

// Mock data for modules when running in browser mode
const mockModules: Module[] = [
  {
    id: "tailwind",
    name: "Tailwind CSS",
    description: "A utility-first CSS framework",
    version: "1.0.0",
    category: "styling",
    dependencies: [],
    incompatibleWith: [],
    installation: {
      commands: ["npm install -D tailwindcss postcss autoprefixer", "npx tailwindcss init -p"],
      files: [
        {
          source: "tailwind/tailwind.config.js",
          destination: "tailwind.config.js"
        }
      ],
      transforms: []
    },
    configuration: {
      options: [
        {
          name: "darkMode",
          type: "select",
          description: "Dark mode configuration",
          default: "class",
          options: ["media", "class"]
        }
      ]
    }
  },
  {
    id: "daisyui",
    name: "DaisyUI",
    description: "Component library for Tailwind CSS",
    version: "1.0.0",
    category: "ui",
    dependencies: ["tailwind"],
    incompatibleWith: [],
    installation: {
      commands: ["npm install daisyui"],
      files: [],
      transforms: [
        {
          file: "tailwind.config.js",
          pattern: "plugins: \\[.*\\]",
          replacement: "plugins: [require(\"daisyui\")]"
        }
      ]
    },
    configuration: {
      options: [
        {
          name: "themes",
          type: "select",
          description: "DaisyUI themes to include",
          default: "light",
          options: ["light", "dark", "corporate"]
        }
      ]
    }
  },
  {
    id: "recharts",
    name: "Recharts",
    description: "Redefined chart library built with React and D3",
    version: "1.0.0",
    category: "ui",
    dependencies: [],
    incompatibleWith: [],
    installation: {
      commands: ["npm install recharts"],
      files: [],
      transforms: []
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
    if (command === 'get_templates') {
      return mockTemplates as T;
    } else if (command === 'get_modules') {
      return mockModules as T;
    } else {
      console.warn(`Mock for command ${command} not implemented`);
      return {} as T;
    }
  }
};

export class LocalTemplateService implements TemplateService {
  async getTemplates(): Promise<Template[]> {
    try {
      return await safeInvoke<Template[]>('get_templates');
    } catch (error) {
      console.error('Failed to get templates:', error);
      return [];
    }
  }

  async getModules(): Promise<Module[]> {
    try {
      return await safeInvoke<Module[]>('get_modules');
    } catch (error) {
      console.error('Failed to get modules:', error);
      return [];
    }
  }

  async validateProjectConfig(config: ProjectConfig): Promise<ValidationResult> {
    try {
      return await safeInvoke<ValidationResult>('validate_project_config', { config });
    } catch (error) {
      console.error('Failed to validate project config:', error);
      return { valid: false, errors: ['Validation failed due to system error'] };
    }
  }

  async generateProject(config: ProjectConfig): Promise<string> {
    try {
      return await safeInvoke<string>('generate_project', { config });
    } catch (error) {
      console.error('Failed to generate project:', error);
      throw new Error(`Project generation failed: ${error}`);
    }
  }

  listenToProgress(callback: (progress: GenerationProgress) => void): () => void {
    const unlistenPromise = listen('generation-progress', (eventData) => {
      callback(eventData.payload as GenerationProgress);
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }

  async openInEditor(path: string, editor = 'code'): Promise<boolean> {
    try {
      await safeInvoke('open_in_editor', { path, editor });
      return true;
    } catch (error) {
      console.error('Failed to open in editor:', error);
      return false;
    }
  }

  async browseForDirectory(): Promise<string | null> {
    try {
      const selected = await safeInvoke<string>('browse_directory', { title: 'Select Project Location' });
      return selected || null;
    } catch (error) {
      console.error('Failed to browse for directory:', error);
      return null;
    }
  }
} 