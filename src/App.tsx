/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { db, auth, loginWithGoogle } from './lib/firebase';
import { onAuthStateChanged, signOut, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './lib/firebase-seed';
import { adminResetDatabase } from './services/adminService';
import { Product, Category } from './types';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { ProductGrid } from './components/ProductGrid';
import { ProductDetailView } from './components/ProductDetailView';
import { CartView } from './components/CartView';
import { CheckoutView } from './components/CheckoutView';
import { OrderSuccessView } from './components/OrderSuccessView';
import { AdminPortal } from './components/AdminPortal';
import { AdminEnvironmentWrapper } from './components/AdminEnvironmentWrapper';
import { Footer } from './components/Footer';
import { Loader2, AlertCircle, RefreshCw, Sparkles, CheckCircle2, ShieldAlert, ShoppingBag, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useCart } from './hooks/useCart';
import { useCompare } from './hooks/useCompare';
import { verifyUserIsAdmin, verifyAdminRoleStrict } from './services/authService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProductSkeletonGrid } from './components/ProductSkeletonGrid';
import { NewsletterSignup } from './components/NewsletterSignup';
import { OrderHistoryView } from './components/OrderHistoryView';
import { OrderTracking } from './components/OrderTracking';
import { QuickViewModal } from './components/QuickViewModal';
import { WishlistView } from './components/WishlistView';
import { AddressBook } from './components/AddressBook';
import { ToastContainer } from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import { CompareView } from './components/CompareView';
import { FeedbackModal } from './components/FeedbackModal';
import { MessageSquare } from 'lucide-react';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const { showToast } = useToast();
  // Navigation / Custom View State routing
  const [currentView, setCurrentView] = useState<string>('storefront');
  const [systemMode, setSystemMode] = useState<'customer' | 'admin'>('customer');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [hasUnreadFeedback, setHasUnreadFeedback] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [alertMessages, setAlertMessages] = useState<string[]>([
    'Complimentary Worldwide Insured Express Cargo Dispatch For Purchases Surpassing $200',
    'Exclusive Curated Global Releases Added Weekly — Sign up to Our Premium Newsletter List',
    'Enjoy Complimentary 10% Discount On First Purchase with Promo Code: MYSTORE10'
  ]);

  // Dedicated Server-isolated Admin States
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminCategories, setAdminCategories] = useState<Category[]>([]);
  const [isRefreshingAdminData, setIsRefreshingAdminData] = useState(false);
  const [adminLastSynced, setAdminLastSynced] = useState<Date | null>(null);

  // Firestore real data collections
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Auth User states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Search Filter state shared with layout
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Cart indicators
  const addItem = useCart((state) => state.addItem);

  // Mount state tracking
  useEffect(() => {
    setIsMounted(true);

    // Auto-login anonymously on load if completely unauthenticated in background
    const triggerAutoAnon = async () => {
      setTimeout(async () => {
        if (!auth.currentUser) {
          try {
            const { signInAnonymously } = await import('firebase/auth');
            await signInAnonymously(auth);
          } catch (e) {
            console.warn("Background guest login did not process: ", e);
          }
        }
      }, 1000);
    };
    triggerAutoAnon();
  }, []);

  // Dynamic Auth State Syncer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const enrichedUser = {
          ...currentUser,
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Aesthetic Explorer',
          email: currentUser.email || 'explorer@example.com',
          photoURL: currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          isAnonymous: currentUser.isAnonymous
        };
        setUser(enrichedUser as any);
        
        // Pull the initial cart & compare state from Firestore upon user login
        await useCart.getState().setUserId(currentUser.uid);
        await useCompare.getState().setUserId(currentUser.uid);

        // Fetch user document from users collection to verify roles strictly
        let isUserAdmin = await verifyUserIsAdmin(currentUser.uid);

        // Automatic developer/seed onboarding to secure Admin role
        if (!isUserAdmin && currentUser.email && (currentUser.email === 'muhammadbehzadiftikhar@gmail.com' || currentUser.email === 'admin@example.com')) {
          try {
            const { setDoc, doc } = await import('firebase/firestore');
            await setDoc(doc(db, 'users', currentUser.uid), {
              id: currentUser.uid,
              name: currentUser.displayName || 'Store Administrator',
              email: currentUser.email,
              role: 'ADMIN',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            isUserAdmin = true;
          } catch (e) {
            console.error("Auto-provisioning admin role failed:", e);
          }
        }
        setIsAdmin(isUserAdmin);
      } else {
        setUser(null);
        setIsAdmin(false);
        // Clear or unbind cart & compare user id
        await useCart.getState().setUserId(null);
        await useCompare.getState().setUserId(null);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Categories & Products from Firestore
  useEffect(() => {
    let unsubscribeProducts = () => {};
    let unsubscribeCategories = () => {};

    try {
      // 1. Listen for categories
      unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
        const cats: Category[] = [];
        snapshot.forEach((doc) => {
          cats.push({ id: doc.id, ...doc.data() } as Category);
        });
        setCategories(cats);
      }, (err) => {
        console.warn("Categories fetch failed:", err);
      });

      // 2. Listen for products
      unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
        const prods: Product[] = [];
        snapshot.forEach((doc) => {
          prods.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(prods);
        setIsLoadingCatalog(false);
      }, (err) => {
        console.warn("Products fetch failed:", err);
        setIsLoadingCatalog(false);
      });
    } catch (e) {
      console.error("Firestore Listeners Setup Failed", e);
      setIsLoadingCatalog(false);
    }

    return () => {
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, [systemMode]);

  // Listen to site feedback submissions to check for unread entries
  useEffect(() => {
    let unsubscribeFeedback = () => {};
    try {
      unsubscribeFeedback = onSnapshot(collection(db, 'feedback'), (snapshot) => {
        const lastReadStr = localStorage.getItem('lastReadFeedbackTimestamp');
        const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;
        
        let unread = false;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.createdAt) {
            const creationTime = new Date(data.createdAt).getTime();
            if (creationTime > lastReadTime) {
              unread = true;
            }
          }
        });
        setHasUnreadFeedback(unread);
      }, (err) => {
        console.warn("Feedback query silent error or permission rule blocker:", err);
      });
    } catch (e) {
      console.warn("Feedback live subscription exception:", e);
    }
    return () => unsubscribeFeedback();
  }, [isFeedbackOpen]);

  // Listen to site settings configuration from Firestore
  useEffect(() => {
    let unsubscribeSettings = () => {};
    try {
      unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.alertBarMessages && Array.isArray(data.alertBarMessages) && data.alertBarMessages.length > 0) {
            setAlertMessages(data.alertBarMessages);
          } else if (data.value && data.value.alertBarMessages && Array.isArray(data.value.alertBarMessages) && data.value.alertBarMessages.length > 0) {
            setAlertMessages(data.value.alertBarMessages);
          }
        }
      }, (err) => {
        console.warn("Settings listener warning (unseeded or rule locked):", err);
      });
    } catch (e) {
      console.warn("Settings reader exception:", e);
    }
    return () => unsubscribeSettings();
  }, []);

  // Auto-Seeder if Firestore collections are database-empty
  useEffect(() => {
    const checkAndSeed = async () => {
      if (!isLoadingCatalog && products.length === 0 && categories.length === 0) {
        console.log("No data found in Firestore db collection. Executing automatic database seeder...");
        await adminResetDatabase();
      }
    };
    checkAndSeed();
  }, [isLoadingCatalog, products.length, categories.length]);

  // Auth Operations handlers
  const handleLogin = async () => {
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    setUser(null);
  };

  const triggerResetSeed = async () => {
    const completed = await adminResetDatabase(true);
    if (completed) {
      alert("Database reset and seeded with default categories and products catalog!");
    } else {
      alert("Failed to seed. Standard authorization rules blocks. Check rule permissions.");
    }
  };

  const handleToggleWishlist = async (product: Product) => {
    if (!user) {
      await handleLogin();
      return;
    }

    const currentWishlist = product.wishlist || [];
    let updatedWishlist: string[];
    const wasAdded = !currentWishlist.includes(user.uid);

    if (currentWishlist.includes(user.uid)) {
      updatedWishlist = currentWishlist.filter((uid) => uid !== user.uid);
    } else {
      updatedWishlist = [...currentWishlist, user.uid];
    }

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'products', product.id);
      await updateDoc(docRef, { wishlist: updatedWishlist });
      
      if (wasAdded) {
        showToast(`Added ${product.name} to your Wishlist collection!`, 'success');
      } else {
        showToast(`Removed ${product.name} from your Wishlist collection.`, 'success');
      }

      if (selectedProduct && selectedProduct.id === product.id) {
        setSelectedProduct({ ...selectedProduct, wishlist: updatedWishlist });
      }
    } catch (err) {
      console.error("Failed to toggle wishlist item:", err);
      // Fallback state update
      const updatedProducts = products.map((p) => {
        if (p.id === product.id) {
          return { ...p, wishlist: updatedWishlist };
        }
        return p;
      });
      setProducts(updatedProducts);
      if (selectedProduct && selectedProduct.id === product.id) {
        setSelectedProduct({ ...selectedProduct, wishlist: updatedWishlist });
      }
    }
  };

  // Isolated Admin Fetch Logic bypassing client cache completely
  const fetchAdminDataStrict = async () => {
    setIsRefreshingAdminData(true);
    try {
      const { getDocsFromServer, collection } = await import('firebase/firestore');
      
      // Fetch categories strictly bypassing cache
      const catsSnap = await getDocsFromServer(collection(db, 'categories'));
      const cats: Category[] = [];
      catsSnap.forEach((docSnap) => {
        cats.push({ id: docSnap.id, ...docSnap.data() } as Category);
      });
      setAdminCategories(cats);

      // Fetch products strictly bypassing cache
      const prodsSnap = await getDocsFromServer(collection(db, 'products'));
      const prods: Product[] = [];
      prodsSnap.forEach((docSnap) => {
        prods.push({ id: docSnap.id, ...docSnap.data() } as Product);
      });
      setAdminProducts(prods);
      
      setAdminLastSynced(new Date());
      showToast('Admin Console DB Synchronized: Pulled fresh authority dataset from secure server.', 'success');
    } catch (e) {
      console.error("Direct server-isolated admin fetch failed:", e);
      showToast('Metadata Sync Failed: Unauthorized credentials or database connection issue.', 'error');
    } finally {
      setIsRefreshingAdminData(false);
    }
  };

  // Run initial server fetch upon admin session load
  useEffect(() => {
    if (systemMode === 'admin' && isAdmin) {
      fetchAdminDataStrict();
    }
  }, [systemMode, isAdmin]);

  // Safe navigation abstraction that ensures correct active workspace environment state
  const handleNavigate = async (view: string) => {
    if (view === 'admin') {
      if (user) {
        const check = await verifyAdminRoleStrict(user.uid);
        if (!check) {
          showToast('Access Denied: You do not have the required administrative role.', 'error');
          setSystemMode('customer');
          setCurrentView('storefront');
          return;
        }
      } else {
        showToast('Please log in with an Admin account first.', 'error');
        setSystemMode('customer');
        setCurrentView('storefront');
        return;
      }
      setSystemMode('admin');
    } else {
      setSystemMode('customer');
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Protective automatic redirect if non-admin tries to hold admin views
  useEffect(() => {
    const checkAdminRedirect = async () => {
      if (systemMode === 'admin' && !isLoadingAuth) {
        const check = await verifyAdminRoleStrict(user?.uid);
        if (!check) {
          showToast('Programmatic Redirect: Authorized administrative access only.', 'error');
          setSystemMode('customer');
          setCurrentView('storefront');
        }
      }
    };
    checkAdminRedirect();
  }, [systemMode, user, isLoadingAuth]);

  // Safe fallback arrays if Firestore is syncing
  const displayProducts = (products.length > 0 ? products : SEED_PRODUCTS(SEED_CATEGORIES as any)) as Product[];
  const displayCategories = (categories.length > 0 ? categories : SEED_CATEGORIES) as Category[];

  // Dynamic status descriptor for Firestore activity & synchronized content pools
  const dbSyncStatus = isRefreshingAdminData ? 'Syncing' : (products.length > 0 ? 'Live' : 'Cached');

  // Consolidate mounting, auth check, and catalog load into a single loading indicator to prevent flicker
  const isInitialLoading = !isMounted || isLoadingAuth || (isLoadingCatalog && products.length === 0);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-slate-800 animate-spin" />
        <h3 className="font-sans font-medium text-xs text-slate-400 uppercase tracking-widest animate-pulse">SYNCING DATABASE.....</h3>
      </div>
    );
  }

  return (
    <div id="mystore-premium-app" className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-slate-900 selection:text-white">
      
      {/* Dynamic Top Environment Shift bar split */}
      <div className={`text-xs py-2.5 px-4 flex flex-col sm:flex-row items-center justify-between font-sans z-[60] relative gap-2 shrink-0 transition-all duration-300 border-b-2 ${
        systemMode === 'admin'
          ? 'bg-slate-950 border-indigo-500 shadow-[0_4px_25px_rgba(79,70,229,0.3)]'
          : 'bg-slate-900 border-emerald-500 shadow-[0_2px_15px_rgba(16,185,129,0.15)]'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full animate-pulse transition-all duration-300 ${
            systemMode === 'admin' ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
          }`} />
          <span className="font-extrabold tracking-widest uppercase text-[10px] text-slate-400">DEPLOYMENT CONSOLE:</span>
          <span className="font-sans text-white text-[11px] font-bold">
            {systemMode === 'admin' ? 'MyStore Systems Admin Console' : 'MyStore Premium Production'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-sans text-slate-400 mr-2 secret-label hidden md:inline font-bold uppercase tracking-wide">Active Environment:</span>
          <div className={`flex p-1 rounded-xl transition-all duration-350 border ${
            systemMode === 'admin' ? 'bg-slate-900 border-indigo-900/40' : 'bg-slate-850 border-slate-700/60'
          }`}>
            <div className="relative group/customer mr-1">
              <button
                id="switcher-btn-customer"
                onClick={() => handleNavigate('storefront')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all duration-250 cursor-pointer border ${
                  systemMode === 'customer'
                    ? 'bg-emerald-600 border-emerald-500 shadow-xl shadow-emerald-950/70 ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950 text-white font-sans font-extrabold scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent hover:scale-[1.01]'
                }`}
              >
                <ShoppingBag className={`w-3.5 h-3.5 mr-1.5 transition-all duration-300 ease-in-out ${
                  systemMode === 'customer' 
                    ? 'rotate-0 scale-100 text-white' 
                    : '-rotate-12 scale-95 text-slate-500 opacity-60 group-hover/customer:opacity-100'
                }`} />
                <span>Customer Web</span>
              </button>
              
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/customer:opacity-100 translate-y-1 group-hover/customer:translate-y-0 transition-all duration-200 pointer-events-none bg-slate-950 border border-emerald-500/30 text-[9px] font-semibold text-slate-300 px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Store Environment:</span>
                <span className="font-mono font-extrabold tracking-wider text-emerald-400 uppercase">Live Store</span>
              </div>
            </div>

            <div className="relative group/admin">
              <button
                id="switcher-btn-admin"
                onClick={() => handleNavigate('admin')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 ease-in-out cursor-pointer select-none border ${
                  systemMode === 'admin'
                    ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-950/70 ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 text-white font-sans font-extrabold scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent hover:scale-[1.01]'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 mr-1.5 transition-all duration-500 ease-in-out ${
                  systemMode === 'admin' 
                    ? dbSyncStatus === 'Syncing'
                      ? 'text-indigo-400 scale-110 rotate-180 animate-pulse'
                      : dbSyncStatus === 'Live'
                        ? 'text-emerald-400 scale-110'
                        : 'text-amber-400 scale-110 shadow-amber-500/50'
                    : 'rotate-45 scale-95 text-slate-500 opacity-60 group-hover/admin:opacity-100'
                }`} />
                <span className={`transition-colors duration-500 ${
                  systemMode === 'admin'
                    ? dbSyncStatus === 'Syncing'
                      ? 'text-indigo-300'
                      : dbSyncStatus === 'Live'
                        ? 'text-emerald-50'
                        : 'text-amber-100'
                    : 'text-slate-400 group-hover/admin:text-white'
                }`}>
                  Admin Portal {systemMode === 'admin' && `(${dbSyncStatus})`}
                </span>
                
                {/* Embedded Status Indicator Dot Inside the Button */}
                <span 
                  className={`ml-1.5 h-1.5 w-1.5 rounded-full transition-all duration-500 ease-in-out shrink-0 ${
                    dbSyncStatus === 'Syncing' 
                      ? 'bg-indigo-400 animate-ping shadow-[0_0_8px_#818cf8]' 
                      : (dbSyncStatus === 'Live' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]')
                  }`} 
                />
              </button>
              
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/admin:opacity-100 translate-y-1 group-hover/admin:translate-y-0 transition-all duration-200 pointer-events-none bg-slate-950 border border-indigo-500/30 text-[9px] font-semibold text-slate-300 px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                    dbSyncStatus === 'Syncing' 
                      ? 'bg-indigo-400 animate-spin' 
                      : (dbSyncStatus === 'Live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')
                  }`} />
                  <span className="transition-colors duration-500">DB Status:</span>
                  <span className={`font-mono font-extrabold tracking-wider transition-colors duration-500 ${
                    dbSyncStatus === 'Syncing' 
                      ? 'text-indigo-400' 
                      : (dbSyncStatus === 'Live' ? 'text-emerald-400' : 'text-amber-400')
                  }`}>{dbSyncStatus}</span>
                </div>
                <div className="text-[8px] font-mono text-slate-500 border-t border-slate-900/60 w-full pt-1.5 mt-1 flex justify-center items-center gap-1 transition-all duration-300">
                  <span>Last Server Sync:</span>
                  <span className="text-slate-400 font-bold">
                    {adminLastSynced 
                      ? adminLastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                      : 'Not Synced'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {systemMode === 'admin' ? (
        isAdmin ? (
          /* Dedicated Isolated Admin Console Environment */
          <AdminEnvironmentWrapper isRefreshingData={isRefreshingAdminData}>
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col"
            >
              <div className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <ErrorBoundary>
                  <AdminPortal
                    products={adminProducts.length > 0 ? adminProducts : displayProducts}
                    categories={adminCategories.length > 0 ? adminCategories : displayCategories}
                    user={user}
                    isAdmin={isAdmin}
                    onNavigate={(view) => {
                      if (view !== 'admin') {
                        setSystemMode('customer');
                      }
                      setCurrentView(view);
                      window.scrollTo({ top: 0 });
                    }}
                    onResetSeed={triggerResetSeed}
                    onRefreshData={fetchAdminDataStrict}
                    isRefreshingData={isRefreshingAdminData}
                  />
                </ErrorBoundary>
              </div>
              
              <div className="bg-slate-100/50 dark:bg-slate-900/35 border-t border-slate-200/50 dark:border-slate-800/50 py-4 text-center select-none">
                <p className="text-[10px] font-mono text-slate-400">MyStore System Console • Secure Host Authority Admin Session Active</p>
              </div>
            </motion.div>
          </AdminEnvironmentWrapper>
        ) : (
          /* Security/Loading fallback during strict verification checks */
          <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4 py-32 animate-in fade-in duration-200">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <h3 className="font-sans font-semibold text-xs text-slate-400 uppercase tracking-widest animate-pulse">Running Server Authority Authentication Check...</h3>
          </div>
        )
      ) : (
        /* Isolated Customer Web Environment */
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {/* Top Shipment Promos Banner (Seamless Marquee Bar) */}
            <div className="relative overflow-hidden w-full bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 py-2 select-none flex">
              <div className="animate-marquee text-[10px] font-sans font-bold tracking-widest text-[#64748b] uppercase gap-16 flex items-center">
                {alertMessages.map((msg, idx) => (
                  <span key={`original-${idx}`} className="flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    {msg}
                  </span>
                ))}
                
                {/* Duplicate for seamless looping */}
                {alertMessages.map((msg, idx) => (
                  <span key={`duplicate-${idx}`} className="flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    {msg}
                  </span>
                ))}
              </div>
            </div>

            {/* Global Header */}
            <Header
              currentView={currentView}
              onNavigate={handleNavigate}
              user={user}
              onLogin={handleLogin}
              onLogout={handleLogout}
              isAdmin={isAdmin}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Core views layout */}
            <main className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
              <ErrorBoundary>
                <div>
                  {currentView === 'storefront' && (
                    <div className="space-y-12 animate-in fade-in duration-300">
                      <HeroBanner onExplore={() => {
                        const el = document.getElementById('catalog-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }} />
                      
                      {isLoadingCatalog && products.length === 0 ? (
                        <ProductSkeletonGrid />
                      ) : (
                        <ProductGrid
                          products={displayProducts}
                          categories={displayCategories}
                          selectedCategory={selectedCategory}
                          user={user}
                          onSelectCategory={setSelectedCategory}
                          onViewDetails={(prod) => {
                            setSelectedProduct(prod);
                            setCurrentView('product-detail');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onQuickAdd={(prod) => {
                            addItem(prod, 1);
                            setCurrentView('cart');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onToggleWishlist={handleToggleWishlist}
                          onQuickView={setQuickViewProduct}
                          searchQuery={searchQuery}
                        />
                      )}

                      {/* Newsletter signup card */}
                      <NewsletterSignup />
                    </div>
                  )}

                  {currentView === 'product-detail' && selectedProduct && (
                    <ProductDetailView
                      product={selectedProduct}
                      onBack={() => setCurrentView('storefront')}
                      user={user}
                      onLogin={handleLogin}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  )}

                  {currentView === 'order-history' && (
                    <OrderHistoryView
                      user={user}
                      onNavigateToStore={() => {
                        setCurrentView('storefront');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}

                  {currentView === 'order-tracking' && (
                    <OrderTracking
                      onNavigateToStore={() => {
                        setCurrentView('storefront');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}

                  {currentView === 'wishlist' && (
                    <WishlistView
                      user={user}
                      products={displayProducts}
                      onNavigateToStore={() => {
                        setCurrentView('storefront');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onViewDetails={(prod) => {
                        setSelectedProduct(prod);
                        setCurrentView('product-detail');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onQuickView={setQuickViewProduct}
                      onToggleWishlist={handleToggleWishlist}
                      onLogin={handleLogin}
                    />
                  )}

                  {currentView === 'address-book' && (
                    <AddressBook
                      user={user}
                      onNavigateToStore={() => {
                        setCurrentView('storefront');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onLogin={handleLogin}
                    />
                  )}

                  {currentView === 'cart' && (
                    <CartView
                      onBack={() => setCurrentView('storefront')}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {currentView === 'checkout' && (
                    <CheckoutView
                      user={user}
                      onOrderSuccess={(order) => {
                        setSuccessOrder(order);
                        setCurrentView('order-success');
                        window.scrollTo({ top: 0 });
                      }}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {currentView === 'order-success' && successOrder && (
                    <OrderSuccessView
                      orderInfo={successOrder}
                      onReturnToStore={() => {
                        setSuccessOrder(null);
                        setCurrentView('storefront');
                        window.scrollTo({ top: 0 });
                      }}
                    />
                  )}

                  {currentView === 'compare' && (
                    <CompareView
                      products={displayProducts}
                      onNavigateToStore={() => {
                        setCurrentView('storefront');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onViewProduct={(prod) => {
                        setSelectedProduct(prod);
                        setCurrentView('product-detail');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}
                </div>
              </ErrorBoundary>
            </main>
          </div>

          {quickViewProduct && (
            <QuickViewModal
              product={quickViewProduct}
              isOpen={!!quickViewProduct}
              onClose={() => setQuickViewProduct(null)}
              onAddedToCart={() => {
                setCurrentView('cart');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {/* Floating feedback trigger */}
          <motion.button
            id="floating-feedback-trigger-btn"
            onClick={() => {
              setIsFeedbackOpen(true);
              localStorage.setItem('lastReadFeedbackTimestamp', new Date().toISOString());
              setHasUnreadFeedback(false);
            }}
            whileHover={{ 
              scale: 1.12,
              boxShadow: "0 0 25px rgba(99, 102, 241, 0.65)",
              borderColor: "rgba(99, 102, 241, 0.6)"
            }}
            whileTap={{ scale: 0.92 }}
            animate={hasUnreadFeedback ? {
              scale: [1, 1.08, 1],
              boxShadow: [
                "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
                "0 0 22px rgba(99, 102, 241, 0.7)",
                "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)"
              ]
            } : undefined}
            transition={hasUnreadFeedback ? {
              duration: 2.0,
              repeat: Infinity,
              ease: "easeInOut"
            } : { type: "spring", stiffness: 450, damping: 14 }}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] bg-slate-900 border border-slate-800 text-slate-100 hover:text-indigo-300 shadow-xl rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200"
            title="Submit Site Feedback"
          >
            <MessageSquare className="w-5 h-5" />
            {hasUnreadFeedback && (
              <span className="absolute top-2.5 right-2.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500 border border-slate-900"></span>
              </span>
            )}
          </motion.button>

          {/* site feedback modal */}
          <FeedbackModal
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
          />

          {/* custom credential authentication modal */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />

          {/* global footer */}
          <Footer
            onNavigate={handleNavigate}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      )}

      {/* global toast notifications */}
      <ToastContainer />

    </div>
  );
}
