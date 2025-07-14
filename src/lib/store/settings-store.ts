import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "architech", // Use your custom dark theme as default
      defaultProjectPath: "",
      editorCommand: "code", // Default to VS Code
      autoOpenProjectAfterGeneration: true,
      useGit: true,
      setTheme: (theme) => {
        set({ theme });
      },
      setDefaultProjectPath: (path) => {
        set({ defaultProjectPath: path });
      },
      setEditorCommand: (command) => {
        set({ editorCommand: command });
      },
      setAutoOpenProjectAfterGeneration: (value) => {
        set({ autoOpenProjectAfterGeneration: value });
      },
      setUseGit: (value) => {
        set({ useGit: value });
      },
    }),
    {
      name: "architech-settings",
    },
  ),
);
