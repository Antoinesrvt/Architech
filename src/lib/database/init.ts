import Database from "@tauri-apps/plugin-sql";

export interface DatabaseTables {
  recent_projects: {
    id: string;
    name: string;
    path: string;
    framework: string;
    created_at: string;
    last_opened_at: string;
  };

  project_drafts: {
    id: string;
    name: string;
    path: string;
    description?: string;
    framework_id?: string;
    module_ids: string; // JSON string
    module_configurations?: string; // JSON string
    last_updated: string;
    generation_id?: string;
    generation_status?: string;
    generation_progress?: number;
    generation_error?: string;
  };

  frameworks: {
    id: string;
    name: string;
    description: string;
    version: string;
    type: string;
    tags: string; // JSON string
    cli: string; // JSON string
    compatible_modules: string; // JSON string
    directory_structure: string; // JSON string
    logo?: string;
  };

  modules: {
    id: string;
    name: string;
    description: string;
    version: string;
    category: string;
    dependencies: string; // JSON string
    file_operations: string; // JSON string
    options: string; // JSON string
  };

  favorite_frameworks: {
    id: string;
    framework_id: string;
    created_at: string;
  };
}

let dbInstance: Database | null = null;

export async function initializeDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await Database.load("sqlite:architech.db");

    // Create tables if they don't exist
    await createTables(dbInstance);

    return dbInstance;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

export async function getDatabase(): Promise<Database> {
  if (!dbInstance) {
    return await initializeDatabase();
  }
  return dbInstance;
}

async function createTables(db: Database): Promise<void> {
  // Recent projects table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS recent_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      framework TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_opened_at TEXT NOT NULL
    )
  `);

  // Project drafts table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_drafts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      framework_id TEXT,
      module_ids TEXT NOT NULL DEFAULT '[]',
      module_configurations TEXT DEFAULT '{}',
      last_updated TEXT NOT NULL,
      generation_id TEXT,
      generation_status TEXT,
      generation_progress INTEGER,
      generation_error TEXT
    )
  `);

  // Frameworks table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS frameworks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      version TEXT NOT NULL,
      type TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      cli TEXT NOT NULL,
      compatible_modules TEXT NOT NULL DEFAULT '[]',
      directory_structure TEXT NOT NULL,
      logo TEXT
    )
  `);

  // Modules table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      version TEXT NOT NULL,
      category TEXT NOT NULL,
      dependencies TEXT NOT NULL DEFAULT '[]',
      file_operations TEXT NOT NULL DEFAULT '[]',
      options TEXT NOT NULL DEFAULT '[]'
    )
  `);

  // Favorite frameworks table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS favorite_frameworks (
      id TEXT PRIMARY KEY,
      framework_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(framework_id)
    )
  `);

  console.log("Database tables initialized successfully");
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
