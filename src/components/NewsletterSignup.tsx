/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      // Create a unique clean ID for the subscriber (sanitize email for the document ID)
      const sanitizedId = email.toLowerCase().replace(/[^a-zA-Z0-9_\-]/g, '_');
      
      const payload = {
        id: sanitizedId,
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      };

      const docRef = doc(db, 'subscribers', sanitizedId);
      await setDoc(docRef, payload);

      setSuccess(true);
      setEmail('');
    } catch (err) {
      console.error("Subscription error:", err);
      setErrorMsg("An unexpected error occurred. Please verify your email and try again.");
      try {
        handleFirestoreError(err, OperationType.WRITE, `subscribers/${email}`);
      } catch (e) {
        // Log custom system diagnostic info without crashing React component
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="newsletter-signup-card" className="bg-slate-50 border border-slate-100 rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-sm my-12">
      <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Mail className="w-5 h-5" />
      </div>
      
      <h3 className="text-xl sm:text-2xl font-sans font-bold text-slate-900 tracking-tight mb-2">
        Join our Curated Journal
      </h3>
      
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
        Receive complimentary preview alerts for upcoming collections, curated styling journals, and member-only pricing campaigns.
      </p>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 max-w-md mx-auto flex items-center justify-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-xs font-semibold">Verification link dispatched to your inbox! Welcome to MyStore.</span>
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="max-w-md mx-auto aspect-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="newsletter-email-input"
              type="email"
              required
              disabled={loading}
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-grow bg-white border border-slate-200 focus:border-slate-800 outline-none rounded-xl px-4 py-3 text-sm text-slate-800 transition-all shadow-inner placeholder:text-slate-400"
            />
            <button
              id="newsletter-submit-btn"
              type="submit"
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-3 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-slate-900/10 min-w-[120px] disabled:bg-slate-400"
            >
              <span>{loading ? 'Subscribing...' : 'Subscribe'}</span>
            </button>
          </div>
          
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-rose-600 text-xs mt-3 justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      )}

      {/* Trust reassurance subtitle */}
      <span className="text-[10px] text-slate-400 font-medium block mt-4 flex items-center justify-center gap-1">
        <Sparkles className="w-3 h-3 text-amber-500" />
        <span>No spam. Opt-out at any instant. Securely encrypted.</span>
      </span>
    </div>
  );
}
