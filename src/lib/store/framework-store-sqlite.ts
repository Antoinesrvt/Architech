import { getDatabase } from "@/lib/database/init";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

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
  logo?: string;
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
  file_operations?: FileOperation[];
  options?: ModuleOption[];
}

export interface FileOperation {
  type: "create" | "modify" | "delete";
  path: string;
  content?: string;
  template?: string;
  variables?: Record<string, any>;
}

export interface ModuleOption {
  id: string;
  name: string;
  description: string;
  type: "boolean" | "string" | "number" | "select" | "multiselect";
  default?: any;
  options?: { value: any; label: string }[];
  required?: boolean;
}

interface FrameworkState {
  frameworks: Framework[];
  modules: Module[];
  selectedFrameworkId: string | null;
  favoriteFrameworks: string[];

  // Actions
  setFrameworks: (frameworks: Framework[]) => Promise<void>;
  setModules: (modules: Module[]) => Promise<void>;
  setSelectedFramework: (frameworkId: string | null) => void;
  addFavorite: (frameworkId: string) => Promise<void>;
  removeFavorite: (frameworkId: string) => Promise<void>;

  // Data loading
  loadFrameworks: () => Promise<void>;
  loadModules: () => Promise<void>;
  loadFavorites: () => Promise<void>;

  // Individual operations
  addFramework: (framework: Framework) => Promise<void>;
  updateFramework: (framework: Framework) => Promise<void>;
  removeFramework: (frameworkId: string) => Promise<void>;
  addModule: (module: Module) => Promise<void>;
  updateModule: (module: Module) => Promise<void>;
  removeModule: (moduleId: string) => Promise<void>;
}

export const useFrameworkStore = create<FrameworkState>((set, get) => ({
  frameworks: [],
  modules: [],
  selectedFrameworkId: null,
  favoriteFrameworks: [],

  // Actions
  setFrameworks: async (frameworks) => {
    const db = await getDatabase();

    // Clear existing frameworks
    await db.execute("DELETE FROM frameworks");

    // Insert new frameworks
    for (const framework of frameworks) {
      await db.execute(
        `INSERT INTO frameworks 
         (id, name, description, version, type, tags, cli, compatible_modules, directory_structure, logo) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          framework.id,
          framework.name,
          framework.description,
          framework.version,
          framework.type,
          JSON.stringify(framework.tags),
          JSON.stringify(framework.cli),
          JSON.stringify(framework.compatible_modules),
          JSON.stringify(framework.directory_structure),
          framework.logo || null,
        ],
      );
    }

    set({ frameworks });
  },

  setModules: async (modules) => {
    const db = await getDatabase();

    // Clear existing modules
    await db.execute("DELETE FROM modules");

    // Insert new modules
    for (const module of modules) {
      await db.execute(
        `INSERT INTO modules 
         (id, name, description, version, category, dependencies, file_operations, options) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          module.id,
          module.name,
          module.description,
          module.version,
          module.category,
          JSON.stringify(module.dependencies),
          JSON.stringify(module.file_operations || []),
          JSON.stringify(module.options || []),
        ],
      );
    }

    set({ modules });
  },

  setSelectedFramework: (frameworkId) => {
    set({ selectedFrameworkId: frameworkId });
  },

  addFavorite: async (frameworkId) => {
    const db = await getDatabase();
    const id = uuidv4();

    await db.execute(
      "INSERT OR IGNORE INTO favorite_frameworks (id, framework_id, created_at) VALUES (?, ?, ?)",
      [id, frameworkId, new Date().toISOString()],
    );

    set((state) => ({
      favoriteFrameworks: [...state.favoriteFrameworks, frameworkId],
    }));
  },

  removeFavorite: async (frameworkId) => {
    const db = await getDatabase();

    await db.execute("DELETE FROM favorite_frameworks WHERE framework_id = ?", [
      frameworkId,
    ]);

    set((state) => ({
      favoriteFrameworks: state.favoriteFrameworks.filter(
        (id) => id !== frameworkId,
      ),
    }));
  },

  // Data loading
  loadFrameworks: async () => {
    const db = await getDatabase();
    const result = await db.select<{
      id: string;
      name: string;
      description: string;
      version: string;
      type: string;
      tags: string;
      cli: string;
      compatible_modules: string;
      directory_structure: string;
      logo: string | null;
    }[]>(
      "SELECT * FROM frameworks ORDER BY name",
    );

    const frameworks: Framework[] = result.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      type: row.type,
      tags: JSON.parse(row.tags ?? "[]"),
      cli: JSON.parse(row.cli),
      compatible_modules: JSON.parse(row.compatible_modules ?? "[]"),
      directory_structure: JSON.parse(row.directory_structure),
      logo: row.logo,
    }));

    set({ frameworks });
  },

  loadModules: async () => {
    const db = await getDatabase();
    const result = await db.select<{
      id: string;
      name: string;
      description: string;
      version: string;
      category: string;
      dependencies: string;
      file_operations: string;
      options: string;
    }[]>(
      "SELECT * FROM modules ORDER BY category, name",
    );

    const modules: Module[] = result.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      category: row.category,
      dependencies: JSON.parse(row.dependencies ?? "[]"),
      file_operations: JSON.parse(row.file_operations ?? "[]"),
      options: JSON.parse(row.options ?? "[]"),
    }));

    set({ modules });
  },

  loadFavorites: async () => {
    const db = await getDatabase();
    const result = await db.select<{
      framework_id: string;
    }[]>(
      "SELECT framework_id FROM favorite_frameworks ORDER BY created_at DESC",
    );

    const favoriteFrameworks = result.map((row) => row.framework_id);
    set({ favoriteFrameworks });
  },

  // Individual operations
  addFramework: async (framework) => {
    const db = await getDatabase();

    await db.execute(
      `INSERT OR REPLACE INTO frameworks 
       (id, name, description, version, type, tags, cli, compatible_modules, directory_structure, logo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        framework.id,
        framework.name,
        framework.description,
        framework.version,
        framework.type,
        JSON.stringify(framework.tags),
        JSON.stringify(framework.cli),
        JSON.stringify(framework.compatible_modules),
        JSON.stringify(framework.directory_structure),
        framework.logo || null,
      ],
    );

    set((state) => ({
      frameworks: [...state.frameworks, framework],
    }));
  },

  updateFramework: async (framework) => {
    const db = await getDatabase();

    await db.execute(
      `UPDATE frameworks SET 
       name = ?, description = ?, version = ?, type = ?, tags = ?, 
       cli = ?, compatible_modules = ?, directory_structure = ?, logo = ? 
       WHERE id = ?`,
      [
        framework.name,
        framework.description,
        framework.version,
        framework.type,
        JSON.stringify(framework.tags),
        JSON.stringify(framework.cli),
        JSON.stringify(framework.compatible_modules),
        JSON.stringify(framework.directory_structure),
        framework.logo || null,
        framework.id,
      ],
    );

    set((state) => ({
      frameworks: state.frameworks.map((f) =>
        f.id === framework.id ? framework : f,
      ),
    }));
  },

  removeFramework: async (frameworkId) => {
    const db = await getDatabase();

    await db.execute("DELETE FROM frameworks WHERE id = ?", [frameworkId]);

    set((state) => ({
      frameworks: state.frameworks.filter((f) => f.id !== frameworkId),
    }));
  },

  addModule: async (module) => {
    const db = await getDatabase();

    await db.execute(
      `INSERT OR REPLACE INTO modules 
       (id, name, description, version, category, dependencies, file_operations, options) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        module.id,
        module.name,
        module.description,
        module.version,
        module.category,
        JSON.stringify(module.dependencies),
        JSON.stringify(module.file_operations || []),
        JSON.stringify(module.options || []),
      ],
    );

    set((state) => ({
      modules: [...state.modules, module],
    }));
  },

  updateModule: async (module) => {
    const db = await getDatabase();

    await db.execute(
      `UPDATE modules SET 
       name = ?, description = ?, version = ?, category = ?, 
       dependencies = ?, file_operations = ?, options = ? 
       WHERE id = ?`,
      [
        module.name,
        module.description,
        module.version,
        module.category,
        JSON.stringify(module.dependencies),
        JSON.stringify(module.file_operations || []),
        JSON.stringify(module.options || []),
        module.id,
      ],
    );

    set((state) => ({
      modules: state.modules.map((m) => (m.id === module.id ? module : m)),
    }));
  },

  removeModule: async (moduleId) => {
    const db = await getDatabase();

    await db.execute("DELETE FROM modules WHERE id = ?", [moduleId]);

    set((state) => ({
      modules: state.modules.filter((m) => m.id !== moduleId),
    }));
  },
}));
