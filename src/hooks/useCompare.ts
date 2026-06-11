/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface CompareState {
  selectedIds: string[];
  userId: string | null;
  setUserId: (userId: string | null) => Promise<void>;
  addToCompare: (id: string) => Promise<void>;
  removeFromCompare: (id: string) => Promise<void>;
  clearCompare: () => Promise<void>;
  isInCompare: (id: string) => boolean;
}

const syncToFirestore = async (selectedIds: string[], userId: string | null) => {
  if (!userId) return;
  const path = `compares/${userId}`;
  try {
    const docRef = doc(db, 'compares', userId);
    await setDoc(docRef, {
      userId,
      selectedIds,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Failed to sync compares list to Firestore:", err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const useCompare = create<CompareState>()((set, get) => ({
  selectedIds: [],
  userId: null,

  setUserId: async (userId) => {
    set({ userId });
    if (userId) {
      const path = `compares/${userId}`;
      try {
        const docRef = doc(db, 'compares', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.selectedIds)) {
            set({ selectedIds: data.selectedIds });
          }
        } else {
          // If no existing document, write any loaded state to Firestore
          const currentIds = get().selectedIds;
          if (currentIds.length > 0) {
            await setDoc(docRef, {
              userId,
              selectedIds: currentIds,
              updatedAt: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.error("Failed to load customer compare list from Firestore:", e);
        handleFirestoreError(e, OperationType.GET, path);
      }
    } else {
      set({ selectedIds: [] });
    }
  },

  addToCompare: async (id: string) => {
    const state = get();
    let updatedIds = [...state.selectedIds];
    
    if (state.selectedIds.includes(id)) {
      // Toggle off
      updatedIds = state.selectedIds.filter((x) => x !== id);
    } else {
      // Limit to max 4 comparisons
      if (state.selectedIds.length >= 4) {
        return;
      }
      updatedIds = [...state.selectedIds, id];
    }
    
    set({ selectedIds: updatedIds });
    await syncToFirestore(updatedIds, state.userId);
  },

  removeFromCompare: async (id: string) => {
    const state = get();
    const updatedIds = state.selectedIds.filter((x) => x !== id);
    set({ selectedIds: updatedIds });
    await syncToFirestore(updatedIds, state.userId);
  },

  clearCompare: async () => {
    const state = get();
    set({ selectedIds: [] });
    await syncToFirestore([], state.userId);
  },

  isInCompare: (id: string) => {
    return get().selectedIds.includes(id);
  },
}));
