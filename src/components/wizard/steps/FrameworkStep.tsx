import { useProjectStore } from "@/lib/store/project-store";
import { cn } from "@/lib/utils/cn";
import FrameworkCard from "../FrameworkCard";
import WizardCard from "../WizardCard";
import { useFrameworkSelection } from "../hooks/useFrameworkSelection";
import type { WizardStepProps } from "../types";

export function FrameworkStep({
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  onBackToDashboard,
}: WizardStepProps) {
  const {
    frameworksByType,
    selectedFrameworkId,
    selectedType,
    loading,
    error,
    setSelectedType,
    selectFramework,
  } = useFrameworkSelection();

  const { lastSaved, saveDraft } = useProjectStore();

  // Check if we have a valid selection
  const isSelectionValid = !!selectedFrameworkId;

  // Handle next button
  const handleNext = async () => {
    if (isSelectionValid) {
      try {
        await saveDraft();
        onNext();
      } catch (error) {
        console.error("Failed to save draft:", error);
      }
    }
  };

  return (
    <WizardCard
      title="Select a Framework"
      description="Our framework-first approach uses official CLI tools to create your project with the latest versions and best practices."
      canGoPrevious={canGoPrevious}
      canGoNext={canGoNext && isSelectionValid}
      onPrevious={onPrevious}
      onNext={handleNext}
      onBackToDashboard={onBackToDashboard}
      isFormValid={isSelectionValid}
      isLoading={loading}
      lastSavedTime={lastSaved}
      hasChanges={true}
      onSave={() => saveDraft()}
      stepNumber={2}
      totalSteps={5}
    >
      <div className="space-y-6">
        {/* Framework type selector */}
        <div className="tabs tabs-boxed">
          <button
            type="button"
            className={cn("tab", selectedType === "web" && "tab-active")}
            onClick={() => setSelectedType("web")}
          >
            Web
          </button>
          <button
            type="button"
            className={cn("tab", selectedType === "app" && "tab-active")}
            onClick={() => setSelectedType("app")}
          >
            Mobile
          </button>
          <button
            type="button"
            className={cn("tab", selectedType === "desktop" && "tab-active")}
            onClick={() => setSelectedType("desktop")}
          >
            Desktop
          </button>
        </div>

        {loading && (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        {error && (
          <div className="alert alert-error">
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
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {frameworksByType.map((framework) => (
              <FrameworkCard
                key={framework.id}
                framework={framework}
                selected={framework.id === selectedFrameworkId}
                onSelect={selectFramework}
              />
            ))}

            {frameworksByType.length === 0 && (
              <div className="text-center py-8">
                <p className="text-base-content/50">
                  No frameworks available for this type.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Selection summary */}
        {selectedFrameworkId && (
          <div className="alert alert-success mt-4 animate-fadeIn">
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
              You&apos;ve selected a framework! Click "Next" to continue.
            </span>
          </div>
        )}
      </div>
    </WizardCard>
  );
}
