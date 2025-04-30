"use client";

import { useEffect, useState } from "react";
import { GenerationProgress } from "@/lib/api/types";

interface ProgressIndicatorProps {
  progress: GenerationProgress | null;
  isComplete: boolean;
  error: string | null;
  onRetry?: () => void;
}

export default function ProgressIndicator({ 
  progress, 
  isComplete, 
  error,
  onRetry
}: ProgressIndicatorProps) {
  const [steps, setSteps] = useState<string[]>([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    if (progress?.step && !steps.includes(progress.step)) {
      setSteps((prevSteps) => [...prevSteps, progress.step]);
    }
  }, [progress, steps]);

  // More user-friendly error messages
  const getFriendlyErrorMessage = (errorText: string) => {
    if (errorText.includes("tokio-runtime-worker") && errorText.includes("Cannot start a runtime from within a runtime")) {
      return "There's an internal error with the async process. This is likely a temporary issue with command execution.";
    }
    
    if (errorText.includes("Command failed")) {
      return "A CLI command failed during project generation. Check that you have the required tools installed.";
    }
    
    if (errorText.includes("EACCES") || errorText.includes("permission denied")) {
      return "Permission error: Make sure the selected folder is writable.";
    }
    
    if (errorText.includes("ENOENT") || errorText.includes("no such file or directory")) {
      return "File not found: The project path or a required file couldn't be accessed.";
    }
    
    return errorText;
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-error/10 border border-error/20 text-error rounded-lg animate-pulse">
          <h3 className="font-bold mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Generation Error
          </h3>
          <p className="mb-2">{getFriendlyErrorMessage(error)}</p>
          
          {/* Show/hide technical details */}
          <div className="mt-2 flex flex-col space-y-2">
            <button 
              onClick={() => setShowDebugInfo(!showDebugInfo)} 
              className="btn btn-xs btn-outline btn-error"
            >
              {showDebugInfo ? "Hide Technical Details" : "Show Technical Details"}
            </button>
            
            {showDebugInfo && (
              <div className="bg-base-300 text-xs p-2 rounded overflow-x-auto">
                <pre>{error}</pre>
              </div>
            )}
            
            {onRetry && (
              <button 
                onClick={onRetry} 
                className="btn btn-sm btn-primary mt-2"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
        
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <h3 className="font-bold">Troubleshooting Tips</h3>
            <ul className="list-disc pl-5 text-sm">
              <li>Make sure you have Node.js installed</li>
              <li>Check your internet connection</li>
              <li>Verify you have write permissions to the selected folder</li>
              <li>Try restarting the application</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!progress && !isComplete) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-full"></div>
        <div className="skeleton h-32 w-full"></div>
      </div>
    );
  }

  const progressPercentage = progress?.progress ? progress.progress * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="w-full">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Generation Progress</span>
          <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
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
          progress && progress.message && (
            <div className="flex items-center gap-3 bg-base-200 p-3 rounded-md">
              <div className="loading loading-spinner loading-md text-primary"></div>
              <div>
                <p className="font-medium">{progress.message}</p>
                <p className="text-sm opacity-70">Step {steps.length} of 7</p>
              </div>
            </div>
          )
        )}

        <ul className="steps steps-vertical">
          {['init', 'framework', 'create', 'structure', 'dependencies', 'modules', 'complete'].map((step, index) => (
            <li 
              key={step} 
              className={`step ${steps.includes(step) ? 'step-primary' : ''}`}
              data-content={steps.includes(step) ? '✓' : (index + 1)}
            >
              <div className="ml-2">
                {step === 'init' && 'Initializing project'}
                {step === 'framework' && 'Loading CLI tool'}
                {step === 'create' && 'Running CLI command'}
                {step === 'structure' && 'Setting up directory structure'}
                {step === 'dependencies' && 'Resolving dependencies'}
                {step === 'modules' && 'Installing modules'}
                {step === 'complete' && 'Project ready'}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 