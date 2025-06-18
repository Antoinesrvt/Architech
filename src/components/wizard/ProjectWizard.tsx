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
import Button from "@/components/ui/Button";
import { WizardSideNavigation } from './WizardSideNavigation';

import { useToast } from '@/components/ui/Toast';

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
  const { toast } = useToast();
  const [hasUserMadeChanges, setHasUserMadeChanges] = useState(false);
  const [isStepChanging, setIsStepChanging] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward' | null>(null);
  const initialStateRef = useRef({
    projectName: '',
    projectPath: '',
    selectedFrameworkId: null as string | null,
    selectedModuleIds: [] as string[],
  });

  // Define wizard steps
  const wizardSteps: WizardStep[] = [
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

  // Custom navigation handlers with animations
  const navigateWithAnimation = (
    direction: 'forward' | 'backward', 
    callback: () => void
  ) => {
    setDirection(direction);
    setIsStepChanging(true);
    
    // Execute the callback immediately to start loading the next step content
    callback();
    
    // Reset the animation state after it completes
    setTimeout(() => {
      setIsStepChanging(false);
    }, 200); // Reduced from 300ms for quicker transitions
  };

  // Initialize wizard navigation
  const {
    currentStep,
    currentStepIndex,
    visitedSteps,
    goToNextStep: originalGoToNextStep,
    goToPreviousStep: originalGoToPreviousStep,
    goToStep: originalGoToStep,
    progress,
  } = useWizardNavigation({
    steps: wizardSteps,
    onComplete: async () => {
      // Only save draft on completion when user has made changes
      if (hasUserMadeChanges) {
        try {
          await saveDraft();
          toast({
            type: "success",
            title: "Draft Saved",
            message: "Your project draft has been saved successfully.",
          });
        } catch (error) {
          console.error('Failed to save draft:', error);
        }
      }
    },
  });

  // Wrap navigation methods with animations
  const goToNextStep = () => {
    navigateWithAnimation('forward', originalGoToNextStep);
  };

  const goToPreviousStep = () => {
    navigateWithAnimation('backward', originalGoToPreviousStep);
  };

  const goToStep = (index: number) => {
    const direction = index > currentStepIndex ? 'forward' : 'backward';
    navigateWithAnimation(direction, () => originalGoToStep(index));
  };

  // Auto-save draft periodically when changes are made
  useEffect(() => {
    if (!hasUserMadeChanges) return;
    
    const saveTimer = setTimeout(async () => {
      try {
        await saveDraft();
      } catch (error) {
        console.error('Failed to auto-save draft:', error);
      }
    }, 30000); // Auto-save every 30 seconds if changes were made
    
    return () => clearTimeout(saveTimer);
  }, [hasUserMadeChanges, projectName, projectPath, selectedFrameworkId, selectedModuleIds, saveDraft]);

  // Convert visitedSteps object to Set for components that need it
  const visitedStepsSet = new Set(
    Object.entries(visitedSteps)
      .filter(([_, visited]) => visited)
      .map(([index]) => parseInt(index))
  );

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

  const handleKeepDraft = async () => {
    // Only save if there are actual changes
    if (hasUserMadeChanges) {
      try {
        await saveDraft();
        toast({
          type: "info",
          title: "Draft Saved",
          message: "Your project draft has been saved.",
        });
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
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
      toast({
        type: "info",
        message: "Draft discarded.",
      });
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
    <div className="py-6 relative">
      {/* Progress bar at the top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-base-200 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 w-full h-full bg-white/20 animate-shimmer-right" />
        </div>
      </div>

      {/* Side navigation buttons - only visible on larger screens */}
      <div className="hidden md:block">
        <WizardSideNavigation
          onNext={goToNextStep}
          onPrevious={goToPreviousStep}
          canGoNext={currentStepIndex < wizardSteps.length - 1}
          canGoPrevious={currentStepIndex > 0}
        />
      </div>

      {/* Main content */}
      <div className="relative overflow-hidden">
        <div
          className={cn(
            "transition-all duration-200 ease-out", // Faster transition
            isStepChanging && direction === "forward"
              ? "transform translate-x-[-10px] opacity-0" // Reduced distance
              : "",
            isStepChanging && direction === "backward"
              ? "transform translate-x-[10px] opacity-0" // Reduced distance
              : "",
            !isStepChanging && direction === "forward"
              ? "animate-slideFromRight"
              : "",
            !isStepChanging && direction === "backward"
              ? "animate-slideFromLeft"
              : ""
          )}
        >
          <CurrentStepComponent
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            canGoNext={true}
            canGoPrevious={currentStepIndex > 0}
            onBackToDashboard={handleBackToDashboard}
          />
        </div>
      </div>

      {/* The "go back" confirmation modal */}
      <input
        type="checkbox"
        id="back-confirmation-modal"
        className="modal-toggle"
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Save your progress?</h3>
          <p className="py-4">
            You have unsaved changes. Would you like to save this project as a
            draft before going back?
          </p>
          <div className="modal-action">
            <label htmlFor="back-confirmation-modal" className="btn btn-ghost">
              Cancel
            </label>
            <Button variant="error" onClick={handleDiscardDraft}>
              Discard
            </Button>
            <button className="btn btn-primary" onClick={handleKeepDraft}>
              Save Draft
            </button>
          </div>
        </div>
        <label
          className="modal-backdrop"
          htmlFor="back-confirmation-modal"
        ></label>
      </div>
    </div>
  );
}