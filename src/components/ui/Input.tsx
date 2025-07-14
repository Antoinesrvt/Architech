"use client";

import { cn } from "@/lib/utils/cn";
import type React from "react";
import { forwardRef } from "react";

export type InputSize = "xs" | "sm" | "md" | "lg";
export type InputVariant = "default" | "bordered" | "ghost" | "unstyled";
export type InputStatus = "success" | "error" | "warning" | "info";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /**
   * Input size
   */
  size?: InputSize;
  /**
   * Input variant
   */
  variant?: InputVariant;
  /**
   * Input status for validation feedback
   */
  status?: InputStatus;
  /**
   * Left icon or element
   */
  leftElement?: React.ReactNode;
  /**
   * Right icon or element
   */
  rightElement?: React.ReactNode;
  /**
   * Show loading indicator
   */
  isLoading?: boolean;
  /**
   * Full width input
   */
  fullWidth?: boolean;
  /**
   * Makes left/right elements appear inside the input
   */
  elementsInside?: boolean;
  /**
   * Error message to display
   */
  errorMessage?: string;
  /**
   * Help text below the input
   */
  helpText?: string;
  /**
   * Custom wrapper className
   */
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size = "md",
      variant = "bordered",
      status,
      leftElement,
      rightElement,
      isLoading = false,
      fullWidth = false,
      elementsInside = true,
      errorMessage,
      helpText,
      disabled = false,
      wrapperClassName,
      ...props
    },
    ref,
  ) => {
    // Base classes
    const baseClasses =
      "input focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary";

    // Size classes
    const sizeClasses = size !== "md" ? `input-${size}` : "";

    // Variant classes
    const variantClasses = variant !== "default" ? `input-${variant}` : "";

    // Status classes
    const statusClasses = status ? `input-${status}` : "";

    // Width classes
    const widthClasses = fullWidth ? "w-full" : "";

    // Disabled state
    const disabledClasses = disabled ? "opacity-70 cursor-not-allowed" : "";

    // Combine all classes
    const inputClasses = cn(
      baseClasses,
      sizeClasses,
      variantClasses,
      statusClasses,
      widthClasses,
      disabledClasses,
      className,
    );

    // Container classes
    const containerClasses = cn(
      "relative",
      fullWidth ? "w-full" : "",
      wrapperClassName,
    );

    // Calculate padding classes for elements inside
    const getElementPaddingClasses = () => {
      if (!elementsInside) return "";
      const classes: string[] = [];
      if (leftElement) classes.push("pl-10");
      if (rightElement) classes.push("pr-10");
      return cn(...classes);
    };

    const elementPaddingClasses = getElementPaddingClasses();

    // Position classes for left/right elements
    const leftElementClasses = cn(
      "absolute left-0 top-1/2 transform -translate-y-1/2 flex items-center justify-center",
      elementsInside ? "pl-3" : "left-0 -ml-10",
    );

    const rightElementClasses = cn(
      "absolute right-0 top-1/2 transform -translate-y-1/2 flex items-center justify-center",
      elementsInside ? "pr-3" : "right-0 -mr-10",
    );

    return (
      <div className={containerClasses}>
        {leftElement && <div className={leftElementClasses}>{leftElement}</div>}

        <input
          ref={ref}
          className={cn(inputClasses, elementPaddingClasses)}
          disabled={disabled || isLoading}
          {...props}
        />

        {(rightElement || isLoading) && (
          <div className={rightElementClasses}>
            {isLoading ? (
              <div className="loading loading-spinner loading-xs" />
            ) : (
              rightElement
            )}
          </div>
        )}

        {(errorMessage || helpText) && (
          <div className="mt-1 text-xs">
            {errorMessage && <p className="text-error">{errorMessage}</p>}
            {helpText && !errorMessage && (
              <p className="text-base-content/70">{helpText}</p>
            )}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
