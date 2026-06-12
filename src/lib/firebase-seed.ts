/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, getDocs, doc, writeBatch, setDoc, query, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface SeedProduct {
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
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  images: Array<{ url: string; alt: string; position: number }>;
  variants: Array<{ name: string; sku: string; price: number; quantity: number; options: Record<string, string> }>;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    id: 'cat-electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Cutting-edge gadgets, sound systems, and accessories.',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'cat-clothing',
    name: 'Clothing',
    slug: 'clothing',
    description: 'Minimalist designer apparel crafted from sustainable materials.',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'cat-accessories',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Finely crafted leatherware, premium watches, and EDC gear.',
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'cat-home',
    name: 'Living & Home',
    slug: 'living-home',
    description: 'Modern organic design items for your office and living quarters.',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'
  }
];

export const SEED_PRODUCTS = (categories: SeedCategory[]): SeedProduct[] => [
  {
    id: 'prod-iphone15',
    name: 'Apple iPhone 15 Pro Max',
    slug: 'iphone-15-pro-max',
    description: 'Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and a powerful iPhone camera system.',
    shortDescription: 'The ultimate titanium smartphone with A17 Pro chip.',
    price: 1199.00,
    compareAtPrice: 1299.00,
    costPrice: 650.00,
    sku: 'IPH-15PM-BLK',
    trackInventory: true,
    quantity: 45,
    lowStockAlert: 5,
    categoryId: 'cat-electronics',
    featured: true,
    status: 'ACTIVE',
    images: [
      { url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80', alt: 'iPhone 15 Pro Max Titanium', position: 0 },
      { url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80', alt: 'iPhone screen display', position: 1 }
    ],
    variants: [
      { name: '256GB / Titanium Black', sku: 'IPH-15PM-256-BLK', price: 1199.00, quantity: 20, options: { storage: '256GB', color: 'Titanium Black' } },
      { name: '512GB / Titanium Gray', sku: 'IPH-15PM-512-GRY', price: 1399.00, quantity: 25, options: { storage: '512GB', color: 'Titanium Gray' } }
    ],
    tags: ['apple', 'smartphone', 'premium'],
    metaTitle: 'Buy iPhone 15 Pro Max - Premium Titanium',
    metaDescription: 'Shop the latest iPhone 15 Pro Max in space black and titanium gray at the best price.'
  },
  {
    id: 'prod-headphones',
    name: 'Sony WH-1000XM5 Headphones',
    slug: 'sony-wh-1000xm5',
    description: 'Industry-leading noise cancelling overhead headphones with incredible sound performance, Crystal-clear hands-free calling, and long-lasting battery.',
    shortDescription: 'Industry-leading noise cancelling overhead headphones.',
    price: 399.00,
    compareAtPrice: 449.00,
    costPrice: 180.00,
    sku: 'SNY-XM5-WHT',
    trackInventory: true,
    quantity: 60,
    lowStockAlert: 8,
    categoryId: 'cat-electronics',
    featured: true,
    status: 'ACTIVE',
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', alt: 'Sony WH-1000XM5 Over Ear', position: 0 },
      { url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80', alt: 'Details side view', position: 1 }
    ],
    variants: [
      { name: 'Classic Black', sku: 'SNY-XM5-BLK', price: 399.00, quantity: 30, options: { color: 'Black' } },
      { name: 'Platinum Silver', sku: 'SNY-XM5-SLV', price: 399.00, quantity: 30, options: { color: 'Platinum Silver' } }
    ],
    tags: ['audio', 'noise-cancelling', 'sony'],
    metaTitle: 'Sony WH-1000XM5 Noise Cancelling Headphones',
    metaDescription: 'Unpack pure silence and world-class acoustics with Sony WH-1000XM5 headphones.'
  },
  {
    id: 'prod-watch',
    name: 'Minimalist Quartz Leather Watch',
    slug: 'minimalist-quartz-watch',
    description: 'Encased in 316L sandblasted stainless steel with a high-durability sapphire crystal lens and a handmade Italian calf leather strap.',
    shortDescription: 'Calf-leather quartz watch in brushed silver and black.',
    price: 189.00,
    compareAtPrice: 220.00,
    costPrice: 75.00,
    sku: 'WTC-QRTZ-SLV',
    trackInventory: true,
    quantity: 24,
    lowStockAlert: 4,
    categoryId: 'cat-accessories',
    featured: true,
    status: 'ACTIVE',
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', alt: 'Silver minimalist watch', position: 0 }
    ],
    variants: [],
    tags: ['watch', 'minimalist', 'wristwear'],
    metaTitle: 'Elite Minimalist Quartz Wristwatch',
    metaDescription: 'Elegant timeless watch featuring clean dials and premium coordinates.'
  },
  {
    id: 'prod-trenchcoat',
    name: 'Classic Cotton Trench Coat',
    slug: 'classic-cotton-trench-coat',
    description: 'A double-breasted trench coat cut in heavy waterproof organic cotton gabardine, featuring signature epaulettes, gun flap, and D-ring belt.',
    shortDescription: 'Weather-resistant double-breasted organic cotton coat.',
    price: 249.00,
    sku: 'CLO-TENCH-KHK',
    trackInventory: true,
    quantity: 15,
    lowStockAlert: 3,
    categoryId: 'cat-clothing',
    featured: false,
    status: 'ACTIVE',
    images: [
      { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80', alt: 'Beige cotton trench coat fitting', position: 0 }
    ],
    variants: [
      { name: 'Size S / Beige', sku: 'CLO-TRN-S-BGE', price: 249.00, quantity: 5, options: { size: 'S', color: 'Beige' } },
      { name: 'Size M / Beige', sku: 'CLO-TRN-M-BGE', price: 249.00, quantity: 5, options: { size: 'M', color: 'Beige' } },
      { name: 'Size L / Beige', sku: 'CLO-TRN-L-BGE', price: 249.00, quantity: 5, options: { size: 'L', color: 'Beige' } }
    ],
    tags: ['coat', 'outerwear', 'classic'],
    metaTitle: 'Premium Organic Cotton Trench Coat',
    metaDescription: 'Keep wind and rain out with this modern elegant classic cotton coat.'
  },
  {
    id: 'prod-sweater',
    name: 'Merino Wool Knit Sweater',
    slug: 'merino-wool-knit-sweater',
    description: 'Spun from exceptionally soft Italian-sourced merino wool, this lightweight knit layer provides comfortable core warmth in a refined gauge.',
    shortDescription: 'Superfine sustainable merino wool pullover sweater.',
    price: 120.00,
    compareAtPrice: 150.00,
    costPrice: 40.00,
    sku: 'CLO-MERN-SWEET',
    trackInventory: true,
    quantity: 35,
    lowStockAlert: 5,
    categoryId: 'cat-clothing',
    featured: true,
    status: 'ACTIVE',
    images: [
      { url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80', alt: 'Grey wool knit sweater', position: 0 }
    ],
    variants: [
      { name: 'Charcoal Grey / Medium', sku: 'CLO-SWR-M-GRY', price: 120.00, quantity: 15, options: { size: 'M', color: 'Charcoal' } },
      { name: 'Oatmeal / Medium', sku: 'CLO-SWR-M-OAT', price: 120.00, quantity: 20, options: { size: 'M', color: 'Oatmeal' } }
    ],
    tags: ['wool', 'sweater', 'winter'],
    metaTitle: 'Italian Merino Wool Knitwear',
    metaDescription: 'Shop incredibly soft and breathable crew neck lightweight sweaters.'
  },
  {
    id: 'prod-vase',
    name: 'Modern Ceramic Vase',
    slug: 'modern-ceramic-vase',
    description: 'Handmade matte-textured structural stoneware vase designed for dry or active botanicals, boasting an elegant organic abstract geometry.',
    shortDescription: 'Rustic minimalist ceramic sculpture vase.',
    price: 45.00,
    sku: 'HOM-VASE-WHT',
    trackInventory: true,
    quantity: 50,
    lowStockAlert: 5,
    categoryId: 'cat-home',
    featured: false,
    status: 'ACTIVE',
    images: [
      { url: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80', alt: 'Ceramic matte white vase', position: 0 }
    ],
    variants: [],
    tags: ['ceramic', 'decor', 'stoneware'],
    metaTitle: 'Modern Ceramic Decorative Vase',
    metaDescription: 'Refined rustic table decor sculpture with structural aesthetic handles.'
  },
  {
    id: 'prod-chair',
    name: 'Ergonomic Office Desk Chair',
    slug: 'ergonomic-office-desk-chair',
    description: 'Features a self-adjusting lumbar support system, adaptive multi-axis armrests, high durability mesh backing, and fluid smooth-glide castors.',
    shortDescription: 'Advanced orthopedic lumbar support desk task chair.',
    price: 299.00,
    compareAtPrice: 349.00,
    costPrice: 120.00,
    sku: 'HOM-CHR-ERGO',
    trackInventory: true,
    quantity: 18,
    lowStockAlert: 2,
    categoryId: 'cat-home',
    featured: true,
    status: 'ACTIVE',
    images: [
      { url: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80', alt: 'Office task ergonomic chair', position: 0 }
    ],
    variants: [],
    tags: ['furniture', 'office', 'chair'],
    metaTitle: 'Pro Orthopedic Lumbar Desk Chair',
    metaDescription: 'Invest in physical comfort and posture corrections with this elite ergonomic task model.'
  },
  {
    id: 'prod-backpack',
    name: 'Premium Leather Backpack',
    slug: 'premium-leather-backpack',
    description: 'Hand-sewn water-repellent full-grain leather pack with custom brass hardware, dedicated padded 16" laptop chamber, and structured tech organizers.',
    shortDescription: 'Structured full-grain leather laptop daypack.',
    price: 149.00,
    sku: 'ACC-BPK-LTHR',
    trackInventory: true,
    quantity: 28,
    lowStockAlert: 4,
    categoryId: 'cat-accessories',
    featured: false,
    status: 'ACTIVE',
    images: [
      { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80', alt: 'Tan full grain leather utility pack', position: 0 }
    ],
    variants: [],
    tags: ['backpack', 'leather', 'commute'],
    metaTitle: 'Classic Full-Grain Leather Daypack',
    metaDescription: 'Shop handcrafted dual compartment luxury commuter pack.'
  }
];

export async function seedDatabase(force: boolean = false) {
  try {
    const productsRef = collection(db, 'products');
    const existingSnap = await getDocs(query(productsRef, limit(1)));
    
    if (!existingSnap.empty && !force) {
      console.log('Database already has content. Skipping auto-seed.');
      return false;
    }

    console.log('Starting Firestore auto-seed logic...');
    const batch = writeBatch(db);

    // 1. Seed Categories
    for (const cat of SEED_CATEGORIES) {
      const catDoc = doc(db, 'categories', cat.id);
      batch.set(catDoc, {
        ...cat,
        createdAt: new Date().toISOString()
      });
    }

    // 2. Seed Products
    const products = SEED_PRODUCTS(SEED_CATEGORIES);
    for (const prod of products) {
      const prodDoc = doc(db, 'products', prod.id);
      batch.set(prodDoc, {
        ...prod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 3. Seed Default Admin record securely
    const adminDoc = doc(db, 'admins', 'admin-seed-uid-123');
    batch.set(adminDoc, {
      email: 'admin@example.com',
      role: 'ADMIN',
      password: 'admin123',
      createdAt: new Date().toISOString()
    });

    const userDoc = doc(db, 'users', 'admin-seed-uid-123');
    batch.set(userDoc, {
      id: 'admin-seed-uid-123',
      name: 'Store Administrator',
      email: 'admin@example.com',
      role: 'ADMIN',
      password: 'admin123',
      phone: '+1(800)555-0199',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Seed dummy site setting configurations
    const settingsDoc = doc(db, 'settings', 'general');
    batch.set(settingsDoc, {
      id: 'general',
      key: 'general_store_settings',
      value: {
        storeName: 'MyStore Premium',
        supportEmail: 'support@example.com',
        allowGuestCheckout: true,
        taxPercent: 8,
        shippingFlatRate: 15
      }
    });

    await batch.commit();
    console.log('Firestore seed completed successfully!');
    return true;
  } catch (error) {
    console.error('Failed to seed database:', error);
    return false;
  }
}
