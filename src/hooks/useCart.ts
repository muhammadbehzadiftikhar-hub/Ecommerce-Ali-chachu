/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { CartItem, Product, Variant } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface CartState {
  items: CartItem[];
  userId: string | null;
  setUserId: (userId: string | null) => Promise<void>;
  addItem: (product: Product, quantity?: number, variant?: Variant) => Promise<void>;
  removeItem: (productId: string, variantSku?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variantSku?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartSubtotal: () => number;
  getCartCount: () => number;
}

const syncToFirestore = async (items: CartItem[], userId: string | null) => {
  if (!userId) return;
  const path = `carts/${userId}`;
  try {
    const docRef = doc(db, 'carts', userId);
    await setDoc(docRef, {
      userId,
      items,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Failed to sync cart to Firestore:", err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const useCart = create<CartState>()((set, get) => ({
  items: [],
  userId: null,

  setUserId: async (userId) => {
    set({ userId });
    if (userId) {
      const path = `carts/${userId}`;
      try {
        const docRef = doc(db, 'carts', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.items)) {
            set({ items: data.items });
          }
        } else {
          // If no database-backed cart exists, check if there are memory items to port
          const currentItems = get().items;
          if (currentItems.length > 0) {
            await setDoc(docRef, {
              userId,
              items: currentItems,
              updatedAt: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.error("Failed to load customer cart from Firestore:", e);
        handleFirestoreError(e, OperationType.GET, path);
      }
    } else {
      set({ items: [] });
    }
  },

  addItem: async (product: Product, quantity = 1, variant?: Variant) => {
    const state = get();
    const items = [...state.items];
    
    const existingItemIndex = items.findIndex(
      (item) =>
        item.product.id === product.id &&
        (!variant || item.selectedVariant?.sku === variant.sku)
    );

    if (existingItemIndex > -1) {
      items[existingItemIndex].quantity += quantity;
    } else {
      items.push({
        product,
        quantity,
        selectedVariant: variant,
      });
    }

    set({ items });
    await syncToFirestore(items, state.userId);
  },

  removeItem: async (productId: string, variantSku?: string) => {
    const state = get();
    const items = state.items.filter(
      (item) =>
        !(
          item.product.id === productId &&
          (!variantSku || item.selectedVariant?.sku === variantSku)
        )
    );

    set({ items });
    await syncToFirestore(items, state.userId);
  },

  updateQuantity: async (productId: string, quantity: number, variantSku?: string) => {
    if (quantity <= 0) {
      await get().removeItem(productId, variantSku);
      return;
    }

    const state = get();
    const items = state.items.map((item) => {
      if (
        item.product.id === productId &&
        (!variantSku || item.selectedVariant?.sku === variantSku)
      ) {
        return { ...item, quantity };
      }
      return item;
    });

    set({ items });
    await syncToFirestore(items, state.userId);
  },

  clearCart: async () => {
    const state = get();
    set({ items: [] });
    await syncToFirestore([], state.userId);
  },

  getCartSubtotal: () => {
    return get().items.reduce((total, item) => {
      const price = item.selectedVariant?.price ?? item.product.price;
      return total + price * item.quantity;
    }, 0);
  },

  getCartCount: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },
}));
