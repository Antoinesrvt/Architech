import { Framework, Module } from '../store/framework-store';
import { ProjectGenerationState, TaskResult } from './local';

// For backward compatibility - Template is now Framework
export type Template = Framework;

export interface ProjectConfig {
  name: string;
  path: string;
  framework: string;
  modules: ModuleConfig[];
  options: {
    typescript: boolean;
    app_router: boolean;
    eslint: boolean;
    cli_execution?: boolean;
    verbose_logging?: boolean;
  };
}

export interface ModuleConfig {
  id: string;
  options: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GenerationProgress {
  step: string;
  message: string;
  progress: number;
}

export interface FrameworkService {
  getFrameworks(): Promise<Framework[]>;
  getModules(): Promise<Module[]>;
  validateProjectConfig(config: ProjectConfig): Promise<ValidationResult>;
  generateProject(config: ProjectConfig): Promise<string>;
  listenToProgress(callback: (progress: GenerationProgress) => void): () => void;
  
  // New state management methods
  getProjectStatus(projectId: string): Promise<ProjectGenerationState>;
  getProjectLogs(projectId: string): Promise<string[]>;
  cancelProjectGeneration(projectId: string): Promise<void>;
  listenToTaskUpdates(callback: (result: TaskResult) => void): () => void;
  listenToGenerationComplete(callback: (projectId: string) => void): () => void;
  listenToGenerationFailed(callback: (data: { projectId: string, reason: string }) => void): () => void;
  
  // Existing system methods
  openInEditor(path: string, editor?: string): Promise<boolean>;
  openInFolder(path: string): Promise<boolean>;
  browseForDirectory(): Promise<string | null>;
}

// For backward compatibility - TemplateService is now FrameworkService
export type TemplateService = FrameworkService; 