/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCart } from '../hooks/useCart';
import { Trash2, ArrowRight, ShoppingBag, Landmark, ArrowLeft, RefreshCw } from 'lucide-react';

interface CartViewProps {
  onBack: () => void;
  onNavigate: (view: string) => void;
}

export function CartView({ onBack, onNavigate }: CartViewProps) {
  const items = useCart((state) => state.items);
  const removeItem = useCart((state) => state.removeItem);
  const updateQuantity = useCart((state) => state.updateQuantity);
  const getCartSubtotal = useCart((state) => state.getCartSubtotal);

  const subtotal = getCartSubtotal();
  const estimatedTax = subtotal * 0.08;
  const flatShipping = subtotal > 0 ? 15.00 : 0.00;
  const total = subtotal + estimatedTax + flatShipping;

  return (
    <div id="cart-view-container" className="max-w-4xl mx-auto py-6 font-sans">
      
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Your Shopping Cart</h1>
          <p className="text-xs text-slate-500 mt-1">Review your premium selections and customize editions.</p>
        </div>
        <button
          id="continue-shopping-top-btn"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div id="cart-empty-state" className="text-center py-20 px-6 bg-slate-50 rounded-3xl">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">Your bag is empty</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            Explore our curated catalog and select from modern sustainable essentials to fill your bag.
          </p>
          <button
            id="cart-shop-now-btn"
            onClick={onBack}
            className="inline-flex items-center justify-center bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs px-6 py-3 rounded-xl transition-all shadow-sm shadow-slate-950/10 active:scale-95"
          >
            <span>Shop Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Items listing stage */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => {
              const product = item.product;
              const variant = item.selectedVariant;
              const price = variant?.price ?? product.price;
              const image = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=150&q=80';

              return (
                <div
                  id={`cart-item-${product.id}-${variant?.sku || 'default'}`}
                  key={`${product.id}-${variant?.sku || 'default'}`}
                  className="flex flex-col sm:flex-row gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-slate-50 overflow-hidden shrink-0">
                    <img src={image} alt={product.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Core copy */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{product.name}</h4>
                      {variant && (
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 bg-slate-100 px-2.0 py-0.5 rounded-md inline-block">
                          Edition: {variant.name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Modifier */}
                      <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg">
                        <button
                          id={`qt-dec-item-${product.id}`}
                          onClick={() => updateQuantity(product.id, item.quantity - 1, variant?.sku)}
                          className="w-6 h-6 rounded-md hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 cursor-pointer text-xs"
                        >
                          -
                        </button>
                        <span className="font-bold text-xs text-slate-800 w-4 text-center">{item.quantity}</span>
                        <button
                          id={`qt-inc-item-${product.id}`}
                          onClick={() => updateQuantity(product.id, item.quantity + 1, variant?.sku)}
                          className="w-6 h-6 rounded-md hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 cursor-pointer text-xs"
                        >
                          +
                        </button>
                      </div>

                      {/* Delete action */}
                      <button
                        id={`delete-item-${product.id}`}
                        onClick={() => removeItem(product.id, variant?.sku)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Remove selection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* Prices breakdown */}
                  <div className="text-right flex sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <span className="text-xs text-slate-400 sm:hidden">Total price:</span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">${(price * item.quantity).toFixed(2)}</div>
                      {item.quantity > 1 && (
                        <div className="text-[10px] text-slate-400 font-medium">${price.toFixed(2)} each</div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Right Summary Sidebar desk */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-6">
            <h3 className="font-bold text-base text-slate-800 font-sans border-b border-slate-200 pb-3">Store Checkout Summary</h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800 font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Estimated Tax (8%)</span>
                <span className="font-semibold text-slate-800 font-mono">${estimatedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Flat Insurance Shipping</span>
                <span className="font-semibold text-slate-800 font-mono">${flatShipping.toFixed(2)}</span>
              </div>
              
              <div className="border-t border-slate-200 pt-3.5 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Estimated Total</span>
                <span className="text-base text-slate-950 font-mono">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Direct Proceed call */}
            <button
              id="proceed-checkout-btn"
              onClick={() => onNavigate('checkout')}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 text-white font-semibold text-sm py-3.5 rounded-xl shadow-lg shadow-slate-950/10 hover:opacity-95 transition-all cursor-pointer group active:scale-98"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Trust footer inside checkout drawer */}
            <div className="text-[10px] text-slate-400 leading-relaxed text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-500">
                <Landmark className="w-3.5 h-3.5 text-indigo-500" />
                <span>3D Secured SSL Gateway Protection</span>
              </div>
              <p>Your pricing is locked. Tax & shipping schedules are subject to real billing address sync.</p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
