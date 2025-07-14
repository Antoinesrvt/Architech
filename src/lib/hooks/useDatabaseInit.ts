import { initializeDatabase } from "@/lib/database/init";
import { useFrameworkStore } from "@/lib/store/framework-store-sqlite";
import { useProjectStore } from "@/lib/store/project-store-sqlite";
import { useEffect, useState } from "react";

interface DatabaseInitState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useDatabaseInit() {
  const [state, setState] = useState<DatabaseInitState>({
    isInitialized: false,
    isLoading: true,
    error: null,
  });

  const projectStore = useProjectStore();
  const frameworkStore = useFrameworkStore();

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Initialize database
        await initializeDatabase();

        // Load data into stores
        await Promise.all([
          projectStore.loadRecentProjects(),
          projectStore.loadDrafts(),
          frameworkStore.loadFrameworks(),
          frameworkStore.loadModules(),
          frameworkStore.loadFavorites(),
        ]);

        if (isMounted) {
          setState({
            isInitialized: true,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error("Failed to initialize database:", error);
        if (isMounted) {
          setState({
            isInitialized: false,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to initialize database",
          });
        }
      }
    };

    void initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
