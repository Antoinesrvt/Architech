import { Framework, Module } from '../store/framework-store';
import { ProjectGenerationState, TaskResult } from './local';

// For backward compatibility - Template is now Framework
export type Template = Framework;

export interface ProjectConfig {
  name: string;
  path: string;
  framework: string;
  modules: string[];
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
  initializeProjectTasks(projectId: string): Promise<void>;
  listenToProgress(callback: (progress: GenerationProgress) => void): Promise<() => void>;
  
  // New state management methods
  getProjectStatus(projectId: string): Promise<ProjectGenerationState>;
  getProjectLogs(projectId: string): Promise<string[]>;
  cancelProjectGeneration(projectId: string): Promise<void>;
  resumeProjectGeneration(projectId: string): Promise<void>;
  listenToTaskUpdates(callback: (result: TaskResult) => void): Promise<() => void>;
  listenToGenerationComplete(callback: (projectId: string) => void): Promise<() => void>;
  listenToGenerationFailed(callback: (data: { projectId: string, reason: string }) => void): Promise<() => void>;
  
  // New task initialization events
  listenToTaskInitializationStarted(callback: (data: { project_id: string }) => void): Promise<() => void>;
  listenToTaskInitializationProgress(callback: (data: { project_id: string, message: string }) => void): Promise<() => void>;
  listenToTaskInitializationCompleted(callback: (data: { project_id: string, task_count: number, task_names: Array<[string, string]> }) => void): Promise<() => void>;
  listenToTaskInitializationFailed(callback: (data: { project_id: string, reason: string }) => void): Promise<() => void>;
  
  // Existing system methods
  openInEditor(path: string, editor?: string): Promise<boolean>;
  openInFolder(path: string): Promise<boolean>;
  browseForDirectory(): Promise<string | null>;
}

// For backward compatibility - TemplateService is now FrameworkService
export type TemplateService = FrameworkService; 