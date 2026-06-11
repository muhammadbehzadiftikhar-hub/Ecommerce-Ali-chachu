/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Package, Calendar, DollarSign, ChevronRight, ArrowLeft, RefreshCw, Eye, ShieldCheck } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { Order } from '../types';

interface OrderHistoryViewProps {
  user: FirebaseUser | null;
  onNavigateToStore: () => void;
  onSelectOrder?: (order: Order) => void;
}

export function OrderHistoryView({ user, onNavigateToStore }: OrderHistoryViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Querying the orders collection matching past orders for current client
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef, 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(list);
      setLoading(false);
    }, (error) => {
      console.warn("Order snapshot query failed. Falling back to simple query without index requirements.", error);
      // Fallback in case composer index is active or not made yet, safely try simple query
      const fallbackQuery = query(ordersRef, where('userId', '==', user.uid));
      getDocs(fallbackQuery).then((snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Order);
        });
        setOrders(list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      }).catch((err) => {
        console.error("Orders load failed:", err);
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'SHIPPED':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'PROCESSING':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20 px-6 max-w-sm mx-auto">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Package className="w-6 h-6" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800 mb-1">Authenticating Required</h3>
        <p className="text-xs text-slate-500 mb-6">
          Please login to view details of your personal boutique purchase records.
        </p>
        <button
          onClick={onNavigateToStore}
          className="inline-flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return To Store</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
        <span className="text-xs text-slate-400 uppercase tracking-widest animate-pulse font-sans">Compiling Order Ledger...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 font-sans">
      {selectedOrder ? (
        // Inner view: Detailed single order checkout receipt view
        <div className="space-y-8">
          <button
            onClick={() => setSelectedOrder(null)}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Orders</span>
          </button>

          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
              <div>
                <span className="text-xs text-slate-400 font-medium">Purchase Receipt for</span>
                <h2 className="text-xl font-bold text-slate-900">{selectedOrder.orderNumber}</h2>
                <p className="text-[11px] text-slate-400 mt-1">ID: {selectedOrder.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-3 py-1.5 border rounded-full ${getStatusBadgeClass(selectedOrder.status)}`}>
                  Status: {selectedOrder.status}
                </span>
                <span className="text-xs font-semibold bg-white border border-slate-100 px-3 py-1.5 rounded-full text-slate-600">
                  {selectedOrder.paymentStatus}
                </span>
              </div>
            </div>

            {/* Shopping Items List */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchased Selections</h3>
              <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl overflow-hidden p-2">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 last:border-0">
                    <div className="flex items-center gap-4">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-xl " />
                      ) : (
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                        {item.variant && <p className="text-[10px] text-slate-400 mt-0.5">Edition: {item.variant}</p>}
                        <p className="text-[10px] text-slate-400 mt-0.5">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold font-mono text-slate-800">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shipping Address</h3>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 text-xs space-y-1 text-slate-600 leading-relaxed">
                  <p className="font-bold text-slate-800">{selectedOrder.shippingAddress.fullName}</p>
                  <p>{selectedOrder.shippingAddress.street}</p>
                  <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                  <p>{selectedOrder.shippingAddress.country}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Overview</h3>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 text-xs space-y-2 font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-slate-800">${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Taxes</span>
                    <span className="text-slate-800">${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cargo Delivery</span>
                    <span className="text-slate-800">${selectedOrder.shippingCost === 0 ? 'Complimentary' : `$${selectedOrder.shippingCost.toFixed(2)}`}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Promo Coupon Discount</span>
                      <span>-${selectedOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-bold text-slate-900 text-slate-950 font-mono">
                    <span>Grand Total</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <span className="text-[10px] text-slate-400 font-medium block flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>MyStore Premium Guarantee Certifies Secured Encryption</span>
            </span>
          </div>
        </div>
      ) : (
        // List view: all historical shopping transactions
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-sans text-slate-900 tracking-tight">Your Order History</h2>
              <p className="text-xs text-slate-500 mt-1">Review status updates and detailed receipts for all past transactions</p>
            </div>
            
            <button
              onClick={onNavigateToStore}
              className="inline-flex items-center gap-1.5 text-xs border border-slate-200/65 hover:border-slate-800 px-4 py-2 rounded-xl transition-all font-medium text-slate-700 hover:text-slate-950"
            >
              <span>Back Storefront</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 max-w-lg mx-auto">
              <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Package className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="font-sans font-bold text-base text-slate-800 mb-1">No Orders Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6">
                You haven't initiated any previous package transactions with this profile credentials.
              </p>
              <button
                onClick={onNavigateToStore}
                className="inline-flex bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl active:scale-95 transition-all shadow-md"
              >
                <span>Browse Products catalog</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-slate-100 hover:border-slate-300 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-2 flex-grow">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-slate-800 uppercase bg-slate-100 px-2.5 py-1 rounded-lg">
                        {order.orderNumber}
                      </span>
                      <span className={`text-[10px] font-sans font-bold uppercase border px-2.5 py-1 rounded-full ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Instant ago'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800 font-mono">${order.total.toFixed(2)}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-[11px] text-slate-400 leading-none">
                        <span>{order.items.length} {order.items.length === 1 ? 'selection' : 'items'} in parcel</span>
                      </div>
                    </div>
                  </div>

                  <button
                    id={`view-order-details-${order.id}`}
                    onClick={() => setSelectedOrder(order)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-50/70 border border-indigo-100 px-4 py-2.5 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Receipt</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
