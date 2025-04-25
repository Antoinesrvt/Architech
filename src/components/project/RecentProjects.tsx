"use client";

import { useProjectStore } from "@/lib/store";
import ProjectCard from "./ProjectCard";
import Link from "next/link";

export default function RecentProjects() {
  const { recentProjects } = useProjectStore();

  if (recentProjects.length === 0) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body items-center text-center">
          <h2 className="card-title">No Recent Projects</h2>
          <p className="text-base-content/70 mb-4">
            You haven&apos;t created any projects yet. Get started by creating your first project.
          </p>
          <div className="card-actions">
            <Link href="/new-project" className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Create New Project
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Recent Projects</h2>
        <Link href="/new-project" className="btn btn-sm btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {recentProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
} 