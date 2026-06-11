/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { CreditCard, ShoppingBag, ArrowLeft, Loader2, Landmark, ShieldCheck, Ticket } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface CheckoutViewProps {
  user: FirebaseUser | null;
  onOrderSuccess: (orderInfo: any) => void;
  onNavigate: (view: string) => void;
}

export function CheckoutView({ user, onOrderSuccess, onNavigate }: CheckoutViewProps) {
  const items = useCart((state) => state.items);
  const clearCart = useCart((state) => state.clearCart);
  const getCartSubtotal = useCart((state) => state.getCartSubtotal);

  // Billing shipping info
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('US');

  // Load user's default address for faster checkout
  React.useEffect(() => {
    if (!user) return;
    const fetchDefaultAddress = async () => {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const addrRef = collection(db, 'users', user.uid, 'addresses');
        const q = query(addrRef, where('isDefault', '==', true));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const addr = snap.docs[0].data();
          setFullName(addr.fullName || '');
          setStreet(addr.street || '');
          setCity(addr.city || '');
          setStateName(addr.state || '');
          setZipCode(addr.zipCode || '');
          setCountry(addr.country || 'US');
        }
      } catch (e) {
        console.warn("Failed to load default checkout address:", e);
      }
    };
    fetchDefaultAddress();
  }, [user]);

  // Coupon promo input
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // Card mock details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = getCartSubtotal();
  const discountAmount = subtotal * (discountPercent / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const estimatedTax = discountedSubtotal * 0.08;
  const flatShipping = discountedSubtotal > 0 ? 15.00 : 0.00;
  const total = discountedSubtotal + estimatedTax + flatShipping;

  const handleApplyPromo = () => {
    setPromoError('');
    if (promoCode.trim().toUpperCase() === 'WELCOME10') {
      setDiscountPercent(10);
      setPromoApplied(true);
    } else {
      setPromoError('Invalid coupon. Try using "WELCOME10"');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderId = `order-${Math.floor(Date.now())}`;

      const orderItemSnapshots = items.map((item, idx) => ({
        id: `${orderId}-item-${idx}`,
        productId: item.product.id,
        name: item.product.name,
        price: item.selectedVariant?.price ?? item.product.price,
        quantity: item.quantity,
        image: item.product.images?.[0]?.url || '',
        variant: item.selectedVariant?.name || null
      }));

      const orderPayload = {
        id: orderId,
        orderNumber,
        userId: user?.uid || null,
        email,
        phone,
        items: orderItemSnapshots,
        subtotal,
        tax: estimatedTax,
        shippingCost: flatShipping,
        discount: discountAmount,
        total,
        shippingAddress: {
          fullName,
          street,
          city,
          state: stateName,
          zipCode,
          country
        },
        status: 'CONFIRMED', // Instant completion for mockup/auth trust rules
        paymentStatus: 'PAID',
        couponCode: promoApplied ? promoCode.trim().toUpperCase() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Write direct to Firestore orders database
      const orderDocRef = doc(db, 'orders', orderId);
      try {
        await setDoc(orderDocRef, orderPayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
      }

      // Clean Cart bag
      clearCart();

      // Lift success state to view receipt
      onOrderSuccess(orderPayload);
    } catch (e) {
      console.error("Order processing failed", e);
      alert("Order processing failed due to permissions or missing values. Please make sure fields are populated.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="checkout-view-container" className="max-w-5xl mx-auto py-6 font-sans">
      
      {/* Back to Cart navigation */}
      <button
        id="checkout-back-btn"
        onClick={() => onNavigate('cart')}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium text-sm transition-all mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Cart</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Hand: Capture details form */}
        <div className="lg:col-span-7">
          <form id="billing-shipping-form" onSubmit={handlePlaceOrder} className="space-y-8">
            
            {/* Delivery address capture card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900 font-sans border-b border-slate-100 pb-3">1. Shipping Logistics Contact</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium font-sans">Full Name *</label>
                  <input
                    id="shipping-fullname"
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Liam Sterling"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium font-sans">Email Address *</label>
                  <input
                    id="shipping-email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="liam@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium font-sans">Phone Number *</label>
                  <input
                    id="shipping-phone"
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 0199"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium font-sans">Street Address *</label>
                  <input
                    id="shipping-street"
                    required
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="1225 Walnut St, Apt 4B"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium font-sans">City *</label>
                  <input
                    id="shipping-city"
                    required
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Philadelphia"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium font-sans">State *</label>
                  <input
                    id="shipping-state"
                    required
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="PA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium font-sans">ZIP Code *</label>
                  <input
                    id="shipping-zip"
                    required
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="19107"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium font-sans">Country *</label>
                  <select
                    id="shipping-country-dropdown"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs cursor-pointer"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Credit Card simulation section */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900 font-sans">2. Premium SSL Payment</h3>
                <Landmark className="w-5 h-5 text-indigo-500" />
              </div>

              <div className="bg-slate-900 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg mb-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,_var(--tw-gradient-stops))] from-indigo-700/40 via-transparent to-transparent opacity-80" />
                <div className="relative z-10 flex flex-col justify-between h-32 text-xs font-mono">
                  <div className="flex justify-between items-start">
                    <span className="font-sans font-bold text-sm">Secure Pay Terminal</span>
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-lg tracking-widest">{cardNumber || '•••• •••• •••• ••••'}</div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[9px] uppercase text-slate-400">Card Name</div>
                      <div className="font-sans font-bold tracking-tight">{fullName || 'LIAM STERLING'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-slate-400">Expires</div>
                      <div>{cardExpiry || 'MM/YY'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-sans">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-500 font-medium">Card Number *</label>
                  <input
                    id="payment-card-number"
                    required
                    type="text"
                    maxLength={19}
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => {
                      // auto space formatting
                      const val = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                      setCardNumber(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium">Expiry Date *</label>
                  <input
                    id="payment-card-expiry"
                    required
                    type="text"
                    maxLength={5}
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\?/g, '');
                      setCardExpiry(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-slate-500 font-medium">CVC Security *</label>
                  <input
                    id="payment-card-cvc"
                    required
                    type="password"
                    maxLength={3}
                    placeholder="•••"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Direct primary checkout execution button */}
            <button
              id="submit-order-checkout-btn"
              type="submit"
              disabled={items.length === 0 || isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white font-semibold text-sm py-4 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Safe Consignment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Place Your Consignment (${total.toFixed(2)})</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* Right Hand: Products recap */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="font-bold text-base text-slate-800 font-sans border-b border-slate-200 pb-3">Recap Consignment</h3>
          
          {/* Basket list */}
          <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
            {items.map((item) => {
              const prod = item.product;
              const price = item.selectedVariant?.price ?? prod.price;
              const img = prod.images?.[0]?.url || '';

              return (
                <div key={`${prod.id}-${item.selectedVariant?.sku || 'default'}`} className="flex items-center gap-3 text-xs">
                  <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0 border border-slate-100">
                    <img src={img} alt={prod.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{prod.name}</h4>
                    <p className="text-[10px] text-slate-400">Qty: {item.quantity} {item.selectedVariant && `• ${item.selectedVariant.name}`}</p>
                  </div>
                  <div className="font-bold text-slate-800 font-mono">${(price * item.quantity).toFixed(2)}</div>
                </div>
              );
            })}
          </div>

          {/* Coupon codes trigger */}
          <div className="border-t border-b border-slate-200 py-4 my-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  id="promo-code-input"
                  type="text"
                  placeholder="Enter WELCOME10 code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="w-full text-xs font-sans bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-slate-500 text-slate-800 font-semibold"
                />
              </div>
              <button
                id="apply-promo-btn"
                type="button"
                onClick={handleApplyPromo}
                className="bg-slate-900 text-white text-xs font-semibold px-4 rounded-xl hover:bg-slate-800 cursor-pointer transition-all shrink-0 active:scale-95"
              >
                Apply
              </button>
            </div>
            {promoApplied && (
              <span className="text-[11px] font-bold text-emerald-600 block mt-2 animate-pulse bg-emerald-50 px-2 py-1 rounded inline-block">
                ✓ 10% Discount Welcome Code Applied!
              </span>
            )}
            {promoError && (
              <span className="text-[10px] text-red-500 font-medium block mt-2">{promoError}</span>
            )}
          </div>

          {/* Totals readout */}
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800 font-mono">${subtotal.toFixed(2)}</span>
            </div>
            {promoApplied && (
              <div className="flex justify-between items-center text-emerald-600 font-bold">
                <span>Promo Discount (10%)</span>
                <span className="font-mono">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-500">
              <span>Estimated Tax (8%)</span>
              <span className="font-semibold text-slate-800 font-mono">${estimatedTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Flat Insurance Shipping</span>
              <span className="font-semibold text-slate-800 font-mono">${flatShipping.toFixed(2)}</span>
            </div>
            
            <div className="border-t border-slate-200 pt-3.5 flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Final Total</span>
              <span className="text-base text-slate-950 font-mono">${total.toFixed(2)}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
