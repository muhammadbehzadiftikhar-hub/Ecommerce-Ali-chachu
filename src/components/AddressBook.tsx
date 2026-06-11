/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Check, ArrowLeft, RefreshCw, AlertCircle, Home, ShieldCheck } from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface Address {
  id: string;
  userId: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressBookProps {
  user: FirebaseUser | null;
  onNavigateToStore: () => void;
  onLogin: () => void;
}

export function AddressBook({ user, onNavigateToStore, onLogin }: AddressBookProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load addresses from Firestore
  const fetchAddresses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const addressesRef = collection(db, 'users', user.uid, 'addresses');
      const q = query(addressesRef);
      const snapshot = await getDocs(q);
      const list: Address[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Address);
      });
      // Sort list to have the default address first
      list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
      setAddresses(list);
    } catch (err) {
      console.error("Error reading personal addresses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [user]);

  const initForm = (addr?: Address) => {
    setFormError('');
    if (addr) {
      setFullName(addr.fullName);
      setStreet(addr.street);
      setCity(addr.city);
      setStateVal(addr.state);
      setZipCode(addr.zipCode);
      setCountry(addr.country);
      setIsDefault(addr.isDefault);
    } else {
      setFullName('');
      setStreet('');
      setCity('');
      setStateVal('');
      setZipCode('');
      setCountry('United States');
      setIsDefault(addresses.length === 0); // Default if first address
    }
  };

  const startEdit = (address: Address) => {
    setEditingAddress(address);
    setIsAddingNew(false);
    initForm(address);
  };

  const startAdd = () => {
    setIsAddingNew(true);
    setEditingAddress(null);
    initForm();
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingAddress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName.trim() || !street.trim() || !city.trim() || !stateVal.trim() || !zipCode.trim() || !country.trim()) {
      setFormError('Please fill in all address lines.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const addressId = editingAddress ? editingAddress.id : `addr_${Date.now()}`;
      const docRef = doc(db, 'users', user.uid, 'addresses', addressId);

      const payload: Address = {
        id: addressId,
        userId: user.uid,
        fullName: fullName.trim(),
        street: street.trim(),
        city: city.trim(),
        state: stateVal.trim(),
        zipCode: zipCode.trim(),
        country: country.trim(),
        isDefault: isDefault,
      };

      // If set as default, we need to mark all other addresses as non-default in Firestore
      if (isDefault) {
        const batch = writeBatch(db);
        
        // Update other items
        addresses.forEach((addr) => {
          if (addr.id !== addressId && addr.isDefault) {
            const otherRef = doc(db, 'users', user.uid, 'addresses', addr.id);
            batch.update(otherRef, { isDefault: false });
          }
        });
        
        // Write the current default address
        batch.set(docRef, payload);
        await batch.commit();
      } else {
        await setDoc(docRef, payload);
      }

      await fetchAddresses();
      setIsAddingNew(false);
      setEditingAddress(null);
    } catch (err: any) {
      console.error("Error saving address record:", err);
      setFormError(err.message || 'Failed to save address details. Verify form limits.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to remove this address?')) return;

    try {
      const docRef = doc(db, 'users', user.uid, 'addresses', addressId);
      await deleteDoc(docRef);
      
      // If deleted default, pick next address as default if list is not empty
      const target = addresses.find(a => a.id === addressId);
      if (target?.isDefault && addresses.length > 1) {
        const nextDefault = addresses.find(a => a.id !== addressId);
        if (nextDefault) {
          const nextRef = doc(db, 'users', user.uid, 'addresses', nextDefault.id);
          await updateDoc(nextRef, { isDefault: true });
        }
      }

      await fetchAddresses();
    } catch (err) {
      console.error("Error deleting address:", err);
    }
  };

  const handleSetDefault = async (address: Address) => {
    if (!user || address.isDefault) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // Reset others
      addresses.forEach((addr) => {
        if (addr.isDefault) {
          const otherRef = doc(db, 'users', user.uid, 'addresses', addr.id);
          batch.update(otherRef, { isDefault: false });
        }
      });

      // Set this one
      const thisRef = doc(db, 'users', user.uid, 'addresses', address.id);
      batch.update(thisRef, { isDefault: true });

      await batch.commit();
      await fetchAddresses();
    } catch (err) {
      console.error("Error setting default address:", err);
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20 px-6 max-w-sm mx-auto">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800 mb-1">Authenticating Required</h3>
        <p className="text-xs text-slate-500 mb-6">
          Please login to view details of your personal boutique address credentials.
        </p>
        <button
          onClick={onLogin}
          className="inline-flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
        >
          <span>Sign In / Register</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
        <span className="text-xs text-slate-400 uppercase tracking-widest animate-pulse font-sans">Compiling Delivery Ledger...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-sans text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-slate-900" />
            <span>Manage Address Book</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Configure preset locations for faster boutique checkouts</p>
        </div>

        <button
          onClick={onNavigateToStore}
          className="inline-flex items-center gap-1.5 text-xs border border-slate-200 hover:border-slate-800 px-4 py-2 rounded-xl transition-all font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back Storefront</span>
        </button>
      </div>

      {isAddingNew || editingAddress ? (
        // Add / Edit form layout
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">
            {editingAddress ? 'Modify Address Record' : 'Create Shipping Profile'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Recipient Full Name</label>
              <input
                id="addr-fullName-input"
                type="text"
                required
                maxLength={100}
                placeholder="E.g., Charlotte Bronte"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-slate-800 outline-none rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 transition-all shadow-inner placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Street Address</label>
              <input
                id="addr-street-input"
                type="text"
                required
                maxLength={200}
                placeholder="100 Orchard St, Chelsea"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-slate-800 outline-none rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 transition-all shadow-inner placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">City</label>
                <input
                  id="addr-city-input"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="New York"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 outline-none rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 transition-all shadow-inner placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">State / Province</label>
                <input
                  id="addr-state-input"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="NY"
                  value={stateVal}
                  onChange={(e) => setStateVal(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 outline-none rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 transition-all shadow-inner placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Zip / Postal Code</label>
                <input
                  id="addr-zip-input"
                  type="text"
                  required
                  maxLength={20}
                  placeholder="10002"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 outline-none rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 transition-all shadow-inner placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Country</label>
                <input
                  id="addr-country-input"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="United States"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 outline-none rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 transition-all shadow-inner placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Checkbox default designation */}
            <div className="flex items-center gap-2 pt-2">
              <input
                id="addr-isDefault-checkbox"
                type="checkbox"
                checked={isDefault}
                disabled={editingAddress?.isDefault} // Cannot uncheck default designator unless another is picked
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-800"
              />
              <span className="text-xs text-slate-600 font-medium">Designate as preset default shipping destination</span>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="addr-submit-btn"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 disabled:bg-slate-400 cursor-pointer shadow-sm"
              >
                <span>{submitting ? 'Saving...' : 'Save Address'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        // Addresses grid display
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Registered Profiles</h3>
            
            <button
              id="add-address-trigger-btn"
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 text-xs bg-slate-950 hover:bg-slate-800 text-white font-semibold py-2 px-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-slate-950/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Address</span>
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6 max-w-md mx-auto">
              <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400 shadow-sm">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm text-slate-800 mb-1">No Saved Addresses</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                You haven't customized any delivery parameters in your account profiles yet.
              </p>
              <button
                onClick={startAdd}
                className="inline-flex bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer"
              >
                <span>Create address map</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`border rounded-2xl p-5 transition-all relative flex flex-col justify-between ${
                    address.isDefault
                      ? 'border-slate-900 bg-slate-50/50 shadow-inner'
                      : 'border-slate-100 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1">
                        {address.fullName}
                      </span>
                      {address.isDefault ? (
                        <span className="bg-slate-900 text-white text-[9px] font-sans font-bold px-2.5 py-1 rounded-md tracking-wider uppercase shrink-0 flex items-center gap-1 shadow-sm">
                          <Check className="w-2.5 h-2.5" />
                          <span>Default preset</span>
                        </span>
                      ) : (
                        <button
                          id={`set-default-btn-${address.id}`}
                          onClick={() => handleSetDefault(address)}
                          className="text-[10px] text-slate-500 hover:text-slate-900 bg-slate-50 border border-slate-200 hover:border-slate-400 px-2.5 py-1 rounded-md cursor-pointer transition-all shrink-0"
                        >
                          Designate default
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 leading-relaxed font-sans font-normal">
                      <p>{address.street}</p>
                      <p>{address.city}, {address.state} {address.zipCode}</p>
                      <p className="text-slate-400 text-[10px] font-medium tracking-wider uppercase mt-1">{address.country}</p>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-end gap-3">
                    <button
                      id={`edit-address-btn-${address.id}`}
                      onClick={() => startEdit(address)}
                      className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Configure</span>
                    </button>
                    <button
                      id={`delete-address-btn-${address.id}`}
                      onClick={() => handleDelete(address.id)}
                      className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <span className="text-[10px] text-slate-400 font-medium block flex items-center justify-center gap-1 mt-6">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Encrypted payment-ready physical addresses profiles</span>
          </span>
        </div>
      )}
    </div>
  );
}
