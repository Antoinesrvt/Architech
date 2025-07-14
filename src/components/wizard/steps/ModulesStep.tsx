import { useFrameworkStore } from "@/lib/store/framework-store";
import type { Module } from "@/lib/store/framework-store";
import { useProjectStore } from "@/lib/store/project-store";
import { cn } from "@/lib/utils/cn";
import { useEffect, useState } from "react";
import ModuleCard from "../ModuleCard";
import WizardCard from "../WizardCard";
import type { WizardStepProps } from "../types";

type ModuleCategory =
  | "all"
  | "styling"
  | "ui"
  | "state"
  | "i18n"
  | "forms"
  | "testing"
  | "advanced";

export function ModulesStep({
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  onBackToDashboard,
}: WizardStepProps) {
  const { modules, frameworks } = useFrameworkStore();
  const {
    selectedFrameworkId,
    selectedModuleIds,
    addModule,
    removeModule,
    saveDraft,
    lastSaved,
  } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<ModuleCategory>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get the selected framework
  const selectedFramework = selectedFrameworkId
    ? frameworks.find((f) => f.id === selectedFrameworkId)
    : null;

  // Filter modules based on search, category, and compatibility with selected framework
  const filteredModules = modules
    .filter((module) => {
      // Filter by search query
      if (
        searchQuery &&
        !module.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !module.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Filter by category
      if (selectedCategory !== "all" && module.category !== selectedCategory) {
        return false;
      }

      // Filter by framework compatibility
      if (
        selectedFramework &&
        (!selectedFramework.compatible_modules ||
          !selectedFramework.compatible_modules.includes(module.id))
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by selected status first
      const aSelected = selectedModuleIds.includes(a.id);
      const bSelected = selectedModuleIds.includes(b.id);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });

  // Check if a module can be toggled based on dependencies and incompatibilities
  const canToggleModule = (module: Module, selected: boolean) => {
    // If we're trying to deselect a module, make sure no selected module depends on it
    if (selected) {
      const selectedDependentModules = modules.filter(
        (m) =>
          selectedModuleIds.includes(m.id) &&
          m.dependencies.includes(module.id),
      );

      if (selectedDependentModules.length > 0) {
        return {
          can: false,
          reason: `Cannot remove ${module.name} because it is required by: ${selectedDependentModules.map((m) => m.name).join(", ")}`,
        };
      }
    }
    // If we're trying to select a module, check for incompatibilities
    else {
      // Check if this module is incompatible with any already selected module
      const incompatibleModules = modules.filter(
        (m) =>
          selectedModuleIds.includes(m.id) &&
          (m.incompatible_with.includes(module.id) ||
            module.incompatible_with.includes(m.id)),
      );

      if (incompatibleModules.length > 0) {
        return {
          can: false,
          reason: `${module.name} is incompatible with: ${incompatibleModules.map((m) => m.name).join(", ")}`,
        };
      }
    }

    return { can: true, reason: "" };
  };

  // Handle module toggle
  const handleModuleToggle = (moduleId: string, isSelected: boolean) => {
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return;

    const currentlySelected = selectedModuleIds.includes(moduleId);
    const toggle = canToggleModule(module, currentlySelected);

    if (!toggle.can) {
      // Show error message
      setErrorMessage(toggle.reason);
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    if (currentlySelected) {
      // Remove module from selection
      removeModule(moduleId);
    } else {
      // Add module to selection
      addModule(moduleId);

      // Also add all dependencies
      module.dependencies.forEach((depId) => {
        if (!selectedModuleIds.includes(depId)) {
          addModule(depId);
        }
      });
    }
  };

  // Group modules by category for better organization
  const modulesByCategory: Record<ModuleCategory, Module[]> = {
    all: filteredModules,
    styling: filteredModules.filter((m) => m.category === "styling"),
    ui: filteredModules.filter((m) => m.category === "ui"),
    state: filteredModules.filter((m) => m.category === "state"),
    i18n: filteredModules.filter((m) => m.category === "i18n"),
    forms: filteredModules.filter((m) => m.category === "forms"),
    testing: filteredModules.filter((m) => m.category === "testing"),
    advanced: filteredModules.filter((m) => m.category === "advanced"),
  };

  // Get counts by category
  const countsByCategory = Object.entries(modulesByCategory).reduce(
    (acc, [category, modules]) => {
      acc[category as ModuleCategory] = modules.length;
      return acc;
    },
    {} as Record<ModuleCategory, number>,
  );

  // Handle next step
  const handleNext = async () => {
    try {
      await saveDraft();
      onNext();
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  };

  return (
    <WizardCard
      title="Select Modules"
      description={`Choose the modules you want to install in your project.${selectedFramework ? ` Showing modules compatible with ${selectedFramework.name}.` : ""}`}
      canGoPrevious={canGoPrevious}
      canGoNext={canGoNext}
      onPrevious={onPrevious}
      onNext={handleNext}
      onBackToDashboard={onBackToDashboard}
      isFormValid={true}
      lastSavedTime={lastSaved}
      hasChanges={true}
      onSave={() => saveDraft()}
      stepNumber={3}
      totalSteps={5}
    >
      <div className="space-y-6">
        {/* Error message display */}
        {errorMessage && (
          <div className="alert alert-error animate-slideIn">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Search and filter bar */}
        <div className="flex flex-col sm:flex-row gap-2 form-control flex-grow w-full">
          <div className="input-group">
            <input
              type="text"
              placeholder="Search modules..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="button" className="btn btn-square">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="tabs tabs-boxed overflow-x-auto">
          <button
            type="button"
            className={cn("tab", selectedCategory === "all" && "tab-active")}
            onClick={() => setSelectedCategory("all")}
          >
            All ({countsByCategory.all || 0})
          </button>
          <button
            type="button"
            className={cn(
              "tab",
              selectedCategory === "styling" && "tab-active",
            )}
            onClick={() => setSelectedCategory("styling")}
          >
            Styling ({countsByCategory.styling || 0})
          </button>
          <button
            type="button"
            className={cn("tab", selectedCategory === "ui" && "tab-active")}
            onClick={() => setSelectedCategory("ui")}
          >
            UI ({countsByCategory.ui || 0})
          </button>
          <button
            type="button"
            className={cn("tab", selectedCategory === "state" && "tab-active")}
            onClick={() => setSelectedCategory("state")}
          >
            State ({countsByCategory.state || 0})
          </button>
          <button
            type="button"
            className={cn("tab", selectedCategory === "i18n" && "tab-active")}
            onClick={() => setSelectedCategory("i18n")}
          >
            i18n ({countsByCategory.i18n || 0})
          </button>
          <button
            type="button"
            className={cn("tab", selectedCategory === "forms" && "tab-active")}
            onClick={() => setSelectedCategory("forms")}
          >
            Forms ({countsByCategory.forms || 0})
          </button>
          <button
            type="button"
            className={cn(
              "tab",
              selectedCategory === "testing" && "tab-active",
            )}
            onClick={() => setSelectedCategory("testing")}
          >
            Testing ({countsByCategory.testing || 0})
          </button>
          <button
            type="button"
            className={cn(
              "tab",
              selectedCategory === "advanced" && "tab-active",
            )}
            onClick={() => setSelectedCategory("advanced")}
          >
            Advanced ({countsByCategory.advanced || 0})
          </button>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulesByCategory[selectedCategory].map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              selected={selectedModuleIds.includes(module.id)}
              onToggle={handleModuleToggle}
              disabled={
                !selectedFramework ||
                !selectedFramework.compatible_modules ||
                !selectedFramework.compatible_modules.includes(module.id)
              }
            />
          ))}

          {modulesByCategory[selectedCategory].length === 0 && (
            <div className="text-center py-8">
              <p className="text-base-content/50">
                No modules available in this category.
              </p>
            </div>
          )}
        </div>

        {/* Selection summary */}
        {selectedModuleIds.length > 0 && (
          <div className="alert alert-success animate-fadeIn">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              You've selected {selectedModuleIds.length} module(s). Click "Next"
              to continue.
            </span>
          </div>
        )}
      </div>
    </WizardCard>
  );
}
