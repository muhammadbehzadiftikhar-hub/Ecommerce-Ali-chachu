/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Trash2, ArrowLeft, RefreshCw, MessageSquare } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Product } from '../types';
import { useCart } from '../hooks/useCart';
import { ProductCard } from './ProductCard';

interface WishlistViewProps {
  user: FirebaseUser | null;
  products: Product[]; // Passed as pre-loaded storefront products fallback
  onNavigateToStore: () => void;
  onViewDetails: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  onToggleWishlist: (product: Product) => Promise<void>;
  onLogin: () => void;
}

export function WishlistView({
  user,
  products: storefrontProducts,
  onNavigateToStore,
  onViewDetails,
  onQuickView,
  onToggleWishlist,
  onLogin,
}: WishlistViewProps) {
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCart((state) => state.addItem);

  const fetchWishlist = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Attempt to fetch list of product IDs from the user's document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let userWishlistIds: string[] = [];
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        userWishlistIds = userData.wishlistIds || userData.wishlist || [];
      }

      // 2. Fetch products where the user's UID is in the wishlist array of products (Product list query)
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('wishlist', 'array-contains', user.uid));
      const querySnap = await getDocs(q);
      
      const queryProducts: Product[] = [];
      querySnap.forEach((doc) => {
        queryProducts.push({ id: doc.id, ...doc.data() } as Product);
      });

      // 3. Merge both sources to make absolutely sure any wishlisted items are shown
      const combinedMap = new Map<string, Product>();
      
      // Add items found in products collection first
      queryProducts.forEach((p) => combinedMap.set(p.id, p));

      // If user had specific wishlist IDs in their profile, fetch those specifically if not already merged
      if (userWishlistIds.length > 0) {
        for (const pid of userWishlistIds) {
          if (!combinedMap.has(pid)) {
            // Find in storefront first for speed, or fetch from db
            const localFound = storefrontProducts.find((p) => p.id === pid);
            if (localFound) {
              combinedMap.set(pid, localFound);
            } else {
              try {
                const prodSnap = await getDoc(doc(db, 'products', pid));
                if (prodSnap.exists()) {
                  combinedMap.set(pid, { id: prodSnap.id, ...prodSnap.data() } as Product);
                }
              } catch (e) {
                console.warn(`Failed to fetch individual product ${pid} for wishlist:`, e);
              }
            }
          }
        }
      }

      setWishlistItems(Array.from(combinedMap.values()));
    } catch (err) {
      console.error('Failed to load wishlist:', err);
      // fallback matching user.uid in product wishlist fields
      const localFiltered = storefrontProducts.filter((p) => p.wishlist?.includes(user.uid));
      setWishlistItems(localFiltered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [user, storefrontProducts]);

  const handleRemove = async (product: Product) => {
    try {
      await onToggleWishlist(product);
      setWishlistItems((prev) => prev.filter((item) => item.id !== product.id));
    } catch (e) {
      console.error('Error removing from wishlist:', e);
    }
  };

  const handleMoveToCart = async (product: Product) => {
    addItem(product, 1);
    await handleRemove(product);
  };

  if (!user) {
    return (
      <div className="text-center py-20 px-6 max-w-sm mx-auto">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Heart className="w-6 h-6" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800 mb-1">Authenticating Required</h3>
        <p className="text-xs text-slate-500 mb-6">
          Please login to view details of your personal boutique wishlist collection.
        </p>
        <button
          onClick={onLogin}
          className="inline-flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
        >
          <span>Sign In / Register</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
        <span className="text-xs text-slate-400 uppercase tracking-widest animate-pulse font-sans">Compiling Wishlist Collection...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-sans text-slate-900 tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            <span>Your Wishlist</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Review, manage, or checkout your curated style choices</p>
        </div>

        <button
          onClick={onNavigateToStore}
          className="inline-flex items-center gap-1.5 text-xs border border-slate-200 hover:border-slate-800 px-4 py-2 rounded-xl transition-all font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Grid</span>
        </button>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Heart className="w-5 h-5 text-slate-300" />
          </div>
          <h3 className="font-sans font-bold text-base text-slate-800 mb-1">Your Wishlist is Empty</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6">
            You haven't added any premium selections to your wishlist library yet.
          </p>
          <button
            onClick={onNavigateToStore}
            className="inline-flex bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <span>Browse Products Catalog</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
          {wishlistItems.map((prod) => (
            <div key={prod.id} className="relative group flex flex-col h-full bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
              {/* Product Card Rendering */}
              <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
                <img
                  src={prod.images?.[0]?.url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80'}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                {/* Floating tags */}
                <button
                  onClick={() => handleRemove(prod)}
                  className="absolute top-3 right-3 p-2 rounded-full border border-slate-100 bg-white/95 text-rose-500 hover:bg-rose-50 shadow-sm transition-all focus:outline-none cursor-pointer"
                  title="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    onClick={() => onViewDetails(prod)}
                    className="font-sans font-semibold text-slate-800 text-sm tracking-tight mb-2 hover:text-indigo-600 hover:underline cursor-pointer line-clamp-1"
                  >
                    {prod.name}
                  </h3>
                  <p className="text-slate-500 text-xs font-sans mb-3 line-clamp-2 leading-relaxed">
                    {prod.shortDescription || prod.description}
                  </p>
                </div>

                <div className="pt-2">
                  <div className="text-base font-sans font-bold text-slate-900 mb-4 font-mono">
                    ${prod.price.toFixed(2)}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRemove(prod)}
                      className="inline-flex items-center justify-center gap-1.5 border border-slate-200 hover:border-slate-800 text-slate-700 hover:text-slate-950 text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer font-medium"
                    >
                      <span>Remove</span>
                    </button>
                    <button
                      onClick={() => handleMoveToCart(prod)}
                      className="inline-flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-white text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer font-medium"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>Move to Cart</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
