'use client';
import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}
export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children, title, className }) => (
  <RadixDialog.Root open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/50" />
      <RadixDialog.Content aria-describedby={undefined} className={cn('fixed top-1/2 left-1/2 z-[61] -translate-x-1/2 -translate-y-1/2 flex flex-col min-w-0 bg-surface rounded-2xl border border-primary/25 shadow-2xl max-w-md w-[calc(100%_-_1.5rem)] max-h-[calc(100dvh-3rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-hidden', className)}>
        {title ? (
          <div className="flex shrink-0 items-center justify-between gap-3 p-4 border-b border-border">
            <RadixDialog.Title asChild><h2 className="text-lg font-semibold text-text-primary">{title}</h2></RadixDialog.Title>
            <RadixDialog.Close asChild><button type="button" aria-label="Close dialog" className="shrink-0 p-2 rounded-lg border border-primary/25 bg-primary-light/45 text-text-primary hover:bg-primary-light"><X className="w-5 h-5" /></button></RadixDialog.Close>
          </div>
        ) : <RadixDialog.Title className="sr-only">Dialog</RadixDialog.Title>}
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);
