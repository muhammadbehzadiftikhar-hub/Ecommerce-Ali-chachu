/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

type UIState = 'request' | 'sent' | 'error';

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<UIState>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Use Firebase Auth's sendPasswordResetEmail directly
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      setState('sent');
    } catch (err: any) {
      console.error("Firebase reset email failed: ", err);
      let friendlyMessage = 'We could not dispatch the reset link at this time. Please check your credentials and connection.';
      if (err.code === 'auth/user-not-found') {
        friendlyMessage = 'No account detected with this email address. Please double-check or register as a new user.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'The email address format is invalid. Please check for spelling mistakes.';
      }
      setErrorMessage(friendlyMessage);
      setState('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5" id="forgot-password-component">
      {state === 'request' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-sans font-semibold text-slate-800 dark:text-slate-200">
              Reset Password via Email
            </h3>
            <p className="text-xs font-sans text-slate-400">
              Enter your registered email address and we'll send you a secure link to reset your password.
            </p>
          </div>

          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-sans font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="behzad@example.com"
                  className="w-full pl-10 pr-4 py-2 text-sm font-sans rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white bg-slate-50/50 dark:bg-slate-900/40 text-slate-950 dark:text-white"
                />
              </div>
            </div>

            <button
              id="forgot-password-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer font-sans"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Log In</span>
            </button>
          </div>
        </div>
      )}

      {state === 'sent' && (
        <div className="space-y-4 text-center py-4" id="forgot-password-sent-view">
          <div className="mx-auto w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="font-sans font-semibold text-sm text-slate-900 dark:text-white">
              Reset Instructions Dispatched
            </h3>
            <p className="text-xs font-sans text-slate-400 max-w-sm mx-auto leading-relaxed">
              We've dispatched an email to <span className="font-medium text-slate-800 dark:text-slate-200">{email}</span>. Click the link in the message to quickly establish a new password.
            </p>
          </div>

          <button
            id="forgot-password-success-login-btn"
            onClick={onBackToLogin}
            className="w-full mt-2 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Log In</span>
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-4 text-center py-4" id="forgot-password-error-view">
          <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h3 className="font-sans font-semibold text-sm text-slate-900 dark:text-white">
              Email Dispatch Unsuccessful
            </h3>
            <p className="text-xs font-sans text-slate-400 max-w-sm mx-auto leading-relaxed">
              {errorMessage}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              id="forgot-password-retry-btn"
              onClick={() => setState('request')}
              className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl font-sans font-medium text-xs uppercase tracking-widest hover:active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={onBackToLogin}
              className="text-xs text-slate-400 hover:text-slate-705 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer font-sans underline"
            >
              Cancel & Return to Log In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
