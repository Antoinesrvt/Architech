import { useState } from 'react';
import { WizardStepProps } from '../types';

export type WizardStep = {
  id: string;
  title: string;
  component: React.ComponentType<WizardStepProps>;
  canProceed?: () => boolean;
};

export interface UseWizardNavigationProps {
  steps: WizardStep[];
  onComplete?: () => void;
}

export function useWizardNavigation({ steps, onComplete }: UseWizardNavigationProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Record<number, boolean>>({ 0: true });
  const [isCompleted, setIsCompleted] = useState(false);

  // Get the current step
  const currentStep = steps[currentStepIndex];

  // Navigate to the next step
  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      // Check if we can proceed
      if (currentStep.canProceed && !currentStep.canProceed()) {
        return false;
      }

      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      // Mark the next step as visited
      setVisitedSteps(prev => ({
        ...prev,
        [nextIndex]: true,
      }));
      
      return true;
    } else if (currentStepIndex === steps.length - 1) {
      // If we're on the last step and going forward, mark as completed
      setIsCompleted(true);
      onComplete?.();
      return true;
    }
    
    return false;
  };

  // Navigate to the previous step
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      return true;
    }
    return false;
  };

  // Navigate to a specific step (only if already visited or adjacent to current)
  const goToStep = (index: number) => {
    // Can't navigate past the last step
    if (index >= steps.length) {
      return false;
    }
    
    // Can only navigate to a step that has been visited before
    // or is immediately after the current highest visited step
    const highestVisitedIndex = Math.max(...Object.keys(visitedSteps).map(Number));
    
    if (visitedSteps[index] || index === highestVisitedIndex + 1) {
      setCurrentStepIndex(index);
      
      // Mark this step as visited
      setVisitedSteps(prev => ({
        ...prev,
        [index]: true,
      }));
      
      return true;
    }
    
    return false;
  };

  // Check if we can go to the next step
  const canGoNext = currentStepIndex < steps.length - 1 && 
    (!currentStep.canProceed || currentStep.canProceed());

  // Check if we can go to the previous step
  const canGoPrevious = currentStepIndex > 0;

  // Get the progress percentage
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return {
    currentStep,
    currentStepIndex,
    steps,
    visitedSteps,
    isCompleted,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    canGoNext,
    canGoPrevious,
    progress,
  };
} 