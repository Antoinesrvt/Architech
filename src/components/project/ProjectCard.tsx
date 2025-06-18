"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import { getApiService } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { RecentProject } from "@/lib/store/project-store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { confirmDialog } from "@/lib/utils/dialog";

interface ProjectCardProps {
  project: RecentProject;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { removeProject, updateLastOpened } = useProjectStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const api = getApiService();

  const handleOpenProject = async () => {
    try {
      setIsLoading(true);
      const success = await api.openInEditor(project.path);
      
      if (success) {
        await updateLastOpened(project.id);
        toast({
          type: "success",
          message: `Project "${project.name}" opened in editor`,
        });
      } else {
        toast({
          type: "error",
          title: "Error",
          message: "Failed to open project in editor",
        });
      }
    } catch (error) {
      console.error("Failed to open project:", error);
      toast({
        type: "error",
        title: "Error",
        message: "Failed to open project in editor",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveProject = async () => {
    try {
      const shouldRemove = await confirmDialog(
        `Are you sure you want to remove "${project.name}" from recent projects?`,
        { 
          title: 'Remove Project', 
          variant: 'default',
          confirmText: 'Remove',
          cancelText: 'Cancel'
        }
      );
      
      if (shouldRemove) {
        await removeProject(project.id);
        toast({
          type: "info",
          message: `Project "${project.name}" removed from recent projects`,
        });
      }
    } catch (error) {
      console.error("Error removing project:", error);
      toast({
        type: "error",
        title: "Error",
        message: "Failed to remove project. Please try again.",
      });
    }
  };

  return (
    <Card 
      interactive
      hoverLift
      withShadow
      className="animate-fadeIn"
    >
      <Card.Body>
        <Card.Title>{project.name}</Card.Title>
        <div className="text-sm opacity-70 mb-2 truncate" title={project.path}>
          {project.path}
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="badge badge-outline">{project.framework}</div>
          <div className="text-xs opacity-50">
            Last opened {formatRelativeTime(project.lastOpenedAt)}
          </div>
        </div>
        
        <Card.Actions className="justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveProject}
            leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            Remove
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenProject}
            isLoading={isLoading}
            leftIcon={!isLoading && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
          >
            Open
          </Button>
        </Card.Actions>
      </Card.Body>
    </Card>
  );
}