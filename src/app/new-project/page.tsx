"use client";

import { ProjectWizard } from "@/components/wizard/ProjectWizard";

export default function NewProjectPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Project</h1>
      <ProjectWizard />
    </div>
  );
} 