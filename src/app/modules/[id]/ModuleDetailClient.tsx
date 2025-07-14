"use client";

import type {
  FileOperation,
  Module,
  ModuleOption,
} from "@/lib/store/framework-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ModuleDetailClientProps {
  module: Module;
}

export default function ModuleDetailClient({
  module,
}: ModuleDetailClientProps) {
  const router = useRouter();

  // Get category display name
  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case "styling":
        return "Styling";
      case "state":
        return "State Management";
      case "i18n":
        return "Internationalization";
      case "testing":
        return "Testing";
      case "ui":
        return "UI Components";
      case "forms":
        return "Forms";
      case "advanced":
        return "Advanced";
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "styling":
        return "badge-primary";
      case "state":
        return "badge-secondary";
      case "i18n":
        return "badge-accent";
      case "testing":
        return "badge-info";
      case "ui":
        return "badge-success";
      case "forms":
        return "badge-warning";
      case "advanced":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  // Handle create project with this module
  const handleCreateProject = () => {
    router.push(`/new-project?modules=${module.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with breadcrumbs */}
      <div className="text-sm breadcrumbs">
        <ul>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/modules">Modules</Link>
          </li>
          <li className="font-semibold">{module.name}</li>
        </ul>
      </div>

      {/* Module header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{module.name}</h1>
            <span className={`badge ${getCategoryColor(module.category)}`}>
              {getCategoryDisplayName(module.category)}
            </span>
          </div>
          <p className="text-lg text-base-content/70 mt-2">
            {module.description}
          </p>
        </div>
        <div className="flex-none mt-4 md:mt-0">
          <button className="btn btn-primary" onClick={handleCreateProject}>
            Create Project with this Module
          </button>
        </div>
      </div>

      {/* Module details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="col-span-2 space-y-6">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">About</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="badge badge-outline">
                  Version {module.version}
                </span>
              </div>

              {/* Installation commands */}
              <div className="mt-6">
                <h3 className="font-bold text-lg">Installation</h3>
                <div className="mt-2 space-y-3">
                  {module.installation.commands.map((command, index) => (
                    <div
                      key={index}
                      className="bg-base-300 rounded-lg p-3 font-mono text-sm relative group"
                    >
                      {command}
                      <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* File operations */}
              {module.installation.file_operations.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-lg">File Operations</h3>
                  <p className="text-base-content/70 text-sm">
                    This module will create or modify the following files:
                  </p>
                  <div className="overflow-x-auto mt-2">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th>Path</th>
                          <th>Operation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {module.installation.file_operations.map(
                          (file: FileOperation, index) => (
                            <tr key={index}>
                              <td className="font-mono text-sm">{file.path}</td>
                              <td className="font-mono text-sm">
                                {file.operation}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dependencies */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Dependencies</h2>
              {module.dependencies.length === 0 ? (
                <p className="text-base-content/70">No dependencies required</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {module.dependencies.map((dep: string) => (
                    <Link
                      key={dep}
                      href={`/modules/${dep}`}
                      className="block p-2 bg-base-200 rounded hover:bg-base-300 transition-colors"
                    >
                      {dep}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Incompatibilities */}
          {module.incompatible_with.length > 0 && (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-error">Incompatibilities</h2>
                <p className="text-base-content/70 text-sm">
                  This module cannot be used with:
                </p>
                <div className="space-y-2 mt-2">
                  {module.incompatible_with.map((inc: string) => (
                    <div
                      key={inc}
                      className="flex items-center p-2 bg-error/10 text-error rounded"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {inc}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Configuration options */}
          {module.configuration.options.length > 0 && (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title">Configuration Options</h2>
                <div className="space-y-4 mt-2">
                  {module.configuration.options.map((option: ModuleOption) => (
                    <div
                      key={option.id}
                      className="border-b pb-3 last:border-0"
                    >
                      <h3 className="font-bold">{option.label}</h3>
                      <p className="text-base-content/70 text-sm">
                        {option.description}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="badge badge-sm">{option.type}</span>
                        {option.default !== undefined && (
                          <span className="badge badge-sm">
                            Default:{" "}
                            {typeof option.default === "object"
                              ? JSON.stringify(option.default)
                              : String(option.default)}
                          </span>
                        )}
                      </div>
                      {option.choices && option.choices.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">
                            Available options:
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {option.choices.map((choice) => (
                              <span
                                key={choice.value}
                                className="badge badge-sm badge-outline"
                              >
                                {choice.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
