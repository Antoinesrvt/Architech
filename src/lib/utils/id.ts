/**
 * Generate a random UUID v4
 * @returns A random UUID string
 */
export function generateUUID(): string {
  // This is a simplified UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a unique ID with an optional prefix
 * @param prefix Optional prefix for the ID
 * @returns A unique ID string
 */
export function generateId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
} 