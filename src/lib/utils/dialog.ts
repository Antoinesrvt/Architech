"use client";

import { isTauri } from "@tauri-apps/api/core";
import {
  confirm as tauriConfirm,
  message as tauriMessage,
} from "@tauri-apps/plugin-dialog";

// Modal state management for UI modals
interface ModalState {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
  config?: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "danger";
  };
};

let modalState: ModalState = { isOpen: false };
let modalStateListeners: Array<(state: ModalState) => void> = [];

// Subscribe to modal state changes
export const subscribeToModalState = (
  listener: (state: ModalState) => void,
) => {
  modalStateListeners.push(listener);
  return () => {
    modalStateListeners = modalStateListeners.filter((l) => l !== listener);
  };
};

// Get current modal state
export const getModalState = () => modalState;

// Update modal state
const updateModalState = (newState: Partial<ModalState>) => {
  modalState = { ...modalState, ...newState };
  modalStateListeners.forEach((listener) => {
    listener(modalState);
  });
};

/**
 * Show a confirmation dialog using UI modal (preferred) or Tauri dialog (fallback)
 */
export async function confirmDialog(
  message: string,
  options: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "danger";
    useNativeDialog?: boolean;
  } = {},
): Promise<boolean> {
  const {
    title = "Confirm",
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default",
    useNativeDialog = false,
  } = options;

  // Use native Tauri dialog if explicitly requested or if not in browser
  if (useNativeDialog || (isTauri() && typeof window === "undefined")) {
    try {
      return await tauriConfirm(message, {
        title,
        kind: variant === "danger" ? "warning" : "info",
      });
    } catch (error) {
      console.error("Tauri dialog error:", error);
      // Fallback to browser confirm
      return window.confirm(`${title}\n\n${message}`);
    }
  }

  // Use UI modal (preferred method)
  return new Promise<boolean>((resolve) => {
    updateModalState({
      isOpen: true,
      resolve,
      config: {
        title,
        message,
        confirmText,
        cancelText,
        variant,
      },
    });
  });
}

/**
 * Handle modal confirmation
 */
export const handleModalConfirm = () => {
  if (modalState.resolve) {
    modalState.resolve(true);
  }
  updateModalState({ isOpen: false, resolve: undefined, config: undefined });
};

/**
 * Handle modal cancellation
 */
export const handleModalCancel = () => {
  if (modalState.resolve) {
    modalState.resolve(false);
  }
  updateModalState({ isOpen: false, resolve: undefined, config: undefined });
};

/**
 * Show a message dialog using UI toast (preferred) or Tauri dialog (fallback)
 */
export async function messageDialog(
  message: string,
  options: {
    title?: string;
    type?: "info" | "warning" | "error";
    useNativeDialog?: boolean;
  } = {},
): Promise<void> {
  const { title = "Message", type = "info", useNativeDialog = false } = options;

  // Use native Tauri dialog if explicitly requested
  if (useNativeDialog) {
    try {
      await tauriMessage(message, { title, kind: type });
      return;
    } catch (error) {
      console.error("Tauri dialog error:", error);
      // Fallback to browser alert
      window.alert(`${title}\n\n${message}`);
      return;
    }
  }

  // For UI implementation, you would typically use a toast notification
  // This is a simple fallback - in a real app, integrate with your toast system
  if (typeof window !== "undefined") {
    // Try to use toast if available (you can integrate with your toast system here)
    console.info(`${title}: ${message}`);

    // For now, use browser alert as fallback
    window.alert(`${title}\n\n${message}`);
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use confirmDialog instead
 */
export const confirm = confirmDialog;

/**
 * Legacy function for backward compatibility
 * @deprecated Use messageDialog instead
 */
export const message = messageDialog;
