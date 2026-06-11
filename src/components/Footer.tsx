/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Github, Globe, Shield, RefreshCw, Heart, CheckCircle2, AlertCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface FooterProps {
  onNavigate: (view: string) => void;
  onSelectCategory?: (categoryId: string | null) => void;
}

export function Footer({ onNavigate, onSelectCategory }: FooterProps) {
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
      console.error("Footer subscription error:", err);
      setErrorMsg("Error during subscription.");
      try {
        handleFirestoreError(err, OperationType.WRITE, `subscribers/${email}`);
      } catch (e) {
        // Safe catch to avoid crashing UI
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (catId: string) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    onNavigate('storefront');
    // Scroll to products
    setTimeout(() => {
      const el = document.getElementById('catalog-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <footer id="app-footer" className="bg-slate-900 text-slate-400 mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Core Guarantee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-slate-800 mb-12 text-slate-300">
          <div className="flex items-start gap-4">
            <Globe className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-sans font-semibold text-white mb-1 text-sm">Worldwide Curated Delivery</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Direct premium dispatch worldwide with fully insured tracking on every collection consignment.</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate('order-tracking')}
            className="flex items-start gap-4 cursor-pointer hover:bg-slate-800/20 p-2 rounded-xl transition-all"
          >
            <RefreshCw className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-sans font-semibold text-white mb-1 text-sm">30-Day Aesthetic Trust Return</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Changed your perspective? Utilize our simple online portal for a swift exchange or fully backed refund processing.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-sans font-semibold text-white mb-1 text-sm">Encrypted Stripe Guarantee</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Payments handled safely utilizing modern industry security protocols via Stripe Checkout engines.</p>
            </div>
          </div>
        </div>

        {/* Links structures */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 text-sm">
          <div>
            <div 
              onClick={() => { if (onSelectCategory) onSelectCategory(null); onNavigate('storefront'); }}
              className="flex items-center gap-2 mb-4 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-900 font-bold text-sm">
                M
              </div>
              <span className="font-sans font-extrabold text-lg text-white">
                MyStore
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Our vision is to build an elegant platform showcasing refined essentials, crafted to elevate your daily productivity, style, and living workspace.
            </p>
            <div className="flex gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://google.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors">
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-sans font-semibold text-white mb-4 text-xs tracking-wider uppercase">Shop Categories</h4>
            <ul className="space-y-2.5 text-xs">
              <li><button onClick={() => handleCategoryClick('cat-electronics')} className="hover:text-white transition-colors cursor-pointer text-left">Premium Electronics</button></li>
              <li><button onClick={() => handleCategoryClick('cat-clothing')} className="hover:text-white transition-colors cursor-pointer text-left">Organic Trenchcoats & Knits</button></li>
              <li><button onClick={() => handleCategoryClick('cat-accessories')} className="hover:text-white transition-colors cursor-pointer text-left">Leatherwares & Accessories</button></li>
              <li><button onClick={() => handleCategoryClick('cat-home')} className="hover:text-white transition-colors cursor-pointer text-left">Modern Stoneware & Furniture</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans font-semibold text-white mb-4 text-xs tracking-wider uppercase">Newsletter Signup</h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">Receive curations, drop timetables, and private subscriber codes.</p>
            {success ? (
              <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-200 rounded-xl p-3 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Subscription confirmed. Check inbox!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    disabled={loading}
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-sans bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-slate-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-white hover:bg-slate-100 text-slate-950 font-sans font-medium text-xs px-4 py-2 rounded-lg transition-all shrink-0 active:scale-95 disabled:bg-slate-400"
                  >
                    {loading ? '...' : 'Join'}
                  </button>
                </div>
                {errorMsg && (
                  <span className="text-[10px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errorMsg}
                  </span>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Footnotes */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 MyStore Premium Corp. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span id="footer-powered-by">Powered by VertexWaves IT Solutions</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
