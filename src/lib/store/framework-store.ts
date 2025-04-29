import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Framework {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  tags: string[];
  screenshot?: string;
  baseCommand: string;
  compatibleModules: string[];
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

export interface ModuleOption {
  name: string;
  type: 'boolean' | 'string' | 'select';
  description: string;
  default?: string | boolean | string[];
  options?: string[];
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

interface FrameworkState {
  frameworks: Framework[];
  modules: Module[];
  selectedFrameworkId: string | null;
  setFrameworks: (frameworks: Framework[]) => void;
  setModules: (modules: Module[]) => void;
  setSelectedFramework: (frameworkId: string | null) => void;
  favoriteFrameworks: string[];
  addFavorite: (frameworkId: string) => void;
  removeFavorite: (frameworkId: string) => void;
}

// @ts-ignore Ignoring type errors due to zustand version compatibility issues
export const useFrameworkStore = create<FrameworkState>()(
  // @ts-ignore
  persist((set) => ({
    frameworks: [],
    modules: [],
    selectedFrameworkId: null,
    setFrameworks: (frameworks) => set({ frameworks }),
    setModules: (modules) => set({ modules }),
    setSelectedFramework: (frameworkId) => set({ selectedFrameworkId: frameworkId }),
    favoriteFrameworks: [],
    addFavorite: (frameworkId) => set((state) => ({
      favoriteFrameworks: [...state.favoriteFrameworks, frameworkId]
    })),
    removeFavorite: (frameworkId) => set((state) => ({
      favoriteFrameworks: state.favoriteFrameworks.filter(id => id !== frameworkId)
    })),
  }), { name: 'architech-frameworks' })
); 