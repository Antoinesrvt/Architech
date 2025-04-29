import { useState } from 'react';
import { FrameworkStep } from './steps/FrameworkStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { ModulesStep } from './steps/ModulesStep';
import { ConfigurationStep } from './steps/ConfigurationStep';
import { SummaryStep } from './steps/SummaryStep';
import { useProjectStore } from '@/lib/store/project-store';
import { frameworkService } from '@/lib/api';

type WizardStep = {
  id: string;
  title: string;
  component: React.ComponentType;
};

export function ProjectWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const { generateProject, isLoading, error } = useProjectStore();
  
  const steps: WizardStep[] = [
    { id: 'basic', title: 'Project Info', component: BasicInfoStep },
    { id: 'framework', title: 'Select Framework', component: FrameworkStep },
    { id: 'modules', title: 'Choose Modules', component: ModulesStep },
    { id: 'config', title: 'Configuration', component: ConfigurationStep },
    { id: 'summary', title: 'Review & Generate', component: SummaryStep },
  ];
  
  const CurrentStepComponent = steps[currentStep].component;
  
  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleGenerate = async () => {
    try {
      await generateProject();
      // Navigate to success page or show success message
    } catch (err) {
      // Error is handled by the store
      console.error('Project generation failed:', err);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <ul className="steps steps-horizontal w-full">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`step ${index <= currentStep ? 'step-primary' : ''}`}
              onClick={() => index < currentStep && setCurrentStep(index)}
            >
              {step.title}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <CurrentStepComponent />
          
          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}
          
          <div className="card-actions justify-end mt-6">
            {currentStep > 0 && (
              <button
                className="btn btn-outline"
                onClick={goToPreviousStep}
                disabled={isLoading}
              >
                Previous
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={goToNextStep}
                disabled={isLoading}
              >
                Next
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Generating...
                  </>
                ) : (
                  'Generate Project'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 