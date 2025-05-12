import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { frameworkService } from '@/lib/api';
import { ProjectGenerationState, TaskResult, TaskStatusHelpers, GenerationTask } from '@/lib/api/local';
import { ProjectConfig } from '@/lib/api/types';
import { useEffect } from 'react';

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
  generationId?: string | null;
  generationStatus?: string;
  generationProgress?: number;
  generationError?: string | null;
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
  resumeGeneration: () => Promise<void>;
  
  // Setup event listeners
  setupGenerationListeners: () => () => void;
  
  // Reset generation state
  resetGenerationState: () => void;
  
  // New helper method to listen to task initialization events
  listenToTaskInitialization: () => Promise<() => void>;
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
      set({ isLoading: true, error: null });
      
      try {
        const config: ProjectConfig = {
          name: get().projectName,
          path: get().projectPath,
          framework: get().selectedFrameworkId || '',
          modules: get().selectedModuleIds,
          options: {
            typescript: true,
            app_router: true,
            eslint: true,
            // Use module configurations for any additional options
            ...get().moduleConfigurations?.options
          }
        };
        
        if (!config.name || !config.path || !config.framework) {
          set({ 
            isLoading: false, 
            error: 'Please provide a name, path, and framework for your project'
          });
          return '';
        }
        
        // Phase 1: Get project ID
        console.log('Starting project generation phase 1 (ID generation)', config);
        const projectId = await frameworkService.generateProject(config);
        console.log('Received project ID from backend:', projectId);
        
        if (!projectId) {
          console.error('Failed to get project ID from backend');
          set({ 
            isLoading: false, 
            error: 'Failed to start project generation. No project ID returned.' 
          });
          return '';
        }
        
        // Set the current generation ID
        set({ currentGenerationId: projectId });
        console.log('Set currentGenerationId in store:', projectId);
        
        // Update draft with generation ID
        const currentDraftId = get().currentDraftId;
        if (currentDraftId) {
          set(state => ({
            drafts: state.drafts.map(draft => 
              draft.id === currentDraftId 
                ? { 
                    ...draft, 
                    generationId: projectId,
                    generationStatus: 'Initializing',
                    generationProgress: 0
                  }
                : draft
            )
          }));
        }
        
        // Phase 2: Initialize tasks
        console.log('Starting project generation phase 2 (task initialization)');
        try {
          await frameworkService.initializeProjectTasks(projectId);
          console.log('Project task initialization requested successfully');
        } catch (error) {
          console.error('Failed to initialize project tasks:', error);
          set({ error: `Failed to initialize project tasks: ${error}` });
          // Don't set isLoading to false here, as we want to keep listening for events
        }
        
        return projectId;
      } catch (error) {
        console.error('Project generation failed:', error);
        set({ 
          isLoading: false, 
          error: `Project generation failed: ${error}` 
        });
        return '';
      }
    },
    
    getGenerationStatus: async () => {
      const { currentGenerationId } = get();
      if (!currentGenerationId) {
        console.log('No currentGenerationId, cannot get status');
        return;
      }
      
      try {
        // Save the existing tasks to global state so the API can access them
        if (typeof window !== 'undefined') {
          // Store existing tasks in a global variable for the API function to use
          const existingState = get().generationState;
          if (existingState && existingState.tasks) {
            (window as any).__PROJECT_STORE_TASKS = existingState.tasks;
          }
        }
        
        const status = await frameworkService.getProjectStatus(currentGenerationId);
        
        // Process status and merge with existing tasks
        set((state) => {
          const existingTasks = state.generationState?.tasks || {};
          
          // Merge tasks, preferring existing task data but getting state from backend
          const mergedTasks = { ...existingTasks };
          
          // Update the generation state
          return {
            ...state,
            generationState: {
              ...status,
              tasks: mergedTasks, // Preserve existing tasks
            }
          };
        });
        
        return status;
      } catch (error) {
        console.error('Failed to get generation status:', error);
        set({ error: `Failed to get generation status: ${error}` });
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
        
        // Find draft with this generation ID
        const drafts = get().drafts;
        const draftWithGeneration = drafts.find(d => d.generationId === currentGenerationId);
        
        if (draftWithGeneration) {
          // Update draft with cancelled status
          set((state) => ({
            drafts: state.drafts.map(draft => 
              draft.id === draftWithGeneration.id
                ? {
                    ...draft,
                    generationStatus: 'Cancelled',
                    generationError: 'Generation cancelled by user'
                  }
                : draft
            )
          }));
        }
        
        set({ isLoading: false });
        // Immediately update status to reflect cancellation
        await get().getGenerationStatus();
      } catch (error) {
        console.error('Failed to cancel generation:', error);
        
        // Update draft with error status
        const drafts = get().drafts;
        const draftWithGeneration = drafts.find(d => d.generationId === currentGenerationId);
        
        if (draftWithGeneration) {
          set((state) => ({
            drafts: state.drafts.map(draft => 
              draft.id === draftWithGeneration.id
                ? {
                    ...draft,
                    generationStatus: 'Failed',
                    generationError: 'Failed to cancel generation'
                  }
                : draft
            )
          }));
        }
        
        set({ 
          isLoading: false,
          error: 'Failed to cancel project generation' 
        });
      }
    },
    
    resumeGeneration: async () => {
      const { currentGenerationId, currentDraftId } = get();
      if (!currentGenerationId) return;
      
      try {
        set({ isLoading: true, error: null });
        
        // Update the draft status if we have one
        if (currentDraftId) {
          set((state) => ({
            drafts: state.drafts.map(draft => 
              draft.id === currentDraftId
                ? {
                    ...draft,
                    generationStatus: 'Running',
                    generationError: null
                  }
                : draft
            )
          }));
        }
        
        // Call the service to resume generation
        await frameworkService.resumeProjectGeneration(currentGenerationId);
        
        // Start polling for updates
        await get().getGenerationStatus();
        await get().getGenerationLogs();
      } catch (error) {
        console.error("Failed to resume project generation:", error);
        set({ 
          error: "Failed to resume project generation",
          isLoading: false 
        });
        
        // Update draft status on error
        if (currentDraftId) {
          set((state) => ({
            drafts: state.drafts.map(draft => 
              draft.id === currentDraftId
                ? {
                    ...draft,
                    generationStatus: 'Failed',
                    generationError: "Failed to resume project generation"
                  }
                : draft
            )
          }));
        }
      }
    },
    
    setupGenerationListeners: () => {
      // Get current project ID before setting up listeners
      const currentId = get().currentGenerationId;
      
      if (!currentId) {
        console.warn('No current generation ID available for setting up listeners');
        return () => {}; // Return a no-op cleanup function
      }
      
      console.log(`Setting up generation listeners for project ${currentId}`);
      
      // Create array to hold cleanup functions
      const cleanupFunctions: Array<() => void> = [];
      
      // Setup task update listener
      frameworkService.listenToTaskUpdates((taskUpdate) => {
        console.log(`Received task update:`, taskUpdate);
        
        // Check if this update is for our current generation
        if (taskUpdate.project_id !== currentId) {
          console.log(`Ignoring task update for different project: ${taskUpdate.project_id} vs current ${currentId}`);
          return;
        }
        
        // Force uppercase first letter for UI consistency
        const taskStatus = taskUpdate.status.charAt(0).toUpperCase() + taskUpdate.status.slice(1);
        console.log(`Normalized task status to: ${taskStatus}`);
        
        // Update tasks in the generation state
        set((state) => {
          // Get the current generation state
          const currentGenState = state.generationState;
          if (!currentGenState) {
            console.warn('No generation state to update task in');
            return state;
          }
          
          // Ensure tasks object exists
          const existingTasks = currentGenState.tasks || {};
          
          // Find the task to update or create a placeholder if it doesn't exist
          const taskToUpdate = existingTasks[taskUpdate.task_id] || {
            id: taskUpdate.task_id,
            name: `Task ${taskUpdate.task_id}`,
            description: `Task ${taskUpdate.task_id}`,
            status: 'Pending',
            progress: 0,
            dependencies: []
          };
          
          console.log(`Updating task ${taskUpdate.task_id} to status: ${taskStatus}`);
          
          // Create updated tasks map
          const updatedTasks = {
            ...existingTasks,
            [taskUpdate.task_id]: {
              ...taskToUpdate,
              status: taskStatus,
              // If task is now running, set progress
              progress: taskStatus === 'Completed' ? 1.0 : 
                        taskStatus === 'Running' ? 0.5 : 
                        taskStatus.startsWith('Failed') ? 1.0 :
                        taskStatus.startsWith('Skipped') ? 1.0 :
                        taskToUpdate.progress
            }
          };
          
          // Sync with global store for API access
          if (typeof window !== 'undefined') {
            window.__PROJECT_STORE_TASKS = updatedTasks;
          }
          
          // Check if we need to update current_task
          let current_task = currentGenState.current_task;
          
          if (taskStatus === 'Running') {
            // If task is running, set as current
            current_task = taskUpdate.task_id;
          } else if (current_task === taskUpdate.task_id && taskStatus !== 'Running') {
            // If current task is no longer running, clear it
            current_task = null;
          }
          
          // Calculate overall progress based on task states
          const taskValues = Object.values(updatedTasks);
          const completedCount = taskValues.filter(t => 
            t.status === 'Completed' || 
            t.status.startsWith('Failed') || 
            t.status.startsWith('Skipped')
          ).length;
          const totalCount = taskValues.length;
          const progress = totalCount > 0 ? completedCount / totalCount : 0;
          
          console.log(`Task progress update: ${completedCount}/${totalCount} tasks completed, progress = ${progress}`);
          
          // Add to logs
          const newLogs = [...state.generationLogs];
          if (taskUpdate.message) {
            newLogs.push(taskUpdate.message);
          }
          
          const result = {
            ...state,
            generationState: {
              ...currentGenState,
              tasks: updatedTasks,
              current_task,
              progress,
            },
            generationLogs: newLogs
          };
          
          console.log(`Updated generation state:`, {
            taskCount: Object.keys(result.generationState.tasks).length,
            progress: result.generationState.progress,
            currentTask: result.generationState.current_task
          });
          
          return result;
        });
        
        // Refresh full generation state after a brief delay
        setTimeout(() => {
          try {
            get().getGenerationStatus();
          } catch (error) {
            console.error('Error refreshing generation status after task update:', error);
          }
        }, 1000);
      }).then(cleanup => {
        cleanupFunctions.push(cleanup);
      }).catch(err => {
        console.error('Error setting up task update listener:', err);
      });
      
      // Setup task initialization started listener
      frameworkService.listenToTaskInitializationStarted((data) => {
        console.log('Task initialization started:', data);
        
        if (data.project_id !== currentId) return;
        
        // Update state to show initialization
        set((state) => ({
          ...state,
          generationState: state.generationState ? {
            ...state.generationState,
            status: 'Initializing',
            progress: 0.05
          } : null
        }));
      }).then(cleanup => {
        cleanupFunctions.push(cleanup);
      }).catch(err => {
        console.error('Error setting up task init start listener:', err);
      });
      
      // Setup task initialization completed listener
      frameworkService.listenToTaskInitializationCompleted((data) => {
        console.log('Task initialization completed:', data);
        
        if (data.project_id !== currentId) return;
        
        console.log(`Creating ${data.task_count} tasks with names:`, data.task_names);
        
        // Create tasks from the name pairs
        const initialTasks: Record<string, GenerationTask> = {};
        
        data.task_names.forEach(([taskId, taskName]) => {
          initialTasks[taskId] = {
            id: taskId,
            name: taskName,
            description: taskName,
            status: 'Pending',
            progress: 0,
            dependencies: []
          };
        });
        
        // Store tasks globally for API access
        if (typeof window !== 'undefined') {
          window.__PROJECT_STORE_TASKS = initialTasks;
        }
        
        // Update the generation state
        set((state) => ({
          ...state,
          generationState: state.generationState ? {
            ...state.generationState,
            tasks: initialTasks,
            status: 'Generating',
            progress: 0.1
          } : null,
          generationLogs: [
            ...(state.generationLogs || []),
            `Created ${data.task_count} tasks for project generation`
          ]
        }));
        
        // Get the full status after tasks are created
        setTimeout(() => {
          get().getGenerationStatus();
          get().getGenerationLogs();
        }, 100);
      }).then(cleanup => {
        cleanupFunctions.push(cleanup);
      }).catch(err => {
        console.error('Error setting up task init completed listener:', err);
      });
      
      // Return a cleanup function
      return () => {
        // Clean up all listeners
        cleanupFunctions.forEach(cleanup => {
          try {
            cleanup();
          } catch (err) {
            console.error('Error cleaning up listener:', err);
          }
        });
      };
    },
    
    // Add the new listenToTaskInitialization method
    listenToTaskInitialization: async () => {
      try {
        const unlisteners = await Promise.all([
          frameworkService.listenToTaskInitializationStarted((data: { project_id: string }) => {}),
          frameworkService.listenToTaskInitializationProgress((data: { project_id: string, message: string }) => {}),
          frameworkService.listenToTaskInitializationCompleted((data: { 
            project_id: string, 
            task_count: number,
            task_names: Array<[string, string]>
          }) => {}),
          frameworkService.listenToTaskInitializationFailed((data: { project_id: string, reason: string }) => {})
        ]);
        
        return () => {
          unlisteners.forEach(unlisten => unlisten());
        };
      } catch (error) {
        console.error("Error setting up task initialization listeners:", error);
        return () => {}; // Return a no-op cleanup function on error
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

// Extend Window interface to include our global var
declare global {
  interface Window {
    __PROJECT_STORE_TASKS?: Record<string, GenerationTask>;
  }
}

// Create a project store with Zustand
interface ProjectStoreState {
  recentProjects: RecentProject[];
  currentGenerationId: string | null;
  generationState: ProjectGenerationState | null;
  generationLogs: string[];
  addRecentProject: (project: RecentProject) => void;
  startGeneration: (id: string, config: ProjectConfig) => Promise<void>;
  getGenerationStatus: () => Promise<any>;
  getGenerationLogs: () => Promise<void>;
  cancelGeneration: () => Promise<void>;
} 