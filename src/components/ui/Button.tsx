import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 
    | 'primary' 
    | 'secondary' 
    | 'outline' 
    | 'ghost' 
    | 'danger' 
    | 'accept' 
    | 'reject' 
    | 'login' 
    | 'signup' 
    | 'logout' 
    | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex min-w-0 items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 cursor-pointer select-none';
  
  const variants = {
    primary: 'bg-gradient-to-r from-[#1665D8] to-[#1E60D5] text-white border border-[#1665D8] hover:from-[#1354B5] hover:to-[#164EAB] focus:ring-[#1E60D5] shadow-md hover:shadow-lg shadow-blue-500/20',
    gradient: 'bg-gradient-to-r from-[#38BDF8] via-[#0EA5E9] to-[#2563EB] text-white border-0 hover:brightness-105 focus:ring-[#0EA5E9] shadow-md hover:shadow-lg shadow-sky-500/25 font-extrabold',
    login: 'bg-gradient-to-r from-[#38BDF8] via-[#0284C7] to-[#1D4ED8] text-white border-0 hover:brightness-110 focus:ring-[#0284C7] shadow-lg shadow-sky-500/30 font-extrabold tracking-wide hover:-translate-y-0.5',
    signup: 'bg-gradient-to-r from-[#1E60D5] via-[#2563EB] to-[#4F46E5] text-white border-0 hover:brightness-110 focus:ring-[#2563EB] shadow-lg shadow-blue-500/30 font-extrabold tracking-wide hover:-translate-y-0.5',
    accept: 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-700 focus:ring-emerald-500 shadow-md hover:shadow-lg shadow-emerald-600/30 font-bold ring-2 ring-emerald-400/20 hover:-translate-y-0.5',
    reject: 'bg-red-600 text-white border border-red-500 hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg shadow-red-600/30 font-bold ring-2 ring-red-400/20 hover:-translate-y-0.5',
    logout: 'bg-rose-50 text-rose-700 border-2 border-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-600 focus:ring-rose-500 shadow-sm hover:shadow-md font-bold transition-all',
    secondary: 'bg-white text-[#1665D8] border border-slate-200 hover:bg-blue-50/70 hover:border-blue-300 focus:ring-[#1665D8] shadow-sm hover:shadow font-semibold',
    outline: 'bg-white/90 text-slate-800 border-2 border-slate-200 hover:border-[#1E60D5] hover:text-[#1E60D5] focus:ring-[#1E60D5] shadow-sm font-semibold',
    ghost: 'bg-slate-100/80 text-slate-700 border border-slate-200/60 hover:bg-slate-200/80 focus:ring-slate-400 font-medium',
    danger: 'bg-red-600 text-white border border-red-700 hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg shadow-red-600/25 font-bold',
  };
  
  const sizes = {
    sm: 'min-h-11 px-3 text-xs rounded-lg',
    md: 'h-11 px-4 text-sm rounded-xl',
    lg: 'h-13 px-6 text-base rounded-2xl',
    icon: 'h-11 w-11 shrink-0 p-0 rounded-lg',
  };
  
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};

