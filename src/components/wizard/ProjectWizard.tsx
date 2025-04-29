import { useState } from 'react';
import { useWizardNavigation, WizardStep } from './hooks/useWizardNavigation';
import { FrameworkStep } from './steps/FrameworkStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { ModulesStep } from './steps/ModulesStep';
import { ConfigurationStep } from './steps/ConfigurationStep';
import { SummaryStep } from './steps/SummaryStep';
import { useProjectStore } from '@/lib/store/project-store';
import { cn } from '@/lib/utils/cn';

export function ProjectWizard() {
  const { generateProject, isLoading, error } = useProjectStore();
  
  // Define wizard steps
  const steps: WizardStep[] = [
    { id: 'basic', title: 'Project Info', component: BasicInfoStep },
    { id: 'framework', title: 'Select Framework', component: FrameworkStep },
    { id: 'modules', title: 'Choose Modules', component: ModulesStep },
    { id: 'config', title: 'Configuration', component: ConfigurationStep },
    { id: 'summary', title: 'Review & Generate', component: SummaryStep },
  ];

  // Initialize wizard navigation
  const { 
    currentStep, 
    currentStepIndex, 
    visitedSteps, 
    goToNextStep, 
    goToPreviousStep, 
    goToStep, 
    progress 
  } = useWizardNavigation({ steps });

  // Project generation handling
  const handleGenerate = async () => {
    try {
      await generateProject();
      // Navigate to success page or show success message
    } catch (err) {
      // Error is handled by the store
      console.error('Project generation failed:', err);
    }
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
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 