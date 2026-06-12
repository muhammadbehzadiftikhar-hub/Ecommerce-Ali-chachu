/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ShoppingBag, Search, User, LogIn, LogOut, ShieldCheck, ShoppingCart, HelpCircle, Heart, MapPin, Sun, Moon, GitCompare } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useCompare } from '../hooks/useCompare';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header({
  currentView,
  onNavigate,
  user,
  onLogin,
  onLogout,
  isAdmin,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  const cartCount = useCart((state) => state.getCartCount());
  const cartSubtotal = useCart((state) => state.getCartSubtotal());
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Self-contained persistent Theme Toggle system
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const compareCount = useCompare((state) => state.selectedIds.length);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const items = localStorage.getItem('recentSearches');
      if (items) {
        try {
          setRecentSearches(JSON.parse(items));
        } catch (e) {
          console.warn(e);
        }
      }
    }
  }, []);

  const addSearchToHistory = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((x) => x.toLowerCase() !== q.toLowerCase());
      const updated = [q, ...filtered].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <header id="app-header" className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div 
            id="brand-logo"
            onClick={() => { onNavigate('storefront'); onSearchChange(''); }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-slate-900/10 group-hover:bg-slate-800 transition-colors">
              M
            </div>
            <span className="font-sans font-extrabold text-xl tracking-tight text-slate-900">
              MyStore<span className="text-amber-500 font-medium text-xs ml-1 uppercase bg-amber-50 px-2 py-0.5 rounded-full">Premium</span>
            </span>
          </div>

          {/* Search bar inside header space for quick customer actions */}
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              id="header-search-input"
              type="text"
              placeholder="Search premium apparel, electronics, essentials..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentView !== 'storefront') {
                  onNavigate('storefront');
                }
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 250);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addSearchToHistory(searchQuery);
                }
              }}
              className="w-full text-sm font-sans bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-slate-500 focus:bg-white transition-all text-slate-800"
            />
            {isSearchFocused && recentSearches.length > 0 && (
              <div id="recent-searches-dropdown" className="absolute top-[50px] left-0 right-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-2 text-xs text-left">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest pl-1">Recent Queries</span>
                <div className="space-y-1">
                  {recentSearches.map((query, index) => (
                    <button
                      key={index}
                      id={`recent-query-item-${index}`}
                      onMouseDown={() => {
                        onSearchChange(query);
                        addSearchToHistory(query);
                        if (currentView !== 'storefront') {
                          onNavigate('storefront');
                        }
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-705 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-950 dark:hover:text-white transition-all flex items-center justify-between font-medium cursor-pointer"
                    >
                      <span>{query}</span>
                      <span className="text-[9px] text-slate-350 dark:text-slate-650 tracking-wider">↵ Search</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Action Rig */}
          <div className="flex items-center gap-2 sm:gap-4 text-slate-700">
            
            {/* View store locator/support */}
            <button
              id="nav-catalog-btn"
              onClick={() => { onNavigate('storefront'); onSearchChange(''); }}
              className={`text-sm font-medium font-sans px-3 py-2 rounded-lg hover:text-slate-900 transition-all cursor-pointer ${
                currentView === 'storefront' ? 'text-slate-900 bg-slate-50' : ''
              }`}
            >
              Catalog
            </button>

            {/* Track Order view shortcut */}
            <button
              id="nav-tracking-btn"
              onClick={() => onNavigate('order-tracking')}
              className={`text-sm font-medium font-sans px-3 py-2 rounded-lg hover:text-slate-900 transition-all cursor-pointer ${
                currentView === 'order-tracking' ? 'text-slate-905 bg-slate-50' : ''
              }`}
            >
              Track Order
            </button>

            {/* Admin shortcut if logged in as Admin, or show guest admin tool */}
            <button
              id="nav-admin-btn"
              onClick={() => onNavigate('admin')}
              className={`inline-flex items-center gap-1.5 text-sm font-medium font-sans px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentView === 'admin' 
                  ? 'text-indigo-600 bg-indigo-50 font-semibold' 
                  : 'hover:text-amber-600 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${isAdmin ? 'text-indigo-500' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Portal</span>
            </button>

            {/* User Auth Info Rig */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    id="profile-dropdown-trigger"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-50 transition-all duration-200 border border-slate-100"
                  >
                    <img
                      src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`}
                      alt={user.displayName || 'User Profile'}
                      className="w-8 h-8 rounded-full bg-slate-100 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  
                      {showProfileMenu && (
                        <div id="profile-menu-dropdown" className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-100 shadow-xl py-2 animate-in fade-in duration-200 ring-4 ring-slate-100">
                          <div className="px-4 py-3 border-b border-slate-50">
                            <p className="text-xs text-slate-400 font-sans">Signed in as</p>
                            <p className="text-sm font-semibold text-slate-800 font-sans truncate">{user.displayName || user.email}</p>
                            {isAdmin && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                                Admin Account
                              </span>
                            )}
                          </div>
                          
                          <button
                            id="user-order-history-btn"
                            onClick={() => {
                              onNavigate('order-history');
                              setShowProfileMenu(false);
                            }}
                            className="w-full text-left font-sans text-sm text-slate-700 hover:bg-slate-50 px-4 py-2.5 flex items-center gap-2 transition-all cursor-pointer"
                          >
                            <ShoppingBag className="w-4 h-4 text-slate-400" />
                            <span>Order History</span>
                          </button>

                          <button
                            id="user-wishlist-btn"
                            onClick={() => {
                              onNavigate('wishlist');
                              setShowProfileMenu(false);
                            }}
                            className="w-full text-left font-sans text-sm text-slate-700 hover:bg-slate-50 px-4 py-2.5 flex items-center gap-2 transition-all cursor-pointer border-t border-slate-50"
                          >
                            <Heart className="w-4 h-4 text-slate-400" />
                            <span>Wishlist</span>
                          </button>

                          <button
                            id="user-address-book-btn"
                            onClick={() => {
                              onNavigate('address-book');
                              setShowProfileMenu(false);
                            }}
                            className="w-full text-left font-sans text-sm text-slate-700 hover:bg-slate-50 px-4 py-2.5 flex items-center gap-2 transition-all cursor-pointer border-t border-slate-50"
                          >
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>Address Book</span>
                          </button>
                          
                          <button
                            id="user-logout-btn"
                            onClick={() => {
                              onLogout();
                              setShowProfileMenu(false);
                            }}
                            className="w-full text-left font-sans text-sm text-red-600 hover:bg-red-50 hover:text-red-700 px-4 py-2.5 flex items-center gap-2 transition-all border-t border-slate-50 mt-1 cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      )}
                </div>
              ) : (
                <button
                  id="header-login-btn"
                  onClick={onLogin}
                  className="inline-flex items-center gap-1.5 text-sm font-sans font-medium hover:text-slate-900 border border-slate-200 hover:border-slate-800 px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200" />

            {/* Wishlist Quick Access Shortcut */}
            <button
              id="header-wishlist-btn"
              onClick={() => onNavigate('wishlist')}
              className="p-2.5 rounded-xl hover:bg-slate-50 transition-all group flex items-center gap-1 cursor-pointer border border-transparent hover:border-slate-100"
              title="View Wishlist"
            >
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500 group-hover:scale-105 transition-transform" />
            </button>

            {/* Compare Quick Access Shortcut */}
            <button
              id="header-compare-btn"
              onClick={() => onNavigate('compare')}
              className="relative p-2.5 rounded-xl hover:bg-slate-50 transition-all group flex items-center gap-1 cursor-pointer border border-transparent hover:border-slate-100"
              title="Compare Products"
            >
              <GitCompare className="w-5 h-5 text-indigo-550 group-hover:scale-105 transition-transform" />
              {compareCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white font-sans font-extrabold text-[10px] h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {compareCount}
                </span>
              )}
            </button>

            {/* Dark/Light mode theme toggle */}
            <button
              id="header-theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all group flex items-center justify-center cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-500 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              id="header-cart-btn"
              onClick={() => onNavigate('cart')}
              className="relative p-2.5 rounded-xl hover:bg-slate-50 transition-all group flex items-center gap-1 cursor-pointer border border-transparent hover:border-slate-100"
            >
              <ShoppingCart className="w-5 h-5 text-slate-800 group-hover:scale-105 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white font-sans font-extrabold text-[10px] h-5 w-5 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-transparent animate-pulse">
                  {cartCount}
                </span>
              )}
              {cartSubtotal > 0 && (
                <span className="hidden lg:inline text-xs font-semibold text-slate-800 ml-1">
                  ${cartSubtotal.toFixed(2)}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
