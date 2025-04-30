import { Framework, Module } from '../store/framework-store';

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
  openInEditor(path: string, editor?: string): Promise<boolean>;
  openInFolder(path: string): Promise<boolean>;
  browseForDirectory(): Promise<string | null>;
}

// For backward compatibility - TemplateService is now FrameworkService
export type TemplateService = FrameworkService; 