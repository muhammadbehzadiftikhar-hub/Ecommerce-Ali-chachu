/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingCart, Star, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { Product, Variant } from '../types';
import { useCart } from '../hooks/useCart';

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddedToCart?: () => void;
}

export function QuickViewModal({ product, isOpen, onClose, onAddedToCart }: QuickViewModalProps) {
  const addItem = useCart((state) => state.addItem);
  const [selectedVariant, setSelectedVariant] = useState<Variant | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [addFeedback, setAddFeedback] = useState(false);

  if (!isOpen) return null;

  const currentPrice = selectedVariant?.price ?? product.price;
  const currentCompareAt = product.compareAtPrice;
  const outOfStock = product.trackInventory && (selectedVariant?.quantity ?? product.quantity) <= 0;

  const handleAddToCart = () => {
    if (outOfStock) return;
    
    // Add item to cart hook
    addItem(product, purchaseQuantity, selectedVariant);
    
    setAddFeedback(true);
    setTimeout(() => {
      setAddFeedback(false);
      if (onAddedToCart) {
        onAddedToCart();
      }
      onClose();
    }, 1200);
  };

  const mainImage = product.images?.[activeImageIdx]?.url || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80';

  // Modal Portal container render
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        id="quick-view-backdrop"
        onClick={onClose} 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Box */}
      <div 
        id={`quick-view-modal-${product.id}`}
        className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[80vh] border border-slate-100 z-10 animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Images Viewport */}
        <div className="w-full md:w-1/2 bg-slate-50 relative flex flex-col justify-between p-6 border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto">
          {/* Main Stage Image */}
          <div className="aspect-square w-full rounded-2xl overflow-hidden bg-white border border-slate-100 flex items-center justify-center relative">
            <img 
              src={mainImage} 
              alt={product.name} 
              className="object-cover w-full h-full"
            />
            {currentCompareAt && currentCompareAt > currentPrice && (
              <span className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-sans font-bold px-2 py-1 rounded-lg tracking-wide uppercase shadow-sm">
                Offer Space
              </span>
            )}
          </div>

          {/* Thumbnail strip */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-14 h-14 rounded-xl border overflow-hidden shrink-0 transition-all ${
                    idx === activeImageIdx ? 'border-slate-800 ring-2 ring-slate-100' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Description & checkout handles */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            {/* Category tag */}
            <div className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest leading-none">
              {product.categoryId === 'cat-electronics' ? 'Electronics' :
               product.categoryId === 'cat-clothing' ? 'Clothing' :
               product.categoryId === 'cat-accessories' ? 'Accessories' : 'Living & Home'}
            </div>

            {/* Core title */}
            <h2 className="text-xl sm:text-2xl font-bold font-sans text-slate-900 tracking-tight leading-snug">
              {product.name}
            </h2>

            {/* Price dynamic readout */}
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold font-sans text-slate-900">
                ${currentPrice.toFixed(2)}
              </span>
              {currentCompareAt && currentCompareAt > currentPrice && (
                <span className="text-sm text-slate-400 line-through font-sans">
                  ${currentCompareAt.toFixed(2)}
                </span>
              )}
            </div>

            {/* Star Rating summary tag */}
            <div className="flex items-center gap-1">
              <div className="flex text-amber-400">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current animate-pulse" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <span className="text-xs text-slate-500 font-medium ml-1">4.9 / 5.0 Rating</span>
            </div>

            <p className="text-slate-500 text-xs sm:text-sm font-sans leading-relaxed">
              {product.shortDescription || product.description}
            </p>

            {/* Formats variants selectors */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Selection Edition</h4>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v, i) => (
                    <button
                      key={i}
                      id={`quick-variant-opt-${v.name}`}
                      onClick={() => {
                        setSelectedVariant(v);
                      }}
                      className={`text-xs px-3 py-2 rounded-xl border transition-all ${
                        selectedVariant?.name === v.name
                          ? 'border-slate-900 bg-slate-900 text-white font-medium'
                          : 'border-slate-200 hover:border-slate-400 bg-white text-slate-700'
                      }`}
                    >
                      {v.name} - ${v.price.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quantity Controls and Trigger buttons */}
          <div className="pt-6 border-t border-slate-100 mt-6 space-y-4">
            <div className="flex gap-3">
              {/* Quantity selector */}
              <div className="w-1/3 bg-slate-50 border border-slate-100 rounded-xl p-1 flex items-center justify-between shrink-0">
                <button
                  disabled={purchaseQuantity <= 1}
                  onClick={() => setPurchaseQuantity(prev => prev - 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                >
                  -
                </button>
                <span className="font-mono text-xs font-bold text-slate-800">{purchaseQuantity}</span>
                <button
                  onClick={() => setPurchaseQuantity(prev => prev + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                >
                  +
                </button>
              </div>

              {/* Add trigger */}
              <button
                disabled={outOfStock}
                onClick={handleAddToCart}
                className={`flex-grow inline-flex items-center justify-center gap-2 rounded-xl text-xs font-sans font-semibold transition-all duration-300 active:scale-95 text-white ${
                  outOfStock ? 'bg-slate-300 cursor-not-allowed' :
                  addFeedback ? 'bg-emerald-600' : 'bg-slate-950 hover:bg-slate-900 shadow-md shadow-slate-950/20'
                }`}
              >
                {addFeedback ? (
                  <>
                    <Check className="w-4 h-4 animate-bounce" />
                    <span>Added Safely!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>{outOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Feedback details */}
            <span className="text-[10px] text-slate-400 font-medium block flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>Free cargo delivery above $150. Secured SSL transaction protocols.</span>
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
