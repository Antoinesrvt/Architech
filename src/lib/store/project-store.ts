import { frameworkService } from "@/lib/api";
import {
  type ProjectGenerationState,
  type TaskResult,
  TaskStatusHelpers,
} from "@/lib/api/local";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  setModuleConfiguration: (
    moduleId: string,
    options: Record<string, any>,
  ) => void;
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
  projectName: "",
  projectPath: "",
  projectDescription: "",
  selectedFrameworkId: null,
  selectedModuleIds: [],
  moduleConfigurations: {},
  lastSaved: null,
};

// @ts-ignore Ignoring type errors due to zustand version compatibility issues
export const useProjectStore = create<ProjectState>()(
  // @ts-ignore
  persist(
    (set, get) => ({
      // Recent projects
      recentProjects: [],
      addProject: (project) =>
        set((state) => ({
          recentProjects: [
            project,
            ...state.recentProjects.filter((p) => p.id !== project.id),
          ].slice(0, 10),
        })),
      removeProject: (projectId) =>
        set((state) => ({
          recentProjects: state.recentProjects.filter(
            (p) => p.id !== projectId,
          ),
        })),
      updateLastOpened: (projectId) =>
        set((state) => ({
          recentProjects: state.recentProjects.map((p) =>
            p.id === projectId
              ? { ...p, lastOpenedAt: new Date().toISOString() }
              : p,
          ),
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
              name: "",
              path: "",
              frameworkId: null,
              moduleIds: [],
              moduleConfigurations: {},
              lastUpdated: new Date().toISOString(),
            },
          ],
          currentDraftId: draftId,
          ...DEFAULT_PROJECT_STATE,
        }));
        return draftId;
      },
      saveDraft: () => {
        const {
          currentDraftId,
          projectName,
          projectPath,
          projectDescription,
          selectedFrameworkId,
          selectedModuleIds,
          moduleConfigurations,
        } = get();

        if (!currentDraftId) return;

        const now = new Date();

        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === currentDraftId
              ? {
                  ...draft,
                  name: projectName || "Untitled Project",
                  path: projectPath,
                  description: projectDescription,
                  frameworkId: selectedFrameworkId,
                  moduleIds: selectedModuleIds,
                  moduleConfigurations: moduleConfigurations,
                  lastUpdated: now.toISOString(),
                }
              : draft,
          ),
          lastSaved: now,
        }));
      },
      loadDraft: (draftId) => {
        const { drafts } = get();
        const draft = drafts.find((d) => d.id === draftId);

        if (!draft) return;

        // Ensure moduleIds is always an array
        const moduleIds = Array.isArray(draft.moduleIds) ? draft.moduleIds : [];

        set({
          currentDraftId: draftId,
          projectName: draft.name || "",
          projectPath: draft.path || "",
          projectDescription: draft.description || "",
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
            ...DEFAULT_PROJECT_STATE,
          });
        }

        // Then remove the draft from the drafts array
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== draftId),
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
      addModule: (moduleId) =>
        set((state) => {
          const newState = {
            selectedModuleIds: [...state.selectedModuleIds, moduleId],
          };
          set(newState);
          get().saveDraft();
          return newState;
        }),
      removeModule: (moduleId) =>
        set((state) => {
          const newState = {
            selectedModuleIds: state.selectedModuleIds.filter(
              (id) => id !== moduleId,
            ),
          };
          set(newState);
          get().saveDraft();
          return newState;
        }),
      setModuleConfiguration: (moduleId, options) =>
        set((state) => {
          const newState = {
            moduleConfigurations: {
              ...state.moduleConfigurations,
              [moduleId]: options,
            },
          };
          set(newState);
          get().saveDraft();
          return newState;
        }),
      resetWizardState: () => {
        // Completely reset all project-related state
        set({
          currentDraftId: null,
          projectName: "",
          projectPath: "",
          projectDescription: "",
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
        const {
          projectName,
          projectPath,
          selectedFrameworkId,
          selectedModuleIds,
          moduleConfigurations,
          currentDraftId,
        } = get();

        // Validate required fields
        if (!projectName) {
          set({ error: "Project name is required" });
          return Promise.reject("Project name is required");
        }

        if (!projectPath) {
          set({ error: "Project path is required" });
          return Promise.reject("Project path is required");
        }

        if (!selectedFrameworkId) {
          set({ error: "Framework selection is required" });
          return Promise.reject("Framework selection is required");
        }

        // Ensure we have a draft to track generation
        const draftId = currentDraftId || get().createDraft();

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
            modules: selectedModuleIds.map((id) => ({
              id,
              options: moduleConfigurations[id] || {},
            })),
            options: {
              typescript: true,
              app_router: true,
              eslint: true,
            },
          };

          console.log(
            "Project generation config:",
            JSON.stringify(config, null, 2),
          );

          // Call the backend to generate the project
          const projectId = await frameworkService.generateProject(config);
          set({ currentGenerationId: projectId });

          // Update the draft with generation info
          set((state) => ({
            drafts: state.drafts.map((draft) =>
              draft.id === draftId
                ? {
                    ...draft,
                    name: projectName || "Untitled Project",
                    path: projectPath,
                    frameworkId: selectedFrameworkId,
                    moduleIds: selectedModuleIds,
                    moduleConfigurations: moduleConfigurations,
                    lastUpdated: new Date().toISOString(),
                    generationId: projectId,
                    generationStatus: "Running",
                    generationProgress: 0,
                    generationError: null,
                  }
                : draft,
            ),
            lastSaved: new Date(),
          }));

          // Setup listeners for this generation
          get().setupGenerationListeners();

          // Get initial status after a short delay to allow backend to initialize
          setTimeout(async () => {
            try {
              await get().getGenerationStatus();
              await get().getGenerationLogs();
            } catch (error) {
              console.error("Failed to get initial status/logs:", error);
            }
          }, 500);

          return projectId;
        } catch (error) {
          console.error("Project generation error:", error);

          // Provide a more helpful error message
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Update the draft with the error
          set((state) => ({
            drafts: state.drafts.map((draft) =>
              draft.id === draftId
                ? {
                    ...draft,
                    generationStatus: "Failed",
                    generationError: errorMessage,
                  }
                : draft,
            ),
            isLoading: false,
            error: errorMessage,
          }));

          return Promise.reject(error);
        }
      },

      getGenerationStatus: async () => {
        const { currentGenerationId } = get();
        if (!currentGenerationId) return;

        try {
          const status =
            await frameworkService.getProjectStatus(currentGenerationId);
          set({ generationState: status });

          // Find draft with this generation ID
          const drafts = get().drafts;
          const draftWithGeneration = drafts.find(
            (d) => d.generationId === currentGenerationId,
          );

          if (draftWithGeneration) {
            // Update draft with generation progress
            set((state) => ({
              drafts: state.drafts.map((draft) =>
                draft.id === draftWithGeneration.id
                  ? {
                      ...draft,
                      generationStatus: status.status,
                      generationProgress: status.progress,
                      generationError: TaskStatusHelpers.isFailed(status.status)
                        ? TaskStatusHelpers.getReason(status.status) ||
                          "Generation failed"
                        : null,
                    }
                  : draft,
              ),
            }));

            // If generation completed successfully, create the project
            if (status.status === "Completed") {
              // Create the project from the draft
              const newProject: RecentProject = {
                id: currentGenerationId,
                name: status.name,
                path: `${status.path}/${status.name}`,
                framework: status.framework,
                createdAt: new Date().toISOString(),
                lastOpenedAt: new Date().toISOString(),
              };

              // Add to recent projects
              get().addProject(newProject);

              // Delete the draft
              get().deleteDraft(draftWithGeneration.id);
            }
          }

          // Update loading state based on generation status
          if (
            status.status === "Completed" ||
            TaskStatusHelpers.isFailed(status.status)
          ) {
            set({ isLoading: false });
          }

          return status;
        } catch (error) {
          console.error("Failed to get generation status:", error);

          // But if we've been failing repeatedly, we should update the UI
          if (get().isLoading) {
            // After 5 seconds of failing, give up and show error
            setTimeout(() => {
              if (get().isLoading) {
                const errorMsg =
                  error instanceof Error ? error.message : String(error);

                // Update any draft with this generation ID
                const drafts = get().drafts;
                const draftWithGeneration = drafts.find(
                  (d) => d.generationId === currentGenerationId,
                );

                if (draftWithGeneration) {
                  set((state) => ({
                    drafts: state.drafts.map((draft) =>
                      draft.id === draftWithGeneration.id
                        ? {
                            ...draft,
                            generationStatus: "Failed",
                            generationError: errorMsg,
                          }
                        : draft,
                    ),
                  }));
                }

                set({
                  isLoading: false,
                  error: errorMsg,
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
          const logs =
            await frameworkService.getProjectLogs(currentGenerationId);
          set({ generationLogs: logs });
          return logs;
        } catch (error) {
          console.error("Failed to get generation logs:", error);
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
          const draftWithGeneration = drafts.find(
            (d) => d.generationId === currentGenerationId,
          );

          if (draftWithGeneration) {
            // Update draft with cancelled status
            set((state) => ({
              drafts: state.drafts.map((draft) =>
                draft.id === draftWithGeneration.id
                  ? {
                      ...draft,
                      generationStatus: "Cancelled",
                      generationError: "Generation cancelled by user",
                    }
                  : draft,
              ),
            }));
          }

          set({ isLoading: false });
          // Immediately update status to reflect cancellation
          await get().getGenerationStatus();
        } catch (error) {
          console.error("Failed to cancel generation:", error);

          // Update draft with error status
          const drafts = get().drafts;
          const draftWithGeneration = drafts.find(
            (d) => d.generationId === currentGenerationId,
          );

          if (draftWithGeneration) {
            set((state) => ({
              drafts: state.drafts.map((draft) =>
                draft.id === draftWithGeneration.id
                  ? {
                      ...draft,
                      generationStatus: "Failed",
                      generationError: "Failed to cancel generation",
                    }
                  : draft,
              ),
            }));
          }

          set({
            isLoading: false,
            error: "Failed to cancel project generation",
          });
        }
      },

      setupGenerationListeners: () => {
        const { currentGenerationId } = get();

        // Set up event listeners for task updates, completion, and failure
        const unlistenTaskUpdates = frameworkService.listenToTaskUpdates(
          (result: TaskResult) => {
            console.log("Task update received:", result);
            // Update status whenever we get a task update
            get().getGenerationStatus();
            get().getGenerationLogs();
          },
        );

        const unlistenComplete = frameworkService.listenToGenerationComplete(
          (projectId: string) => {
            console.log("Generation completed:", projectId);
            if (projectId === get().currentGenerationId) {
              // Find draft with this generation ID
              const drafts = get().drafts;
              const draftWithGeneration = drafts.find(
                (d) => d.generationId === projectId,
              );

              if (draftWithGeneration) {
                // Create project from the draft
                get()
                  .getGenerationStatus()
                  .then((status) => {
                    if (status) {
                      // Create the project from the draft
                      const newProject: RecentProject = {
                        id: projectId,
                        name: status.name,
                        path: `${status.path}/${status.name}`,
                        framework: status.framework,
                        createdAt: new Date().toISOString(),
                        lastOpenedAt: new Date().toISOString(),
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
          },
        );

        const unlistenFailed = frameworkService.listenToGenerationFailed(
          ({ projectId, reason }) => {
            console.log("Generation failed:", projectId, reason);
            if (projectId === get().currentGenerationId) {
              // Find draft with this generation ID
              const drafts = get().drafts;
              const draftWithGeneration = drafts.find(
                (d) => d.generationId === projectId,
              );

              if (draftWithGeneration) {
                // Update draft with failed status
                set((state) => ({
                  drafts: state.drafts.map((draft) =>
                    draft.id === draftWithGeneration.id
                      ? {
                          ...draft,
                          generationStatus: "Failed",
                          generationError: reason,
                        }
                      : draft,
                  ),
                }));
              }

              set({
                isLoading: false,
                error: `Generation failed: ${reason}`,
              });
              get().getGenerationStatus();
              get().getGenerationLogs();
            }
          },
        );

        // Return a function to unsubscribe from all listeners
        return () => {
          unlistenTaskUpdates();
          unlistenComplete();
          unlistenFailed();
        };
      },
    }),
    {
      name: "architech-projects",
      partialize: (state) => ({
        recentProjects: state.recentProjects,
        drafts: state.drafts,
        currentDraftId: state.currentDraftId,
      }),
    },
  ),
);
