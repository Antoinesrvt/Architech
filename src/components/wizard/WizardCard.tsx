"use client";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

export interface WizardCardProps {
  /** Title of the current step */
  title: string;
  /** Content to display in the card */
  children: ReactNode;
  /** Description text for the current step */
  description?: string;
  /** Whether to enable the previous button */
  canGoPrevious?: boolean;
  /** Whether to enable the next button */
  canGoNext?: boolean;
  /** Function to handle going to the previous step */
  onPrevious?: () => void;
  /** Function to handle going to the next step */
  onNext?: () => void;
  /** Function to call when user confirms going back to dashboard */
  onBackToDashboard?: () => void;
  /** Text to display on the next button */
  nextButtonText?: string;
  /** Text to display on the previous button */
  previousButtonText?: string;
  /** Whether the form within the step is valid */
  isFormValid?: boolean;
  /** Whether the step is currently loading data */
  isLoading?: boolean;
  /** Last saved time information */
  lastSavedTime?: Date | null;
  /** Whether the content has unsaved changes */
  hasChanges?: boolean;
  /** Function to call when user wants to save manually */
  onSave?: () => void;
  /** Current step number */
  stepNumber?: number;
  /** Total number of steps */
  totalSteps?: number;
}

/**
 * WizardCard - A reusable component for wizard steps with navigation and save status
 */
export default function WizardCard({
  title,
  children,
  description,
  canGoPrevious = false,
  canGoNext = true,
  onPrevious,
  onNext,
  onBackToDashboard,
  nextButtonText = "Next",
  previousButtonText = "Previous",
  isFormValid = true,
  isLoading = false,
  lastSavedTime = null,
  hasChanges = false,
  onSave,
  stepNumber,
  totalSteps,
}: WizardCardProps) {
  const [showBackOptions, setShowBackOptions] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Format last saved time
  const getLastSavedText = () => {
    if (!lastSavedTime) return "Not saved yet";

    const now = new Date();
    const diffMs = now.getTime() - lastSavedTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return "Saved just now";
    }
    if (diffMinutes === 1) {
      return "Saved 1 minute ago";
    }
    if (diffMinutes < 60) {
      return `Saved ${diffMinutes} minutes ago`;
    }
    const hours = Math.floor(diffMinutes / 60);
    return `Saved ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  };

  // Handle back navigation
  const handleBackClick = () => {
    setShowBackOptions(!showBackOptions);
  };

  // Handle going to previous step
  const handleGoToPreviousStep = () => {
    setShowBackOptions(false);
    if (onPrevious) {
      onPrevious();
    }
  };

  // Handle going back to dashboard
  const handleBackToDashboard = () => {
    setShowBackOptions(false);
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      router.push("/");
    }
  };

  // Handle manual save
  const handleSave = () => {
    if (onSave) {
      onSave();
      toast({
        type: "success",
        message: "Changes saved",
      });
    }
  };

  return (
    <Card withShadow className="animate-fadeIn overflow-hidden relative">
      {/* Header with title, step indicator, and save status */}
      <div className="flex items-center justify-between p-4 border-b border-base-200">
        <div className="flex items-center">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="mr-2"
              onClick={handleBackClick}
              leftIcon={
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
              }
            />

            {/* Back navigation dropdown */}
            {showBackOptions && (
              <div className="absolute top-full left-0 mt-1 bg-base-100 rounded-lg shadow-lg border border-base-300 w-60 z-50 animate-fadeIn">
                <ul className="menu menu-compact p-2">
                  {canGoPrevious && (
                    <li>
                      <button
                        className="flex items-center"
                        onClick={handleGoToPreviousStep}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                        Previous Step
                      </button>
                    </li>
                  )}
                  <li>
                    <button
                      className="flex items-center"
                      onClick={handleBackToDashboard}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                      Back to Dashboard
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold">{title}</h2>
        </div>

        <div className="flex items-center">
          {stepNumber !== undefined && totalSteps !== undefined && (
            <div className="badge badge-neutral mr-2">
              Step {stepNumber} of {totalSteps}
            </div>
          )}

          {hasChanges && (
            <div className="text-xs opacity-70 animate-fadeIn flex items-center">
              <div
                className={cn(
                  "w-2 h-2 rounded-full mr-1",
                  lastSavedTime ? "bg-success" : "bg-warning animate-pulse",
                )}
              />
              {getLastSavedText()}
              {onSave && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="ml-2 h-6"
                  onClick={handleSave}
                >
                  Save
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <Card.Body className="p-6">
        {description && (
          <p className="text-base-content/70 mb-4">{description}</p>
        )}

        <div className="animate-fadeIn">{children}</div>
      </Card.Body>

      {/* Footer with navigation buttons */}
      <div className="flex justify-between p-4 border-t border-base-200 bg-base-100">
        <Button
          variant={canGoPrevious ? "outline" : "ghost"}
          onClick={onPrevious}
          disabled={!canGoPrevious}
          leftIcon={
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          }
        >
          {previousButtonText}
        </Button>

        <Button
          variant="primary"
          onClick={onNext}
          disabled={!canGoNext || !isFormValid || isLoading}
          className={
            isFormValid && canGoNext && !isLoading ? "animate-pulse-slow" : ""
          }
          isLoading={isLoading}
          rightIcon={
            !isLoading && (
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )
          }
        >
          {nextButtonText}
        </Button>
      </div>
    </Card>
  );
}
