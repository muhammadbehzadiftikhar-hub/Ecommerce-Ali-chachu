/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode } from 'react';

interface AdminEnvironmentWrapperProps {
  children: ReactNode;
  isRefreshingData?: boolean;
}

/**
 * AdminEnvironmentWrapper
 * Ensures that all styles, sub-configurations, specialized font weights, and layout systems
 * within the Admin Console are fully isolated from the main customer-facing storefront container.
 */
export function AdminEnvironmentWrapper({ children, isRefreshingData = false }: AdminEnvironmentWrapperProps) {
  return (
    <div 
      id="admin-environment-wrapper" 
      className="admin-scoped-context flex-1 flex flex-col min-h-[80vh] bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased"
      style={{
        colorScheme: 'light dark',
        // Isolates the visual context, stopping layout thrashing and styling bleed
        contain: 'style layout',
      }}
    >
      <div className={`relative flex-1 flex flex-col transition-all duration-300 ${
        isRefreshingData ? 'opacity-85 saturate-75 cursor-wait' : 'opacity-100 saturate-100'
      }`}>
        {children}
      </div>
    </div>
  );
}
