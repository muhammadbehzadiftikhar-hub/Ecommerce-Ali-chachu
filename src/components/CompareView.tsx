/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useCompare } from '../hooks/useCompare';
import { Product } from '../types';
import { X, ArrowLeft, ShoppingCart, Star, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';

interface CompareViewProps {
  products: Product[];
  onNavigateToStore: () => void;
  onViewProduct: (product: Product) => void;
}

export function CompareView({ products, onNavigateToStore, onViewProduct }: CompareViewProps) {
  const { selectedIds, removeFromCompare, clearCompare } = useCompare();
  const addItem = useCart((state) => state.addItem);
  const { showToast } = useToast();

  const comparedProducts = products.filter((p) => selectedIds.includes(p.id));

  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      showToast('This product is out of stock.', 'error');
      return;
    }
    addItem(product, 1);
    showToast(`Added ${product.name} to your cart bag!`, 'success');
  };

  return (
    <div id="compare-products-page" className="py-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-8 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Product Comparison</span>
            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold">
              {comparedProducts.length} items selected
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Review side-by-side specifications, rating metrics, and inventory details</p>
        </div>

        <div className="flex items-center gap-2">
          {comparedProducts.length > 0 && (
            <button
              id="clear-comparison-btn"
              onClick={clearCompare}
              className="text-xs font-semibold py-2 px-4 rounded-xl border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/25 transition-all cursor-pointer"
            >
              Clear Comparison
            </button>
          )}
          <button
            id="back-to-catalog-from-compare"
            onClick={onNavigateToStore}
            className="inline-flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-800 hover:border-slate-800 px-4 py-2 rounded-xl transition-all font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Catalog</span>
          </button>
        </div>
      </div>

      {comparedProducts.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-xl mx-auto p-8">
          <svg className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="font-sans font-bold text-base text-slate-900 dark:text-white">Review Compartment Empty</h3>
          <p className="text-xs text-slate-500 mt-2 mb-6 max-w-sm mx-auto">
            Select comparison switches on individual product cards in the catalog to review parameters side-by-side.
          </p>
          <button
            onClick={onNavigateToStore}
            className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs px-6 py-3 rounded-xl transition-all duration-200"
          >
            Explore Catalog Collection
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-[200px]">Specification</th>
                {comparedProducts.map((p) => (
                  <th key={p.id} className="p-6 relative group/header min-w-[200px]">
                    <button
                      id={`remove-compare-x-${p.id}`}
                      onClick={() => removeFromCompare(p.id)}
                      className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col gap-3">
                      <div className="w-24 h-24 bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 self-center">
                        <img src={p.images?.[0]?.url} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-center group-hover/header:underline cursor-pointer" onClick={() => onViewProduct(p)}>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{p.name}</h4>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                          ${p.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="p-6 text-xs font-bold text-slate-450 uppercase dark:text-slate-400">Inventory Status</td>
                {comparedProducts.map((p) => {
                  const outOfStock = p.quantity <= 0;
                  const lowStock = !outOfStock && p.quantity <= p.lowStockAlert;
                  return (
                    <td key={p.id} className="p-6">
                      {outOfStock ? (
                        <span className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-[10px] font-sans font-bold px-2.5 py-1 rounded-lg uppercase">
                          Out Of Stock
                        </span>
                      ) : lowStock ? (
                        <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-sans font-bold px-2.5 py-1 rounded-lg uppercase">
                          Low Stock ({p.quantity} left)
                        </span>
                      ) : (
                        <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-sans font-bold px-2.5 py-1 rounded-lg uppercase">
                          In Stock ({p.quantity} items)
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="p-6 text-xs font-bold text-slate-450 uppercase dark:text-slate-400">Model SKU Code</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-6 text-xs font-mono text-slate-800 dark:text-slate-300">{p.sku}</td>
                ))}
              </tr>
              <tr>
                <td className="p-6 text-xs font-bold text-slate-450 uppercase dark:text-slate-400">Category</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-6 text-xs text-slate-650 dark:text-slate-300">
                    {p.categoryId === 'cat-electronics' ? 'Electronics' :
                     p.categoryId === 'cat-clothing' ? 'Clothing & Apparel' :
                     p.categoryId === 'cat-accessories' ? 'Premium Accessories' : 'Staff Interior'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-6 text-xs font-bold text-slate-450 uppercase dark:text-slate-400">Rating Performance</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-6">
                    <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                      <Star className="w-4 h-4 fill-amber-500" />
                      <span>4.8</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-6 text-xs font-bold text-slate-450 uppercase dark:text-slate-400">Feature Tags</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-6">
                    <div className="flex flex-wrap gap-1">
                      {p.tags && p.tags.map((tag, i) => (
                        <span key={i} className="text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full select-none">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-6 text-xs font-bold text-slate-450 uppercase dark:text-slate-400">Design Overview</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-6 text-xs text-slate-650 dark:text-slate-300 leading-relaxed max-w-sm line-clamp-3">
                    {p.shortDescription || p.description}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-950/20">
                <td className="p-6"></td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-6">
                    <button
                      id={`compare-add-cart-btn-${p.id}`}
                      disabled={p.quantity <= 0}
                      onClick={() => handleAddToCart(p)}
                      className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 disabled:cursor-not-allowed font-semibold text-xs py-3 px-4 rounded-xl cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{p.quantity <= 0 ? 'Sold Out' : 'Purchase Spec'}</span>
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
