/**
 * Validates a project name
 * @param name The project name to validate
 * @returns An error message if invalid, empty string if valid
 */
export function validateProjectName(name: string): string {
  if (!name || name.trim() === '') {
    return 'Project name is required';
  }
  
  // Check for valid package name (simplified)
  if (!/^[a-z0-9-_]+$/i.test(name)) {
    return 'Project name can only contain letters, numbers, hyphens, and underscores';
  }
  
  return '';
}

/**
 * Validates a project path
 * @param path The project path to validate
 * @returns An error message if invalid, empty string if valid
 */
export function validateProjectPath(path: string): string {
  if (!path || path.trim() === '') {
    return 'Project path is required';
  }
  
  return '';
}

/**
 * Validates if a string is a valid URL
 * @param url The URL to validate
 * @returns True if the string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
} 