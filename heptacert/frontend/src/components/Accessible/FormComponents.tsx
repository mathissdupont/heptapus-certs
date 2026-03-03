'use client';

import { ReactNode } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

export function FormField({
  label,
  error,
  required = false,
  children,
  hint,
}: FormFieldProps) {
  const errorId = `${label}-error`;
  const hintId = `${label}-hint`;

  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-600 dark:text-red-400 ml-1" aria-label="required">*</span>}
      </label>

      <div className="relative">
        {/* Clone the child and add accessibility attributes */}
        {(children as any)?.type ? (
          // For form elements
          <>
            {children}
          </>
        ) : (
          children
        )}
      </div>

      {hint && (
        <p id={hintId} className="text-sm text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}

      {error && (
        <div
          id={errorId}
          className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}

export function FormContainer({
  children,
  onSubmit,
  ariaLabel = 'Form',
}: {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  ariaLabel?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-label={ariaLabel}
      noValidate
    >
      {children}
    </form>
  );
}

export function SuccessMessage({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900"
      role="status"
      aria-live="polite"
    >
      <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-hidden="true" />
      <span className="text-emerald-800 dark:text-emerald-200 flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded px-2 py-1"
          aria-label="Dismiss message"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function ErrorMessage({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" aria-hidden="true" />
      <span className="text-red-800 dark:text-red-200 flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  );
}
