"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The width of the skeleton
   */
  width?: string | number;
  /**
   * The height of the skeleton
   */
  height?: string | number;
  /**
   * If true, makes the skeleton rounded
   */
  rounded?: boolean;
  /**
   * If true, makes the skeleton fully rounded (circle)
   */
  circle?: boolean;
  /**
   * If true, adds a shimmering effect
   */
  animate?: boolean;
  /**
   * If provided, renders multiple skeleton items
   */
  count?: number;
  /**
   * If true, renders a text-like skeleton with multiple lines
   */
  text?: boolean;
  /**
   * Number of lines to render if text is true
   */
  lines?: number;
  /**
   * Last line width percentage if text is true
   */
  lastLineWidth?: number;
  /**
   * If true, disables responsive behavior
   */
  noResponsive?: boolean;
}

export function Skeleton({
  className,
  width,
  height,
  rounded = true,
  circle = false,
  animate = true,
  count = 1,
  text = false,
  lines = 3,
  lastLineWidth = 70,
  noResponsive = false,
  style: propStyle,
  ...props
}: SkeletonProps) {
  const style = {
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    ...propStyle
  };

  const baseClasses = cn(
    "bg-base-300",
    rounded && !circle && "rounded",
    circle && "rounded-full",
    animate && "animate-pulse",
    !noResponsive && "transition-all duration-300",
    className
  );

  if (text) {
    return (
      <div {...props}>
        {Array.from({ length: lines }).map((_, index) => {
          const isLastLine = index === lines - 1;
          const lineStyle = isLastLine 
            ? { ...style, width: `${lastLineWidth}%` }
            : style;
          
          return (
            <div
              key={index}
              className={cn(baseClasses, "h-4 mb-2")}
              style={lineStyle}
            />
          );
        })}
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={baseClasses}
          style={style}
          {...props}
        />
      ))}
    </>
  );
}

/**
 * Skeleton for cards with a consistent layout
 */
export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card bg-base-200 shadow-sm", className)} {...props}>
      <div className="card-body">
        <Skeleton height={24} className="w-1/2 mb-4" />
        <Skeleton text lines={2} />
        <div className="card-actions justify-end mt-4">
          <Skeleton width={80} height={32} className="rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for table with customizable rows and columns
 */
export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  hasHeader = true,
  className,
  ...props
}: { 
  rows?: number; 
  columns?: number; 
  hasHeader?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-x-auto w-full", className)} {...props}>
      <table className="table w-full">
        {hasHeader && (
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={`header-${index}`}>
                  <Skeleton height={20} width={index === 0 ? 120 : 80} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="hover">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={`cell-${rowIndex}-${colIndex}`}>
                  <Skeleton 
                    height={16} 
                    width={colIndex === 0 ? 150 : colIndex === columns - 1 ? 60 : 100}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton for grid layouts (cards, images, etc.)
 */
export function SkeletonGrid({
  items = 6,
  columns = 3,
  gap = 4,
  itemHeight = 200,
  className,
  ...props
}: {
  items?: number;
  columns?: number;
  gap?: number;
  itemHeight?: number;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "grid w-full",
        `grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(columns, 12)}`,
        `gap-${gap}`,
        className
      )}
      {...props}
    >
      {Array.from({ length: items }).map((_, index) => (
        <Skeleton 
          key={`grid-item-${index}`}
          height={itemHeight}
          className="w-full"
        />
      ))}
    </div>
  );
}

export default Object.assign(Skeleton, {
  Card: SkeletonCard,
  Table: SkeletonTable,
  Grid: SkeletonGrid,
}); 