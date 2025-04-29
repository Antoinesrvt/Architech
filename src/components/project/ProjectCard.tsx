"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import { getApiService } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { RecentProject } from "@/lib/store/project-store";

interface ProjectCardProps {
  project: RecentProject;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { removeProject, updateLastOpened } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);
  const api = getApiService();

  const handleOpenProject = async () => {
    try {
      setIsLoading(true);
      const success = await api.openInEditor(project.path);
      
      if (success) {
        updateLastOpened(project.id);
      }
    } catch (error) {
      console.error("Failed to open project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveProject = () => {
    removeProject(project.id);
  };

  return (
    <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
      <div className="card-body">
        <h2 className="card-title">{project.name}</h2>
        <div className="text-sm opacity-70 mb-2">{project.path}</div>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="badge badge-outline">{project.framework}</div>
          <div className="text-xs opacity-50">
            Last opened {formatRelativeTime(project.lastOpenedAt)}
          </div>
        </div>
        
        <div className="card-actions justify-end">
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={handleRemoveProject}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
          
          <button 
            className={`btn btn-primary btn-sm ${isLoading ? 'loading' : ''}`}
            onClick={handleOpenProject}
            disabled={isLoading}
          >
            {!isLoading && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
            Open
          </button>
        </div>
      </div>
    </div>
  );
} 