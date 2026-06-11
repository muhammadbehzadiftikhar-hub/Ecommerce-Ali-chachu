/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  getDocsFromServer
} from 'firebase/firestore';
import { db, OperationType } from '../lib/firebase';
import { Product, Category } from '../types';
import { handleServiceError } from './errorHandler';

const PRODUCTS_PATH = 'products';
const CATEGORIES_PATH = 'categories';

/**
 * Fetch all categories from the Firestore database.
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const categoriesSnapshot = await getDocs(collection(db, CATEGORIES_PATH));
    const list: Category[] = [];
    categoriesSnapshot.forEach((docRef) => {
      list.push({ id: docRef.id, ...docRef.data() } as Category);
    });
    return list;
  } catch (error) {
    handleServiceError(error, OperationType.LIST, CATEGORIES_PATH);
  }
}

/**
 * Fetch all categories strictly bypassing client-cache.
 */
export async function getCategoriesStrict(): Promise<Category[]> {
  try {
    const categoriesSnapshot = await getDocsFromServer(collection(db, CATEGORIES_PATH));
    const list: Category[] = [];
    categoriesSnapshot.forEach((docRef) => {
      list.push({ id: docRef.id, ...docRef.data() } as Category);
    });
    return list;
  } catch (error) {
    handleServiceError(error, OperationType.GET, CATEGORIES_PATH);
  }
}

/**
 * Fetch all products from the Firestore database.
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const productsSnapshot = await getDocs(collection(db, PRODUCTS_PATH));
    const list: Product[] = [];
    productsSnapshot.forEach((docRef) => {
      list.push({ id: docRef.id, ...docRef.data() } as Product);
    });
    return list;
  } catch (error) {
    handleServiceError(error, OperationType.LIST, PRODUCTS_PATH);
  }
}

/**
 * Fetch all products strictly bypassing client-cache.
 */
export async function getProductsStrict(): Promise<Product[]> {
  try {
    const productsSnapshot = await getDocsFromServer(collection(db, PRODUCTS_PATH));
    const list: Product[] = [];
    productsSnapshot.forEach((docRef) => {
      list.push({ id: docRef.id, ...docRef.data() } as Product);
    });
    return list;
  } catch (error) {
    handleServiceError(error, OperationType.GET, PRODUCTS_PATH);
  }
}

/**
 * Get a single product details by id.
 */
export async function getProductById(id: string): Promise<Product | null> {
  const path = `${PRODUCTS_PATH}/${id}`;
  try {
    const docRef = doc(db, PRODUCTS_PATH, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Product;
    }
    return null;
  } catch (error) {
    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Save or update product details (using transaction-like safe writes)
 */
export async function saveProduct(product: Product): Promise<void> {
  const path = `${PRODUCTS_PATH}/${product.id}`;
  try {
    const docRef = doc(db, PRODUCTS_PATH, product.id);
    await setDoc(docRef, {
      ...product,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}

/**
 * Update stock quantity for a single product.
 */
export async function updateProductStock(id: string, newQty: number): Promise<void> {
  const path = `${PRODUCTS_PATH}/${id}`;
  try {
    const docRef = doc(db, PRODUCTS_PATH, id);
    await updateDoc(docRef, {
      quantity: newQty,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.UPDATE, path);
  }
}

/**
 * Detach/Delete specific product item from records.
 */
export async function deleteProduct(id: string): Promise<void> {
  const path = `${PRODUCTS_PATH}/${id}`;
  try {
    const docRef = doc(db, PRODUCTS_PATH, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleServiceError(error, OperationType.DELETE, path);
  }
}

/**
 * Save or update category specifications.
 */
export async function saveCategory(category: Category): Promise<void> {
  const path = `${CATEGORIES_PATH}/${category.id}`;
  try {
    const docRef = doc(db, CATEGORIES_PATH, category.id);
    await setDoc(docRef, category);
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}

/**
 * Remove Category directory.
 */
export async function deleteCategory(id: string): Promise<void> {
  const path = `${CATEGORIES_PATH}/${id}`;
  try {
    const docRef = doc(db, CATEGORIES_PATH, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleServiceError(error, OperationType.DELETE, path);
  }
}
