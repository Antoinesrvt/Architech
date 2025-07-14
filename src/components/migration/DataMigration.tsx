"use client";

import { initializeDatabase } from "@/lib/database/init";
import {
  clearLocalStorageData,
  exportLocalStorageData,
  migrateToSQLite,
} from "@/lib/database/migration";
import React, { useState } from "react";

interface MigrationStatus {
  status: "idle" | "checking" | "migrating" | "completed" | "error";
  message: string;
  hasData: boolean;
}

export function DataMigration() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    status: "idle",
    message: "",
    hasData: false,
  });

  const checkForLocalStorageData = () => {
    setMigrationStatus({
      status: "checking",
      message: "Checking for existing data...",
      hasData: false,
    });

    try {
      const data = exportLocalStorageData();
      const hasProjects =
        data.projects?.recentProjects?.length ?? data.projects?.drafts?.length;
      const hasFrameworks =
        data.frameworks?.frameworks?.length ?? data.frameworks?.modules?.length;
      const hasSettings = !!data.settings?.theme;

      const hasData = !!(hasProjects || hasFrameworks || hasSettings);

      if (hasData) {
        const dataDescription = [];
        if (hasProjects)
          dataDescription.push(
            `${(data.projects?.recentProjects?.length ?? 0) + (data.projects?.drafts?.length ?? 0)} projects`,
          );
        if (hasFrameworks)
          dataDescription.push(
            `${(data.frameworks?.frameworks?.length ?? 0) + (data.frameworks?.modules?.length ?? 0)} frameworks/modules`,
          );
        if (hasSettings) dataDescription.push("settings");

        setMigrationStatus({
          status: "idle",
          message: `Found data to migrate: ${dataDescription.join(", ")}`,
          hasData: true,
        });
      } else {
        setMigrationStatus({
          status: "completed",
          message: "No data found to migrate. You're all set!",
          hasData: false,
        });
      }
    } catch (error) {
      setMigrationStatus({
        status: "error",
        message: `Error checking data: ${error instanceof Error ? error.message : "Unknown error"}`,
        hasData: false,
      });
    }
  };

  const performMigration = async () => {
    setMigrationStatus({
      status: "migrating",
      message: "Initializing database...",
      hasData: true,
    });

    try {
      // Initialize database
      await initializeDatabase();
      setMigrationStatus({
        status: "migrating",
        message: "Migrating data to SQLite...",
        hasData: true,
      });

      // Perform migration
      await migrateToSQLite();
      setMigrationStatus({
        status: "migrating",
        message: "Cleaning up old data...",
        hasData: true,
      });

      // Clear localStorage
      clearLocalStorageData();

      setMigrationStatus({
        status: "completed",
        message:
          "Migration completed successfully! Your data is now stored in SQLite.",
        hasData: false,
      });
    } catch (error) {
      setMigrationStatus({
        status: "error",
        message: `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        hasData: true,
      });
    }
  };

  const getStatusColor = () => {
    switch (migrationStatus.status) {
      case "checking":
      case "migrating":
        return "text-blue-600";
      case "completed":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = () => {
    switch (migrationStatus.status) {
      case "checking":
      case "migrating":
        return (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Loading spinner"
          >
            <title>Loading spinner</title>
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case "completed":
        return (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            role="img"
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
        );
      case "error":
        return (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            role="img"
            aria-label="Error X mark"
          >
            <title>Error X mark</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            role="img"
            aria-label="Database icon"
          >
            <title>Database icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7c0-2.21 1.79-4 4-4h8c2.21 0 4-1.79 4-4M4 7h16"
            />
          </svg>
        );
    }
  };

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <svg
            className="h-6 w-6 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            role="img"
            aria-label="Upload icon"
          >
            <title>Upload icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Data Migration to SQLite</h3>
          <p className="text-sm text-base-content/70">
            Migrate your existing data from browser storage to SQLite for better
            performance and reliability.
          </p>
        </div>
      </div>

      {migrationStatus.message && (
        <div
          className={`flex items-center gap-2 mb-4 p-3 rounded-lg bg-base-200 ${getStatusColor()}`}
        >
          {getStatusIcon()}
          <span className="text-sm">{migrationStatus.message}</span>
        </div>
      )}

      <div className="flex gap-3">
        {migrationStatus.status === "idle" && !migrationStatus.hasData && (
          <button
            type="button"
            onClick={checkForLocalStorageData}
            className="btn btn-primary"
          >
            Check for Data
          </button>
        )}

        {migrationStatus.status === "checking" && (
          <button type="button" className="btn btn-primary" disabled>
            Checking for Data...
          </button>
        )}

        {migrationStatus.status === "idle" && migrationStatus.hasData && (
          <>
            <button
              type="button"
              onClick={() => void performMigration()}
              className="btn btn-primary"
            >
              Start Migration
            </button>
            <button
              type="button"
              onClick={checkForLocalStorageData}
              className="btn btn-outline"
            >
              Recheck Data
            </button>
          </>
        )}

        {migrationStatus.status === "migrating" && (
          <button type="button" className="btn btn-primary" disabled>
            Migrating Data...
          </button>
        )}

        {migrationStatus.status === "error" && (
          <button
            type="button"
            onClick={checkForLocalStorageData}
            className="btn btn-primary"
          >
            Try Again
          </button>
        )}

        {migrationStatus.status === "completed" && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Reload Application
          </button>
        )}
      </div>

      <div className="mt-4 p-3 bg-base-200 rounded-lg">
        <h4 className="text-sm font-medium mb-2">What will be migrated:</h4>
        <ul className="text-xs text-base-content/70 space-y-1">
          <li>• Recent projects and project drafts</li>
          <li>• Framework and module data</li>
          <li>• Favorite frameworks</li>
          <li>• Application settings (handled separately)</li>
        </ul>
      </div>
    </div>
  );
}
