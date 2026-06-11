/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  getDocsFromServer, 
  query, 
  where 
} from 'firebase/firestore';
import { db, OperationType } from '../lib/firebase';
import { Order, OrderStatus, PaymentStatus } from '../types';
import { handleServiceError } from './errorHandler';

const ORDERS_PATH = 'orders';

/**
 * Fetch all historical orders from Firestore.
 */
export async function getOrders(): Promise<Order[]> {
  try {
    const ordersSnapshot = await getDocs(collection(db, ORDERS_PATH));
    const list: Order[] = [];
    ordersSnapshot.forEach((docRef) => {
      list.push({ id: docRef.id, ...docRef.data() } as Order);
    });
    return list;
  } catch (error) {
    handleServiceError(error, OperationType.LIST, ORDERS_PATH);
  }
}

/**
 * Fetch all orders bypassing client side cache strictly.
 */
export async function getOrdersStrict(): Promise<Order[]> {
  try {
    const ordersSnapshot = await getDocsFromServer(collection(db, ORDERS_PATH));
    const list: Order[] = [];
    ordersSnapshot.forEach((docRef) => {
      list.push({ id: docRef.id, ...docRef.data() } as Order);
    });
    return list;
  } catch (error) {
    handleServiceError(error, OperationType.GET, ORDERS_PATH);
  }
}

/**
 * Store a newly spawned order invoice.
 */
export async function saveOrder(order: Order): Promise<void> {
  const path = `${ORDERS_PATH}/${order.id}`;
  try {
    const docRef = doc(db, ORDERS_PATH, order.id);
    await setDoc(docRef, {
      ...order,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}

/**
 * Update administrative delivery log status.
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const path = `${ORDERS_PATH}/${orderId}`;
  try {
    const docRef = doc(db, ORDERS_PATH, orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.UPDATE, path);
  }
}

/**
 * Update administrative Stripe transaction billing status.
 */
export async function updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<void> {
  const path = `${ORDERS_PATH}/${orderId}`;
  try {
    const docRef = doc(db, ORDERS_PATH, orderId);
    await updateDoc(docRef, {
      paymentStatus,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, OperationType.UPDATE, path);
  }
}
