import { useState, useEffect, useRef } from 'react';
import { useWizardNavigation, WizardStep } from './hooks/useWizardNavigation';
import { FrameworkStep } from './steps/FrameworkStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { ModulesStep } from './steps/ModulesStep';
import { ConfigurationStep } from './steps/ConfigurationStep';
import { SummaryStep } from './steps/SummaryStep';
import { useProjectStore } from '@/lib/store/project-store';
import { cn } from '@/lib/utils/cn';
import { useRouter } from 'next/navigation';

export function ProjectWizard() {
  const {
    generateProject,
    isLoading,
    error,
    currentDraftId,
    createDraft,
    saveDraft,
    deleteDraft,
    resetWizardState,
    projectName,
    projectPath,
    selectedFrameworkId,
    selectedModuleIds,
  } = useProjectStore();
  const router = useRouter();
  const [hasUserMadeChanges, setHasUserMadeChanges] = useState(false);
  const initialStateRef = useRef({
    projectName: '',
    projectPath: '',
    selectedFrameworkId: null as string | null,
    selectedModuleIds: [] as string[],
  });

  // Define wizard steps
  const steps: WizardStep[] = [
    { id: "basic", title: "Project Info", component: BasicInfoStep },
    { id: "framework", title: "Select Framework", component: FrameworkStep },
    { id: "modules", title: "Choose Modules", component: ModulesStep },
    { id: "config", title: "Configuration", component: ConfigurationStep },
    { id: "summary", title: "Review & Generate", component: SummaryStep },
  ];

  // Create or use existing draft - only when starting
  useEffect(() => {
    if (!currentDraftId) {
      createDraft();
      // Capture initial state for detecting changes
      const storeState = useProjectStore.getState();
      initialStateRef.current = {
        projectName: storeState.projectName,
        projectPath: storeState.projectPath,
        selectedFrameworkId: storeState.selectedFrameworkId,
        selectedModuleIds: [...storeState.selectedModuleIds],
      };
    }
  }, [currentDraftId, createDraft]);

  // Check for user changes whenever relevant state changes
  useEffect(() => {
    const initialState = initialStateRef.current;
    
    const hasChanges = 
      projectName !== initialState.projectName ||
      projectPath !== initialState.projectPath ||
      selectedFrameworkId !== initialState.selectedFrameworkId ||
      selectedModuleIds.length !== initialState.selectedModuleIds.length ||
      !selectedModuleIds.every(id => initialState.selectedModuleIds.includes(id));
    
    setHasUserMadeChanges(hasChanges);
  }, [projectName, projectPath, selectedFrameworkId, selectedModuleIds]);

  // Save draft only when specifically requested, not automatically on unmount
  // We'll only call saveDraft() when explicitly asked to
  
  // Initialize wizard navigation
  const {
    currentStep,
    currentStepIndex,
    visitedSteps,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    progress,
  } = useWizardNavigation({
    steps,
    onComplete: () => {
      // Only save draft on completion when user has made changes
      if (hasUserMadeChanges) {
        saveDraft();
      }
    },
  });

  // Project generation handling
  const handleGenerate = async () => {
    try {
      await generateProject();
      // Navigate to success page or show success message
    } catch (err) {
      // Error is handled by the store
      console.error("Project generation failed:", err);
    }
  };

  // Navigation handlers
  const handleBackToDashboard = () => {
    // If no changes made, just go back without showing modal
    if (!hasUserMadeChanges) {
      router.push("/");
      return;
    }
    
    // Otherwise, show the modal by triggering the checkbox
    const modal = document.getElementById('back-confirmation-modal') as HTMLInputElement;
    if (modal) {
      modal.checked = true;
    }
  };

  const handleKeepDraft = () => {
    // Only save if there are actual changes
    if (hasUserMadeChanges) {
      saveDraft();
    }
    
    // Close the modal first
    const modal = document.getElementById('back-confirmation-modal') as HTMLInputElement;
    if (modal) {
      modal.checked = false;
    }
    
    // Small delay to ensure state is updated and modal is closed
    setTimeout(() => {
      router.push("/");
    }, 100);
  };

  const handleDiscardDraft = () => {
    if (currentDraftId) {
      deleteDraft(currentDraftId);
      resetWizardState(); // Ensure wizard state is completely reset
    }
    
    // Close the modal first
    const modal = document.getElementById('back-confirmation-modal') as HTMLInputElement;
    if (modal) {
      modal.checked = false;
    }
    
    // Small delay to ensure state is updated and modal is closed
    setTimeout(() => {
      router.push("/");
    }, 100);
  };

  // Component for the current step
  const CurrentStepComponent = currentStep.component;

  return (
    <div className="py-6 relative animate-fadeIn">
      {/* Progress bar at the top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-base-200">
        <div
          className="h-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center mb-6 mt-2">
          <button
            className="btn btn-ghost btn-sm mr-2"
            onClick={handleBackToDashboard}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Create New Project</h1>
        </div>

      </div>

      {/* CLI-first approach callout */}
      {/* <div className="alert alert-info mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <h3 className="font-bold">Command-Line First Approach</h3>
          <div className="text-xs">
            We use the official CLI tools of each framework to ensure you get
            the latest versions and best practices.
          </div>
        </div>
      </div> */}

      {/* Step indicators */}
      <div className="mb-8">
        <ul className="steps steps-horizontal w-full">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={cn(
                "step cursor-pointer transition-all duration-300",
                index <= currentStepIndex ? "step-primary" : "",
                visitedSteps[index] ? "step-accent" : ""
              )}
              onClick={() => index <= currentStepIndex && goToStep(index)}
            >
              {step.title}
            </li>
          ))}
        </ul>
      </div>

      {/* Card with current step */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          {/* Current step component */}
          <div className="min-h-[50vh] transition-all duration-300 animate-fadeIn">
            <CurrentStepComponent />
          </div>

          {/* Error display */}
          {error && (
            <div className="alert alert-error mt-4 animate-slideUp">
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

          {/* Navigation buttons */}
          <div className="card-actions justify-between mt-6">
            <div>
              {currentStepIndex > 0 && (
                <button
                  className="btn btn-outline hover:btn-primary transition-all"
                  onClick={goToPreviousStep}
                  disabled={isLoading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Previous
                </button>
              )}
            </div>
            <div>
              {currentStepIndex < steps.length - 1 ? (
                <button
                  className="btn btn-primary transform transition-transform hover:scale-105"
                  onClick={goToNextStep}
                  disabled={isLoading}
                >
                  Next
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-lg animate-pulse transform transition-transform hover:scale-105"
                  onClick={handleGenerate}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Project
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 ml-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          {/* Back Confirmation Modal using DaisyUI */}
          <input
            type="checkbox"
            id="back-confirmation-modal"
            className="modal-toggle"
          />
          <div className="modal" role="dialog">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Return to Dashboard?</h3>
              <p className="py-4">
                What would you like to do with your current progress?
              </p>
              <div className="modal-action flex flex-col sm:flex-row gap-2">
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleKeepDraft}
                >
                  Save as Draft
                </button>
                <button
                  className="btn btn-error flex-1"
                  onClick={handleDiscardDraft}
                >
                  Discard
                </button>
                <label
                  htmlFor="back-confirmation-modal"
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </label>
              </div>
            </div>
            <label
              className="modal-backdrop"
              htmlFor="back-confirmation-modal"
            ></label>
          </div>
        </div>
      </div>
    </div>
  );
} 