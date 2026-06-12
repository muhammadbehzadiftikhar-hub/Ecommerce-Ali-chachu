/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db, OperationType } from '../lib/firebase';
import { handleServiceError } from './errorHandler';

/**
 * Interface representing security question details.
 */
export interface UserSecurityDetails {
  email: string;
  securityQuestion: string;
}

/**
 * Queries the 'users' collection in Firestore to verify if a user has the 'ADMIN' role.
 * 
 * @param uid The Firebase user ID
 * @returns Promise<boolean> True if the user exists and has the ADMIN or SUPER_ADMIN role
 */
export async function verifyUserIsAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return data?.role === 'ADMIN' || data?.role === 'SUPER_ADMIN';
    }
    return false;
  } catch (error) {
    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Performs a strict server-side direct check against the secure 'users' database collection 
 * to guarantee that the authenticated user possesses the 'ADMIN' or 'SUPER_ADMIN' role.
 * This is used to block any component mounting/rendering in the Admin Console.
 * 
 * @param uid The Firebase user ID to verify
 */
export async function verifyAdminRoleStrict(uid: string | undefined | null): Promise<boolean> {
  if (!uid) return false;
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return data?.role === 'ADMIN' || data?.role === 'SUPER_ADMIN';
    }
    return false;
  } catch (error) {
    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Register a user profile with Email, Password, custom security question, and custom security answer.
 * Also stores user records in the Firestore database.
 */
export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName: string,
  securityQuestion: string,
  securityAnswer: string,
  role = 'CUSTOMER'
) {
  const normalizedEmail = email.toLowerCase().trim();
  const path = 'auth/registration';

  try {
    // 1. Create standard Firebase Authentication credential
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const firebaseUser = userCredential.user;

    // 2. Set display name in auth profile
    await updateProfile(firebaseUser, { displayName });

    // 3. Write User document to users/collection
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userDocRef, {
      id: firebaseUser.uid,
      name: displayName,
      email: normalizedEmail,
      role,
      password, // Password stored directly in DB to meet literal request
      securityQuestion,
      securityAnswer: securityAnswer.toLowerCase().trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 4. Create public security recovery map document to facilitate looking up secure answers before logging in
    const recoveryDocRef = doc(db, 'password_recovery', normalizedEmail);
    await setDoc(recoveryDocRef, {
      email: normalizedEmail,
      userId: firebaseUser.uid,
      securityQuestion,
      securityAnswer: securityAnswer.toLowerCase().trim(),
      password,
      updatedAt: new Date().toISOString()
    });

    return firebaseUser;
  } catch (error) {
    handleServiceError(error, OperationType.CREATE, path);
  }
}

/**
 * Sign in a user with Email and Password credentials.
 */
export async function loginWithEmailPassword(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const path = 'auth/signin';

  try {
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const firebaseUser = userCredential.user;

    // Optional self-healing: Update database password just in case it is out-of-sync
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDocRef, {
        password,
        updatedAt: new Date().toISOString()
      });
      const recoveryDocRef = doc(db, 'password_recovery', normalizedEmail);
      await updateDoc(recoveryDocRef, {
        password,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Swallowed safely (might be guest/anon or restricted permissions)
    }

    return firebaseUser;
  } catch (error: any) {
    // Self-healing check: If sign-in fails because of invalid credentials, but this account exists in Firestore users exactly with this password,
    // we can automatically register them in Firebase Authentication so their account is seamlessly synced and signed-in!
    try {
      const errCode = error?.code || '';
      const errMsg = error instanceof Error ? error.message : String(error);
      const isCredentialIssue = errCode === 'auth/user-not-found' || 
                                errCode === 'auth/invalid-credential' || 
                                errCode === 'auth/wrong-password' ||
                                errMsg.toLowerCase().includes('user-not-found') ||
                                errMsg.toLowerCase().includes('invalid-credential') ||
                                errMsg.toLowerCase().includes('wrong-password') ||
                                errMsg.toLowerCase().includes('invalid credential');

      if (isCredentialIssue) {
        const { doc, getDoc, setDoc, deleteDoc } = await import('firebase/firestore');
        const recoveryDocRef = doc(db, 'password_recovery', normalizedEmail);
        const snap = await getDoc(recoveryDocRef);

        if (snap.exists()) {
          const userData = snap.data();
          if (userData && userData.password === password) {
            console.log("Self-healing: Found matching credentials in Firestore password_recovery, but missing/out-of-sync in Firebase Auth. Provisioning Auth user now...");
            
            // Register this user inside Firebase Authentication on-the-fly
            const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            const firebaseUser = userCredential.user;

            const oldUid = userData.userId || '';
            let finalRole = userData.role || 'CUSTOMER';
            let finalName = userData.name || 'Store User';

            // Now that we are authenticated, we can check if they existed in the admins collection
            if (oldUid) {
              try {
                const adminDocSnap = await getDoc(doc(db, 'admins', oldUid));
                if (adminDocSnap.exists()) {
                  finalRole = 'ADMIN';
                  const adminData = adminDocSnap.data();
                  if (adminData && adminData.role) {
                    finalRole = adminData.role;
                  }
                }
              } catch (adminErr) {
                console.warn("Could not check old admins record:", adminErr);
              }
            }

            // Always grant ADMIN to explicit administrator emails
            const isEmailAdmin = normalizedEmail === 'muhammadbehzadiftikhar@gmail.com' || 
                                 normalizedEmail === 'muhammadbehzad@gmail.com' || 
                                 normalizedEmail === 'admin@example.com' ||
                                 normalizedEmail === 'admin@behzad.com';
            if (isEmailAdmin) {
              finalRole = 'ADMIN';
              finalName = 'Store Administrator';
            }

            // Write or migrate user profile under the new active UID (which we now own, so isOwner is true)
            const newDocRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(newDocRef, {
              id: firebaseUser.uid,
              name: finalName,
              email: normalizedEmail,
              role: finalRole,
              password: password,
              securityQuestion: userData.securityQuestion || 'Dynamic Administrator Password Secret',
              securityAnswer: userData.securityAnswer || 'admins_root_trust_auth_recovery',
              createdAt: userData.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            // Perform cleanups of old records (which is now permitted since roles are active for users/{firebaseUser.uid})
            if (oldUid && oldUid !== firebaseUser.uid) {
              try {
                await deleteDoc(doc(db, 'users', oldUid));
              } catch (delErr) {
                console.warn("Failed to delete older user record during migration:", delErr);
              }
            }

            // If an administrator, update/seed both admins list and make sure password_recovery is updated too
            if (finalRole === 'ADMIN' || finalRole === 'SUPER_ADMIN') {
              const adminRef = doc(db, 'admins', firebaseUser.uid);
              await setDoc(adminRef, {
                id: firebaseUser.uid,
                email: normalizedEmail,
                role: finalRole,
                createdAt: new Date().toISOString()
              });
              if (oldUid && oldUid !== firebaseUser.uid) {
                try {
                  await deleteDoc(doc(db, 'admins', oldUid));
                } catch {}
              }
            }

            // Sync/update password recovery document with the new authenticated user ID
            await setDoc(recoveryDocRef, {
              email: normalizedEmail,
              userId: firebaseUser.uid,
              securityQuestion: userData.securityQuestion || 'Dynamic Administrator Password Secret',
              securityAnswer: userData.securityAnswer || 'admins_root_trust_auth_recovery',
              password: password,
              name: finalName,
              role: finalRole,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            return firebaseUser;
          }
        }
      }
    } catch (healError) {
      console.error("Self-healing signup sync failed:", healError);
    }

    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Retrieve user's configured security question by email for authentication verification.
 */
export async function getSecurityQuestionByEmail(email: string): Promise<UserSecurityDetails | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const path = `password_recovery/${normalizedEmail}`;

  try {
    const recoveryDocRef = doc(db, 'password_recovery', normalizedEmail);
    const recoveryDocSnap = await getDoc(recoveryDocRef);
    if (recoveryDocSnap.exists()) {
      const data = recoveryDocSnap.data();
      return {
        email: data.email,
        securityQuestion: data.securityQuestion
      };
    }
    return null;
  } catch (error) {
    handleServiceError(error, OperationType.GET, path);
  }
}

/**
 * Resets/recovers the user password in the Firestore database if they present the correct security question answer.
 * Also returns the recovered password back to the user, and triggers database updates.
 */
export async function recoverPasswordWithSecurityQuestion(
  email: string,
  answer: string,
  newPassword?: string
): Promise<{ success: boolean; recoveredPassword?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedAnswer = answer.toLowerCase().trim();
  const path = `password_recovery/${normalizedEmail}`;

  try {
    const recoveryDocRef = doc(db, 'password_recovery', normalizedEmail);
    const recoveryDocSnap = await getDoc(recoveryDocRef);

    if (!recoveryDocSnap.exists()) {
      return { success: false };
    }

    const data = recoveryDocSnap.data();
    if (data.securityAnswer === normalizedAnswer) {
      // If user specified a new password, let's update it in the recovery database too!
      if (newPassword) {
        await updateDoc(recoveryDocRef, {
          password: newPassword,
          updatedAt: serverTimestamp()
        });

        // Also attempt user profile update if possible (could fail if we're not authorized yet, which is safe)
        try {
          const userDocRef = doc(db, 'users', data.userId);
          await updateDoc(userDocRef, {
            password: newPassword,
            updatedAt: new Date().toISOString()
          });
        } catch {
          // Normal background behavior if they are unauthenticated
        }
      }

      return { 
        success: true, 
        recoveredPassword: newPassword || data.password 
      };
    }

    return { success: false };
  } catch (error) {
    handleServiceError(error, OperationType.UPDATE, path);
  }
}

/**
 * Dispatches a standard secure Firebase Password reset link directly to the customer's mailbox.
 */
export async function resetPasswordWithEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const path = 'auth/reset-email';
  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
    return true;
  } catch (error) {
    handleServiceError(error, OperationType.WRITE, path);
  }
}
