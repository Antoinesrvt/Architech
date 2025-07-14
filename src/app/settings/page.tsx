"use client";

import MainLayout from "@/components/layouts/MainLayout";
import { frameworkService } from "@/lib/api";
import { useSettingsStore } from "@/lib/store";
import { useState } from "react";

export default function SettingsPage() {
  const {
    theme,
    defaultProjectPath,
    editorCommand,
    autoOpenProjectAfterGeneration,
    useGit,
    setTheme,
    setDefaultProjectPath,
    setEditorCommand,
    setAutoOpenProjectAfterGeneration,
    setUseGit,
  } = useSettingsStore();

  const [tempPath, setTempPath] = useState(defaultProjectPath);
  const [tempEditor, setTempEditor] = useState(editorCommand);
  const [isSaved, setIsSaved] = useState(false);

  // Handle browsing for default project path
  const handleBrowseProjectPath = async () => {
    const path = await frameworkService.browseForDirectory();
    if (path) {
      setTempPath(path);
    }
  };

  // Save settings
  const handleSave = async () => {
    try {
      await setDefaultProjectPath(tempPath);
      await setEditorCommand(tempEditor);
      setIsSaved(true);

      // Reset the saved indicator after a delay
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Settings</h1>
          {isSaved && (
            <div className="badge badge-success gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-label="Success checkmark"
              >
                <title>Success checkmark</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Saved
            </div>
          )}
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Appearance</h2>

            <div className="form-control">
              <div className="label">
                <span className="label-text">Theme</span>
              </div>
              <div className="flex gap-4">
                {[
                  { id: "architech-light", name: "Light", icon: "sun" },
                  { id: "architech", name: "Dark", icon: "moon" },
                ].map((themeOption) => (
                  <div
                    key={themeOption.id}
                    className={`border-2 cursor-pointer p-4 rounded-lg
                      ${theme === themeOption.id ? "border-primary" : "border-base-300"}`}
                    onClick={async () => {
                      try {
                        await setTheme(
                          themeOption.id as "architech" | "architech-light",
                        );
                      } catch (error) {
                        console.error("Failed to set theme:", error);
                      }
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        try {
                          await setTheme(
                            themeOption.id as "architech" | "architech-light",
                          );
                        } catch (error) {
                          console.error("Failed to set theme:", error);
                        }
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Select ${themeOption.name} theme`}
                  >
                    <div
                      className={
                        "w-16 h-16 bg-primary rounded-md flex items-center justify-center"
                      }
                    >
                      {themeOption.icon === "sun" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-label="Light theme"
                        >
                          <title>Light theme</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-label="Dark theme"
                        >
                          <title>Dark theme</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="text-center mt-2">{themeOption.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Project Settings</h2>

            <div className="form-control w-full mb-4">
              <label className="label" htmlFor="project-path-input">
                <span className="label-text">Default Project Location</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="project-path-input"
                  type="text"
                  placeholder="/path/to/projects"
                  className="input input-bordered w-full"
                  value={tempPath}
                  onChange={(e) => setTempPath(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleBrowseProjectPath}
                >
                  Browse
                </button>
              </div>
            </div>

            <div className="form-control w-full mb-4">
              <label className="label" htmlFor="editor-command-input">
                <span className="label-text">Editor Command</span>
              </label>
              <input
                id="editor-command-input"
                type="text"
                placeholder="code"
                className="input input-bordered w-full"
                value={tempEditor}
                onChange={(e) => setTempEditor(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt">
                  Command used to open projects after generation
                </span>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={autoOpenProjectAfterGeneration}
                  onChange={async (e) => {
                    try {
                      await setAutoOpenProjectAfterGeneration(e.target.checked);
                    } catch (error) {
                      console.error(
                        "Failed to update auto-open setting:",
                        error,
                      );
                    }
                  }}
                />
                <span className="label-text">
                  Automatically open project after generation
                </span>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={useGit}
                  onChange={async (e) => {
                    try {
                      await setUseGit(e.target.checked);
                    } catch (error) {
                      console.error("Failed to update Git setting:", error);
                    }
                  }}
                />
                <span className="label-text">
                  Initialize Git repository for new projects
                </span>
              </label>
            </div>

            <div className="card-actions justify-end mt-4">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">About</h2>
            <p className="py-2">
              ArchiTech is a powerful project generator for creating Next.js
              applications with modern tooling and best practices.
            </p>
            <div className="stats shadow mt-4">
              <div className="stat">
                <div className="stat-title">App Version</div>
                <div className="stat-value">1.0.0</div>
              </div>

              <div className="stat">
                <div className="stat-title">Tauri</div>
                <div className="stat-value">2.0</div>
              </div>

              <div className="stat">
                <div className="stat-title">Next.js</div>
                <div className="stat-value">15.0</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
