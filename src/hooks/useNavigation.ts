/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';

export interface NavigationState {
  currentView: string;
  systemMode: 'customer' | 'admin';
  searchQuery: string;
  selectedCategory: string | null;
  
  // Actions
  setSystemMode: (mode: 'customer' | 'admin') => void;
  setCurrentView: (view: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  navigate: (view: string) => void;
  clearStorefrontCache: () => void;
}

export const useNavigation = create<NavigationState>()((set, get) => ({
  currentView: 'storefront',
  systemMode: 'customer',
  searchQuery: '',
  selectedCategory: null,

  setSystemMode: (mode) => {
    set({ systemMode: mode });
    if (mode === 'admin') {
      get().clearStorefrontCache();
    }
  },

  setCurrentView: (view) => {
    set({ currentView: view });
    if (view === 'admin') {
      set({ systemMode: 'admin' });
      get().clearStorefrontCache();
    } else if (view === 'storefront') {
      set({ systemMode: 'customer' });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  navigate: (view) => {
    const isToAdmin = view === 'admin';
    set({
      currentView: view,
      systemMode: isToAdmin ? 'admin' : 'customer'
    });
    
    if (isToAdmin) {
      get().clearStorefrontCache();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  clearStorefrontCache: () => {
    // Clear active storefront filters, search queries or temporary cached states to clean up memory
    set({
      searchQuery: '',
      selectedCategory: null
    });
  }
}));
