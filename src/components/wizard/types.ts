/**
 * Common interface for all wizard step components
 */
export interface WizardStepProps {
  /**
   * Function to navigate to the next step
   */
  onNext: () => void;

  /**
   * Function to navigate to the previous step
   */
  onPrevious: () => void;

  /**
   * Function to navigate back to the dashboard
   */
  onBackToDashboard?: () => void;

  /**
   * Whether navigation to the next step is allowed
   */
  canGoNext: boolean;

  /**
   * Whether navigation to the previous step is allowed
   */
  canGoPrevious: boolean;
}
