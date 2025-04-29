"use client";

import { useFormContext } from "react-hook-form";
import FormField from "./FormField";

interface FormInputProps {
  name: string;
  label?: string;
  helperText?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * A form input component that integrates with React Hook Form
 * Provides consistent styling and error handling
 */
export default function FormInput({
  name,
  label,
  helperText,
  type = "text",
  placeholder,
  disabled = false,
  required = false,
  className = "",
}: FormInputProps) {
  const { register } = useFormContext();

  return (
    <FormField name={name} label={label} helperText={helperText}>
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`input input-bordered w-full ${className}`}
        {...register(name)}
      />
    </FormField>
  );
} 