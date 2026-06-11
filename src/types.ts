/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name?: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
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

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface ProductImage {
  url: string;
  alt?: string;
  position: number;
}

export interface Variant {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  options: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  sku: string;
  trackInventory: boolean;
  quantity: number;
  lowStockAlert: number;
  categoryId: string;
  featured: boolean;
  status: ProductStatus;
  images: ProductImage[];
  variants: Variant[];
  tags: string[];
  wishlist?: string[]; // user UIDs of authenticated users who wishlisted this product
  priceHistory?: { date: string; price: number }[]; // historical price metrics
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: Variant;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface OrderItemSnapshot {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g., ORD-1001
  userId?: string;
  email: string;
  phone?: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingAddress?: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  notes?: string;
  couponCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  userId: string;
  username: string;
  productId: string;
  verified: boolean;
  createdAt: string;
}

export interface Setting {
  id: string;
  key: string;
  value: Record<string, any>;
}
