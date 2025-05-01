import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { frameworkService } from '@/lib/api';
import { ProjectGenerationState, TaskResult } from '@/lib/api/local';

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
  
  // New generation tracking
  currentGenerationId: string | null;
  generationState: ProjectGenerationState | null;
  generationLogs: string[];
  
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
  getGenerationStatus: () => Promise<ProjectGenerationState | undefined>;
  getGenerationLogs: () => Promise<string[] | undefined>;
  cancelGeneration: () => Promise<void>;
  
  // Setup event listeners
  setupGenerationListeners: () => () => void;
  
  // Reset generation state
  resetGenerationState: () => void;
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
    
    // Project generation state
    isLoading: false,
    error: null,
    setIsLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    
    // New generation tracking
    currentGenerationId: null,
    generationState: null,
    generationLogs: [],
    
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
    
    resetGenerationState: () => {
      set({
        currentGenerationId: null,
        generationState: null,
        generationLogs: [],
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
      
      // Reset any previous generation state
      get().resetGenerationState();
      
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
            app_router: true,
            eslint: true,
          }
        };
        
        console.log('Project generation config:', JSON.stringify(config, null, 2));
        
        // Call the backend to generate the project
        const projectId = await frameworkService.generateProject(config);
        set({ currentGenerationId: projectId });
        
        // Setup listeners for this generation
        get().setupGenerationListeners();
        
        // Get initial status after a short delay to allow backend to initialize
        setTimeout(async () => {
          try {
            await get().getGenerationStatus();
            await get().getGenerationLogs();
          } catch (error) {
            console.error('Failed to get initial status/logs:', error);
          }
        }, 500);
        
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
        
        // If we have a current draft, delete it after starting generation
        const { currentDraftId } = get();
        if (currentDraftId) {
          get().deleteDraft(currentDraftId);
        }
        
        return projectId;
      } catch (error) {
        console.error('Project generation error:', error);
        
        // Provide a more helpful error message
        let errorMessage = error instanceof Error ? error.message : String(error);
        
        set({ 
          isLoading: false, 
          error: errorMessage
        });
        return Promise.reject(error);
      }
    },
    
    getGenerationStatus: async () => {
      const { currentGenerationId } = get();
      if (!currentGenerationId) return;
      
      try {
        const status = await frameworkService.getProjectStatus(currentGenerationId);
        set({ generationState: status });
        
        // Update loading state based on generation status
        if (status.status === 'Completed' || status.status.startsWith('Failed')) {
          set({ isLoading: false });
        }
        
        return status;
      } catch (error) {
        console.error('Failed to get generation status:', error);
        // Don't immediately set error state to avoid interrupting the UI
        // We'll retry on the next poll interval
        
        // But if we've been failing repeatedly, we should update the UI
        if (get().isLoading) {
          // After 5 seconds of failing, give up and show error
          setTimeout(() => {
            if (get().isLoading) {
              set({ 
                isLoading: false,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }, 5000);
        }
      }
    },
    
    getGenerationLogs: async () => {
      const { currentGenerationId } = get();
      if (!currentGenerationId) return;
      
      try {
        const logs = await frameworkService.getProjectLogs(currentGenerationId);
        set({ generationLogs: logs });
        return logs;
      } catch (error) {
        console.error('Failed to get generation logs:', error);
        // Don't set error state here to avoid interrupting the UI
      }
    },
    
    cancelGeneration: async () => {
      const { currentGenerationId } = get();
      if (!currentGenerationId) return;
      
      try {
        await frameworkService.cancelProjectGeneration(currentGenerationId);
        set({ isLoading: false });
        // Immediately update status to reflect cancellation
        await get().getGenerationStatus();
      } catch (error) {
        console.error('Failed to cancel generation:', error);
        set({ 
          isLoading: false,
          error: 'Failed to cancel project generation' 
        });
      }
    },
    
    setupGenerationListeners: () => {
      // Set up event listeners for task updates, completion, and failure
      const unlistenTaskUpdates = frameworkService.listenToTaskUpdates((result: TaskResult) => {
        console.log('Task update received:', result);
        // Update status whenever we get a task update
        get().getGenerationStatus();
        get().getGenerationLogs();
      });
      
      const unlistenComplete = frameworkService.listenToGenerationComplete((projectId: string) => {
        console.log('Generation completed:', projectId);
        if (projectId === get().currentGenerationId) {
          set({ isLoading: false });
          get().getGenerationStatus();
          get().getGenerationLogs();
        }
      });
      
      const unlistenFailed = frameworkService.listenToGenerationFailed(({ projectId, reason }) => {
        console.log('Generation failed:', projectId, reason);
        if (projectId === get().currentGenerationId) {
          set({ 
            isLoading: false,
            error: `Generation failed: ${reason}`
          });
          get().getGenerationStatus();
          get().getGenerationLogs();
        }
      });
      
      // Return a function to unsubscribe from all listeners
      return () => {
        unlistenTaskUpdates();
        unlistenComplete();
        unlistenFailed();
      };
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