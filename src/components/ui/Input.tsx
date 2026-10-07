import React, { useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className, ...props }) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  return (
    <div className="min-w-0 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-hint shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all',
            icon && 'pl-10',
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
          id={inputId}
          aria-invalid={error ? true : props['aria-invalid']}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, ...props }) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  return (
    <div className="min-w-0 w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-hint shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all resize-none',
          error && 'border-error focus:ring-error',
          className
        )}
        {...props}
        id={inputId}
        aria-invalid={error ? true : props['aria-invalid']}
      />
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
};
