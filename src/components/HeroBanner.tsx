/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';

interface HeroBannerProps {
  onExplore: () => void;
}

export function HeroBanner({ onExplore }: HeroBannerProps) {
  return (
    <div id="hero-banner-container" className="relative overflow-hidden bg-slate-950 text-white py-24 md:py-32 px-6 rounded-3xl mb-12">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))]" />
      
      <div className="relative max-w-4xl mx-auto text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium mb-6 hover:bg-slate-850 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Summer Collection 2026 is Live</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-4xl md:text-6xl font-sans font-bold tracking-tight mb-6 bg-gradient-to-r from-slate-100 via-white to-slate-400 bg-clip-text text-transparent"
        >
          Elevated Essentials For Your Everyday Space
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 font-sans leading-relaxed"
        >
          Explore a curated selection of premium electronics, sustainable designer apparel, artisanal accessories, and modern home essentials.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <button
            id="hero-explore-btn"
            onClick={onExplore}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-950 font-sans font-medium px-8 py-3.5 rounded-xl hover:bg-slate-100 transition-all duration-200 shadow-lg shadow-white/5 group"
          >
            <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Shop the Catalog</span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            id="hero-learn-more-btn"
            onClick={onExplore}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 font-sans font-medium px-8 py-3.5 rounded-xl hover:bg-slate-800 transition-all"
          >
            <span>Browse Categories</span>
          </button>
        </motion.div>
      </div>

      {/* Decorative badges floating abstractly */}
      <div className="absolute top-1/4 left-10 md:left-20 opacity-10 hidden md:block animate-bounce duration-[4000ms]">
        <div className="w-16 h-16 rounded-2xl bg-amber-400 rotate-12" />
      </div>
      <div className="absolute bottom-1/4 right-10 md:right-24 opacity-10 hidden md:block animate-pulse duration-[6000ms]">
        <div className="w-24 h-24 rounded-full bg-violet-500" />
      </div>
    </div>
  );
}
