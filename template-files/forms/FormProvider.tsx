"use client";

import { ReactNode } from "react";
import {
  FormProvider as HookFormProvider,
  UseFormReturn,
} from "react-hook-form";

interface FormProviderProps {
  children: ReactNode;
  methods: UseFormReturn<any>;
  onSubmit?: (data: any) => void;
}

/**
 * A wrapper component for React Hook Form's FormProvider
 * Makes it easier to use forms with consistent styling and behavior
 */
export default function FormProvider({
  children,
  methods,
  onSubmit,
}: FormProviderProps) {
  return (
    <HookFormProvider {...methods}>
      <form
        onSubmit={onSubmit ? methods.handleSubmit(onSubmit) : undefined}
        className="space-y-6"
      >
        {children}
      </form>
    </HookFormProvider>
  );
} 