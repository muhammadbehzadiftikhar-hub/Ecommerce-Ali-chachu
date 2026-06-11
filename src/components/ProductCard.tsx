/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Eye, Sparkles, Heart, GitCompare } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../hooks/useCart';
import { useCompare } from '../hooks/useCompare';
import { User as FirebaseUser } from 'firebase/auth';

interface ProductCardProps {
  key?: string | number;
  product: Product;
  user: FirebaseUser | null;
  onViewDetails: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
}

export function ProductCard({ product, user, onViewDetails, onQuickAdd, onToggleWishlist, onQuickView }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);
  const isWishlisted = !!(user && product.wishlist?.includes(user.uid));
  const { selectedIds, addToCompare } = useCompare();
  const isInCompare = selectedIds.includes(product.id);

  // Compute discount percentage if compareAtPrice is present and is greater than price
  const discountPercent = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const mainImage = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80';
  const outOfStock = product.quantity === 0 || product.quantity <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group relative min-w-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full"
    >
      {/* Product Image Stage */}
      <div 
        className="relative aspect-square w-full bg-slate-50 dark:bg-slate-950 overflow-hidden group-hover:opacity-95 transition-all"
        style={{ aspectRatio: '1 / 1', minHeight: '200px' }}
      >
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          style={{ aspectRatio: '1 / 1' }}
          width="400"
          height="400"
        />

        {/* Floating status elements if applicable */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {discountPercent > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] font-sans font-bold px-2.5 py-1 rounded-lg tracking-wide uppercase shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Save {discountPercent}%</span>
            </span>
          )}
          {product.featured && (
            <span className="bg-slate-900/90 backdrop-blur-sm text-white text-[10px] font-sans font-bold px-2.5 py-1 rounded-lg tracking-wide uppercase shadow-sm">
              Staff Pick
            </span>
          )}
          {!outOfStock && product.quantity <= product.lowStockAlert && (
            <span className="bg-amber-500/95 backdrop-blur-sm text-white text-[10px] font-sans font-bold px-2.5 py-1 rounded-lg tracking-wide uppercase shadow-sm">
              Low Stock ({product.quantity})
            </span>
          )}
        </div>

        {/* Wishlist Heart Toggle floating button */}
        <button
          id={`wishlist-toggle-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleWishlist) {
              onToggleWishlist(product);
            }
          }}
          className="absolute top-3 right-3 z-30 p-2.5 rounded-full border border-slate-100/50 bg-white/95 text-slate-500 hover:text-rose-500 hover:bg-white hover:scale-110 active:scale-95 shadow-sm transition-all cursor-pointer"
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
        </button>

        {/* Compare Toggle floating button */}
        <button
          id={`compare-toggle-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            addToCompare(product.id);
          }}
          className={`absolute top-14 right-3 z-30 p-2.5 rounded-full border bg-white/95 text-slate-500 hover:text-indigo-600 hover:bg-white hover:scale-110 active:scale-95 shadow-sm transition-all cursor-pointer ${
            isInCompare ? 'border-indigo-200 text-indigo-600 bg-indigo-55/90 font-bold' : 'border-slate-100/50'
          }`}
          title={isInCompare ? "Remove from Compare" : "Add to Compare"}
        >
          <GitCompare className={`w-4 h-4 transition-colors ${isInCompare ? 'text-indigo-650' : 'text-slate-400'}`} />
        </button>

        {/* Quick hover trigger overlay actions */}
        <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-20">
          <button
            id={`quick-view-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onQuickView) {
                onQuickView(product);
              } else {
                onViewDetails(product);
              }
            }}
            className="p-3 bg-white hover:bg-slate-50 text-slate-900 rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            title="Quick View"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            id={`quick-add-${product.id}`}
            disabled={outOfStock}
            onClick={() => {
              if (product.variants && product.variants.length > 0) {
                // If there are variants, open details so they can select one
                onViewDetails(product);
              } else {
                onQuickAdd(product);
              }
            }}
            className="p-3 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
            title="Add to Cart"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>

        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="bg-slate-900 text-white text-xs font-sans font-semibold tracking-wider uppercase px-4 py-1.5 rounded-lg">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Tags or Category label */}
          <div className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            {product.categoryId === 'cat-electronics' ? 'Electronics' :
             product.categoryId === 'cat-clothing' ? 'Clothing' :
             product.categoryId === 'cat-accessories' ? 'Accessories' : 'Living & Home'}
          </div>

          <h3 
            onClick={() => onViewDetails(product)}
            className="font-sans font-semibold text-slate-800 text-sm tracking-tight mb-2 hover:text-slate-900 cursor-pointer line-clamp-1 group-hover:underline"
          >
            {product.name}
          </h3>

          <p className="text-slate-500 text-xs font-sans mb-3 line-clamp-2 leading-relaxed">
            {product.shortDescription || product.description}
          </p>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-sans font-bold text-slate-900">
              ${product.price.toFixed(2)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-slate-400 line-through font-sans">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Quick Add Button underneath for clear mobile access */}
          <button
            id={`add-to-cart-card-${product.id}`}
            disabled={outOfStock}
            onClick={() => {
              if (product.variants && product.variants.length > 0) {
                onViewDetails(product);
              } else {
                onQuickAdd(product);
              }
            }}
            className="w-full mt-4 inline-flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-900 hover:text-white dark:border-slate-800 text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100 disabled:hover:text-slate-400 text-xs font-sans font-medium py-2 px-3 rounded-xl transition-all active:scale-98"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{outOfStock ? 'Unavailable' : product.variants && product.variants.length > 0 ? 'Select Options' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
