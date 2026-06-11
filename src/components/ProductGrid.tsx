/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, SlidersHorizontal, Search, RefreshCcw } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from './ProductCard';
import { User as FirebaseUser } from 'firebase/auth';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  selectedCategory: string | null;
  user: FirebaseUser | null;
  onSelectCategory: (id: string | null) => void;
  onViewDetails: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  searchQuery: string;
}

export function ProductGrid({
  products,
  categories,
  selectedCategory,
  user,
  onSelectCategory,
  onViewDetails,
  onQuickAdd,
  onToggleWishlist,
  onQuickView,
  searchQuery,
}: ProductGridProps) {
  const [selectedSort, setSelectedSort] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [priceLimit, setPriceLimit] = useState<number>(1500);

  // Filter & sort product results
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category Filter
    if (selectedCategory) {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }

    // Search Query Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Price Limit Filter
    result = result.filter((p) => p.price <= priceLimit);

    // Sorting
    if (selectedSort === 'featured') {
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else if (selectedSort === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (selectedSort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, selectedCategory, searchQuery, selectedSort, priceLimit]);

  return (
    <div id="catalog-section" className="space-y-8">
      {/* Category selection and filter control widget */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
        
        {/* Horizontal Category selectors */}
        <div id="category-scroller" className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            id="cat-all-btn"
            onClick={() => onSelectCategory(null)}
            className={`px-4 py-2.5 rounded-xl text-xs font-sans font-semibold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === null
                ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md shadow-slate-900/10 dark:shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Products
          </button>
          
          {categories.map((cat) => (
            <button
               id={`cat-${cat.id}-btn`}
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-sans font-semibold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md shadow-slate-900/10 dark:shadow-indigo-600/10'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Filter / Sort Control cluster */}
        <div className="flex items-center gap-4 flex-wrap">
          
          {/* Price Ceiling Filter Slider */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Max Price:</span>
            <input
              id="price-range-slider"
              type="range"
              min="20"
              max="1500"
              step="10"
              value={priceLimit}
              onChange={(e) => setPriceLimit(Number(e.target.value))}
              className="w-24 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-indigo-550 dark:accent-indigo-500"
            />
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">${priceLimit}</span>
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center gap-2 text-xs">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              id="sort-select-dropdown"
              value={selectedSort}
              onChange={(e: any) => setSelectedSort(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border-0 rounded-xl px-4 py-2.5 font-sans font-medium text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-slate-400 dark:focus:ring-indigo-600 outline-none cursor-pointer"
            >
              <option value="featured">Featured / Curated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

      </div>



      {/* Grid Results display */}
      <AnimatePresence mode="popLayout">
        {filteredProducts.length > 0 ? (
          <motion.div
            layout
            id="product-grid-container"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {filteredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                user={user}
                onViewDetails={onViewDetails}
                onQuickAdd={onQuickAdd}
                onToggleWishlist={onToggleWishlist}
                onQuickView={onQuickView}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="text-center py-20 px-6 bg-slate-50 rounded-3xl"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-bold text-lg text-slate-800 mb-1">No Premium Matches Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              We couldn't locate any products fitting "{searchQuery || 'your criteria'}" under the current custom filters.
            </p>
            <button
              id="reset-filters-btn"
              onClick={() => {
                onSelectCategory(null);
                setPriceLimit(1500);
                setSelectedSort('featured');
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 active:scale-95 transition-all"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
