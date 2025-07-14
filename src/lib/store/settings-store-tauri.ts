import { Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";

type ThemeType = "architech" | "architech-light";

interface SettingsState {
  theme: ThemeType;
  defaultProjectPath: string;
  editorCommand: string;
  autoOpenProjectAfterGeneration: boolean;
  useGit: boolean;
  setTheme: (theme: ThemeType) => void;
  setDefaultProjectPath: (path: string) => void;
  setEditorCommand: (command: string) => void;
  setAutoOpenProjectAfterGeneration: (value: boolean) => void;
  setUseGit: (value: boolean) => void;
  loadSettings: () => Promise<void>;
}

// Initialize the Tauri store
let store: Store | null = null;

const initStore = async (): Promise<Store> => {
  store ??= await Store.load("settings.json", { autoSave: true });

  return store;
};

// Default settings
const defaultSettings = {
  theme: "architech" as ThemeType,
  defaultProjectPath: "",
  editorCommand: "code",
  autoOpenProjectAfterGeneration: true,
  useGit: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,

  setTheme: (theme) => {
    set({ theme });
    void (async () => {
      const storeInstance = await initStore();
      await storeInstance.set("theme", theme);
    })();
  },

  setDefaultProjectPath: (path) => {
    set({ defaultProjectPath: path });
    void (async () => {
      const storeInstance = await initStore();
      await storeInstance.set("defaultProjectPath", path);
    })();
  },

  setEditorCommand: (command) => {
    set({ editorCommand: command });
    void (async () => {
      const storeInstance = await initStore();
      await storeInstance.set("editorCommand", command);
    })();
  },

  setAutoOpenProjectAfterGeneration: (value) => {
    set({ autoOpenProjectAfterGeneration: value });
    void (async () => {
      const storeInstance = await initStore();
      await storeInstance.set("autoOpenProjectAfterGeneration", value);
    })();
  },

  setUseGit: (value) => {
    set({ useGit: value });
    void (async () => {
      const storeInstance = await initStore();
      await storeInstance.set("useGit", value);
    })();
  },

  loadSettings: async () => {
    try {
      const storeInstance = await initStore();

      // Load all settings from the store
      const theme =
        (await storeInstance.get<ThemeType>("theme")) ?? defaultSettings.theme;
      const defaultProjectPath =
        (await storeInstance.get<string>("defaultProjectPath")) ??
        defaultSettings.defaultProjectPath;
      const editorCommand =
        (await storeInstance.get<string>("editorCommand")) ??
        defaultSettings.editorCommand;
      const autoOpenProjectAfterGeneration =
        (await storeInstance.get<boolean>("autoOpenProjectAfterGeneration")) ??
        defaultSettings.autoOpenProjectAfterGeneration;
      const useGit =
        (await storeInstance.get<boolean>("useGit")) ?? defaultSettings.useGit;

      set({
        theme,
        defaultProjectPath,
        editorCommand,
        autoOpenProjectAfterGeneration,
        useGit,
      });
    } catch (error) {
      console.error("Failed to load settings from Tauri store:", error);
      // Fall back to default settings
      set(defaultSettings);
    }
  },
}));

// Initialize settings on store creation
if (typeof window !== "undefined") {
  void useSettingsStore.getState().loadSettings();
}
