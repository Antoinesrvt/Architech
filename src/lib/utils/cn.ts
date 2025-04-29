/**
 * Utility function for combining class names.
 * 
 * This is a simplified version that doesn't require external dependencies
 * like clsx or tailwind-merge.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
} 