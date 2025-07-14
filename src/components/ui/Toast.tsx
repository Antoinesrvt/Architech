"use client";

import { cn } from "@/lib/utils/cn";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

// Toast types
export type ToastType = "info" | "success" | "warning" | "error";

// Toast position
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

// Toast item interface
export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast context interface
interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
  position: ToastPosition;
  setPosition: (position: ToastPosition) => void;
}

// Create context
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Toast provider props
interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export function ToastProvider({
  children,
  position = "bottom-right",
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [currentPosition, setCurrentPosition] =
    useState<ToastPosition>(position);
  const [isMounted, setIsMounted] = useState(false);

  // Handle mounting to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Add a new toast
  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = {
        ...toast,
        id,
        duration: toast.duration || 5000,
      };

      setToasts((prev) => {
        const nextToasts = [newToast, ...prev];
        // Limit the number of toasts
        return nextToasts.slice(0, maxToasts);
      });

      // Auto-remove toast after duration
      if (newToast.duration !== Number.POSITIVE_INFINITY) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [maxToasts],
  );

  // Remove a toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Values for context
  const contextValue: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    position: currentPosition,
    setPosition: setCurrentPosition,
  };

  // Get position classes
  const getPositionClasses = (pos: ToastPosition) => {
    switch (pos) {
      case "top-left":
        return "top-4 left-4";
      case "top-center":
        return "top-4 left-1/2 -translate-x-1/2";
      case "top-right":
        return "top-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-center":
        return "bottom-4 left-1/2 -translate-x-1/2";
      case "bottom-right":
        return "bottom-4 right-4";
    }
  };

  // Animation classes based on position
  const getAnimationClasses = (pos: ToastPosition) => {
    if (pos.startsWith("top")) {
      return "animate-slideDown";
    }
    return "animate-slideUp";
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {isMounted &&
        createPortal(
          <div
            aria-live="polite"
            className={cn(
              "fixed z-50 flex flex-col gap-2 w-full max-w-sm",
              getPositionClasses(currentPosition),
            )}
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={cn(
                  "alert",
                  toast.type === "info" && "alert-info",
                  toast.type === "success" && "alert-success",
                  toast.type === "warning" && "alert-warning",
                  toast.type === "error" && "alert-error",
                  "shadow-lg opacity-0",
                  getAnimationClasses(currentPosition),
                )}
                role="alert"
              >
                <div className="flex-1">
                  {toast.title && <h3 className="font-bold">{toast.title}</h3>}
                  <div className="text-sm">{toast.message}</div>
                </div>
                <div className="flex-none">
                  {toast.action && (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={toast.action.onClick}
                    >
                      {toast.action.label}
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => removeToast(toast.id)}
                    aria-label="Close toast"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return {
    toast: context.addToast,
    dismissToast: context.removeToast,
    toasts: context.toasts,
    setPosition: context.setPosition,
    position: context.position,
  };
}

// Toast component for direct usage
export function Toast({
  message,
  type = "info",
  duration,
  title,
  action,
  className,
  ...props
}: Omit<ToastItem, "id"> & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "alert",
        type === "info" && "alert-info",
        type === "success" && "alert-success",
        type === "warning" && "alert-warning",
        type === "error" && "alert-error",
        "shadow-lg",
        className,
      )}
      role="alert"
      {...props}
    >
      <div className="flex-1">
        {title && <h3 className="font-bold">{title}</h3>}
        <div className="text-sm">{message}</div>
      </div>
      {action && (
        <div className="flex-none">
          <button className="btn btn-sm btn-ghost" onClick={action.onClick}>
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
