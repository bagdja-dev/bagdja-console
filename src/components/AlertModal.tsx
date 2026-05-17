'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: AlertType;
  autoClose?: number; // ms
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  autoClose,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoClose);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoClose]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 200); // Wait for animation
  };

  if (!isOpen && !isAnimating) return null;

  const config = {
    success: {
      icon: <CheckCircle2 className="h-8 w-8 text-green-400" />,
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      accent: 'bg-green-500',
      defaultTitle: 'Success',
    },
    error: {
      icon: <AlertCircle className="h-8 w-8 text-red-400" />,
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      accent: 'bg-red-500',
      defaultTitle: 'Error',
    },
    warning: {
      icon: <AlertTriangle className="h-8 w-8 text-amber-400" />,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      accent: 'bg-amber-500',
      defaultTitle: 'Warning',
    },
    info: {
      icon: <Info className="h-8 w-8 text-blue-400" />,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      accent: 'bg-blue-500',
      defaultTitle: 'Information',
    },
  }[type];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Accent Top Bar */}
        <div className={`h-1.5 w-full ${config.accent}`} />
        
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            {/* Icon Container */}
            <div className={`p-4 rounded-2xl ${config.bg} ${config.border} border mb-6 animate-in zoom-in duration-500`}>
              {config.icon}
            </div>
            
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {title || config.defaultTitle}
            </h3>
            
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
              {message}
            </p>
            
            <button
              onClick={handleClose}
              className={`w-full py-3 px-6 rounded-xl text-white font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg ${config.accent} shadow-${type}-500/20`}
            >
              Continue
            </button>
          </div>
        </div>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-full transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default AlertModal;
