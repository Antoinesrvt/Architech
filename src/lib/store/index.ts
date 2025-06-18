export * from './framework-store-sqlite';
export * from './project-store-sqlite';
export * from './settings-store-tauri';

// For backward compatibility - alias useFrameworkStore as useTemplateStore
import { useFrameworkStore } from './framework-store-sqlite';
export { useFrameworkStore as useTemplateStore };