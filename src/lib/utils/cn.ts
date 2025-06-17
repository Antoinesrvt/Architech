import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for combining class names with Tailwind CSS conflict resolution.
 * 
 * This function combines clsx for conditional class names and tailwind-merge
 * for resolving Tailwind CSS class conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}