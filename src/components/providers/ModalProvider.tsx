"use client";

import { ConfirmModal } from "@/components/ui";
import {
  getModalState,
  handleModalCancel,
  handleModalConfirm,
  subscribeToModalState,
} from "@/lib/utils/dialog";
import type React from "react";
import { useEffect, useState } from "react";

/**
 * Global modal provider that handles UI modals triggered by dialog utilities
 * This should be placed at the root of your app to handle modals globally
 */
export const ModalProvider: React.FC = () => {
  const [modalState, setModalState] = useState(getModalState());

  useEffect(() => {
    const unsubscribe = subscribeToModalState(setModalState);
    return unsubscribe;
  }, []);

  if (!modalState.config) {
    return null;
  }

  return (
    <ConfirmModal
      isOpen={modalState.isOpen}
      onClose={handleModalCancel}
      onConfirm={handleModalConfirm}
      title={modalState.config.title}
      message={modalState.config.message}
      confirmText={modalState.config.confirmText}
      cancelText={modalState.config.cancelText}
      variant={modalState.config.variant}
    />
  );
};

export default ModalProvider;
