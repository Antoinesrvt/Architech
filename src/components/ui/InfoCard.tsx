"use client";

import { cn } from "@/lib/utils/cn";
import type React from "react";
import Card from "./Card";

export type InfoCardVariant =
  | "default"
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error";

export interface InfoCardProps {
  /**
   * Card title
   */
  title: React.ReactNode;
  /**
   * Card description or content
   */
  description?: React.ReactNode;
  /**
   * Card icon
   */
  icon?: React.ReactNode;
  /**
   * Additional content to show in the card
   */
  children?: React.ReactNode;
  /**
   * Card actions
   */
  actions?: React.ReactNode;
  /**
   * Card variant
   */
  variant?: InfoCardVariant;
  /**
   * If true, makes the card more compact
   */
  compact?: boolean;
  /**
   * If true, card will have a hover effect
   */
  hover?: boolean;
  /**
   * If true, adds a border to the card
   */
  bordered?: boolean;
  /**
   * If true, adds a shadow to the card
   */
  withShadow?: boolean;
  /**
   * Additional classes for the card
   */
  className?: string;
  /**
   * If provided, makes the entire card a link
   */
  href?: string;
  /**
   * If true, renders content in a horizontal layout
   */
  horizontal?: boolean;
  /**
   * Additional HTML attributes
   */
  [x: string]: any;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  icon,
  children,
  actions,
  variant = "default",
  compact = false,
  hover = true,
  bordered = true,
  withShadow = true,
  className,
  href,
  horizontal = false,
  ...props
}) => {
  // Get variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-primary/10 border-primary/30 text-primary-content";
      case "secondary":
        return "bg-secondary/10 border-secondary/30 text-secondary-content";
      case "accent":
        return "bg-accent/10 border-accent/30 text-accent-content";
      case "info":
        return "bg-info/10 border-info/30 text-info-content";
      case "success":
        return "bg-success/10 border-success/30 text-success-content";
      case "warning":
        return "bg-warning/10 border-warning/30 text-warning-content";
      case "error":
        return "bg-error/10 border-error/30 text-error-content";
      default:
        return "";
    }
  };

  const cardContent = (
    <>
      <div
        className={cn(
          "flex",
          horizontal ? "flex-row items-center" : "flex-col",
          horizontal && "gap-4",
        )}
      >
        {icon && (
          <div
            className={cn(
              "flex-shrink-0",
              horizontal ? "" : "mb-4",
              variant !== "default" ? `text-${variant}` : "",
            )}
          >
            {icon}
          </div>
        )}
        <div className={cn("flex-1", horizontal && "min-w-0")}>
          <div
            className={cn(
              horizontal ? "flex items-center justify-between" : "",
            )}
          >
            <h3
              className={cn(
                "font-medium",
                compact ? "text-base" : "text-lg",
                variant !== "default" ? `text-${variant}` : "",
              )}
            >
              {title}
            </h3>
            {horizontal && actions && (
              <div className="flex-shrink-0 ml-4">{actions}</div>
            )}
          </div>
          {description && (
            <div
              className={cn(
                "mt-1",
                compact ? "text-sm" : "text-base",
                "opacity-80",
              )}
            >
              {description}
            </div>
          )}
          {children && (
            <div className={cn("mt-3", compact ? "text-sm" : "")}>
              {children}
            </div>
          )}
        </div>
      </div>

      {!horizontal && actions && (
        <div className={cn("mt-4", "card-actions", "justify-end")}>
          {actions}
        </div>
      )}
    </>
  );

  const cardClasses = cn(
    variant !== "default" && getVariantClasses(),
    className,
  );

  if (href) {
    return (
      <Card
        interactive
        bordered={bordered}
        withShadow={withShadow}
        hoverLift={hover}
        className={cardClasses}
        onClick={() => (window.location.href = href)}
        {...props}
      >
        <Card.Body className={cn(compact ? "p-4" : "")}>
          {cardContent}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card
      interactive={hover}
      bordered={bordered}
      withShadow={withShadow}
      hoverLift={hover}
      className={cardClasses}
      {...props}
    >
      <Card.Body className={cn(compact ? "p-4" : "")}>{cardContent}</Card.Body>
    </Card>
  );
};

export default InfoCard;
