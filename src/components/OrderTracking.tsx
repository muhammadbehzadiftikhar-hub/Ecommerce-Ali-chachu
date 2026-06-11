/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Package, Search, Calendar, MapPin, Truck, CheckCircle2, ShoppingBag, ArrowLeft, RefreshCw, Star, AlertCircle, ShieldCheck } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';

interface OrderTrackingProps {
  onNavigateToStore: () => void;
  initialOrderId?: string;
}

export function OrderTracking({ onNavigateToStore, initialOrderId = '' }: OrderTrackingProps) {
  const [searchQuery, setSearchQuery] = useState(initialOrderId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = searchQuery.trim();
    if (!queryStr) {
      setError('Please provide an Order ID or Order Number.');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      // 1. Try to find the document by direct document ID match
      const docRef = doc(db, 'orders', queryStr);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        setLoading(false);
        return;
      }

      // 2. Try to find by orderNumber field
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('orderNumber', '==', queryStr.toUpperCase()));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const found = snap.docs[0];
        setOrder({ id: found.id, ...found.data() } as Order);
        setLoading(false);
        return;
      }

      // 3. Try to do case-insensitive/prefix or check if it's the id itself
      setError("We could not locate a parcel matching that track code. Verify the syntax and retry.");
    } catch (err) {
      console.error("Error retrieving tracking data:", err);
      setError("An unexpected network error occurred while querying the tracking database.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'PROCESSING': return 1;
      case 'SHIPPED': return 2;
      case 'DELIVERED': return 3;
      case 'CANCELLED': return -1;
      default: return 0;
    }
  };

  const steps = [
    { label: 'Order Confirmed', desc: 'Secure payment transaction processed', icon: ShoppingBag },
    { label: 'Processing Parcel', desc: 'Sourced from shelf, packaged, and tagged', icon: RefreshCw },
    { label: 'Shipped & In Transit', desc: 'Dispatched to target hub', icon: Truck },
    { label: 'Out for Delivery / Delivered', desc: 'Arrived at destination address', icon: CheckCircle2 }
  ];

  const currentStepIdx = order ? getStatusStepIndex(order.status) : 0;

  return (
    <div className="max-w-4xl mx-auto py-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-sans text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-slate-900" />
            <span>Track Parcel Courier</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Acquire live transit coordinates and status logs directly from our storage system</p>
        </div>

        <button
          onClick={onNavigateToStore}
          className="inline-flex items-center gap-1.5 text-xs border border-slate-200 hover:border-slate-800 px-4 py-2 rounded-xl transition-all font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </button>
      </div>

      {/* Tracker search inputs */}
      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8 mb-8 max-w-2xl mx-auto text-center">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 font-sans">
          Look up Style Consignment Status
        </h3>
        <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
          Enter either the generated Order Track Reference (e.g., <span className="font-semibold text-slate-800 font-mono">ORD-XXXX</span>) or the system ID to track delivery.
        </p>

        <form onSubmit={handleTrack} className="flex gap-2 max-w-md mx-auto">
          <input
            id="order-tracking-search-input"
            type="text"
            required
            maxLength={128}
            placeholder="E.g., ORD-7926"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow bg-white border border-slate-200 focus:border-slate-850 outline-none rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 transition-all shadow-inner placeholder:text-slate-400 font-mono uppercase"
          />
          <button
            id="order-tracking-submit-btn"
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs px-5 py-3 rounded-2xl cursor-pointer active:scale-95 transition-all w-24 shrink-0"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Log Track'}
          </button>
        </form>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-2xl text-xs flex items-center gap-2 max-w-md mx-auto mt-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Tracking results view */}
      {order && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Tracking Reference</span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-mono mt-0.5">{order.orderNumber}</h3>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">System ID: {order.id}</p>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5">
                <span className={`self-start sm:self-auto text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                  order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  order.status === 'SHIPPED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                  order.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {order.status}
                </span>
                <span className="text-[10px] text-slate-450 font-medium">
                  Created Date: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Instant ago'}
                </span>
              </div>
            </div>

            {/* Stepper progress representation */}
            {order.status === 'CANCELLED' ? (
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 text-center text-rose-800">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <h4 className="font-sans font-bold text-sm">Consignment Cancelled</h4>
                <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">
                  This transaction shipment has been halted. Any refunds will reflect to safety wallets inside 5 business cycles.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Transit Milestones</h4>
                
                {/* Visual timeline loop */}
                <div className="relative mt-4 pl-8 sm:pl-0 sm:grid sm:grid-cols-4 sm:gap-4">
                  {/* Step connectors */}
                  <div className="hidden sm:block absolute top-[18px] left-[12%] right-[12%] h-0.5 bg-slate-100 -z-10">
                    <div 
                      className="h-full bg-slate-900 transition-all duration-500" 
                      style={{ width: `${(Math.max(0, currentStepIdx) / (steps.length - 1)) * 100}%` }}
                    />
                  </div>

                  <div className="sm:hidden absolute top-0 bottom-0 left-[15px] w-0.5 bg-slate-150 -z-10">
                    <div 
                      className="w-full bg-slate-900 transition-all duration-500" 
                      style={{ height: `${(Math.max(0, currentStepIdx) / (steps.length - 1)) * 100}%` }}
                    />
                  </div>

                  {steps.map((step, idx) => {
                    const isDone = idx <= currentStepIdx;
                    const isActive = idx === currentStepIdx;
                    const Icon = step.icon;

                    return (
                      <div key={idx} className="relative sm:text-center pb-8 sm:pb-0 flex sm:flex-col items-center sm:items-center sm:justify-start gap-4 sm:gap-2">
                        {/* Dot / Button */}
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                          isActive ? 'bg-slate-950 text-white border-slate-950 ring-4 ring-slate-100 scale-110' :
                          isDone ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-350 border-slate-200'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        {/* Labels details */}
                        <div className="flex-grow sm:flex-grow-0">
                          <h5 className={`text-xs font-bold leading-tight ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                            {step.label}
                          </h5>
                          <p className={`text-[10px] leading-tight mt-0.5 max-w-[150px] sm:mx-auto ${isActive ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recipient Details & Packages Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Transit Routing</h4>
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex gap-2 items-start text-xs text-slate-650">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Destination Address Profile</p>
                      <p className="mt-1">{order.shippingAddress.fullName}</p>
                      <p>{order.shippingAddress.street}</p>
                      <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-450 mt-1">{order.shippingAddress.country}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Consignment Contents</h4>
                
                <div className="border border-slate-100 rounded-2xl p-3 bg-white space-y-2 max-h-48 overflow-y-auto">
                  {order.items.map((item, id) => (
                    <div key={id} className="flex items-center gap-3 border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center rounded-lg shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex-grow select-none">
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</p>
                        {item.variant && <p className="text-[9px] text-slate-400 font-medium">Edition: {item.variant}</p>}
                        <p className="text-[10px] text-slate-500 mt-0.5">Quantity: {item.quantity}</p>
                      </div>
                      <span className="text-xs font-semibold font-mono text-slate-800 shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Footer pricing info */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-slate-500 text-xs">
              <span>Parcel shipping dispatch totals:</span>
              <span className="font-mono text-sm font-bold text-slate-900">${order.total.toFixed(2)} USD</span>
            </div>

            <span className="text-[10px] text-slate-400 font-medium block flex items-center justify-center gap-1 text-center select-none pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Independently tracked style parameters across dispatch warehouses.</span>
            </span>

          </div>
        </div>
      )}
    </div>
  );
}
