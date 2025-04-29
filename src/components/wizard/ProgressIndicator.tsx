"use client";

import { useEffect, useState } from "react";
import { GenerationProgress } from "@/lib/api/types";

interface ProgressIndicatorProps {
  progress: GenerationProgress | null;
  isComplete: boolean;
  error: string | null;
}

export default function ProgressIndicator({ 
  progress, 
  isComplete, 
  error 
}: ProgressIndicatorProps) {
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    if (progress && !steps.includes(progress.step)) {
      setSteps((prevSteps) => [...prevSteps, progress.step]);
    }
  }, [progress, steps]);

  if (error) {
    return (
      <div className="p-4 bg-error text-error-content rounded-lg">
        <h3 className="font-bold mb-2">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!progress && !isComplete) {
    return <div className="skeleton h-32 w-full"></div>;
  }

  return (
    <div className="space-y-4">
      <div className="w-full">
        <progress 
          className="progress progress-primary w-full" 
          value={progress?.progress ? progress.progress * 100 : 0} 
          max="100"
        ></progress>
        <div className="flex justify-between text-xs mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="space-y-3">
        {isComplete ? (
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Project generation complete!</span>
          </div>
        ) : (
          progress && (
            <div className="flex items-center gap-3">
              <div className="loading loading-spinner loading-sm"></div>
              <div>
                <p className="font-medium">{progress.message}</p>
                <p className="text-sm opacity-70">Step {steps.length} of 5</p>
              </div>
            </div>
          )
        )}

        <ul className="steps steps-vertical">
          {['init', 'framework', 'create', 'structure', 'modules', 'complete'].map((step, index) => (
            <li 
              key={step} 
              className={`step ${steps.includes(step) ? 'step-primary' : ''}`}
              data-content={steps.includes(step) ? '✓' : (index + 1)}
            >
              {step === 'init' && 'Initializing'}
              {step === 'framework' && 'Loading framework'}
              {step === 'create' && 'Creating project'}
              {step === 'structure' && 'Setting up structure'}
              {step === 'modules' && 'Installing modules'}
              {step === 'complete' && 'Project ready'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 