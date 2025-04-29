import { LocalFrameworkService } from './local';
import { FrameworkService } from './types';

// Factory function to get the appropriate service implementation
// based on environment or configuration
export function getFrameworkService(): FrameworkService {
  // For now, we only have local implementation
  return new LocalFrameworkService();
}

// Singleton instance for convenience
export const frameworkService = getFrameworkService();

// For backward compatibility
export const getApiService = getFrameworkService;

export * from './types'; 