import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div className={cn('min-w-0 lb-card-base bg-surface/95 rounded-lg shadow-sm border border-border/70 ring-1 ring-white/25 hover:shadow-md hover:border-primary/45 transition-all duration-200', className)} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className }) => {
  return <div className={cn('p-4', className)}>{children}</div>;
};

export const CardContent: React.FC<CardProps> = ({ children, className }) => {
  return <div className={cn('p-4 pt-0', className)}>{children}</div>;
};

export const CardFooter: React.FC<CardProps> = ({ children, className }) => {
  return <div className={cn('p-4 pt-0 flex items-center', className)}>{children}</div>;
};
