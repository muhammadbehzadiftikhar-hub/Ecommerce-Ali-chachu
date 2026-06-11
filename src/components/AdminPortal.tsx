/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User as AppUser, Product, Category, Order, OrderStatus, PaymentStatus } from '../types';
import { 
  Plus, Edit2, Trash2, Calendar, ClipboardList, Package, LineChart, 
  Check, Trash, ArrowRight, ShieldCheck, HelpCircle, User as UserIcon, 
  RefreshCw, Search, X, AlertTriangle, CheckCircle, ShieldAlert, Eye, 
  Layers, Sparkles, TrendingUp, Coins, ShoppingBag, ArrowUpRight,
  MapPin, Printer, AlertCircle, Info, Tag, Loader2
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { verifyAdminRoleStrict } from '../services/authService';
import { 
  adminGetProducts,
  adminSaveProduct,
  adminDeleteProduct,
  adminGetCategories,
  adminSaveCategory,
  adminDeleteCategory,
  adminGetOrders,
  adminUpdateOrderStatus,
  adminUpdatePaymentStatus,
  adminGetUsers,
  adminUpdateUserRole
} from '../services/adminService';
import { getFriendlyErrorMessage } from '../services/errorHandler';

interface AdminPortalProps {
  products: Product[]; // Kept for interface compatibility but we fetch real-time from server
  categories: Category[]; // Kept for interface compatibility
  user: any;
  isAdmin: boolean;
  onNavigate: (view: string) => void;
  onResetSeed: () => void;
  onRefreshData?: () => void;
  isRefreshingData?: boolean;
}

export function AdminPortal({ 
  user, 
  onNavigate, 
  onResetSeed,
  onRefreshData,
  isRefreshingData
}: AdminPortalProps) {
  const { showToast } = useToast();
  const [isAdminVerified, setIsAdminVerified] = useState<boolean | null>(null);

  // Authoritative State loaded strictly via services from Firestore
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'products' | 'categories' | 'orders' | 'customers'>('stats');

  // Interactive operation states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Search filter states
  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Delete Confirmation state (Products & Categories)
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'product' | 'category' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inspector order state
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Product Form states
  const [prodName, setProdName] = useState('');
  const [prodSlug, setProdSlug] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodShortDesc, setProdShortDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(25);
  const [prodComparePrice, setProdComparePrice] = useState(30);
  const [prodSku, setProdSku] = useState('');
  const [prodQty, setProdQty] = useState(10);
  const [prodCatId, setProdCatId] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodStatus, setProdStatus] = useState<'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ACTIVE');
  const [prodImage, setProdImage] = useState('');
  const [prodMetaTitle, setProdMetaTitle] = useState('');
  const [prodMetaDesc, setProdMetaDesc] = useState('');

  // Category Form states
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImage, setCatImage] = useState('');

  // Enforce server-side role check immediately upon mounting AdminPortal
  useEffect(() => {
    let active = true;
    const runVerification = async () => {
      if (!user?.uid) {
        if (active) {
          showToast('Authentication Required: Please sign in.', 'error');
          onNavigate('storefront');
        }
        return;
      }
      try {
        const check = await verifyAdminRoleStrict(user.uid);
        if (active) {
          if (!check) {
            showToast('Access Denied: You do not have the required administrative role.', 'error');
            onNavigate('storefront');
          } else {
            setIsAdminVerified(true);
          }
        }
      } catch (e: any) {
        if (active) {
          showToast('Access Denied: Severe server verification error.', 'error');
          onNavigate('storefront');
        }
      }
    };
    runVerification();
    return () => {
      active = false;
    };
  }, [user, onNavigate]);

  // Load authoritative database lists
  const loadDatabaseRecords = async (silent = false) => {
    if (!silent) setIsLoadingData(true);
    try {
      const [prods, cats, ords, usrs] = await Promise.all([
        adminGetProducts(),
        adminGetCategories(),
        adminGetOrders(),
        adminGetUsers()
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setOrders(ords || []);
      setUsersList(usrs || []);
    } catch (e: any) {
      console.error("Dashboard metadata lookup failed:", e);
      const friendly = getFriendlyErrorMessage(e, "Failed to load directory tables from Firestore database.");
      showToast(friendly, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdminVerified) {
      loadDatabaseRecords();
    }
  }, [isAdminVerified]);

  const handleRefreshRecords = async () => {
    if (onRefreshData) {
      onRefreshData();
    }
    await loadDatabaseRecords();
    showToast("Database and logs synced with main host registry.", "success");
  };

  const triggerAppSeedDefault = async () => {
    if (window.confirm("Seeding database will wipe existing categories and products and replace them with boutique catalog defaults. Ready?")) {
      setIsLoadingData(true);
      try {
        await onResetSeed();
        await loadDatabaseRecords();
      } catch (err) {
        // Handled silently
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  // Automated sample image suggestions
  const handleAutoSuggestProductImage = () => {
    const text = (prodName + " " + prodCatId).toLowerCase();
    let url = 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=800&q=80';
    
    if (text.includes('phone') || text.includes('iphone') || text.includes('apple') || text.includes('electronics')) {
      url = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('headphone') || text.includes('audio') || text.includes('sound') || text.includes('sony')) {
      url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('watch') || text.includes('leather') || text.includes('accessories')) {
      url = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('trench') || text.includes('coat') || text.includes('outerwear') || text.includes('clothing')) {
      url = 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('sweater') || text.includes('knit') || text.includes('wool') || text.includes('clothing')) {
      url = 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('vase') || text.includes('ceramic') || text.includes('decor') || text.includes('home')) {
      url = 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('chair') || text.includes('desk') || text.includes('office') || text.includes('furniture')) {
      url = 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('backpack') || text.includes('bag') || text.includes('accessories')) {
      url = 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80';
    }
    setProdImage(url);
    showToast("✨ Suggested beautiful Unsplash asset matched to your product!", "success");
  };

  const handleAutoSuggestCategoryImage = () => {
    const text = catName.toLowerCase();
    let url = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80';

    if (text.includes('electro')) {
      url = 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80';
    } else if (text.includes('cloth') || text.includes('wear') || text.includes('apparel')) {
      url = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80';
    } else if (text.includes('access')) {
      url = 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80';
    } else if (text.includes('live') || text.includes('home') || text.includes('decor')) {
      url = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80';
    }
    setCatImage(url);
    showToast("✨ Selected stunning photography preset for this category!", "success");
  };

  // CRUD operation: save product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = prodSlug.trim() || prodName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const id = editingProduct ? editingProduct.id : `prod-${Date.now()}`;

      const payload: Product = {
        id,
        name: prodName,
        slug,
        description: prodDesc,
        shortDescription: prodShortDesc || prodDesc.slice(0, 100),
        price: Number(prodPrice),
        compareAtPrice: Number(prodComparePrice) || undefined,
        sku: prodSku,
        trackInventory: true,
        quantity: Number(prodQty),
        lowStockAlert: 2,
        categoryId: prodCatId,
        featured: prodFeatured,
        status: prodStatus,
        images: [{ url: prodImage || 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=800&q=80', alt: prodName, position: 0 }],
        variants: editingProduct?.variants || [],
        tags: editingProduct?.tags || ['general'],
        metaTitle: prodMetaTitle,
        metaDescription: prodMetaDesc,
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await adminSaveProduct(payload);
      setIsAddingProduct(false);
      setEditingProduct(null);
      showToast(`Product "${prodName}" saved successfully in Firestore catalog.`, 'success');
      await loadDatabaseRecords(true);
    } catch (err: any) {
      console.error("Save product failed:", err);
      const friendly = getFriendlyErrorMessage(err, "Strict authorization check failed. Access blocked.");
      showToast(friendly, 'error');
    }
  };

  // CRUD operation: save category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = catSlug.trim() || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const id = editingCategory ? editingCategory.id : `cat-${Date.now()}`;

      const payload: Category = {
        id,
        name: catName,
        slug,
        description: catDesc,
        image: catImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
        createdAt: editingCategory?.createdAt || new Date().toISOString()
      };

      await adminSaveCategory(payload);
      setIsAddingCategory(false);
      setEditingCategory(null);
      showToast(`Category "${catName}" saved successfully in Firestore directory.`, 'success');
      await loadDatabaseRecords(true);
    } catch (err: any) {
      console.error("Save category failed", err);
      const friendly = getFriendlyErrorMessage(err, "Policy block: Unauthorized category edits.");
      showToast(friendly, 'error');
    }
  };

  // Trigger deletion confirmations
  const triggerDeleteProduct = (id: string) => {
    setDeleteCandidateId(id);
    setDeleteType('product');
  };

  const triggerDeleteCategory = (id: string) => {
    setDeleteCandidateId(id);
    setDeleteType('category');
  };

  const executeConfirmedDeletion = async () => {
    if (!deleteCandidateId || !deleteType) return;
    setIsDeleting(true);
    try {
      if (deleteType === 'product') {
        await adminDeleteProduct(deleteCandidateId);
        showToast("Product successfully dropped from Firestore collection.", "success");
      } else {
        await adminDeleteCategory(deleteCandidateId);
        showToast("Category directory permanently stripped from Firestore database.", "success");
      }
      await loadDatabaseRecords(true);
    } catch (e: any) {
      console.error(e);
      const friendly = getFriendlyErrorMessage(e, "Unauthorized directory actions: Operation restricted.");
      showToast(friendly, "error");
    } finally {
      setDeleteCandidateId(null);
      setDeleteType(null);
      setIsDeleting(false);
    }
  };

  // Handle logistical track stages updates
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await adminUpdateOrderStatus(orderId, status);
      showToast(`Invoice order logistics shifted to ${status}.`, 'info');
      await loadDatabaseRecords(true);
      if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
        setSelectedOrderDetails(prev => prev ? { ...prev, status, updatedAt: new Date().toISOString() } : null);
      }
    } catch (e: any) {
      console.error(e);
      const friendly = getFriendlyErrorMessage(e, "Strict policy lockout: Failed to update order status.");
      showToast(friendly, 'error');
    }
  };

  // Handle Stripe billing status updates
  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    try {
      await adminUpdatePaymentStatus(orderId, paymentStatus);
      showToast(`Stripe transaction system recorded: ${paymentStatus}.`, 'success');
      await loadDatabaseRecords(true);
      if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
        setSelectedOrderDetails(prev => prev ? { ...prev, paymentStatus, updatedAt: new Date().toISOString() } : null);
      }
    } catch (e: any) {
      console.error(e);
      const friendly = getFriendlyErrorMessage(e, "Policy protection blocked modifying billing indices.");
      showToast(friendly, 'error');
    }
  };

  // Handle customer role switches
  const handleToggleUserRole = async (usr: AppUser) => {
    if (usr.id === user?.uid) {
      showToast("Administrator self-demotion block active: prevent lockout loops.", 'error');
      return;
    }
    try {
      const newRole = usr.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
      await adminUpdateUserRole(usr.id, newRole);
      showToast(`Swapped workspace role for ${usr.email || 'customer'} to ${newRole}.`, 'success');
      await loadDatabaseRecords(true);
    } catch (e: any) {
      console.error(e);
      const friendly = getFriendlyErrorMessage(e, "Security constraint: Cannot edit user profiles.");
      showToast(friendly, 'error');
    }
  };

  // Form setups for Add/Edit flows
  const openAddProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdSlug('');
    setProdDesc('');
    setProdShortDesc('');
    setProdPrice(250);
    setProdComparePrice(299);
    setProdSku(`SKU-${Date.now().toString().slice(-6)}`);
    setProdQty(20);
    setProdCatId(categories[0]?.id || '');
    setProdFeatured(false);
    setProdStatus('ACTIVE');
    setProdImage('');
    setProdMetaTitle('');
    setProdMetaDesc('');
    setIsAddingProduct(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdSlug(prod.slug);
    setProdDesc(prod.description);
    setProdShortDesc(prod.shortDescription || '');
    setProdPrice(prod.price);
    setProdComparePrice(prod.compareAtPrice || 0);
    setProdSku(prod.sku || '');
    setProdQty(prod.quantity || 0);
    setProdCatId(prod.categoryId);
    setProdFeatured(!!prod.featured);
    setProdStatus(prod.status || 'ACTIVE');
    setProdImage(prod.images?.[0]?.url || '');
    setProdMetaTitle(prod.metaTitle || '');
    setProdMetaDesc(prod.metaDescription || '');
    setIsAddingProduct(true);
  };

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatDesc('');
    setCatImage('');
    setIsAddingCategory(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatDesc(cat.description || '');
    setCatImage(cat.image || '');
    setIsAddingCategory(true);
  };

  // Calculations for Admin Analytics Stats Tab
  const activeProductsCount = products.filter(p => p.status === 'ACTIVE').length;
  const lowStockProductsCount = products.filter(p => p.quantity <= 3).length;
  
  const billingPaidSum = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingCargoCount = orders.filter(o => o.status === 'PENDING').length;
  
  // Filter systems
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.categoryId.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    c.description?.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.shippingAddress?.fullName || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.email.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.status?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const filteredCustomers = usersList.filter(u => 
    (u.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Layout Skeletons components for fluid transitions
  const StatsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-slate-200 rounded-md" />
              <div className="h-7 w-7 bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-7 w-28 bg-slate-200 rounded-md" />
            <div className="h-3.5 w-full bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>
      <div className="h-44 w-full bg-slate-100/70 border border-slate-200/50 rounded-2xl animate-pulse" />
    </div>
  );

  const ProductsSkeleton = () => (
    <div className="space-y-5 animate-pulse">
      {/* Utilities */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
        <div className="h-10 w-full sm:w-80 bg-slate-50 rounded-xl" />
        <div className="h-10 w-full sm:w-44 bg-slate-50 rounded-xl" />
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/55 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-5">Catalog Offering</th>
                <th className="py-4 px-4">Identifier / SKU</th>
                <th className="py-4 px-4">Value Price</th>
                <th className="py-4 px-4">Inventory Stocks</th>
                <th className="py-4 px-4">Direct State</th>
                <th className="py-4 px-5 text-right">Interactive Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {[1, 2, 3, 4, 5].map((idx) => (
                <tr key={idx}>
                  {/* Catalog Offering */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                      <div className="space-y-2">
                        <div className="h-3 w-36 bg-slate-200 rounded-md" />
                        <div className="h-2.5 w-20 bg-slate-100 rounded-md" />
                      </div>
                    </div>
                  </td>
                  {/* SKU */}
                  <td className="py-3.5 px-4">
                    <div className="h-3.5 w-20 bg-slate-200 rounded-md" />
                  </td>
                  {/* Price */}
                  <td className="py-3.5 px-4">
                    <div className="h-3.5 w-12 bg-slate-200 rounded-md" />
                  </td>
                  {/* Inventory */}
                  <td className="py-3.5 px-4">
                    <div className="h-5 w-16 bg-slate-100 rounded-lg" />
                  </td>
                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <div className="h-5 w-14 bg-slate-100 rounded-lg" />
                  </td>
                  {/* Actions */}
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex gap-2 justify-end">
                      <div className="h-7 w-7 bg-slate-100 rounded-lg animate-pulse" />
                      <div className="h-7 w-7 bg-slate-100 rounded-lg animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const CategoriesSkeleton = () => (
    <div className="space-y-5 animate-pulse">
      {/* Utilities */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
        <div className="h-10 w-full sm:w-80 bg-slate-50 rounded-xl" />
        <div className="h-10 w-full sm:w-44 bg-slate-50 rounded-xl" />
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="space-y-3">
              {/* Image banner placeholder */}
              <div className="w-full h-32 rounded-xl bg-slate-100 animate-pulse" />
              <div className="space-y-2">
                {/* Title */}
                <div className="h-4 w-32 bg-slate-200 rounded-md" />
                {/* Key */}
                <div className="h-2.5 w-24 bg-slate-100 rounded-md" />
                {/* Description lines */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-3 w-full bg-slate-100 rounded-md" />
                  <div className="h-3 w-4/5 bg-slate-100 rounded-md" />
                </div>
              </div>
            </div>
            {/* Footer row */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
              <div className="h-7 w-12 bg-slate-100 rounded-xl" />
              <div className="h-7 w-12 bg-slate-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const OrdersSkeleton = () => (
    <div className="space-y-5 animate-pulse">
      {/* Searchbar */}
      <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
        <div className="h-10 w-full sm:w-80 bg-slate-50 rounded-xl" />
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/55 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                <th className="py-4 px-5">Cargo Invoice</th>
                <th className="py-4 px-4">Consignee Client</th>
                <th className="py-4 px-4">Billing Code</th>
                <th className="py-4 px-4">Transit Stage</th>
                <th className="py-4 px-4">Invoice Total</th>
                <th className="py-4 px-5 text-right">Ledger Inspectors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {[1, 2, 3, 4, 5].map((idx) => (
                <tr key={idx}>
                  {/* Invoice Code */}
                  <td className="py-3.5 px-5">
                    <div className="h-3.5 w-20 bg-slate-200 rounded-md animate-pulse" />
                  </td>
                  {/* Client Consignee */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5 animate-pulse">
                      <div className="h-3 w-28 bg-slate-200 rounded-md" />
                      <div className="h-2.5 w-40 bg-slate-100 rounded-md" />
                    </div>
                  </td>
                  {/* Billing status */}
                  <td className="py-3.5 px-4">
                    <div className="h-5 w-16 bg-slate-100 rounded-lg animate-pulse" />
                  </td>
                  {/* Transit Stage */}
                  <td className="py-3.5 px-4">
                    <div className="h-5 w-18 bg-slate-100 rounded-lg animate-pulse" />
                  </td>
                  {/* Total price */}
                  <td className="py-3.5 px-4">
                    <div className="h-3.5 w-12 bg-slate-200 rounded-md animate-pulse" />
                  </td>
                  {/* Action button */}
                  <td className="py-3.5 px-5 text-right">
                    <div className="h-7 w-24 bg-slate-100 rounded-xl ml-auto animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const CustomersSkeleton = () => (
    <div className="space-y-5 animate-pulse">
      {/* Searchbar */}
      <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
        <div className="h-10 w-full sm:w-80 bg-slate-50 rounded-xl" />
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/55 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                <th className="py-4 px-5">System Account Node</th>
                <th className="py-4 px-4">Registered Contact Address</th>
                <th className="py-4 px-4">Authority Role Badge</th>
                <th className="py-4 px-5 text-right font-bold">Workspace Role Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {[1, 2, 3, 4, 5].map((idx) => (
                <tr key={idx}>
                  {/* System Account Node */}
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0 animate-pulse" />
                      <div className="space-y-1.5 animate-pulse">
                        <div className="h-3.5 w-32 bg-slate-200 rounded-md" />
                        <div className="h-2.5 w-24 bg-slate-100 rounded-md" />
                      </div>
                    </div>
                  </td>
                  {/* Contact Email */}
                  <td className="py-3 px-4">
                    <div className="h-3.5 w-44 bg-slate-200 rounded-md animate-pulse" />
                  </td>
                  {/* Role badge */}
                  <td className="py-3 px-4">
                    <div className="h-5 w-16 bg-slate-100 rounded-lg animate-pulse" />
                  </td>
                  {/* Action button */}
                  <td className="py-3 px-5 text-right">
                    <div className="h-7 w-28 bg-slate-100 rounded-xl ml-auto animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Loading security wrapper
  if (isAdminVerified === null) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <h3 className="font-sans font-semibold text-xs text-slate-400 uppercase tracking-widest animate-pulse">Checking Access Permissions...</h3>
      </div>
    );
  }

  return (
    <div id="admin-dashboard-container" className="flex flex-col lg:flex-row min-h-screen bg-slate-50/70 text-slate-800 font-sans">
      
      {/* PERSISTENT ELEGANT WHITE-AND-SLATE SIDEBAR ROUTER */}
      <aside className="w-full lg:w-64 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 flex flex-col p-6 font-sans">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-200">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm border border-slate-950">
            <ShieldCheck className="w-5 h-5 text-slate-100" />
          </div>
          <div>
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 leading-tight">Admin Console</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Enterprise Core</p>
          </div>
        </div>

        {/* Navigation Sidebar Options */}
        <nav className="flex-1 mt-6 space-y-1.5 focus:outline-none">
          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'stats'
                ? 'bg-slate-900 border-slate-900 text-slate-50 shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            <LineChart className={`w-4 h-4 ${activeTab === 'stats' ? 'text-slate-50' : 'text-slate-500'}`} />
            <span>Overview Metrics</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'products'
                ? 'bg-slate-900 border-slate-900 text-slate-50 shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            <Package className={`w-4 h-4 ${activeTab === 'products' ? 'text-slate-50' : 'text-slate-500'}`} />
            <span>Product Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'categories'
                ? 'bg-slate-900 border-slate-900 text-slate-50 shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === 'categories' ? 'text-slate-50' : 'text-slate-500'}`} />
            <span>Categories Director</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'orders'
                ? 'bg-slate-900 border-slate-900 text-slate-50 shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            <ClipboardList className={`w-4 h-4 ${activeTab === 'orders' ? 'text-slate-50' : 'text-slate-500'}`} />
            <span>Consignee Orders</span>
            {pendingCargoCount > 0 && (
              <span className={`ml-auto font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'orders' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {pendingCargoCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'customers'
                ? 'bg-slate-900 border-slate-900 text-slate-50 shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            <UserIcon className={`w-4 h-4 ${activeTab === 'customers' ? 'text-slate-50' : 'text-slate-500'}`} />
            <span>User Accounts</span>
          </button>
        </nav>

        {/* Global actions at bottom */}
        <div className="pt-5 border-t border-slate-200/80 mt-auto space-y-2.5">
          {/* Diagnostic Sync State */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">System Node</span>
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-extrabold text-slate-700 uppercase bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync</span>
            </span>
          </div>

          <button
            onClick={handleRefreshRecords}
            disabled={isLoadingData || isRefreshingData}
            className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData || isRefreshingData ? 'animate-spin' : ''} text-slate-500`} />
            <span>Force Sync</span>
          </button>

          <button
            onClick={triggerAppSeedDefault}
            className="w-full py-2.5 bg-white hover:bg-slate-100 text-rose-600 hover:text-rose-750 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200 shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500/80" />
            <span>System Reset</span>
          </button>
        </div>
      </aside>

      {/* PRIMARY CONTROLLER CONTENT AREA */}
      <main className="flex-1 flex flex-col p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Dynamic header summary indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg uppercase border border-slate-200 font-bold tracking-wider">
              System // {activeTab.toUpperCase()}
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1.5 font-sans">
              {activeTab === 'stats' && "Business Metrics Overview"}
              {activeTab === 'products' && "Product Catalog Registry"}
              {activeTab === 'categories' && "Category Resource Map"}
              {activeTab === 'orders' && "Customer Order Invoices"}
              {activeTab === 'customers' && "System User Profiles"}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('storefront')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2 shadow-sm border border-slate-800"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Back to Storefront</span>
            </button>
          </div>
        </div>

        {/* RENDERING ACTIVE TABS AND INCORPORATING ACCURATE SKELETON LOADERS */}
        {isLoadingData ? (
          <div>
            {activeTab === 'stats' && <StatsSkeleton />}
            {activeTab === 'products' && <ProductsSkeleton />}
            {activeTab === 'categories' && <CategoriesSkeleton />}
            {activeTab === 'orders' && <OrdersSkeleton />}
            {activeTab === 'customers' && <CustomersSkeleton />}
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. ANALYTICS STATS OVERVIEW PANEL */}
            {activeTab === 'stats' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Revenue Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-sans">Booked Revenue</span>
                      <div className="p-2 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                        <Coins className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">${billingPaidSum.toFixed(2)}</span>
                      <p className="text-[10px] font-medium text-slate-400 mt-1">Confirmed database payments</p>
                    </div>
                  </div>

                  {/* Orders Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-sans">Historical Orders</span>
                      <div className="p-2 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                        <ClipboardList className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{orders.length} Invoices</span>
                      <p className="text-[10px] font-medium text-slate-400 mt-1">Total combined cargo receipts</p>
                    </div>
                  </div>

                  {/* Active Products */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-sans">Listed Offerings</span>
                      <div className="p-2 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                        <Package className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{activeProductsCount} <span className="text-xs text-slate-400 font-semibold font-sans">/ {products.length} active</span></span>
                      <p className="text-[10px] font-medium text-slate-400 mt-1">Catalog items ready for purchase</p>
                    </div>
                  </div>

                  {/* Critical Inventory */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-sans">Stock Alerts</span>
                      <div className={`p-2 rounded-xl border ${lowStockProductsCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className={`text-2xl font-bold font-mono tracking-tight ${lowStockProductsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{lowStockProductsCount} Items</span>
                      <p className="text-[10px] font-medium text-slate-400 mt-1">Stock levels critical (qty &lt;= 3)</p>
                    </div>
                  </div>
                </div>

                {/* Database summary card report */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-5 justify-between">
                  <div className="flex gap-4 items-center">
                    <div className="p-3 bg-slate-100 text-slate-800 rounded-xl border border-slate-200 shrink-0">
                      <ShieldCheck className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Persistent Authoritative Master Database Node</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5 font-medium">All administrative collections automatically execute on high-durability Google Firestore layers.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleRefreshRecords}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl text-xs transition-transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Synchronize Directory</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PRODUCTS DATATABLES REGISTRY */}
            {activeTab === 'products' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* Product utilities */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter product directory (sku, category)..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  
                  <button
                    onClick={openAddProductModal}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Catalog Entry</span>
                  </button>
                </div>

                {/* Product catalog matrix card table */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50/55 border-b border-slate-105 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="py-4 px-5">Catalog Offering</th>
                          <th className="py-4 px-4">Identifier / SKU</th>
                          <th className="py-4 px-4">Value Price</th>
                          <th className="py-4 px-4">Inventory Stocks</th>
                          <th className="py-4 px-4">Direct State</th>
                          <th className="py-4 px-5 text-right">Interactive Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-slate-450 text-slate-400 font-medium">No catalog product matches. Click "Create Catalog Entry" or re-sync data.</td>
                          </tr>
                        ) : (
                          filteredProducts.map((p) => {
                            const cat = categories.find(c => c.id === p.categoryId);
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/40 transition-colors font-medium text-slate-700">
                                
                                {/* Catalog offering details */}
                                <td className="py-3 px-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100/80 shrink-0 bg-slate-50">
                                      <img src={p.images?.[0]?.url || 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=150&q=80'} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-extrabold text-slate-900 truncate max-w-xs">{p.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{cat?.name || p.categoryId}</p>
                                    </div>
                                  </div>
                                </td>

                                {/* SKU */}
                                <td className="py-3 px-4 font-mono text-[10px] text-slate-500 font-semibold uppercase">{p.sku || p.id.slice(0, 8).toUpperCase()}</td>

                                {/* Price */}
                                <td className="py-3 px-4">
                                  <div className="font-mono text-[11px] font-extrabold text-[#0f172a]">
                                    ${p.price.toFixed(2)}
                                  </div>
                                  {p.compareAtPrice && p.compareAtPrice > p.price && (
                                    <span className="font-mono text-[10px] text-slate-400 line-through">${p.compareAtPrice.toFixed(2)}</span>
                                  )}
                                </td>

                                {/* Stock stocks */}
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold border ${
                                    p.quantity <= 0
                                      ? 'bg-rose-50 border-rose-100 text-rose-600'
                                      : p.quantity <= 3
                                        ? 'bg-amber-50 border-amber-100 text-amber-600'
                                        : 'bg-slate-50 border-slate-100 text-slate-600'
                                  }`}>
                                    {p.quantity <= 0 ? "Depleted" : `${p.quantity} Units`}
                                  </span>
                                </td>

                                {/* Direct Product State */}
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1.5 uppercase font-bold text-[9px] px-2 py-0.5 rounded-lg border ${
                                    p.status === 'ACTIVE'
                                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                      : p.status === 'DRAFT'
                                        ? 'bg-amber-50 border-amber-100 text-amber-600'
                                        : 'bg-slate-50 border-slate-100 text-slate-400'
                                  }`}>
                                    <span className={`w-1 h-1 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-500' : p.status === 'DRAFT' ? 'bg-amber-500' : 'bg-slate-450 bg-slate-400'}`} />
                                    <span>{p.status || 'ACTIVE'}</span>
                                  </span>
                                </td>

                                {/* Product Actions */}
                                <td className="py-3 px-5 text-right">
                                  <div className="inline-flex gap-1.5">
                                    <button 
                                      onClick={() => openEditProductModal(p)}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => triggerDeleteProduct(p.id)}
                                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>

                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 3. CATEGORIES DIRECTOR MAP */}
            {activeTab === 'categories' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* Category utilities */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter directory map..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <button
                    onClick={openAddCategoryModal}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Category Map</span>
                  </button>
                </div>

                {/* Grid layout for categories in database */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCategories.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400 font-medium">
                      No category folders mapped. Create one manually to proceed!
                    </div>
                  ) : (
                    filteredCategories.map((c) => {
                      const prodsCount = products.filter(p => p.categoryId === c.id).length;
                      return (
                        <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative">
                              <img src={c.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=350&q=80'} alt="" className="w-full h-full object-cover" />
                              <span className="absolute bottom-3 right-3 font-mono font-bold text-[9px] text-white bg-slate-950/70 backdrop-blur-sm px-2.5 py-1 rounded-lg uppercase border border-white/20">
                                {prodsCount} Products
                              </span>
                            </div>
                            <div>
                              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{c.name}</h3>
                              <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">DIRECTORY KEY: {c.id}</p>
                              <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{c.description || 'No description summary available.'}</p>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-50/80">
                            <button 
                              onClick={() => openEditCategoryModal(c)}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer border border-slate-100"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => triggerDeleteCategory(c.id)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer border border-rose-100/30"
                            >
                              Strip
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}

            {/* 4. ORDERS INVOICE MANAGER */}
            {activeTab === 'orders' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* Orders search toolbar */}
                <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter order ledger (id, client email, destination)..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Orders list data tables */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50/55 border-b border-slate-105 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="py-4 px-5">Cargo Invoice</th>
                          <th className="py-4 px-4">Consignee Client</th>
                          <th className="py-4 px-4">Billing Code</th>
                          <th className="py-4 px-4">Transit Stage</th>
                          <th className="py-4 px-4">Invoice Total</th>
                          <th className="py-4 px-5 text-right">Ledger Inspectors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No order invoices on Firestore records matching criteria.</td>
                          </tr>
                        ) : (
                          filteredOrders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50/40 transition-colors text-slate-705 font-medium">
                              
                              {/* Invoice code */}
                              <td className="py-3.5 px-5 font-mono text-[11px] font-extrabold text-slate-900 uppercase">
                                {o.orderNumber || o.id.slice(0, 8).toUpperCase()}
                              </td>

                              {/* Consignee */}
                              <td className="py-3.5 px-4">
                                <p className="font-extrabold text-slate-850 text-slate-900">{o.shippingAddress?.fullName || 'Guest client'}</p>
                                <p className="text-[10px] font-mono text-slate-400 font-medium select-all">{o.email}</p>
                              </td>

                              {/* Billing Status */}
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[9px] font-extrabold uppercase ${
                                  o.paymentStatus === 'PAID'
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                    : o.paymentStatus === 'REFUNDED'
                                      ? 'bg-sky-50 border-sky-100 text-sky-600'
                                      : 'bg-amber-50 border-amber-100 text-amber-600'
                                }`}>
                                  <span>{o.paymentStatus || 'PENDING'}</span>
                                </span>
                              </td>

                              {/* Transit Cargo Status */}
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 border text-[9px] font-extrabold uppercase ${
                                  o.status === 'DELIVERED'
                                    ? 'bg-sky-50 border-sky-100 text-sky-600'
                                    : o.status === 'SHIPPED'
                                      ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                                      : o.status === 'CANCELLED'
                                        ? 'bg-rose-50 border-rose-100 text-rose-600'
                                        : 'bg-amber-50 border-amber-100 text-amber-600'
                                }`}>
                                  {o.status || 'PENDING'}
                                </span>
                              </td>

                              {/* Sum total value */}
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-[11px]">
                                ${(o.total || 0).toFixed(2)}
                              </td>

                              {/* Ledger actions */}
                              <td className="py-3.5 px-5 text-right">
                                <button
                                  onClick={() => setSelectedOrderDetails(o)}
                                  className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-55 hover:bg-indigo-50 text-slate-550 text-slate-500 hover:text-indigo-600 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors border border-slate-100 cursor-pointer"
                                >
                                  Inspect Details
                                </button>
                              </td>

                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 5. CUSTOMER MATRIX ACCOUNTS */}
            {activeTab === 'customers' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* Search customers */}
                <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter accounts ledger..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Table list */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50/55 border-b border-slate-105 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="py-4 px-5">System Account Node</th>
                          <th className="py-4 px-4">Registered Contact Address</th>
                          <th className="py-4 px-4">Authority Role Badge</th>
                          <th className="py-4 px-5 text-right font-bold">Workspace Role Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-12 text-slate-405 text-slate-400 font-medium">No system registrations matched.</td>
                          </tr>
                        ) : (
                          filteredCustomers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/45 transition-colors text-slate-705 font-medium">
                              
                              {/* Customer Identity */}
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 border border-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                                    <UserIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-extrabold text-slate-900">{u.name || 'Unrecorded Explorer'}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {u.id.toUpperCase()}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Email Address */}
                              <td className="py-3 px-4 font-mono select-all text-slate-500 font-medium">{u.email || 'No email associated'}</td>

                              {/* Role */}
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1.5 font-sans font-bold text-[9px] uppercase px-2 py-0.5 rounded-lg border ${
                                  u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'
                                    ? 'bg-rose-50 border-rose-100 text-rose-600'
                                    : 'bg-slate-50 border-slate-100 text-slate-500'
                                }`}>
                                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                  <span>{u.role || 'CUSTOMER'}</span>
                                </span>
                              </td>

                              {/* Command controls */}
                              <td className="py-3 px-5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserRole(u)}
                                  className={`px-3 py-1.5 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors border cursor-pointer ${
                                    u.role === 'ADMIN'
                                      ? 'bg-rose-50 border-rose-100/30 text-rose-605 text-rose-600 hover:bg-rose-100'
                                      : 'bg-indigo-50 border-indigo-100/35 text-indigo-600 hover:bg-indigo-100'
                                  }`}
                                >
                                  {u.role === 'ADMIN' ? 'Demote Client' : 'Authorize Admin'}
                                </button>
                              </td>

                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* CREATE / EDIT PRODUCT SLIDE DIALOG MODAL */}
      {isAddingProduct && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-150 animate-in zoom-in-95 duration-200 p-6 text-slate-850">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase font-bold">
                  Boutique Catalog Director
                </span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight mt-1">
                  {editingProduct ? `Edit Catalog Details: ${prodName}` : 'Create Catalog Product Item'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsAddingProduct(false);
                  setEditingProduct(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-semibold text-slate-755 text-slate-705">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Product Headline *</label>
                  <input
                    id="form-p-name"
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => {
                      setProdName(e.target.value);
                      if (!editingProduct) {
                        setProdSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                        setProdMetaTitle(`${e.target.value} | Premium Boutique Offering`);
                        setProdMetaDesc(`Exquisite purchase details for ${e.target.value}. Explore luxury standard details on MyStore.`);
                      }
                    }}
                    placeholder="Classic Suede Trench Coat"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">URL Directory Key Slug</label>
                  <input
                    id="form-p-slug"
                    type="text"
                    value={prodSlug}
                    onChange={(e) => setProdSlug(e.target.value)}
                    placeholder="classic-suede-trench-coat"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Direct Listing Price ($) *</label>
                  <input
                    id="form-p-price"
                    type="number"
                    required
                    step="0.01"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    placeholder="250.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-mono text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Strikethrough Price ($)</label>
                  <input
                    id="form-p-compare"
                    type="number"
                    step="0.01"
                    value={prodComparePrice}
                    onChange={(e) => setProdComparePrice(Number(e.target.value))}
                    placeholder="299.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-mono text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Inventory Units Stocks *</label>
                  <input
                    id="form-p-qty"
                    type="number"
                    required
                    value={prodQty}
                    onChange={(e) => setProdQty(Number(e.target.value))}
                    placeholder="20"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Stock keeping code (SKU)</label>
                  <input
                    id="form-p-sku"
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="COAT-TRN-SLT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-mono text-slate-950 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Target Category Directory *</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl select-none">
                    <select
                      id="form-p-category"
                      required
                      value={prodCatId}
                      onChange={(e) => setProdCatId(e.target.value)}
                      className="w-full bg-transparent font-bold inline-block outline-none cursor-pointer border-none py-0.5 text-slate-800"
                    >
                      <option value="">Choose category directory</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Release Visibility Status *</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl select-none">
                    <select
                      id="form-p-status"
                      required
                      value={prodStatus}
                      onChange={(e) => setProdStatus(e.target.value as any)}
                      className="w-full bg-transparent font-bold inline-block outline-none cursor-pointer border-none py-0.5 text-slate-805"
                    >
                      <option value="ACTIVE" className="text-[#0f172a]">ACTIVE Catalog</option>
                      <option value="DRAFT" className="text-[#0f172a]">DRAFT (Hidden)</option>
                      <option value="ARCHIVED" className="text-[#0f172a]">ARCHIVED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sample suggestion input for files */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Unsplash Photography Asset Link *</label>
                  <button
                    id="auto-suggest-match-btn"
                    type="button"
                    onClick={handleAutoSuggestProductImage}
                    className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-150 transition-colors"
                  >
                    Match Scenic Image Suggestion
                  </button>
                </div>
                <input
                  id="form-p-image"
                  type="url"
                  required
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl px-4 py-2.5 outline-none font-mono text-[11px] text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Short Overview Tagline *</label>
                <input
                  id="form-p-short-desc"
                  type="text"
                  required
                  value={prodShortDesc}
                  onChange={(e) => setProdShortDesc(e.target.value)}
                  placeholder="Tailored wool outerwear fitted with premium Italian horn toggles."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-medium text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Detailed Specifications Paragraph *</label>
                <textarea
                  id="form-p-desc"
                  required
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Fully describe physical dimensions, construction, style lines..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 h-24 outline-none focus:border-indigo-500 font-medium resize-none text-slate-900"
                />
              </div>

              {/* Optional Meta tag parameters */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-3">
                <h4 className="font-extrabold text-[9px] text-indigo-555 text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Meta tags / SEO indices descriptors</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Search Engine Headline Value</label>
                    <input
                      id="form-p-meta-title"
                      type="text"
                      value={prodMetaTitle}
                      onChange={(e) => setProdMetaTitle(e.target.value)}
                      placeholder="Custom Title Tag"
                      className="w-full bg-white border border-slate-150 rounded-xl px-3.5 py-2 outline-none text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Search Engine Snippet summary</label>
                    <input
                      id="form-p-meta-desc"
                      type="text"
                      value={prodMetaDesc}
                      onChange={(e) => setProdMetaDesc(e.target.value)}
                      placeholder="Custom Meta Description"
                      className="w-full bg-white border border-slate-150 rounded-xl px-3.5 py-2 outline-none text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Featured checkbox */}
              <div className="flex items-center gap-2.5 py-1">
                <input
                  id="form-p-featured"
                  type="checkbox"
                  checked={prodFeatured}
                  onChange={(e) => setProdFeatured(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 text-indigo-600 border-slate-300 accent-indigo-600 outline-none cursor-pointer"
                />
                <label htmlFor="form-p-featured" className="text-slate-700 font-bold select-none cursor-pointer">
                  Pin Feature Offering on Home Explorer (Featured Grid)
                </label>
              </div>

              <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-4 mt-2">
                <button
                  id="prod-form-cancel-btn"
                  type="button"
                  onClick={() => {
                    setIsAddingProduct(false);
                    setEditingProduct(null);
                  }}
                  className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="prod-form-save-btn"
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Save Catalog item
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CATEGORY MAP SLIDE MODAL */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-205">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-150 p-6 text-slate-800">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5 animate-in slide-in-from-top-1">
              <div>
                <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase font-bold">
                  Boutique Category Directory Manager
                </span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight mt-1">
                  {editingCategory ? `Modify Category: ${catName}` : 'Add Category Directory'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsAddingCategory(false);
                  setEditingCategory(null);
                }}
                className="p-1.5 hover:bg-slate-105 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs font-semibold text-slate-705">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Category Title *</label>
                  <input
                    id="form-c-name"
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => {
                      setCatName(e.target.value);
                      if (!editingCategory) {
                        setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    placeholder="Womens Casuals Apparel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-medium text-slate-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Directory URL Slug</label>
                  <input
                    id="form-c-slug"
                    type="text"
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    placeholder="womens-casuals"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-mono text-slate-955"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Scenic Category Banner Asset *</label>
                  <button
                    id="auto-suggest-cat-match-btn"
                    type="button"
                    onClick={handleAutoSuggestCategoryImage}
                    className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-150 transition-colors"
                  >
                    Load Photographic Portrait Suggestion
                  </button>
                </div>
                <input
                  id="form-c-image"
                  type="url"
                  required
                  value={catImage}
                  onChange={(e) => setCatImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl px-4 py-3 outline-none text-slate-900 font-mono text-[11px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-extrabold uppercase tracking-wider text-[8.5px]">Brief Description Sub-summary *</label>
                <textarea
                  id="form-c-desc"
                  required
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Summarize coordinates, styling themes, and category directory values..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 h-24 outline-none focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500/10 text-slate-950 font-medium resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-4 mt-2">
                <button
                  id="cat-form-cancel-btn"
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setEditingCategory(null);
                  }}
                  className="px-4.5 py-2.5 bg-slate-105 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="cat-form-save-btn"
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Save Category details
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DETAILED INTERACTIVE ORDER DETAILED INSPECT MODAL */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-150 animate-in zoom-in-95 duration-200 text-slate-805 p-6 sm:p-7">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="font-mono text-[10px] bg-slate-100 border border-slate-200/50 text-slate-500 px-2 py-0.5 rounded-lg uppercase">
                  Order Details Inspector
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-indigo-500" />
                  <span>Invoice: {selectedOrderDetails.orderNumber || selectedOrderDetails.id.slice(0, 8).toUpperCase()}</span>
                </h3>
              </div>
              <button 
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6 text-xs text-slate-700 font-semibold">
              
              {/* Grid Client Detail & Address details layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Contact information */}
                <div className="p-4 bg-slate-50 border border-slate-200/45 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-[9.5px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Client Contact Information</span>
                  </h4>
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 text-[12px]">
                      {selectedOrderDetails.shippingAddress?.fullName || 'Guest Client'}
                    </p>
                    <p className="font-mono text-slate-500 select-all font-medium mt-0.5">{selectedOrderDetails.email}</p>
                    {selectedOrderDetails.phone && (
                      <p className="text-slate-505 text-slate-500 font-mono mt-0.5">{selectedOrderDetails.phone}</p>
                    )}
                  </div>
                </div>

                {/* Shipping Delivery address */}
                <div className="p-4 bg-slate-50 border border-slate-200/45 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-[9.5px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>Insured Cargo Destination</span>
                  </h4>
                  <div className="font-medium text-slate-600 leading-relaxed">
                    <p className="font-bold text-slate-800">{selectedOrderDetails.shippingAddress?.street}</p>
                    <p className="text-slate-700">{selectedOrderDetails.shippingAddress?.city}, {selectedOrderDetails.shippingAddress?.state} {selectedOrderDetails.shippingAddress?.zipCode}</p>
                    <p className="font-semibold uppercase text-slate-400 mt-1">{selectedOrderDetails.shippingAddress?.country || 'United States'}</p>
                  </div>
                </div>
              </div>

              {/* Order Status Controller Dashboard Panel bar */}
              <div className="p-4 bg-slate-100/50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-850 text-slate-800">Logistic Stage Actions</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Overrule delivery tracks and Stripe invoices instantly.</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Cargo Stage</label>
                    <div className="inline-flex items-center rounded-xl bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
                      <select
                        id="dialog-delivery-stage"
                        value={selectedOrderDetails.status || 'PENDING'}
                        onChange={(e) => handleUpdateOrderStatus(selectedOrderDetails.id, e.target.value as OrderStatus)}
                        className="bg-transparent font-bold cursor-pointer outline-none border-none text-[10px] font-sans uppercase shrink-0 text-slate-800"
                      >
                        <option value="PENDING" className="text-slate-900">PENDING</option>
                        <option value="CONFIRMED" className="text-slate-900">CONFIRMED</option>
                        <option value="PROCESSING" className="text-slate-900">PROCESSING</option>
                        <option value="SHIPPED" className="text-slate-900">SHIPPED</option>
                        <option value="DELIVERED" className="text-slate-900">DELIVERED</option>
                        <option value="CANCELLED" className="text-slate-900">CANCELLED</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Billing Code</label>
                    <div className="inline-flex items-center rounded-xl bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
                      <select
                        id="dialog-payment-stage"
                        value={selectedOrderDetails.paymentStatus || 'PENDING'}
                        onChange={(e) => handleUpdatePaymentStatus(selectedOrderDetails.id, e.target.value as PaymentStatus)}
                        className="bg-transparent font-bold cursor-pointer outline-none border-none text-[10px] font-sans uppercase shrink-0 text-slate-800"
                      >
                        <option value="PENDING" className="text-slate-900">PENDING</option>
                        <option value="PAID" className="text-slate-900">PAID</option>
                        <option value="FAILED" className="text-slate-900">FAILED</option>
                        <option value="REFUNDED" className="text-slate-900">REFUNDED</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Breakdown list in order */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-[9.5px] text-slate-400 uppercase tracking-widest">Ordered Cart Items</h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm bg-white">
                  {selectedOrderDetails.items?.map((item, idx) => {
                    const matchedProd = products.find(p => p.id === item.productId);
                    const itemImg = item.image || matchedProd?.images?.[0]?.url || 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=150&q=80';
                    return (
                      <div key={item.id || idx} className="p-4 flex items-center justify-between gap-4 font-medium text-slate-700">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
                            <img src={itemImg} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate text-[11px]">{item.name}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                              SKU / ID: {item.productId.slice(0, 8).toUpperCase()} {item.variant ? `• Variant: ${item.variant}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-[11px] font-bold text-slate-900">${item.price.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Qty: {item.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pricing breakdown receipts summary list */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/55 space-y-2 font-medium text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Subtotal Amount</span>
                  <span className="font-mono font-bold text-slate-800">${selectedOrderDetails.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Insured Express Cargo flat rate</span>
                  <span className="font-mono font-bold text-slate-800">${selectedOrderDetails.shippingCost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>State Taxes (Estimated)</span>
                  <span className="font-mono font-bold text-slate-800">${selectedOrderDetails.tax?.toFixed(2) || '0.00'}</span>
                </div>
                {selectedOrderDetails.discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-500 font-bold">
                    <span>Applied coupon Discounts</span>
                    <span className="font-mono">-${selectedOrderDetails.discount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between font-bold text-slate-905 text-slate-900 text-sm">
                  <span>Total Persisted Sum</span>
                  <span className="font-mono">${selectedOrderDetails.total?.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm text-[10px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print invoice receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="px-5 py-2 bg-slate-90 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION SCREEN DIALOG */}
      {deleteCandidateId && deleteType && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-205 text-center">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {deleteType === 'product' ? 'Permanently Delete Product?' : 'Permanently Delete Category?'}
            </h3>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed font-semibold">
              {deleteType === 'product' 
                ? 'This action drops this product catalog item completely from your Firestore database catalog. This cannot be reverted.'
                : 'This action drops this Category folder completely from your Firestore database category structure. This cannot be reverted.'}
            </p>

            <div className="flex gap-2.5 justify-center mt-6">
              <button
                id="cancel-delete-alert-btn"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteCandidateId(null);
                  setDeleteType(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                No, Keep
              </button>
              <button
                id="confirm-delete-alert-btn"
                disabled={isDeleting}
                onClick={executeConfirmedDeletion}
                className="px-4  py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
