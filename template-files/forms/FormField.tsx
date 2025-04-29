"use client";

import { ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";

interface FormFieldProps {
  name: string;
  children: ReactNode | (({ field }: { field: any }) => ReactNode);
  label?: string;
  helperText?: string;
}

/**
 * A component that integrates any input with React Hook Form
 * Provides consistent styling and error handling
 */
export default function FormField({
  name,
  children,
  label,
  helperText,
}: FormFieldProps) {
  const { control, formState: { errors } } = useFormContext();
  const errorMessage = errors[name]?.message as string | undefined;

  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}

      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          return typeof children === "function"
            ? children({ field })
            : children;
        }}
      />

      <div className="min-h-6 mt-1">
        {errorMessage ? (
          <p className="text-sm text-error">{errorMessage}</p>
        ) : helperText ? (
          <p className="text-sm text-base-content/60">{helperText}</p>
        ) : null}
      </div>
    </div>
  );
} 