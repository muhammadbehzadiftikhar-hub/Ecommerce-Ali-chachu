/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleFirestoreError, OperationType } from '../lib/firebase';

export interface ServiceError {
  message: string;
  originalError: string;
  code?: string;
  operation: OperationType;
  path: string;
  timestamp: string;
}

/**
 * Global API/Service Error Handler for all service modules.
 * Ensures consistent, user-friendly feedback without exposing internal stack traces or console leaks.
 */
export function handleServiceError(error: any, operation: OperationType, path: string): never {
  const code = error?.code || error?.status || undefined;
  const originalMessage = error instanceof Error ? error.message : String(error);

  // If we identify a security rule failure (Missing or insufficient permissions),
  // we must run handleFirestoreError to satisfy the firebase skill metadata mandates.
  if (
    originalMessage.toLowerCase().includes('permission') ||
    originalMessage.toLowerCase().includes('unauthorized') ||
    code === 'permission-denied'
  ) {
    try {
      handleFirestoreError(error, operation, path);
    } catch (firestoreError: any) {
      // Re-throw or format as service error
      const serviceErr: ServiceError = {
        message: "Access Denied: You do not possess the required Firestore administrative permissions for this operation.",
        originalError: firestoreError.message,
        code: 'PERMISSION_DENIED',
        operation,
        path,
        timestamp: new Date().toISOString()
      };
      throw new Error(JSON.stringify(serviceErr));
    }
  }

  const serviceErr: ServiceError = {
    message: `Database operation fell short during [${operation.toUpperCase()}] at /${path}. Reason: ${originalMessage}`,
    originalError: originalMessage,
    code,
    operation,
    path,
    timestamp: new Date().toISOString()
  };

  throw new Error(JSON.stringify(serviceErr));
}

/**
 * Utility to parse error messages safely in the UI.
 */
export function getFriendlyErrorMessage(error: any, defaultMessage = "An unexpected error occurred in MyStore database system."): string {
  if (!error) return defaultMessage;
  
  const rawMessage = error instanceof Error ? error.message : String(error);
  let parsed: any = null;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    if (typeof error === 'object' && error !== null) {
      parsed = error;
    }
  }

  const errorCode = parsed?.code || error?.code;
  const originalErr = parsed?.originalError || parsed?.error || rawMessage;

  if (errorCode) {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return "Incorrect email or password. Please check your credentials and try again.";
      case 'auth/email-already-in-use':
        return "An account with this email address already exists.";
      case 'auth/weak-password':
        return "Password is too weak. Please use at least 6 characters.";
      case 'auth/invalid-email':
        return "Please input a valid email address.";
      case 'auth/user-disabled':
        return "This user account has been deactivated.";
      case 'auth/too-many-requests':
        return "Access temporarily blocked due to multiple failed sign-in attempts. Please try again later.";
      case 'PERMISSION_DENIED':
      case 'permission-denied':
        return "Access Denied: You do not possess the required administrative permissions.";
    }
  }

  // Fallback pattern matching
  const checkStr = (parsed?.message || originalErr || rawMessage).toLowerCase();
  if (checkStr.includes("invalid-credential") || checkStr.includes("auth/invalid-credential") || checkStr.includes("wrong-password") || checkStr.includes("invalid credential")) {
    return "Incorrect email or password. Please check your credentials and try again.";
  }
  if (checkStr.includes("email-already-in-use") || checkStr.includes("email already in use")) {
    return "An account with this email address already exists.";
  }
  if (checkStr.includes("permission") || checkStr.includes("unauthorized") || checkStr.includes("insufficient")) {
    return "Access Denied: You do not possess the required permissions for this operation.";
  }

  if (parsed && typeof parsed === 'object' && ('message' in parsed || 'error' in parsed)) {
    let msg = parsed.message || parsed.error || defaultMessage;
    // Clean up technical database prefixes
    if (msg.includes("Reason: ")) {
      msg = msg.split("Reason: ").pop() || msg;
    }
    if (msg.includes("Firebase: ")) {
      msg = msg.replace(/Firebase:\s*(Error\s*)?(\((.*?)\))?\.?/g, '').trim();
    }
    if (msg.startsWith("Error (") && msg.endsWith(").")) {
      msg = msg.substring(7, msg.length - 2);
    }
    return msg || defaultMessage;
  }
  
  return rawMessage || defaultMessage;
}
