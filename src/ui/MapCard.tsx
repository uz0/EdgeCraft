/**
 * Map Card Component
 *
 * Displays a single map with progressive loading states:
 * 1. Skeleton (gray shimmer) - Initial state
 * 2. Spinner (funny message) - Worker generating preview
 * 3. Preview (actual image) - Worker complete
 *
 * Implements cache-first strategy:
 * - Cached previews show immediately (no skeleton/spinner)
 * - Uncached previews show skeleton → spinner → preview
 */

import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import { LoadingSpinner } from './LoadingSpinner';
import './MapCard.css';

export interface MapCardProps {
  mapId: string;
  mapName: string;
  previewUrl?: string; // Data URL of preview image
  loadingState: 'idle' | 'loading' | 'success' | 'error';
  loadingMessage?: string;
  loadingProgress?: number; // 0-100
  format?: 'w3x' | 'w3n' | 'sc2map';
  onClick?: () => void;
}

/**
 * Map Card Component
 */
export const MapCard: React.FC<MapCardProps> = ({
  mapId,
  mapName,
  previewUrl,
  loadingState,
  loadingMessage,
  loadingProgress,
  format,
  onClick,
}) => {
  // Debug logging on state changes
  React.useEffect(() => {
    if (loadingState === 'success') {
    }
  }, [loadingState, previewUrl, mapName]);

  return (
    <div className="map-card" onClick={onClick} data-map-id={mapId}>
      {/* Preview container */}
      <div className="map-card-preview">
        {/* State 1: Skeleton (initial load) */}
        {loadingState === 'idle' && !previewUrl && (
          <SkeletonLoader width={256} height={256} borderRadius={8} />
        )}

        {/* State 2: Spinner (worker generating) */}
        {loadingState === 'loading' && (
          <LoadingSpinner message={loadingMessage} progress={loadingProgress} />
        )}

        {/* State 3: Preview (completed) */}
        {loadingState === 'success' && previewUrl && (
          <img src={previewUrl} alt={`${mapName} preview`} className="map-preview-image" />
        )}

        {/* State 4: Error (fallback) */}
        {loadingState === 'error' && (
          <div className="map-preview-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">Failed to load preview</span>
          </div>
        )}

        {/* Format badge */}
        {format && (
          <div className={`map-format-badge map-format-${format}`}>{format.toUpperCase()}</div>
        )}
      </div>

      {/* Map info */}
      <div className="map-card-info">
        <h3 className="map-card-title">{mapName}</h3>
      </div>
    </div>
  );
};
