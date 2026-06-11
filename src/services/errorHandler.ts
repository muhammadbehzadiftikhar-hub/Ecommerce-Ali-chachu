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
  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed && typeof parsed === 'object' && ('message' in parsed || 'error' in parsed)) {
      return parsed.message || parsed.error || defaultMessage;
    }
  } catch {
    // Treat as raw message
  }
  
  if (rawMessage.includes("Permission denied") || rawMessage.includes("insufficient permissions")) {
    return "Access Denied: Restricted directory action.";
  }
  
  return rawMessage || defaultMessage;
}
