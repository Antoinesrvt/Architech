"use client";

import { cn } from "@/lib/utils/cn";
import type React from "react";
import { forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "ghost"
  | "link"
  | "outline";
export type ButtonSize = "xs" | "sm" | "md" | "lg";
export type ButtonShape = "square" | "circle" | "default";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant
   */
  variant?: ButtonVariant;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Button shape
   */
  shape?: ButtonShape;
  /**
   * Loading state
   */
  isLoading?: boolean;
  /**
   * Button with full width
   */
  fullWidth?: boolean;
  /**
   * Button with animation
   */
  withAnimation?: boolean;
  /**
   * Left icon component
   */
  leftIcon?: React.ReactNode;
  /**
   * Right icon component
   */
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      shape = "default",
      isLoading = false,
      disabled = false,
      fullWidth = false,
      withAnimation = true,
      leftIcon,
      rightIcon,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    // Base classes
    const baseClasses = "btn";

    // Variant classes
    const variantClasses = `btn-${variant}`;

    // Size classes
    const sizeClasses = size !== "md" ? `btn-${size}` : "";

    // Shape classes
    const shapeClasses = shape !== "default" ? `btn-${shape}` : "";

    // Loading state
    const loadingClasses = isLoading ? "loading" : "";

    // Width classes
    const widthClasses = fullWidth ? "w-full" : "";

    // Animation classes
    const animationClasses =
      withAnimation && !isLoading && !disabled
        ? "active:scale-[0.98] transition-transform"
        : "";

    // Accessibility improvements
    const a11yClasses = "focus-visible:outline-primary";

    // Combine all classes
    const buttonClasses = cn(
      baseClasses,
      variantClasses,
      sizeClasses,
      shapeClasses,
      loadingClasses,
      widthClasses,
      animationClasses,
      a11yClasses,
      className,
    );

    return (
      <button
        className={buttonClasses}
        ref={ref}
        disabled={disabled || isLoading}
        type={type}
        {...rest}
      >
        {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
