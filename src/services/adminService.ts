/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDocsFromServer, 
  getDoc,
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db, OperationType } from '../lib/firebase';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
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

/**
 * Fetch general site settings alert messages.
 */
export async function adminGetAlertMessages(): Promise<string[]> {
  const path = 'settings/general';
  try {
    const docRef = doc(db, 'settings', 'general');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.alertBarMessages && Array.isArray(data.alertBarMessages)) {
        return data.alertBarMessages;
      }
      if (data.value && data.value.alertBarMessages && Array.isArray(data.value.alertBarMessages)) {
        return data.value.alertBarMessages;
      }
    }
    return [
      'Complimentary Worldwide Insured Express Cargo Dispatch For Purchases Surpassing $200',
      'Exclusive Curated Global Releases Added Weekly — Sign up to Our Premium Newsletter List',
      'Enjoy Complimentary 10% Discount On First Purchase with Promo Code: MYSTORE10'
    ];
  } catch (error) {
    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Update the site-wide marquee alert messages.
 */
export async function adminSaveAlertMessages(messages: string[]): Promise<void> {
  const path = 'settings/general';
  try {
    const docRef = doc(db, 'settings', 'general');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        alertBarMessages: messages
      });
    } else {
      await setDoc(docRef, {
        id: 'general',
        key: 'general_store_settings',
        value: {
          storeName: 'MyStore Premium',
          supportEmail: 'support@example.com',
          allowGuestCheckout: true,
          taxPercent: 8,
          shippingFlatRate: 15
        },
        alertBarMessages: messages
      });
    }
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}

/**
 * Register a new administrator and write their profile, admins entry, and password_recovery entry to the database properly.
 */
export async function adminCreateNewAdmin(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();
  const path = 'admins/creation';

  try {
    // 1. Initialize a secondary, temporary Firebase App to avoid signing out the current admin user
    const tempAppName = 'AdminCreatorApp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    let newUid: string;

    // 2. Create the authenticated user credential
    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, normalizedEmail, password);
      newUid = userCredential.user.uid;
      // Clean up/sign out of the temporary application
      await signOut(tempAuth);
    } catch (createError: any) {
      if (createError.code === 'auth/email-already-in-use' || String(createError).includes('email-already-in-use')) {
        // Self-heal/recover: If auth exists and they entered the same password, let us sign in to get their UID and write their documents
        try {
          const userCredential = await signInWithEmailAndPassword(tempAuth, normalizedEmail, password);
          newUid = userCredential.user.uid;
          await signOut(tempAuth);
        } catch (signInError: any) {
          throw new Error("This administrator email already exists in authentication with another password. Please choose a different email, or use the ledger controls below to change/reset passwords.");
        }
      } else {
        throw createError;
      }
    }

    // 4. Create the Firestore records under the primary "db" context
    const userDocRef = doc(db, 'users', newUid);
    const nowStr = new Date().toISOString();
    
    // We store the password directly in the users document as requested
    const newUserRecord: User = {
      id: newUid,
      name: displayName,
      email: normalizedEmail,
      role: 'ADMIN',
      phone: '',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      createdAt: nowStr,
      updatedAt: nowStr
    };

    // Include the plain password directly in database as requested
    await setDoc(userDocRef, {
      ...newUserRecord,
      password: password
    });

    // 5. Also insert a mirror admin record in the 'admins' collection to satisfy security rules check
    const adminDocRef = doc(db, 'admins', newUid);
    await setDoc(adminDocRef, {
      id: newUid,
      email: normalizedEmail,
      role: 'ADMIN',
      createdAt: nowStr
    });

    // 6. Also write password recovery record to password_recovery collection
    const recoveryDocRef = doc(db, 'password_recovery', normalizedEmail);
    await setDoc(recoveryDocRef, {
      email: normalizedEmail,
      userId: newUid,
      securityQuestion: 'Dynamic Administrator Password Secret',
      securityAnswer: 'admins_root_trust_auth_recovery',
      password: password,
      updatedAt: nowStr
    });

    return newUserRecord;
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}

/**
 * Updates/resets another administrator's password in standard Firebase Auth and database records.
 */
export async function adminResetOtherAdminPassword(
  userId: string,
  email: string,
  oldPasswordInDB: string,
  newPasswordToSet: string
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const path = `admins/password-reset/${userId}`;

  try {
    // 1. Initialize temporary app to avoid signing out the current admin
    const tempAppName = 'AdminPassResetApp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      // 2. Sign in as the target user on the temporary app
      const userCredential = await signInWithEmailAndPassword(tempAuth, normalizedEmail, oldPasswordInDB || 'temporary_old_default_pass_123');
      // 3. Update their password in Firebase Authentication
      await updatePassword(userCredential.user, newPasswordToSet);
      // 4. Sign out of secondary instance
      await signOut(tempAuth);
    } catch (authError: any) {
      console.warn("Sub-auth sync warning (forcing database self-healing override):", authError);
      
      // If sign-in fails because they were created directly in Firestore users but not in Firebase Auth yet,
      // create them in auth using the new password.
      try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, normalizedEmail, newPasswordToSet);
        await signOut(tempAuth);
      } catch (createError) {
        console.warn("Unable to sync authentications directly, performing DB updates only.", createError);
      }
    }

    // 5. Update Firestore users collection
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      password: newPasswordToSet,
      updatedAt: new Date().toISOString()
    });

    // 6. Update password_recovery collection
    const recoveryDocRef = doc(db, 'password_recovery', normalizedEmail);
    const recoveryDocSnap = await getDoc(recoveryDocRef);
    if (recoveryDocSnap.exists()) {
      await updateDoc(recoveryDocRef, {
        password: newPasswordToSet,
        updatedAt: new Date().toISOString()
      });
    } else {
      await setDoc(recoveryDocRef, {
        email: normalizedEmail,
        userId: userId,
        securityQuestion: 'Dynamic Administrator Password Secret',
        securityAnswer: 'admins_root_trust_auth_recovery',
        password: newPasswordToSet,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}

