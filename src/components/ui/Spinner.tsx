"use client";

import { cn } from "@/lib/utils/cn";
import type React from "react";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpinnerColor =
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "neutral";

export interface SpinnerProps {
  /**
   * Size of the spinner
   * @default "md"
   */
  size?: SpinnerSize;
  /**
   * Color of the spinner
   * @default "primary"
   */
  color?: SpinnerColor;
  /**
   * Additional classes for the spinner
   */
  className?: string;
  /**
   * Custom label for screen readers
   * @default "Loading"
   */
  label?: string;
  /**
   * If true, display label next to spinner
   */
  showLabel?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "primary",
  className,
  label = "Loading",
  showLabel = false,
}) => {
  const sizeClasses = {
    xs: "loading-xs",
    sm: "loading-sm",
    md: "loading-md",
    lg: "loading-lg",
    xl: "loading-xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "loading loading-spinner",
          sizeClasses[size],
          `text-${color}`,
        )}
        role="status"
        aria-label={showLabel ? undefined : label}
      />
      {showLabel && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
};

export default Spinner;
