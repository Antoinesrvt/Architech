import { LocalFrameworkService } from './local';
import { FrameworkService } from './types';

// Export all Node.js command execution utilities
export * from './nodejs';

// Export other API modules as needed
export * from './types';
export * from './local';

// Factory function to get the appropriate service implementation
// based on environment or configuration
export function getFrameworkService(): FrameworkService {
  const frameworkService = new LocalFrameworkService();
  return frameworkService;
}

// Singleton instance for convenience
export const frameworkService = getFrameworkService();

// For backward compatibility
export const getApiService = getFrameworkService; 