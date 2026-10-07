import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-primary border-t-transparent',
          sizes[size]
        )}
      />
    </div>
  );
};

export const FullScreenLoading: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="fixed inset-0 app-page-bg flex flex-col items-center justify-center z-50">
      <Loading size="lg" />
      {message && <p className="mt-4 text-text-secondary">{message}</p>}
    </div>
  );
};
