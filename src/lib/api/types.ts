import { Template, Module } from '../store/template-store';

export interface ProjectConfig {
  name: string;
  path: string;
  template: string;
  modules: ModuleConfig[];
  options: {
    typescript: boolean;
    appRouter: boolean;
    eslint: boolean;
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

export interface TemplateService {
  getTemplates(): Promise<Template[]>;
  getModules(): Promise<Module[]>;
  validateProjectConfig(config: ProjectConfig): Promise<ValidationResult>;
  generateProject(config: ProjectConfig): Promise<string>;
  listenToProgress(callback: (progress: GenerationProgress) => void): () => void;
  openInEditor(path: string, editor?: string): Promise<boolean>;
  browseForDirectory(): Promise<string | null>;
} 