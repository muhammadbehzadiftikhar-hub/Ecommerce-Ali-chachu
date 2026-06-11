/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CheckCircle2, ShoppingBag, Landmark, ArrowRight, Printer } from 'lucide-react';

interface OrderSuccessViewProps {
  orderInfo: {
    orderNumber: string;
    email: string;
    total: number;
    shippingAddress: {
      fullName: string;
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    items: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      variant?: string | null;
    }>;
  };
  onReturnToStore: () => void;
}

export function OrderSuccessView({ orderInfo, onReturnToStore }: OrderSuccessViewProps) {
  return (
    <div id="order-success-view" className="max-w-2xl mx-auto py-12 text-center font-sans">
      
      {/* Animated badge */}
      <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full mb-6">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <h1 className="text-3xl font-bold font-sans text-slate-900 tracking-tight mb-2">Order Confirmed!</h1>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-8">
        We have received your consignment request. A formal receipt with live tracking codes has been issued to <span className="font-semibold text-slate-700">{orderInfo.email}</span>.
      </p>

      {/* Structured itemized receipt */}
      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8 text-left space-y-6 mb-10">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Consignment ID</span>
            <span className="text-sm font-semibold text-slate-800 font-mono">{orderInfo.orderNumber}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-right">Payment Gateway</span>
            <span className="text-xs font-semibold text-indigo-600 font-sans flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5" />
              <span>Stripe Card Secure</span>
            </span>
          </div>
        </div>

        {/* List of items snaps */}
        <div className="space-y-3.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Purchased Items</span>
          <div className="space-y-2.5">
            {orderInfo.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex-1 pr-6">
                  <h4 className="font-semibold text-slate-800 line-clamp-1">{item.name}</h4>
                  {item.variant && <span className="text-[9px] text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded mt-0.5 inline-block">{item.variant}</span>}
                </div>
                <div className="text-slate-400 font-medium shrink-0 mr-4">x{item.quantity}</div>
                <div className="font-bold text-slate-800 font-mono shrink-0">${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Address snapshot */}
        <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Shipping Destination</span>
            <div className="text-slate-700 leading-relaxed space-y-0.5">
              <p className="font-semibold">{orderInfo.shippingAddress.fullName}</p>
              <p>{orderInfo.shippingAddress.street}</p>
              <p>{orderInfo.shippingAddress.city}, {orderInfo.shippingAddress.state} {orderInfo.shippingAddress.zipCode}</p>
              <p>{orderInfo.shippingAddress.country}</p>
            </div>
          </div>
          <div className="flex flex-col justify-end text-neutral-600 sm:items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Grand Invoiced Total</span>
            <div className="text-xl font-bold font-mono text-slate-900">${orderInfo.total.toFixed(2)}</div>
          </div>
        </div>

      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <button
          id="btn-return-storefront"
          onClick={onReturnToStore}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs px-6 py-3.5 rounded-xl transition-all shadow-sm active:scale-95 group"
        >
          <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Catalog Homepage</span>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          id="btn-print-receipt"
          onClick={() => window.print()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-semibold text-xs px-6 py-3.5 rounded-xl transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Save Receipt / Print</span>
        </button>
      </div>

    </div>
  );
}
