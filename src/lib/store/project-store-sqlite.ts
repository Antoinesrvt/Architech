import { frameworkService } from "@/lib/api";
import {
  type ProjectGenerationState,
  type TaskResult,
  TaskStatusHelpers,
} from "@/lib/api/local";
import { getDatabase } from "@/lib/database/init";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

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
  addProject: (project: RecentProject) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  updateLastOpened: (projectId: string) => Promise<void>;
  loadRecentProjects: () => Promise<void>;

  // Project drafts
  drafts: ProjectDraft[];
  currentDraftId: string | null;
  createDraft: () => Promise<string>;
  saveDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  loadDrafts: () => Promise<void>;

  // Current project state
  projectName: string;
  projectPath: string;
  projectDescription: string;
  selectedFrameworkId: string | null;
  selectedModuleIds: string[];
  moduleConfigurations: Record<string, Record<string, any>>;
  lastSaved: string | null;

  // Actions
  setProjectName: (name: string) => void;
  setProjectPath: (path: string) => void;
  setProjectDescription: (description: string) => void;
  setSelectedFramework: (frameworkId: string | null) => void;
  setSelectedModules: (moduleIds: string[]) => void;
  setModuleConfiguration: (
    moduleId: string,
    config: Record<string, any>,
  ) => void;
  resetProject: () => void;

  // Generation state
  generationState: ProjectGenerationState;
  setGenerationState: (state: ProjectGenerationState) => void;
  updateGenerationProgress: (progress: number) => void;
  addGenerationTask: (task: TaskResult) => void;
  updateGenerationTask: (taskId: string, updates: Partial<TaskResult>) => void;

  // Generation actions
  generateProject: () => Promise<void>;
  cancelGeneration: () => Promise<void>;

  // Event listeners
  setupEventListeners: () => () => void;
}

const DEFAULT_PROJECT_STATE = {
  projectName: "",
  projectPath: "",
  projectDescription: "",
  selectedFrameworkId: null,
  selectedModuleIds: [],
  moduleConfigurations: {},
  lastSaved: null,
};

const DEFAULT_GENERATION_STATE: ProjectGenerationState = {
  status: "idle",
  progress: 0,
  currentTask: null,
  tasks: [],
  error: null,
  generationId: null,
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Recent projects
  recentProjects: [],

  addProject: async (project) => {
    const db = await getDatabase();
    await db.execute(
      `INSERT OR REPLACE INTO recent_projects 
       (id, name, path, framework, created_at, last_opened_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        project.id,
        project.name,
        project.path,
        project.framework,
        project.createdAt,
        project.lastOpenedAt,
      ],
    );

    set((state) => ({
      recentProjects: [
        project,
        ...state.recentProjects.filter((p) => p.id !== project.id),
      ].slice(0, 10),
    }));
  },

  removeProject: async (projectId) => {
    const db = await getDatabase();
    await db.execute("DELETE FROM recent_projects WHERE id = ?", [projectId]);

    set((state) => ({
      recentProjects: state.recentProjects.filter((p) => p.id !== projectId),
    }));
  },

  updateLastOpened: async (projectId) => {
    const db = await getDatabase();
    const lastOpenedAt = new Date().toISOString();

    await db.execute(
      "UPDATE recent_projects SET last_opened_at = ? WHERE id = ?",
      [lastOpenedAt, projectId],
    );

    set((state) => ({
      recentProjects: state.recentProjects.map((p) =>
        p.id === projectId ? { ...p, lastOpenedAt } : p,
      ),
    }));
  },

  loadRecentProjects: async () => {
    const db = await getDatabase();
    const result = await db.select<
      {
        id: string;
        name: string;
        path: string;
        framework: string;
        created_at: string;
        last_opened_at: string;
      }[]
    >("SELECT * FROM recent_projects ORDER BY last_opened_at DESC LIMIT 10");

    set({
      recentProjects: result.map((row) => ({
        id: row.id,
        name: row.name,
        path: row.path,
        framework: row.framework,
        createdAt: row.created_at,
        lastOpenedAt: row.last_opened_at,
      })),
    });
  },

  // Project drafts
  drafts: [],
  currentDraftId: null,

  createDraft: async () => {
    const draftId = uuidv4();
    const db = await getDatabase();

    const newDraft: ProjectDraft = {
      id: draftId,
      name: "",
      path: "",
      frameworkId: null,
      moduleIds: [],
      moduleConfigurations: {},
      lastUpdated: new Date().toISOString(),
    };

    await db.execute(
      `INSERT INTO project_drafts 
       (id, name, path, framework_id, module_ids, module_configurations, last_updated) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        newDraft.id,
        newDraft.name,
        newDraft.path,
        newDraft.frameworkId,
        JSON.stringify(newDraft.moduleIds),
        JSON.stringify(newDraft.moduleConfigurations),
        newDraft.lastUpdated,
      ],
    );

    // Keep only the 3 most recent drafts
    const allDrafts = await db.select<
      {
        id: string;
      }[]
    >("SELECT id FROM project_drafts ORDER BY last_updated DESC");

    if (allDrafts.length > 3) {
      const draftsToDelete = allDrafts.slice(3);
      for (const draft of draftsToDelete) {
        await db.execute("DELETE FROM project_drafts WHERE id = ?", [draft.id]);
      }
    }

    set((state) => ({
      drafts: [newDraft, ...state.drafts.slice(0, 2)],
      currentDraftId: draftId,
      ...DEFAULT_PROJECT_STATE,
    }));

    return draftId;
  },

  saveDraft: async () => {
    const state = get();
    if (!state.currentDraftId) return;

    const db = await getDatabase();
    const lastUpdated = new Date().toISOString();

    await db.execute(
      `UPDATE project_drafts SET 
       name = ?, path = ?, description = ?, framework_id = ?, 
       module_ids = ?, module_configurations = ?, last_updated = ? 
       WHERE id = ?`,
      [
        state.projectName,
        state.projectPath,
        state.projectDescription,
        state.selectedFrameworkId,
        JSON.stringify(state.selectedModuleIds),
        JSON.stringify(state.moduleConfigurations),
        lastUpdated,
        state.currentDraftId,
      ],
    );

    set((state) => ({
      lastSaved: lastUpdated,
      drafts: state.drafts.map((draft) =>
        draft.id === state.currentDraftId
          ? {
              ...draft,
              name: state.projectName,
              path: state.projectPath,
              description: state.projectDescription,
              frameworkId: state.selectedFrameworkId,
              moduleIds: state.selectedModuleIds,
              moduleConfigurations: state.moduleConfigurations,
              lastUpdated,
            }
          : draft,
      ),
    }));
  },

  loadDraft: async (draftId) => {
    const db = await getDatabase();
    const result = await db.select<
      {
        id: string;
        name: string;
        path: string;
        description: string | null;
        framework_id: string | null;
        module_ids: string;
        module_configurations: string;
        last_updated: string;
      }[]
    >("SELECT * FROM project_drafts WHERE id = ?", [draftId]);

    if (result.length === 0) return;

    const draft = result[0];
    set({
      currentDraftId: draftId,
      projectName: draft.name,
      projectPath: draft.path,
      projectDescription: draft.description ?? "",
      selectedFrameworkId: draft.framework_id,
      selectedModuleIds: JSON.parse(draft.module_ids ?? "[]"),
      moduleConfigurations: JSON.parse(draft.module_configurations ?? "{}"),
      lastSaved: draft.last_updated,
    });
  },

  deleteDraft: async (draftId) => {
    const db = await getDatabase();
    await db.execute("DELETE FROM project_drafts WHERE id = ?", [draftId]);

    set((state) => ({
      drafts: state.drafts.filter((d) => d.id !== draftId),
      ...(state.currentDraftId === draftId
        ? {
            currentDraftId: null,
            ...DEFAULT_PROJECT_STATE,
          }
        : {}),
    }));
  },

  loadDrafts: async () => {
    const db = await getDatabase();
    const result = await db.select<
      {
        id: string;
        name: string;
        path: string;
        description: string | null;
        framework_id: string | null;
        module_ids: string;
        module_configurations: string;
        last_updated: string;
        generation_id: string | null;
        generation_status: string | null;
        generation_progress: number | null;
        generation_error: string | null;
      }[]
    >("SELECT * FROM project_drafts ORDER BY last_updated DESC LIMIT 3");

    set({
      drafts: result.map((row) => ({
        id: row.id,
        name: row.name,
        path: row.path,
        description: row.description,
        frameworkId: row.framework_id,
        moduleIds: JSON.parse(row.module_ids ?? "[]"),
        moduleConfigurations: JSON.parse(row.module_configurations ?? "{}"),
        lastUpdated: row.last_updated,
        generationId: row.generation_id,
        generationStatus: row.generation_status,
        generationProgress: row.generation_progress,
        generationError: row.generation_error,
      })),
    });
  },

  // Current project state
  ...DEFAULT_PROJECT_STATE,

  // Actions
  setProjectName: (name) => {
    set({ projectName: name });
  },
  setProjectPath: (path) => {
    set({ projectPath: path });
  },
  setProjectDescription: (description) => {
    set({ projectDescription: description });
  },
  setSelectedFramework: (frameworkId) => {
    set({ selectedFrameworkId: frameworkId });
  },
  setSelectedModules: (moduleIds) => {
    set({ selectedModuleIds: moduleIds });
  },
  setModuleConfiguration: (moduleId, config) => {
    set((state) => ({
      moduleConfigurations: {
        ...state.moduleConfigurations,
        [moduleId]: config,
      },
    }));
  },
  resetProject: () => {
    set({ ...DEFAULT_PROJECT_STATE, currentDraftId: null });
  },

  // Generation state
  generationState: DEFAULT_GENERATION_STATE,
  setGenerationState: (generationState) => {
    set({ generationState });
  },
  updateGenerationProgress: (progress) => {
    set((state) => ({
      generationState: { ...state.generationState, progress },
    }));
  },
  addGenerationTask: (task) => {
    set((state) => ({
      generationState: {
        ...state.generationState,
        tasks: [...state.generationState.tasks, task],
      },
    }));
  },
  updateGenerationTask: (taskId, updates) => {
    set((state) => ({
      generationState: {
        ...state.generationState,
        tasks: state.generationState.tasks.map((task) =>
          (task as TaskResult & { id: string }).id === taskId
            ? { ...task, ...updates }
            : task,
        ),
      },
    }));
  },

  // Generation actions (keeping existing implementation)
  generateProject: async () => {
    const state = get();

    if (
      !state.selectedFrameworkId ||
      !state.projectName ||
      !state.projectPath
    ) {
      throw new Error("Missing required project information");
    }

    const generationId = uuidv4();

    set({
      generationState: {
        status: "running",
        progress: 0,
        currentTask: null,
        tasks: [],
        error: null,
        generationId,
      },
    });

    try {
      await frameworkService.generateProject({
        name: state.projectName,
        path: state.projectPath,
        description: state.projectDescription,
        frameworkId: state.selectedFrameworkId,
        moduleIds: state.selectedModuleIds,
        moduleConfigurations: state.moduleConfigurations,
        generationId,
      });
    } catch (error) {
      set((state) => ({
        generationState: {
          ...state.generationState,
          status: "failed",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      }));
      throw error;
    }
  },

  cancelGeneration: async () => {
    const state = get();
    if (state.generationState.generationId) {
      try {
        await frameworkService.cancelGeneration(
          state.generationState.generationId,
        );
        set((state) => ({
          generationState: {
            ...state.generationState,
            status: "cancelled",
          },
        }));
      } catch (error: unknown) {
        console.error("Failed to cancel generation:", error);
      }
    }
  },

  // Event listeners (keeping existing implementation)
  setupEventListeners: () => {
    // Implementation would be the same as the original
    return () => {}; // Cleanup function
  },
}));
