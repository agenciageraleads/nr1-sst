import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export function Logo({ className, showText = true, variant = 'dark' }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10 flex-shrink-0">
        <img 
          src="/logo-symbol.png" 
          alt="Ventura TC Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            "font-black tracking-tighter leading-none text-xl uppercase italic",
            variant === 'dark' ? "text-slate-900" : "text-white"
          )}>
            VENTURA <span className={variant === 'dark' ? "text-brand-600" : "text-brand-400"}>TC</span>
          </span>
          <span className={cn(
            "text-[8px] font-black uppercase tracking-[0.2em] leading-none mt-0.5",
            variant === 'dark' ? "text-slate-500" : "text-white/60"
          )}>
            Treinamentos e Consultoria
          </span>
        </div>
      )}
    </div>
  );
}
