import { frameworkService } from "@/lib/api";
import { useFrameworkStore } from "@/lib/store/framework-store";
import { useProjectStore } from "@/lib/store/project-store";
import { useState } from "react";
import CommandPreview from "../CommandPreview";
import WizardCard from "../WizardCard";
import type { WizardStepProps } from "../types";
import { GenerationPage } from "./GenerationPage";

export function SummaryStep({
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  onBackToDashboard,
}: WizardStepProps) {
  const { frameworks, modules } = useFrameworkStore();
  const {
    projectName,
    projectPath,
    projectDescription,
    selectedFrameworkId,
    selectedModuleIds,
    moduleConfigurations,
    generateProject,
    isLoading,
    error: projectError,
    lastSaved,
    saveDraft,
  } = useProjectStore();

  const [showGenerationPage, setShowGenerationPage] = useState(false);

  // Get the selected framework
  const selectedFramework = selectedFrameworkId
    ? frameworks.find((f) => f.id === selectedFrameworkId)
    : null;

  // Get the selected modules
  const selectedModules = modules.filter((module) =>
    selectedModuleIds.includes(module.id),
  );

  // Start generation and show the generation page
  const handleStartGeneration = async () => {
    try {
      await saveDraft();
      setShowGenerationPage(true);
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  };

  // If we're showing the generation page, render that instead
  if (showGenerationPage) {
    return <GenerationPage onBackToDashboard={onBackToDashboard} />;
  }

  return (
    <WizardCard
      title="Project Summary"
      description="Review your project configuration and the CLI commands that will be executed."
      canGoPrevious={canGoPrevious}
      canGoNext={true}
      onPrevious={onPrevious}
      onNext={handleStartGeneration}
      onBackToDashboard={onBackToDashboard}
      isFormValid={true}
      isLoading={isLoading}
      lastSavedTime={lastSaved}
      hasChanges={true}
      onSave={() => saveDraft()}
      stepNumber={5}
      totalSteps={5}
      nextButtonText="Generate Project"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Details Section */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h3 className="card-title">Project Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span className="text-right">{projectPath}</span>
                </div>
                {projectDescription && (
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-sm mt-1">{projectDescription}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Framework Section */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              {selectedFramework ? (
                <div className="space-y-2">
                  <h3 className="font-medium">
                    {selectedFramework.name}{" "}
                    <span className="text-xs opacity-70">
                      v{selectedFramework.version}
                    </span>
                  </h3>
                  <p className="text-sm">{selectedFramework.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFramework.tags.map((tag) => (
                      <span key={tag} className="badge badge-primary badge-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="bg-base-300 rounded p-2 text-xs mt-2">
                    <span className="font-medium">CLI: </span>
                    <span className="font-mono">
                      {selectedFramework.cli
                        ? selectedFramework.cli.base_command
                        : "No CLI command available"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-error">No framework selected</p>
              )}
            </div>
          </div>
        </div>

        {/* Command Preview */}
        {selectedFramework && (
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h3 className="card-title">Commands That Will Run</h3>
              <CommandPreview
                framework={selectedFramework}
                modules={selectedModules}
                projectName={projectName || "my-project"}
              />
            </div>
          </div>
        )}

        {/* Selected Modules Section */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Selected Modules</h3>
            {selectedModules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedModules.map((module) => (
                  <div key={module.id} className="bg-base-100 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <p className="font-medium">{module.name}</p>
                      <span className="badge badge-sm">{module.category}</span>
                    </div>
                    <p className="text-xs text-base-content/70 mt-1">
                      {module.description}
                    </p>

                    {module.installation.commands.length > 0 && (
                      <div className="mt-2 bg-base-300 p-2 rounded text-xs font-mono overflow-x-auto whitespace-nowrap">
                        $ {module.installation.commands[0]}
                        {module.installation.commands.length > 1 && "..."}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-warning">No modules selected</p>
            )}
          </div>
        </div>

        {/* Project Structure Preview */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Project Structure Preview</h3>
            <div className="bg-base-100 p-4 rounded-lg font-mono text-sm">
              <p>📁 {projectName || "my-project"}/</p>
              {selectedFramework?.directory_structure?.directories?.map(
                (dir) => (
                  <p key={dir} className="ml-4">
                    📁 {dir}/
                  </p>
                ),
              )}
              <p className="ml-4">📄 package.json</p>
              <p className="ml-4">📄 README.md</p>
              {selectedModules.some((m) => m.id === "tailwind") && (
                <p className="ml-4">📄 tailwind.config.js</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </WizardCard>
  );
}
