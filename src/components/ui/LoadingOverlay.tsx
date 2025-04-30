"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner, SpinnerProps } from "./Spinner";

export interface LoadingOverlayProps {
  /**
   * Whether the overlay is active
   */
  isLoading: boolean;
  /**
   * Content to be displayed under the overlay
   */
  children: React.ReactNode;
  /**
   * Props to pass to the Spinner component
   */
  spinnerProps?: Omit<SpinnerProps, "className">;
  /**
   * Text to show below the spinner
   */
  loadingText?: string;
  /**
   * Additional classes for the overlay
   */
  className?: string;
  /**
   * Blur amount for the content when loading
   * @default "sm"
   */
  blurAmount?: "none" | "sm" | "md" | "lg" | "xl";
  /**
   * Background opacity level
   * @default 70
   */
  bgOpacity?: 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  spinnerProps,
  loadingText,
  className,
  blurAmount = "sm",
  bgOpacity = 70,
}) => {
  const blurClasses = {
    none: "",
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
  };

  return (
    <div className={cn("relative", className)}>
      {children}
      
      {isLoading && (
        <div 
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center z-50",
            `bg-base-100/${bgOpacity}`,
            blurClasses[blurAmount]
          )}
          aria-live="polite"
          aria-busy="true"
        >
          <Spinner {...spinnerProps} />
          {loadingText && (
            <p className="mt-2 text-sm font-medium">{loadingText}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay; 