import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Template {
  id: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  screenshot?: string;
  baseCommand: string;
  recommendedModules: string[];
  structure: {
    enforced: boolean;
    directories: string[];
  };
}

export interface Module {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'styling' | 'state' | 'i18n' | 'testing' | 'ui' | 'forms' | 'advanced';
  dependencies: string[];
  incompatibleWith: string[];
  installation: {
    commands: string[];
    files: FileOperation[];
    transforms: Transform[];
  };
  configuration: {
    options: ModuleOption[];
  };
}

export interface FileOperation {
  source: string;
  destination: string;
}

export interface Transform {
  file: string;
  pattern: string;
  replacement: string;
}

export interface ModuleOption {
  name: string;
  type: 'boolean' | 'string' | 'select';
  description: string;
  default?: string | boolean;
  options?: string[];
}

interface TemplateState {
  templates: Template[];
  modules: Module[];
  setTemplates: (templates: Template[]) => void;
  setModules: (modules: Module[]) => void;
  favoriteTemplates: string[];
  addFavorite: (templateId: string) => void;
  removeFavorite: (templateId: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: [],
      modules: [],
      setTemplates: (templates) => set({ templates }),
      setModules: (modules) => set({ modules }),
      favoriteTemplates: [],
      addFavorite: (templateId) => set((state) => ({
        favoriteTemplates: [...state.favoriteTemplates, templateId]
      })),
      removeFavorite: (templateId) => set((state) => ({
        favoriteTemplates: state.favoriteTemplates.filter(id => id !== templateId)
      })),
    }),
    {
      name: 'architech-templates',
    }
  )
); 