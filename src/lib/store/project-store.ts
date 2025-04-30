import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { frameworkService } from '@/lib/api';

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  framework: string;
  createdAt: string;
  lastOpenedAt: string;
}

export interface ProjectDraft {
  id: string;
  name: string;
  path: string;
  description?: string;
  frameworkId: string | null;
  moduleIds: string[];
  moduleConfigurations?: Record<string, Record<string, any>>;
  lastUpdated: string;
}

interface ModuleConfig {
  id: string;
  options: Record<string, any>;
}

interface ProjectState {
  // Recent projects history
  recentProjects: RecentProject[];
  addProject: (project: RecentProject) => void;
  removeProject: (projectId: string) => void;
  updateLastOpened: (projectId: string) => void;
  
  // Project drafts
  drafts: ProjectDraft[];
  currentDraftId: string | null;
  createDraft: () => string;
  saveDraft: () => void;
  loadDraft: (draftId: string) => void;
  deleteDraft: (draftId: string) => void;
  
  // Current project state
  projectName: string;
  projectPath: string;
  projectDescription: string;
  selectedFrameworkId: string | null;
  selectedModuleIds: string[];
  moduleConfigurations: Record<string, Record<string, any>>;
  
  // Project generation state
  isLoading: boolean;
  error: string | null;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Save tracking
  lastSaved: Date | null;
  
  // Actions for wizard steps
  setProjectName: (name: string) => void;
  setProjectPath: (path: string) => void;
  setProjectDescription: (description: string) => void;
  setSelectedFramework: (frameworkId: string | null) => void;
  addModule: (moduleId: string) => void;
  removeModule: (moduleId: string) => void;
  setModuleConfiguration: (moduleId: string, options: Record<string, any>) => void;
  resetWizardState: () => void;
  
  // Project generation
  generateProject: () => Promise<string>;
}

// Default state for a new project
const DEFAULT_PROJECT_STATE = {
  projectName: '',
  projectPath: '',
  projectDescription: '',
  selectedFrameworkId: null,
  selectedModuleIds: [],
  moduleConfigurations: {},
  lastSaved: null,
};

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
    
    // Project drafts
    drafts: [],
    currentDraftId: null,
    createDraft: () => {
      const draftId = uuidv4();
      set((state) => ({
        drafts: [
          ...state.drafts.slice(0, 3), // Keep only the 3 most recent drafts
          {
            id: draftId,
            name: '',
            path: '',
            frameworkId: null,
            moduleIds: [],
            moduleConfigurations: {},
            lastUpdated: new Date().toISOString()
          }
        ],
        currentDraftId: draftId,
        ...DEFAULT_PROJECT_STATE
      }));
      return draftId;
    },
    saveDraft: () => {
      const { currentDraftId, projectName, projectPath, projectDescription, selectedFrameworkId, selectedModuleIds, moduleConfigurations } = get();
      
      if (!currentDraftId) return;
      
      const now = new Date();
      
      set((state) => ({
        drafts: state.drafts.map(draft => 
          draft.id === currentDraftId
            ? {
                ...draft,
                name: projectName || 'Untitled Project',
                path: projectPath,
                description: projectDescription,
                frameworkId: selectedFrameworkId,
                moduleIds: selectedModuleIds,
                moduleConfigurations: moduleConfigurations,
                lastUpdated: now.toISOString()
              }
            : draft
        ),
        lastSaved: now
      }));
    },
    loadDraft: (draftId) => {
      const { drafts } = get();
      const draft = drafts.find(d => d.id === draftId);
      
      if (!draft) return;
      
      // Ensure moduleIds is always an array
      const moduleIds = Array.isArray(draft.moduleIds) ? draft.moduleIds : [];
      
      set({
        currentDraftId: draftId,
        projectName: draft.name || '',
        projectPath: draft.path || '',
        projectDescription: draft.description || '',
        selectedFrameworkId: draft.frameworkId || null,
        selectedModuleIds: moduleIds,
        moduleConfigurations: draft.moduleConfigurations || {}, // Add default empty object if not present
        lastSaved: draft.lastUpdated ? new Date(draft.lastUpdated) : null,
      });
    },
    deleteDraft: (draftId) => {
      // First, reset the current state if this is the active draft
      if (get().currentDraftId === draftId) {
        // Reset all current project state
        set({
          currentDraftId: null,
          ...DEFAULT_PROJECT_STATE
        });
      }
      
      // Then remove the draft from the drafts array
      set((state) => ({
        drafts: state.drafts.filter(d => d.id !== draftId)
      }));
    },
    
    // Current project properties
    ...DEFAULT_PROJECT_STATE,
    
    // Generation state
    isLoading: false,
    error: null,
    setIsLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    
    // Actions
    setProjectName: (name) => {
      set({ projectName: name });
      get().saveDraft();
    },
    setProjectPath: (path) => {
      set({ projectPath: path });
      get().saveDraft();
    },
    setProjectDescription: (description) => {
      set({ projectDescription: description });
      get().saveDraft();
    },
    setSelectedFramework: (frameworkId) => {
      set({ selectedFrameworkId: frameworkId });
      get().saveDraft();
    },
    addModule: (moduleId) => set((state) => {
      const newState = { 
        selectedModuleIds: [...state.selectedModuleIds, moduleId] 
      };
      set(newState);
      get().saveDraft();
      return newState;
    }),
    removeModule: (moduleId) => set((state) => {
      const newState = { 
        selectedModuleIds: state.selectedModuleIds.filter(id => id !== moduleId) 
      };
      set(newState);
      get().saveDraft();
      return newState;
    }),
    setModuleConfiguration: (moduleId, options) => set((state) => {
      const newState = {
        moduleConfigurations: {
          ...state.moduleConfigurations,
          [moduleId]: options
        }
      };
      set(newState);
      get().saveDraft();
      return newState;
    }),
    resetWizardState: () => {
      // Completely reset all project-related state
      set({
        currentDraftId: null,
        projectName: '',
        projectPath: '',
        projectDescription: '',
        selectedFrameworkId: null,
        selectedModuleIds: [],
        moduleConfigurations: {},
        isLoading: false,
        error: null,
        lastSaved: null,
      });
    },
    
    generateProject: async () => {
      const { projectName, projectPath, selectedFrameworkId, selectedModuleIds, moduleConfigurations } = get();
      
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
          modules: selectedModuleIds.map(id => ({ 
            id, 
            options: moduleConfigurations[id] || {} 
          })),
          options: {
            typescript: true,
            app_router: true, // Using app_router to match backend expectations
            eslint: true,
            cli_execution: true,
            verbose_logging: true
          }
        };
        
        // Log the config for debugging
        console.log('Project generation config:', JSON.stringify(config, null, 2));
        
        // Call API to generate project - this will use CLI tools
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
        
        // If we have a current draft, delete it after successful generation
        const { currentDraftId } = get();
        if (currentDraftId) {
          get().deleteDraft(currentDraftId);
        }
        
        set({ isLoading: false });
        
        return projectId;
      } catch (error) {
        console.error('Project generation error:', error);
        
        // Provide a more helpful error message
        let errorMessage = error instanceof Error ? error.message : String(error);
        
        // Special handling for known errors
        if (errorMessage.includes('app_router')) {
          errorMessage = 'There was an issue with the Next.js App Router configuration. Please try again.';
        }
        
        set({ 
          isLoading: false, 
          error: errorMessage
        });
        return Promise.reject(error);
      }
    }
  }), 
  { 
    name: 'architech-projects',
    partialize: (state) => ({ 
      recentProjects: state.recentProjects,
      drafts: state.drafts,
      currentDraftId: state.currentDraftId,
    })
  })
); 