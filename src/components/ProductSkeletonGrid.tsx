/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export function ProductSkeletonGrid() {
  const skeletonCards = Array.from({ length: 8 });

  return (
    <div className="space-y-8 animate-pulse">
      {/* Category Horizontal Pills Skeleton */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <div className="h-9 w-24 bg-slate-100 rounded-xl" />
          <div className="h-9 w-28 bg-slate-100 rounded-xl" />
          <div className="h-9 w-20 bg-slate-100 rounded-xl" />
          <div className="h-9 w-28 bg-slate-100 rounded-xl" />
        </div>
        
        {/* Sorting slider skeleton */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="h-9 w-44 bg-slate-100 rounded-xl" />
          <div className="h-9 w-40 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* Grid of skeleton cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
        {skeletonCards.map((_, idx) => (
          <div
            key={idx}
            className="border border-slate-100 rounded-2xl overflow-hidden flex flex-col h-full bg-white"
          >
            {/* Image Placeholder */}
            <div className="relative aspect-square w-full bg-slate-100" />

            {/* Content Details Placeholder */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                {/* Category tag */}
                <div className="h-3 w-16 bg-slate-100 rounded-md" />
                {/* Title */}
                <div className="h-4 w-3/4 bg-slate-100 rounded-md" />
                {/* Description */}
                <div className="space-y-1">
                  <div className="h-3 w-full bg-slate-100 rounded-md" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded-md" />
                </div>
              </div>

              {/* Price and Button footer */}
              <div className="space-y-3 pt-2">
                <div className="h-5 w-20 bg-slate-100 rounded-md" />
                <div className="h-8 w-full bg-slate-100 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
