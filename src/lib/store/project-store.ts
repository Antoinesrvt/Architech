import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { frameworkService } from '@/lib/api';
import { ProjectGenerationState, TaskResult, TaskStatusHelpers, GenerationTask } from '@/lib/api/local';
import { ProjectConfig } from '@/lib/api/types';

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
      if (!currentGenerationId) return;
      
      try {
        const status = await frameworkService.getProjectStatus(currentGenerationId);
        
        // Preserve existing tasks if they exist
        set((state) => {
          // Get current tasks if they exist
          const existingTasks = state.generationState?.tasks || {};
          const hasExistingTasks = Object.keys(existingTasks).length > 0;
          
          if (hasExistingTasks) {
            console.log(`Preserving ${Object.keys(existingTasks).length} existing tasks in state update`);
          }
          
          return {
            ...state,
            generationState: {
              ...status,
              // Keep existing tasks if we already have them and the API response doesn't
              tasks: hasExistingTasks ? existingTasks : (status.tasks || {})
            }
          };
        });
        
        // Find draft with this generation ID
        const drafts = get().drafts;
        const draftWithGeneration = drafts.find(d => d.generationId === currentGenerationId);
        
        if (draftWithGeneration) {
          // Update draft with generation progress
          set((state) => ({
            drafts: state.drafts.map(draft => 
              draft.id === draftWithGeneration.id
                ? {
                    ...draft,
                    generationStatus: status.status,
                    generationProgress: status.progress,
                    generationError: TaskStatusHelpers.isFailed(status.status) 
                      ? TaskStatusHelpers.getReason(status.status) || 'Generation failed'
                      : null
                  }
                : draft
            )
          }));
          
          // If generation completed successfully, create the project
          if (status.status === 'Completed') {
            // Create the project from the draft
            const newProject: RecentProject = {
              id: currentGenerationId,
              name: status.name,
              path: `${status.path}/${status.name}`,
              framework: status.framework,
              createdAt: new Date().toISOString(),
              lastOpenedAt: new Date().toISOString()
            };
            
            // Add to recent projects
            get().addProject(newProject);
            
            // Delete the draft
            get().deleteDraft(draftWithGeneration.id);
          }
        }
        
        // Update loading state based on generation status
        if (status.status === 'Completed' || TaskStatusHelpers.isFailed(status.status)) {
          set({ isLoading: false });
        }
        
        return status;
      } catch (error) {
        console.error('Failed to get generation status:', error);
        
        // But if we've been failing repeatedly, we should update the UI
        if (get().isLoading) {
          // After 5 seconds of failing, give up and show error
          setTimeout(() => {
            if (get().isLoading) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              
              // Update any draft with this generation ID
              const drafts = get().drafts;
              const draftWithGeneration = drafts.find(d => d.generationId === currentGenerationId);
              
              if (draftWithGeneration) {
                set((state) => ({
                  drafts: state.drafts.map(draft => 
                    draft.id === draftWithGeneration.id
                      ? {
                          ...draft,
                          generationStatus: 'Failed',
                          generationError: errorMsg
                        }
                      : draft
                  )
                }));
              }
              
              set({ 
                isLoading: false,
                error: errorMsg
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
      const { currentGenerationId } = get();
      console.log('Setting up generation listeners for project ID:', currentGenerationId);
      
      // Promise array to store all listener setup promises
      const listenerPromises: Promise<() => void>[] = [];
      
      // Set up all the event listeners and collect their promises
      listenerPromises.push(
        // Task updates
        frameworkService.listenToTaskUpdates((result: TaskResult) => {
          console.log('Task update received:', result);
          
          const { project_id, task_id, state } = result;
          
          // Only process if this is the current generation
          if (project_id === currentGenerationId) {
            console.log(`Updating task ${task_id} to state: ${state}`);
            
            // Update the task state in the generationState
            set((state) => {
              if (!state.generationState || !state.generationState.tasks) {
                console.warn('Cannot update task state: no tasks in generationState');
                return state;
              }
              
              // Find the task in the generationState
              const tasks = { ...state.generationState.tasks };
              const task = tasks[task_id];
              
              if (!task) {
                console.warn(`Cannot update task ${task_id}: task not found in generationState`);
                return state;
              }
              
              // Update the task
              tasks[task_id] = {
                ...task,
                status: result.state
              };
              
              // If the task is now running, update the current_task
              let current_task = state.generationState.current_task;
              if (result.state === 'Running') {
                current_task = task_id;
              } else if (current_task === task_id && result.state !== 'Running') {
                // If the task was the current task but is no longer running, clear it
                current_task = null;
              }
              
              // Log the update
              const taskName = task.name;
              const logs = [...(state.generationLogs || [])];
              logs.push(`Task ${taskName} is now ${result.state}`);
              
              return {
                ...state,
                generationState: {
                  ...state.generationState,
                  tasks,
                  current_task
                },
                generationLogs: logs
              };
            });
            
            // Also refresh the status to ensure we have the latest state
            get().getGenerationStatus();
          }
        })
      );
      
      // Task initialization started
      listenerPromises.push(
        frameworkService.listenToTaskInitializationStarted((data: { project_id: string }) => {
          console.log('Task initialization started:', data);
          if (data.project_id === currentGenerationId) {
            // Update the generation state to show initialization
            set((state) => {
              return {
                ...state,
                generationState: state.generationState ? {
                  ...state.generationState,
                  status: 'Initializing',
                  progress: 0.05
                } : {
                  id: data.project_id,
                  path: state.projectPath,
                  name: state.projectName,
                  framework: state.selectedFrameworkId || '',
                  tasks: {},
                  current_task: null,
                  progress: 0.05,
                  status: 'Initializing',
                  logs: []
                }
              };
            });
          }
        })
      );
      
      // Task initialization progress
      listenerPromises.push(
        frameworkService.listenToTaskInitializationProgress((data: { project_id: string, message: string }) => {
          console.log('Task initialization progress:', data);
          if (data.project_id === currentGenerationId) {
            // Add a log entry
            set((state) => {
              const logs = state.generationLogs || [];
              return {
                ...state,
                generationLogs: [...logs, data.message]
              };
            });
          }
        })
      );
      
      // Task initialization completed
      listenerPromises.push(
        frameworkService.listenToTaskInitializationCompleted((data: { 
          project_id: string, 
          task_count: number,
          task_names: Array<[string, string]>
        }) => {
          console.log('Task initialization completed event received:', data);
          if (data.project_id === currentGenerationId) {
            console.log(`Creating ${data.task_count} tasks for project ${data.project_id}`);
            
            // Create empty tasks object with properly named tasks
            const initialTasks: Record<string, GenerationTask> = {};
            
            // Use the task names provided by the backend if available
            if (data.task_names && data.task_names.length > 0) {
              console.log('Using task names from backend:', data.task_names.length);
              
              // Create tasks with the proper names and IDs
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
            } 
            // Fallback to placeholder names if no task names provided
            else {
              console.log('No task names provided, using placeholders');
              for (let i = 0; i < data.task_count; i++) {
                const taskId = `task-${i + 1}`;
                initialTasks[taskId] = {
                  id: taskId,
                  name: `Preparing task ${i + 1}`,
                  description: `Task ${i + 1} is being prepared`,
                  status: 'Pending',
                  progress: 0,
                  dependencies: []
                };
              }
            }
            
            console.log('Created tasks:', Object.keys(initialTasks).length);
            
            // Update the generation state to show ready for execution
            set((state) => {
              console.log('Updating generation state with tasks');
              const newState = {
                ...state,
                generationState: state.generationState ? {
                  ...state.generationState,
                  status: 'Ready',
                  progress: 0.1,
                  tasks: initialTasks // Add the tasks with proper names
                } : {
                  id: data.project_id,
                  path: state.projectPath,
                  name: state.projectName,
                  framework: state.selectedFrameworkId || '',
                  tasks: initialTasks, // Add the tasks with proper names
                  current_task: null,
                  progress: 0.1,
                  status: 'Ready',
                  logs: []
                }
              };
              
              console.log('New generation state:', 
                newState.generationState?.status,
                'with', Object.keys(newState.generationState?.tasks || {}).length, 'tasks');
              
              return newState;
            });
            
            // Add a log entry
            set((state) => {
              const logs = state.generationLogs || [];
              return {
                ...state,
                generationLogs: [...logs, `Created ${data.task_count} tasks for project generation`]
              };
            });
            
            // Log the state after update
            setTimeout(() => {
              const currentState = get().generationState;
              console.log('Current generation state after task initialization:', 
                currentState?.status,
                'with', Object.keys(currentState?.tasks || {}).length, 'tasks');
            }, 100);
            
            // Immediately get status and logs
            get().getGenerationStatus();
            get().getGenerationLogs();
          } else {
            console.warn('Received task initialization completed for different project ID:',
              data.project_id, 'current:', currentGenerationId);
          }
        })
      );
      
      // Task initialization failed
      listenerPromises.push(
        frameworkService.listenToTaskInitializationFailed((data: { project_id: string, reason: string }) => {
          console.log('Task initialization failed:', data);
          if (data.project_id === currentGenerationId) {
            // Set error state
            set((state) => {
              return {
                ...state,
                error: `Task initialization failed: ${data.reason}`,
                isLoading: false
              };
            });
            
            // Update draft status
            const currentDraftId = get().currentDraftId;
            if (currentDraftId) {
              set(state => ({
                drafts: state.drafts.map(draft => 
                  draft.id === currentDraftId 
                    ? { 
                        ...draft, 
                        generationStatus: 'Failed',
                        generationError: data.reason
                      }
                    : draft
                )
              }));
            }
          }
        })
      );
      
      // Generation completion
      listenerPromises.push(
        frameworkService.listenToGenerationComplete((projectId: string) => {
          console.log('Generation completed:', projectId);
          if (projectId === get().currentGenerationId) {
            // Find draft with this generation ID
            const drafts = get().drafts;
            const draftWithGeneration = drafts.find(d => d.generationId === projectId);
            
            if (draftWithGeneration) {
              // Create project from the draft
              get().getGenerationStatus().then(status => {
                if (status) {
                  // Create the project from the draft
                  const newProject: RecentProject = {
                    id: projectId,
                    name: status.name,
                    path: `${status.path}/${status.name}`,
                    framework: status.framework,
                    createdAt: new Date().toISOString(),
                    lastOpenedAt: new Date().toISOString()
                  };
                  
                  // Add to recent projects
                  get().addProject(newProject);
                  
                  // Delete the draft
                  get().deleteDraft(draftWithGeneration.id);
                }
              });
            }
            
            set({ isLoading: false });
            get().getGenerationStatus();
            get().getGenerationLogs();
          }
        })
      );
      
      // Generation failures
      listenerPromises.push(
        frameworkService.listenToGenerationFailed(({ projectId, reason }) => {
          console.log('Generation failed:', projectId, reason);
          if (projectId === get().currentGenerationId) {
            // Find draft with this generation ID
            const drafts = get().drafts;
            const draftWithGeneration = drafts.find(d => d.generationId === projectId);
            
            if (draftWithGeneration) {
              // Update draft with failed status
              set((state) => ({
                drafts: state.drafts.map(draft => 
                  draft.id === draftWithGeneration.id
                    ? {
                        ...draft,
                        generationStatus: 'Failed',
                        generationError: reason
                      }
                    : draft
                )
              }));
            }
            
            set({ 
              isLoading: false,
              error: `Generation failed: ${reason}`
            });
            get().getGenerationStatus();
            get().getGenerationLogs();
          }
        })
      );
      
      // Progress updates
      listenerPromises.push(
        frameworkService.listenToProgress((progress) => {
          // Handle progress updates if needed
          console.log('Progress update:', progress);
        })
      );
      
      // Return a cleanup function that will wait for all listeners to be set up
      // and then unsubscribe all of them when called
      return () => {
        // Wait for all listeners to be set up, then collect their unsubscribe functions
        Promise.all(listenerPromises)
          .then(unlistenFunctions => {
            // Call all unsubscribe functions
            unlistenFunctions.forEach(unlisten => {
              if (unlisten) unlisten();
            });
          })
          .catch(error => {
            console.error('Error cleaning up event listeners:', error);
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