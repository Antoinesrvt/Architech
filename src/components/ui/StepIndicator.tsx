"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface Step {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface StepIndicatorProps {
  /**
   * Array of steps
   */
  steps: Step[];
  /**
   * Current step index
   */
  currentStep: number;
  /**
   * Already visited steps indices
   */
  visitedSteps?: Set<number>;
  /**
   * Optional function to handle clicking on a step
   */
  onStepClick?: (index: number) => void;
  /**
   * Orientation of the step indicator
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Size of step indicator
   */
  size?: "sm" | "md" | "lg";
  /**
   * If true, shows the step titles
   */
  showTitles?: boolean;
  /**
   * If true, shows the step descriptions
   */
  showDescriptions?: boolean;
  /**
   * If true, shows progress line
   */
  showProgressLine?: boolean;
  /**
   * Custom content renderer for step icons
   */
  iconRenderer?: (step: Step, index: number, isActive: boolean, isCompleted: boolean) => React.ReactNode;
  /**
   * Additional CSS class name
   */
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  visitedSteps = new Set(),
  onStepClick,
  orientation = "horizontal",
  size = "md",
  showTitles = true,
  showDescriptions = false,
  showProgressLine = true,
  iconRenderer,
  className,
}) => {
  // Size configuration
  const sizeClasses = {
    sm: {
      container: "gap-3",
      indicator: "w-6 h-6 text-xs",
      title: "text-xs",
      description: "text-xs",
      line: "h-0.5"
    },
    md: {
      container: "gap-4",
      indicator: "w-8 h-8 text-sm",
      title: "text-sm",
      description: "text-xs",
      line: "h-1"
    },
    lg: {
      container: "gap-6",
      indicator: "w-10 h-10 text-base",
      title: "text-base",
      description: "text-sm",
      line: "h-1.5"
    }
  };

  // Calculate progress percentage
  const progressPercentage = ((currentStep) / (steps.length - 1)) * 100;

  // Container classes
  const containerClasses = cn(
    "flex",
    orientation === "horizontal" ? "flex-row" : "flex-col",
    sizeClasses[size].container,
    "w-full relative",
    className
  );

  // Step container classes
  const stepContainerClasses = cn(
    "flex",
    orientation === "horizontal" ? "flex-col items-center" : "flex-row items-center",
    "z-10"
  );

  // Progress line classes
  const progressLineClasses = cn(
    "absolute bg-base-300",
    orientation === "horizontal" 
      ? `left-0 top-${size === "sm" ? "3" : size === "md" ? "4" : "5"} ${sizeClasses[size].line} w-full` 
      : `top-0 left-${size === "sm" ? "3" : size === "md" ? "4" : "5"} w-${sizeClasses[size].line} h-full`,
    "z-0"
  );

  // Progress fill classes
  const progressFillClasses = cn(
    "absolute bg-primary transition-all duration-500 ease-in-out",
    orientation === "horizontal" 
      ? `left-0 top-${size === "sm" ? "3" : size === "md" ? "4" : "5"} ${sizeClasses[size].line}` 
      : `top-0 left-${size === "sm" ? "3" : size === "md" ? "4" : "5"} w-${sizeClasses[size].line}`,
    "z-0"
  );

  return (
    <div className={containerClasses}>
      {/* Background line */}
      {showProgressLine && (
        <div className={progressLineClasses}></div>
      )}

      {/* Progress fill */}
      {showProgressLine && (
        <div 
          className={progressFillClasses} 
          style={{ 
            [orientation === "horizontal" ? "width" : "height"]: `${progressPercentage}%` 
          }}
        ></div>
      )}

      {/* Steps */}
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = visitedSteps.has(index) && index < currentStep;
        const isPending = index > currentStep && !visitedSteps.has(index);
        
        // Step container styles
        const stepStyle = orientation === "horizontal" 
          ? { width: `${100 / steps.length}%` } 
          : {};
        
        // Step indicator classes
        const indicatorClasses = cn(
          "rounded-full flex items-center justify-center transition-all duration-300",
          sizeClasses[size].indicator,
          isCompleted ? "bg-primary text-primary-content" :
          isActive ? "bg-primary text-primary-content animate-pulse" :
          isPending ? "bg-base-300 text-base-content" :
          "bg-base-300 text-base-content",
          onStepClick && visitedSteps.has(index) && "cursor-pointer hover:ring hover:ring-primary/30"
        );
        
        // Title classes
        const titleClasses = cn(
          sizeClasses[size].title,
          "font-medium mt-2",
          orientation === "horizontal" ? "text-center" : "ml-3",
          isActive ? "text-primary" : 
          isCompleted ? "text-base-content" : 
          "text-base-content/70"
        );
        
        // Description classes
        const descriptionClasses = cn(
          sizeClasses[size].description,
          "opacity-70 mt-1",
          orientation === "horizontal" ? "text-center" : "ml-3"
        );

        return (
          <div 
            key={step.id} 
            className={stepContainerClasses}
            style={stepStyle}
          >
            <div 
              className={indicatorClasses}
              onClick={() => {
                if (onStepClick && visitedSteps.has(index)) {
                  onStepClick(index);
                }
              }}
              role={onStepClick && visitedSteps.has(index) ? "button" : undefined}
              tabIndex={onStepClick && visitedSteps.has(index) ? 0 : undefined}
              aria-current={isActive ? "step" : undefined}
            >
              {iconRenderer ? (
                iconRenderer(step, index, isActive, isCompleted)
              ) : (
                isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.icon || (index + 1)
                )
              )}
            </div>
            
            {(showTitles || showDescriptions) && (
              <div className={orientation === "horizontal" ? "text-center" : "ml-3"}>
                {showTitles && (
                  <div className={titleClasses}>{step.title}</div>
                )}
                {showDescriptions && step.description && (
                  <div className={descriptionClasses}>{step.description}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator; 