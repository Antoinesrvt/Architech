import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { frameworkService } from '@/lib/api';

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  framework: string;
  createdAt: string;
  lastOpenedAt: string;
}

interface ProjectState {
  // Recent projects history
  recentProjects: RecentProject[];
  addProject: (project: RecentProject) => void;
  removeProject: (projectId: string) => void;
  updateLastOpened: (projectId: string) => void;
  
  // Current project state
  projectName: string;
  projectPath: string;
  selectedFrameworkId: string | null;
  selectedModuleIds: string[];
  
  // Project generation state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setProjectName: (name: string) => void;
  setProjectPath: (path: string) => void;
  setSelectedFramework: (frameworkId: string | null) => void;
  addModule: (moduleId: string) => void;
  removeModule: (moduleId: string) => void;
  generateProject: () => Promise<string>;
}

// @ts-ignore Ignoring type errors due to zustand version compatibility issues
export const useProjectStore = create<ProjectState>()(
  // @ts-ignore
  persist((set, get) => ({
    // Recent projects
    recentProjects: [],
    addProject: (project) => set((state) => ({ 
      recentProjects: [project, ...state.recentProjects.filter(p => p.id !== project.id)].slice(0, 10) 
    })),
    removeProject: (projectId) => set((state) => ({
      recentProjects: state.recentProjects.filter(p => p.id !== projectId)
    })),
    updateLastOpened: (projectId) => set((state) => ({
      recentProjects: state.recentProjects.map(p => 
        p.id === projectId 
          ? { ...p, lastOpenedAt: new Date().toISOString() } 
          : p
      )
    })),
    
    // Current project properties
    projectName: '',
    projectPath: '',
    selectedFrameworkId: null,
    selectedModuleIds: [],
    
    // Generation state
    isLoading: false,
    error: null,
    
    // Actions
    setProjectName: (name) => set({ projectName: name }),
    setProjectPath: (path) => set({ projectPath: path }),
    setSelectedFramework: (frameworkId) => set({ selectedFrameworkId: frameworkId }),
    addModule: (moduleId) => set((state) => ({ 
      selectedModuleIds: [...state.selectedModuleIds, moduleId] 
    })),
    removeModule: (moduleId) => set((state) => ({ 
      selectedModuleIds: state.selectedModuleIds.filter(id => id !== moduleId) 
    })),
    
    generateProject: async () => {
      const { projectName, projectPath, selectedFrameworkId, selectedModuleIds } = get();
      
      // Validate required fields
      if (!projectName) {
        set({ error: 'Project name is required' });
        return Promise.reject('Project name is required');
      }
      
      if (!projectPath) {
        set({ error: 'Project path is required' });
        return Promise.reject('Project path is required');
      }
      
      if (!selectedFrameworkId) {
        set({ error: 'Framework selection is required' });
        return Promise.reject('Framework selection is required');
      }
      
      // Start generation
      set({ isLoading: true, error: null });
      
      try {
        // Create configuration based on store state
        const config = {
          name: projectName,
          path: projectPath,
          framework: selectedFrameworkId,
          modules: selectedModuleIds.map(id => ({ id, options: {} })),
          options: {
            typescript: true,
            appRouter: true,
            eslint: true
          }
        };
        
        // Call API to generate project
        const projectId = await frameworkService.generateProject(config);
        
        // Add to recent projects
        const newProject: RecentProject = {
          id: projectId,
          name: projectName,
          path: `${projectPath}/${projectName}`,
          framework: selectedFrameworkId,
          createdAt: new Date().toISOString(),
          lastOpenedAt: new Date().toISOString()
        };
        
        get().addProject(newProject);
        set({ isLoading: false });
        
        return projectId;
      } catch (error) {
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : String(error)
        });
        return Promise.reject(error);
      }
    }
  }), 
  { 
    name: 'architech-projects',
    partialize: (state) => ({ 
      recentProjects: state.recentProjects 
    })
  })
); 