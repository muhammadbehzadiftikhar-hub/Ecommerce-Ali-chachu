/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDocsFromServer, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db, OperationType } from '../lib/firebase';
import { Product, Category, Order, User } from '../types';
import { handleServiceError } from './errorHandler';
import { seedDatabase } from '../lib/firebase-seed';

/**
 * Fetch all products in the catalog directly from Firestore.
 */
export async function adminGetProducts(): Promise<Product[]> {
  const path = 'products';
  try {
    const querySnapshot = await getDocsFromServer(collection(db, path));
    const items: Product[] = [];
    querySnapshot.forEach((docRef) => {
      items.push({ id: docRef.id, ...docRef.data() } as Product);
    });
    return items;
  } catch (error) {
    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Save or update product records directly in Firestore.
 */
export async function adminSaveProduct(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const docRef = doc(db, 'products', product.id);
    await setDoc(docRef, {
      ...product,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a product catalog item permanently.
 */
export async function adminDeleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleServiceError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all category directories directly from Firestore.
 */
export async function adminGetCategories(): Promise<Category[]> {
  const path = 'categories';
  try {
    const querySnapshot = await getDocsFromServer(collection(db, path));
    const items: Category[] = [];
    querySnapshot.forEach((docRef) => {
      items.push({ id: docRef.id, ...docRef.data() } as Category);
    });
    return items;
  } catch (error) {
    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Save or update a category record directly in Firestore.
 */
export async function adminSaveCategory(category: Category): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    const docRef = doc(db, 'categories', category.id);
    await setDoc(docRef, {
      ...category,
      createdAt: category.createdAt || new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a category folder from the collection.
 */
export async function adminDeleteCategory(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    const docRef = doc(db, 'categories', categoryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleServiceError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch guest/customer order invoices directly from Firestore bypassing local client states.
 */
export async function adminGetOrders(): Promise<Order[]> {
  const path = 'orders';
  try {
    const querySnapshot = await getDocsFromServer(collection(db, path));
    const items: Order[] = [];
    querySnapshot.forEach((docRef) => {
      items.push({ id: docRef.id, ...docRef.data() } as Order);
    });
    // Sort descending by creation date
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Update the logistical track stages of an order.
 */
export async function adminUpdateOrderStatus(orderId: string, status: any): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.UPDATE, path);
  }
}

/**
 * Update the Stripe payment transaction stage of an order.
 */
export async function adminUpdatePaymentStatus(orderId: string, paymentStatus: any): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      paymentStatus,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.UPDATE, path);
  }
}

/**
 * Fetch registered client accounts directly from Firestore bypassing caching.
 */
export async function adminGetUsers(): Promise<User[]> {
  const path = 'users';
  try {
    const querySnapshot = await getDocsFromServer(collection(db, path));
    const items: User[] = [];
    querySnapshot.forEach((docRef) => {
      items.push({ id: docRef.id, ...docRef.data() } as User);
    });
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Swaps role of a user between 'CUSTOMER' and 'ADMIN'.
 */
export async function adminUpdateUserRole(userId: string, targetRole: 'ADMIN' | 'CUSTOMER'): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      role: targetRole,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.UPDATE, path);
  }
}

/**
 * Perform a secure wipe and default seed operation on the collections.
 */
export async function adminResetDatabase(force: boolean = false): Promise<boolean> {
  const path = 'database/reset';
  try {
    return await seedDatabase(force);
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}
