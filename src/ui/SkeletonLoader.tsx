/**
 * Skeleton Loader Component
 *
 * Shows a gray shimmer animation while map preview is loading.
 * Displayed immediately when page loads (before worker starts).
 */

import React from 'react';
import './SkeletonLoader.css';

export interface SkeletonLoaderProps {
  width?: number;
  height?: number;
  borderRadius?: number;
}

/**
 * Skeleton Loader
 * Gray placeholder with shimmer animation
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = 512,
  height = 512,
  borderRadius = 8,
}) => {
  return (
    <div
      className="skeleton-loader"
      style={{
        width,
        height,
        borderRadius,
      }}
    >
      <div className="skeleton-shimmer" />
    </div>
  );
};
