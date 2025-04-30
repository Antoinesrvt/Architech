import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Framework {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  tags: string[];
  cli: FrameworkCli;
  compatible_modules: string[];
  directory_structure: DirectoryStructure;
}

export interface FrameworkCli {
  base_command: string;
  arguments?: Record<string, CliArgument>;
  interactive: boolean;
  responses?: CliResponse[];
}

export interface CliArgument {
  flag?: string;
  position?: number;
  value?: string;
  description?: string;
  default?: any;
  value_type?: string;
}

export interface CliResponse {
  prompt: string;
  response?: string;
  use_project_name?: boolean;
}

export interface DirectoryStructure {
  enforced: boolean;
  directories: string[];
}

export interface Module {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  dependencies: string[];
  incompatible_with: string[];
  installation: ModuleInstallation;
  configuration: ModuleConfiguration;
}

export interface ModuleInstallation {
  commands: string[];
  file_operations: FileOperation[];
}

export interface FileOperation {
  operation: string;
  path: string;
  content?: string;
  pattern?: string;
  replacement?: string;
  action?: string;
  import?: string;
}

export interface ModuleConfiguration {
  options: ModuleOption[];
}

export interface ModuleOption {
  id: string;
  type: string;
  label: string;
  description: string;
  default: any;
  choices?: OptionChoice[];
}

export interface OptionChoice {
  value: string;
  label: string;
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