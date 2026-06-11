/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X, Send, CheckCircle2, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export function FeedbackModal({ isOpen, onClose, userEmail = '' }: FeedbackModalProps) {
  const { showToast } = useToast();
  const [type, setType] = useState<'BUG_REPORT' | 'FEATURE_REQUEST' | 'GENERAL_COMMENT'>('FEATURE_REQUEST');
  const [email, setEmail] = useState(userEmail);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        type,
        email: email || 'anonymous@example.com',
        message: message.trim(),
        createdAt: new Date().toISOString(),
      });
      setIsSuccess(true);
      showToast('Thank you! Your feedback has been received.', 'success');
      setTimeout(() => {
        setIsSuccess(false);
        setMessage('');
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      showToast('Could not save feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="site-feedback-modal-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
        
        {/* Close trigger */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="font-sans font-bold text-lg">Thank You Very Much!</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We appreciate you taking time to share your insights. Our administrative team will review your submission shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3 mb-4">
              <MessageSquare className="w-5 h-5 text-indigo-500 animate-pulse" />
              <div>
                <h3 className="font-sans font-bold text-base">Share Site Feedback</h3>
                <p className="text-[10px] text-slate-500">Submit requests or report functional bugs</p>
              </div>
            </div>

            {/* Type selector keys */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide">Category</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('FEATURE_REQUEST')}
                  className={`p-3 text-center border text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    type === 'FEATURE_REQUEST'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Feature Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('BUG_REPORT')}
                  className={`p-3 text-center border text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    type === 'BUG_REPORT'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Report Bug</span>
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Contact Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-sans text-xs text-slate-850 dark:text-slate-200"
              />
            </div>

            {/* Text Message Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Detailed Description</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === 'BUG_REPORT'
                    ? 'Explain the issue step-by-step to help us replicate it...'
                    : 'Describe your proposed feature and how it would improve things...'
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 h-24 outline-none focus:border-indigo-500 font-sans text-xs text-slate-850 dark:text-slate-200 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full bg-slate-950 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white font-sans font-semibold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              {isSubmitting ? (
                <span>Submitting ...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
