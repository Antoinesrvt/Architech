import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Template, Module } from '../store/template-store';
import { 
  TemplateService, 
  ProjectConfig, 
  GenerationProgress, 
  ValidationResult 
} from './types';

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
    // Provide mock implementations or fallbacks for browser environment
    return {} as T;
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