"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import Skeleton from "./Skeleton";

export type CardSkeletonType = "basic" | "feature" | "project" | "module" | "framework" | "image" | "pricing";

export interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Type of card skeleton to render
   */
  type?: CardSkeletonType;
  /**
   * Whether to show a title
   */
  showTitle?: boolean;
  /**
   * Whether to show an image placeholder
   */
  showImage?: boolean;
  /**
   * Whether to show action buttons
   */
  showActions?: boolean;
  /**
   * Whether the card should have a border
   */
  bordered?: boolean;
  /**
   * Number of lines in the content
   */
  contentLines?: number;
  /**
   * Number of action buttons
   */
  actionCount?: number;
  /**
   * Whether to add hover effect to the card
   */
  hover?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  type = "basic",
  showTitle = true,
  showImage = false,
  showActions = true,
  bordered = true,
  contentLines = 2,
  actionCount = 2,
  hover = false,
  className,
  ...props
}) => {
  // Adjust properties based on card type
  switch (type) {
    case "feature":
      showImage = true;
      contentLines = 3;
      break;
    case "project":
      showTitle = true;
      contentLines = 1;
      actionCount = 2;
      break;
    case "module":
    case "framework":
      showTitle = true;
      contentLines = 2;
      actionCount = 0;
      break;
    case "image":
      showImage = true;
      contentLines = 1;
      break;
    case "pricing":
      showTitle = true;
      contentLines = 4;
      actionCount = 1;
      break;
    default:
      break;
  }

  const cardClasses = cn(
    "card",
    bordered ? "border border-base-300" : "",
    hover ? "hover:shadow-md transition-shadow" : "",
    "bg-base-100",
    className
  );

  return (
    <div className={cardClasses} {...props}>
      {showImage && (
        <figure>
          <Skeleton height={type === "feature" ? 100 : 200} className="w-full rounded-t-xl rounded-b-none" />
        </figure>
      )}
      <div className="card-body">
        {showTitle && (
          <Skeleton 
            height={type === "pricing" ? 30 : 24} 
            width={type === "pricing" ? "100%" : "60%"} 
            className="mb-2" 
          />
        )}
        
        {type === "framework" || type === "module" ? (
          <>
            <Skeleton text lines={contentLines} />
            <div className="flex flex-wrap gap-1 mt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton 
                  key={`tag-${i}`} 
                  height={20} 
                  width={60 + (i * 10)} 
                  className="rounded-full" 
                />
              ))}
            </div>
            <Skeleton height={30} className="w-full mt-2 rounded-md" />
          </>
        ) : type === "pricing" ? (
          <>
            <Skeleton height={40} width="70%" className="mb-4" />
            {Array.from({ length: contentLines }).map((_, i) => (
              <div key={`feature-${i}`} className="flex items-center gap-2 mb-2">
                <Skeleton width={20} height={20} circle />
                <Skeleton height={16} className="flex-1" />
              </div>
            ))}
          </>
        ) : (
          <Skeleton text lines={contentLines} lastLineWidth={type === "project" ? 100 : 70} />
        )}
        
        {showActions && (
          <div className={cn("card-actions", actionCount > 1 ? "justify-between" : "justify-end", "mt-4")}>
            {Array.from({ length: actionCount }).map((_, i) => (
              <Skeleton 
                key={`action-${i}`} 
                height={36} 
                width={i === 0 && actionCount > 1 ? 80 : 100} 
                className="rounded-lg" 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardSkeleton; 