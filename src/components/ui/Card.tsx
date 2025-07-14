"use client";

import { cn } from "@/lib/utils/cn";
import type React from "react";
import { forwardRef } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * If true, adds hover and active animations
   */
  interactive?: boolean;
  /**
   * If true, adds a subtle border
   */
  bordered?: boolean;
  /**
   * If true, adds a shadow
   */
  withShadow?: boolean;
  /**
   * If true, adds a hover shadow effect (only works with interactive cards)
   */
  hoverShadow?: boolean;
  /**
   * If true, makes the card slightly bigger on hover (only works with interactive cards)
   */
  hoverLift?: boolean;
  /**
   * If true, adds a selected state to the card
   */
  selected?: boolean;
  /**
   * If true, shows the card in a disabled state
   */
  disabled?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      interactive = false,
      bordered = true,
      withShadow = true,
      hoverShadow = true,
      hoverLift = true,
      selected = false,
      disabled = false,
      ...rest
    },
    ref,
  ) => {
    // Base classes
    const baseClasses = "card bg-base-100";

    // Border classes
    const borderClasses = bordered
      ? selected
        ? "border-2 border-primary"
        : "border border-base-300"
      : "";

    // Shadow classes
    const shadowClasses = withShadow ? "shadow-sm" : "";

    // Interactive classes
    const interactiveClasses =
      interactive && !disabled
        ? cn(
            "transition-all duration-300",
            hoverShadow && "hover:shadow-md",
            hoverLift && "hover:translate-y-[-2px]",
            "active:scale-[0.99]",
            "cursor-pointer",
          )
        : "";

    // Selected state classes
    const selectedClasses = selected ? "bg-primary/10" : "";

    // Disabled state classes
    const disabledClasses = disabled ? "opacity-60 cursor-not-allowed" : "";

    // Combine all classes
    const cardClasses = cn(
      baseClasses,
      borderClasses,
      shadowClasses,
      interactiveClasses,
      selectedClasses,
      disabledClasses,
      className,
    );

    return (
      <div className={cardClasses} ref={ref} {...rest}>
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

// Card subcomponents
export const CardBody = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("card-body", className)} {...props}>
    {children}
  </div>
));

CardBody.displayName = "CardBody";

export const CardTitle = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("card-title", className)} {...props}>
    {children}
  </div>
));

CardTitle.displayName = "CardTitle";

export const CardActions = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("card-actions", className)} {...props}>
    {children}
  </div>
));

CardActions.displayName = "CardActions";

export default Object.assign(Card, {
  Body: CardBody,
  Title: CardTitle,
  Actions: CardActions,
});
