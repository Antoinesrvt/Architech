import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Framework, Module } from "../store/framework-store";
import type {
  FrameworkService,
  GenerationProgress,
  ProjectConfig,
  ValidationResult,
} from "./types";

// Mock data for frameworks when running in browser mode
const mockFrameworks: Framework[] = [
  {
    id: "nextjs",
    name: "Next.js",
    description: "React framework for production-grade applications",
    version: "13.4.0",
    type: "web",
    tags: ["react", "frontend", "ssr", "ssg"],
    cli: {
      base_command: "npx create-next-app@latest",
      arguments: {
        typescript: {
          flag: "--typescript",
          default: true,
        },
        app_router: {
          flag: "--app",
          default: true,
        },
      },
      interactive: false,
    },
    compatible_modules: [
      "tailwind",
      "daisyui",
      "i18n",
      "zustand",
      "forms",
      "auth",
      "testing",
    ],
    directory_structure: {
      enforced: true,
      directories: ["src", "public", "app", "components", "lib"],
    },
  },
  {
    id: "vite-react",
    name: "Vite + React",
    description: "Lightweight React setup with Vite",
    version: "4.3.2",
    type: "web",
    tags: ["react", "frontend", "spa", "vite"],
    cli: {
      base_command: "npm create vite@latest",
      arguments: {
        template: {
          flag: "--template react-ts",
          default: true,
        },
      },
      interactive: true,
      responses: [
        {
          prompt: "Project name",
          use_project_name: true,
        },
      ],
    },
    compatible_modules: [
      "tailwind",
      "daisyui",
      "i18n",
      "zustand",
      "forms",
      "testing",
    ],
    directory_structure: {
      enforced: true,
      directories: ["src", "public", "src/components", "src/assets"],
    },
  },
];

// Mock data for modules when running in browser mode
const mockModules: Module[] = [
  {
    id: "tailwind",
    name: "Tailwind CSS",
    description: "A utility-first CSS framework",
    version: "3.3.2",
    category: "styling",
    dependencies: [],
    incompatible_with: [],
    installation: {
      commands: [
        "npm install -D tailwindcss postcss autoprefixer",
        "npx tailwindcss init -p",
      ],
      file_operations: [
        {
          operation: "create",
          path: "tailwind.config.js",
          content:
            "module.exports = {\n  content: ['./src/**/*.{js,jsx,ts,tsx}'],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n}",
        },
        {
          operation: "create",
          path: "src/styles/globals.css",
          content:
            "@tailwind base;\n@tailwind components;\n@tailwind utilities;",
        },
        {
          operation: "modify",
          path: "src/app/layout.tsx",
          pattern: "import",
          replacement: "import '../styles/globals.css';\nimport",
        },
      ],
    },
    configuration: {
      options: [
        {
          id: "darkMode",
          type: "select",
          label: "Dark Mode",
          description: "Dark mode configuration",
          default: "class",
          choices: [
            { value: "media", label: "System Preference" },
            { value: "class", label: "Manual Toggle" },
          ],
        },
      ],
    },
  },
  {
    id: "daisyui",
    name: "DaisyUI",
    description: "Component library for Tailwind CSS",
    version: "3.1.0",
    category: "ui",
    dependencies: ["tailwind"],
    incompatible_with: [],
    installation: {
      commands: ["npm install daisyui"],
      file_operations: [
        {
          operation: "modify",
          path: "tailwind.config.js",
          pattern: "plugins: \\[.*\\]",
          replacement: 'plugins: [require("daisyui")]',
        },
      ],
    },
    configuration: {
      options: [
        {
          id: "themes",
          type: "select",
          label: "Themes",
          description: "DaisyUI themes to include",
          default: "light",
          choices: [
            { value: "light", label: "Light Theme" },
            { value: "dark", label: "Dark Theme" },
            { value: "corporate", label: "Corporate Theme" },
          ],
        },
      ],
    },
  },
  {
    id: "recharts",
    name: "Recharts",
    description: "Redefined chart library built with React and D3",
    version: "2.7.2",
    category: "ui",
    dependencies: [],
    incompatible_with: [],
    installation: {
      commands: ["npm install recharts"],
      file_operations: [],
    },
    configuration: {
      options: [],
    },
  },
];

// Safe invoke function that handles both Tauri and browser environments
const safeInvoke = async <T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> => {
  // Check if we're in a Tauri environment
  const isTauri = window && (window as any).__TAURI__;

  // Debug logging - better format for readability
  console.log(`Invoking ${command} with args:`, JSON.stringify(args, null, 2));

  if (isTauri) {
    try {
      let result;

      // Try the core.invoke approach first (newer Tauri versions)
      if ((window as any).__TAURI__.core?.invoke) {
        result = await (window as any).__TAURI__.core.invoke(command, args);
      } else {
        // Try the direct invoke from import
        result = await invoke(command, args);
      }

      console.log(
        `${command} result:`,
        typeof result === "object" ? JSON.stringify(result, null, 2) : result,
      );
      return result;
    } catch (error) {
      console.error(`Error invoking ${command}:`, error);
      console.error("Args were:", JSON.stringify(args, null, 2));
      console.error("Command context:", {
        command,
        commandType: typeof command,
        argsType: typeof args,
      });
      throw error;
    }
  } else {
    console.warn(
      "Tauri API is not available in this environment. Running in mock mode.",
    );
    // Provide mock implementations for browser environment
    if (command === "get_frameworks") {
      return mockFrameworks as T;
    }
    if (command === "get_templates") {
      // For backward compatibility
      return mockFrameworks as T;
    }
    if (command === "get_modules") {
      return mockModules as T;
    }
    if (command === "get_project_status") {
      // Mock project status
      return {
        id: "123",
        path: "/mock/path",
        name: "mock-project",
        framework: "nextjs",
        tasks: {
          "1": {
            id: "1",
            name: "Task 1",
            description: "Mock task",
            status: "Completed",
            progress: 1.0,
            dependencies: [],
          },
        },
        current_task: null,
        progress: 1.0,
        status: "Completed",
        logs: ["Mock log 1", "Mock log 2"],
      } as T;
    }
    if (command === "get_project_logs") {
      return ["Mock log 1", "Mock log 2"] as T;
    }
    console.warn(`Mock for command ${command} not implemented`);
    return {} as T;
  }
};

// Project generation state type from Rust backend
export interface ProjectGenerationState {
  id: string;
  path: string;
  name: string;
  framework: string;
  tasks: Record<string, GenerationTask>;
  current_task: string | null;
  progress: number;
  status: TaskStatus;
  logs: string[];
}

// Generation task status
export type TaskStatus = "Pending" | "Running" | "Completed" | string; // For "Failed: reason" and "Skipped: reason" formats

// Constants for task status values
export const TASK_STATUS = {
  PENDING: "Pending",
  RUNNING: "Running",
  COMPLETED: "Completed",
} as const;

// Helper methods for TaskStatus
export const TaskStatusHelpers = {
  isFailed: (status: TaskStatus): boolean => {
    return typeof status === "string" && status.startsWith("Failed:");
  },
  isSkipped: (status: TaskStatus): boolean => {
    return typeof status === "string" && status.startsWith("Skipped:");
  },
  getReason: (status: TaskStatus): string | null => {
    if (typeof status !== "string") {
      return null;
    }

    if (status.startsWith("Failed:")) {
      return status.substring("Failed:".length).trim();
    }

    if (status.startsWith("Skipped:")) {
      return status.substring("Skipped:".length).trim();
    }

    return null;
  },
};

// Generation task
export interface GenerationTask {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  progress: number;
  dependencies: string[];
}

// Task result from backend
export interface TaskResult {
  task_id: string;
  success: boolean;
  message: string;
}

export class LocalFrameworkService implements FrameworkService {
  async getFrameworks(): Promise<Framework[]> {
    try {
      return await safeInvoke<Framework[]>("get_frameworks");
    } catch (error) {
      console.error("Failed to get frameworks:", error);
      // Return mock frameworks if there's an error
      return mockFrameworks;
    }
  }

  async getModules(): Promise<Module[]> {
    try {
      return await safeInvoke<Module[]>("get_modules");
    } catch (error) {
      console.error("Failed to get modules:", error);
      // Return mock modules if there's an error
      return mockModules;
    }
  }

  async validateProjectConfig(
    config: ProjectConfig,
  ): Promise<ValidationResult> {
    try {
      return await safeInvoke<ValidationResult>("validate_project_config", {
        config,
      });
    } catch (error) {
      console.error("Failed to validate project config:", error);

      // Provide a more user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [`Validation failed: ${errorMessage}`],
      };
    }
  }

  async generateProject(config: ProjectConfig): Promise<string> {
    try {
      // Validate the config first
      const validation = await this.validateProjectConfig(config);
      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      // If validation passes, generate the project using the new state-based system
      const projectId = await safeInvoke<string>("generate_project", {
        config,
      });
      return projectId;
    } catch (error) {
      console.error("Failed to generate project:", error);
      throw error;
    }
  }

  async getProjectStatus(projectId: string): Promise<ProjectGenerationState> {
    try {
      return await safeInvoke<ProjectGenerationState>("get_project_status", {
        param: { projectId },
      });
    } catch (error) {
      console.error("Error fetching project status:", error);
      throw error;
    }
  }

  async getProjectLogs(projectId: string): Promise<string[]> {
    try {
      return await safeInvoke<string[]>("get_project_logs", {
        param: { projectId },
      });
    } catch (error) {
      console.error("Error fetching project logs:", error);
      throw error;
    }
  }

  async cancelProjectGeneration(projectId: string): Promise<void> {
    try {
      // Ensure we're using the correct param structure for Rust struct parameter
      await safeInvoke<boolean>("cancel_project_generation", {
        param: { projectId },
      });
    } catch (error) {
      console.error("Error cancelling project generation:", error);
      throw error;
    }
  }

  // Listen for task updates
  listenToTaskUpdates(callback: (result: TaskResult) => void): () => void {
    // Check if we're in a Tauri environment
    const isTauri = window && (window as any).__TAURI__;

    if (isTauri) {
      try {
        const unlisten = listen<TaskResult>("task-update", (event) => {
          callback(event.payload);
        });
        return () => {
          unlisten.then((fn) => fn());
        };
      } catch (error) {
        console.error("Failed to listen for task updates:", error);
        return () => {};
      }
    } else {
      console.warn("Task updates are not available in browser mode");
      return () => {};
    }
  }

  // Listen for generation completion
  listenToGenerationComplete(
    callback: (projectId: string) => void,
  ): () => void {
    const isTauri = window && (window as any).__TAURI__;

    if (isTauri) {
      try {
        const unlisten = listen<string>("generation-complete", (event) => {
          callback(event.payload);
        });
        return () => {
          unlisten.then((fn) => fn());
        };
      } catch (error) {
        console.error("Failed to listen for generation completion:", error);
        return () => {};
      }
    } else {
      console.warn(
        "Generation completion events are not available in browser mode",
      );
      return () => {};
    }
  }

  // Listen for generation failure
  listenToGenerationFailed(
    callback: (data: { projectId: string; reason: string }) => void,
  ): () => void {
    const isTauri = window && (window as any).__TAURI__;

    if (isTauri) {
      try {
        const unlisten = listen<[string, string]>(
          "generation-failed",
          (event) => {
            const [projectId, reason] = event.payload;
            callback({ projectId, reason });
          },
        );
        return () => {
          unlisten.then((fn) => fn());
        };
      } catch (error) {
        console.error("Failed to listen for generation failure:", error);
        return () => {};
      }
    } else {
      console.warn(
        "Generation failure events are not available in browser mode",
      );
      return () => {};
    }
  }

  listenToProgress(
    callback: (progress: GenerationProgress) => void,
  ): () => void {
    // In browser mode, simulate progress
    if (!(window as any).__TAURI__) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.05;
        if (progress <= 1) {
          const stepNames = [
            "init",
            "framework",
            "create",
            "structure",
            "dependencies",
            "modules",
            "complete",
          ];
          const step =
            stepNames[
              Math.min(
                Math.floor(progress * stepNames.length),
                stepNames.length - 1,
              )
            ];
          callback({
            step,
            message: `Mock ${step} step`,
            progress,
          });
        } else {
          clearInterval(interval);
        }
      }, 500);

      return () => clearInterval(interval);
    }

    // In Tauri mode, listen to real events
    try {
      const unlisten = listen<GenerationProgress>(
        "generation-progress",
        (event) => {
          callback(event.payload);
        },
      );

      return () => {
        unlisten.then((unlistenFn) => unlistenFn());
      };
    } catch (error) {
      console.error("Failed to listen to progress events:", error);
      return () => {};
    }
  }

  async openInEditor(path: string, editor = "code"): Promise<boolean> {
    try {
      await safeInvoke<void>("open_in_editor", { path, editor });
      return true;
    } catch (error) {
      console.error("Failed to open in editor:", error);
      return false;
    }
  }

  async browseForDirectory(): Promise<string | null> {
    try {
      const path = await safeInvoke<string>("browse_directory", {
        title: "Select Project Location",
      });
      return path;
    } catch (error) {
      // Log the error for debugging
      console.error("Failed to browse for directory:", error);

      // If this is a "No directory selected" error, return null instead of throwing
      if (
        error instanceof Error &&
        error.message.includes("No directory selected")
      ) {
        return null;
      }

      // For other errors, still return null but log it
      return null;
    }
  }

  async openInFolder(path: string): Promise<boolean> {
    try {
      // Use shell plugin to open the folder
      await safeInvoke<void>("open_in_folder", { path });
      return true;
    } catch (error) {
      console.error("Failed to open folder:", error);
      return false;
    }
  }
}
