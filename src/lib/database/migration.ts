import { v4 as uuidv4 } from "uuid";
import type { Framework, Module } from "../store/framework-store";
import type { ProjectDraft, RecentProject } from "../store/project-store";
import { getDatabase } from "./init";

export interface LocalStorageData {
  projects?: {
    recentProjects: RecentProject[];
    drafts: ProjectDraft[];
    currentDraftId: string | null;
  };
  frameworks?: {
    frameworks: Framework[];
    modules: Module[];
    favoriteFrameworks: string[];
  };
  settings?: {
    theme: string;
    defaultProjectPath: string;
    editorCommand: string;
    autoOpenProjectAfterGeneration: boolean;
    useGit: boolean;
  };
}

/**
 * Export all data from localStorage
 */
export function exportLocalStorageData(): LocalStorageData {
  const data: LocalStorageData = {};

  try {
    // Export project data
    const projectData = localStorage.getItem("architech-projects");
    if (projectData) {
      const parsed = JSON.parse(projectData);
      data.projects = {
        recentProjects: parsed.state?.recentProjects || [],
        drafts: parsed.state?.drafts || [],
        currentDraftId: parsed.state?.currentDraftId || null,
      };
    }

    // Export framework data
    const frameworkData = localStorage.getItem("architech-frameworks");
    if (frameworkData) {
      const parsed = JSON.parse(frameworkData);
      data.frameworks = {
        frameworks: parsed.state?.frameworks || [],
        modules: parsed.state?.modules || [],
        favoriteFrameworks: parsed.state?.favoriteFrameworks || [],
      };
    }

    // Export theme data (from useTheme hook)
    const theme = localStorage.getItem("theme");
    if (theme) {
      data.settings = {
        theme,
        defaultProjectPath: "",
        editorCommand: "",
        autoOpenProjectAfterGeneration: false,
        useGit: true,
      };
    }

    console.log("Exported localStorage data:", data);
    return data;
  } catch (error) {
    console.error("Failed to export localStorage data:", error);
    return {};
  }
}

/**
 * Import data into SQLite database
 */
export async function importDataToSQLite(
  data: LocalStorageData,
): Promise<void> {
  const db = await getDatabase();

  try {
    // Import recent projects
    if (data.projects?.recentProjects) {
      for (const project of data.projects.recentProjects) {
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
      }
      console.log(
        `Imported ${data.projects.recentProjects.length} recent projects`,
      );
    }

    // Import project drafts
    if (data.projects?.drafts) {
      for (const draft of data.projects.drafts) {
        await db.execute(
          `INSERT OR REPLACE INTO project_drafts 
           (id, name, path, description, framework_id, module_ids, module_configurations, 
            last_updated, generation_id, generation_status, generation_progress, generation_error) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            draft.id,
            draft.name,
            draft.path,
            draft.description || null,
            draft.frameworkId,
            JSON.stringify(draft.moduleIds),
            JSON.stringify(draft.moduleConfigurations || {}),
            draft.lastUpdated,
            draft.generationId || null,
            draft.generationStatus || null,
            draft.generationProgress || null,
            draft.generationError || null,
          ],
        );
      }
      console.log(`Imported ${data.projects.drafts.length} project drafts`);
    }

    // Import frameworks
    if (data.frameworks?.frameworks) {
      for (const framework of data.frameworks.frameworks) {
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
      }
      console.log(`Imported ${data.frameworks.frameworks.length} frameworks`);
    }

    // Import modules
    if (data.frameworks?.modules) {
      for (const module of data.frameworks.modules) {
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
      }
      console.log(`Imported ${data.frameworks.modules.length} modules`);
    }

    // Import favorite frameworks
    if (data.frameworks?.favoriteFrameworks) {
      for (const frameworkId of data.frameworks.favoriteFrameworks) {
        await db.execute(
          `INSERT OR IGNORE INTO favorite_frameworks (id, framework_id, created_at) 
           VALUES (?, ?, ?)`,
          [uuidv4(), frameworkId, new Date().toISOString()],
        );
      }
      console.log(
        `Imported ${data.frameworks.favoriteFrameworks.length} favorite frameworks`,
      );
    }

    console.log("Data migration to SQLite completed successfully");
  } catch (error) {
    console.error("Failed to import data to SQLite:", error);
    throw error;
  }
}

/**
 * Complete migration process: export from localStorage and import to SQLite
 */
export async function migrateToSQLite(): Promise<void> {
  try {
    console.log("Starting migration from localStorage to SQLite...");

    // Export existing data
    const data = exportLocalStorageData();

    // Import to SQLite
    await importDataToSQLite(data);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Clear localStorage data after successful migration
 */
export function clearLocalStorageData(): void {
  try {
    localStorage.removeItem("architech-projects");
    localStorage.removeItem("architech-frameworks");
    localStorage.removeItem("theme"); // This will be handled by settings store
    console.log("localStorage data cleared");
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
}
