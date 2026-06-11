/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { useToast, Toast } from '../hooks/useToast';
import { CheckCircle2, AlertCircle, HelpCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const renderIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      default:
        return <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  const getBorderColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-100 bg-emerald-50/70 text-emerald-900';
      case 'error':
        return 'border-rose-100 bg-rose-50/70 text-rose-900';
      default:
        return 'border-blue-100 bg-blue-50/70 text-blue-900';
    }
  };

  return createPortal(
    <div id="toast-container" className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            id={`toast-${toast.id}`}
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-lg ${getBorderColor(
              toast.type
            )}`}
          >
            <div className="pt-0.5">{renderIcon(toast.type)}</div>
            <p className="text-xs font-medium font-sans leading-relaxed flex-1">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
