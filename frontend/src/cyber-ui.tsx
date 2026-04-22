import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ButtonVariant = 'primary' | 'danger' | 'warning' | 'success' | 'ghost';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-mono text-xs sm:text-sm font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      primary: "bg-primary/10 text-primary border-primary/50 hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_10px_hsla(var(--primary)/0.5)]",
      danger: "bg-destructive/10 text-destructive border-destructive/50 hover:bg-destructive/20 hover:border-destructive",
      warning: "bg-warning/10 text-warning border-warning/50 hover:bg-warning/20 hover:border-warning",
      success: "bg-success/10 text-success border-success/50 hover:bg-success/20 hover:border-success",
      ghost: "bg-transparent text-muted-foreground border-transparent hover:bg-white/5 hover:text-foreground",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  }
);
CyberButton.displayName = 'CyberButton';

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

interface CyberBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const CyberBadge = React.forwardRef<HTMLSpanElement, CyberBadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    const baseStyles = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider border";
    
    const variants = {
      neutral: "bg-border/50 text-muted-foreground border-border",
      primary: "bg-primary/10 text-primary border-primary/30",
      success: "bg-success/10 text-success border-success/30",
      warning: "bg-warning/10 text-warning border-warning/30",
      danger: "bg-destructive/10 text-destructive border-destructive/30",
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  }
);
CyberBadge.displayName = 'CyberBadge';
