/**
 * Dialog utility functions that work in both Tauri and browser environments
 */

// Detect Tauri environment
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
const tauriDialog = isTauri ? (window as any).__TAURI__.dialog : null;

/**
 * Show a confirmation dialog
 * @param message The message to display
 * @param options Configuration options for the dialog
 * @returns A promise that resolves to true if confirmed, false otherwise
 */
export async function confirmDialog(
  message: string, 
  options: { 
    title?: string; 
    type?: 'info' | 'warning' | 'error'; 
  } = {}
): Promise<boolean> {
  try {
    if (tauriDialog) {
      // Use Tauri dialog API
      return await tauriDialog.confirm(message, {
        title: options.title || 'Confirm',
        type: options.type || 'warning'
      });
    } else {
      // Fallback to browser confirm
      return window.confirm(message);
    }
  } catch (error) {
    console.error('Dialog error:', error);
    // Last resort fallback
    return window.confirm(message);
  }
}

/**
 * Show a message dialog
 * @param message The message to display
 * @param options Configuration options for the dialog
 */
export async function messageDialog(
  message: string, 
  options: { 
    title?: string; 
    type?: 'info' | 'warning' | 'error'; 
  } = {}
): Promise<void> {
  try {
    if (tauriDialog) {
      // Use Tauri dialog API
      await tauriDialog.message(message, {
        title: options.title || 'Message',
        type: options.type || 'info'
      });
    } else {
      // Fallback to browser alert
      window.alert(message);
    }
  } catch (error) {
    console.error('Dialog error:', error);
    // Last resort fallback
    window.alert(message);
  }
}

/**
 * Ask the user for input
 * @param message The message to display
 * @param options Configuration options for the dialog
 * @returns A promise that resolves to the user's input or null if cancelled
 */
export async function promptDialog(
  message: string, 
  options: { 
    title?: string; 
    defaultValue?: string;
    type?: 'info' | 'warning' | 'error';
  } = {}
): Promise<string | null> {
  try {
    if (tauriDialog) {
      // Use Tauri dialog API
      const result = await tauriDialog.ask(message, {
        title: options.title || 'Input',
        type: options.type || 'info',
        ...(options.defaultValue ? { defaultValue: options.defaultValue } : {})
      });
      return result;
    } else {
      // Fallback to browser prompt
      return window.prompt(message, options.defaultValue || '');
    }
  } catch (error) {
    console.error('Dialog error:', error);
    // Last resort fallback
    return window.prompt(message, options.defaultValue || '');
  }
} 