import React, { useState, useMemo } from 'react';
import { MapCard } from './MapCard';
import type { MapLoadProgress } from '../formats/maps/BatchMapLoader';
import type { PreviewLoadingState } from '../hooks/useMapPreviews';
import './MapGallery.css';

export interface MapMetadata {
  /** Unique ID */
  id: string;

  /** Display name */
  name: string;

  /** File format */
  format: 'w3x' | 'w3n' | 'sc2map';

  /** File size in bytes */
  sizeBytes: number;

  /** Thumbnail URL (from MapPreviewGenerator) */
  thumbnailUrl?: string;

  /** File reference */
  file: File;

  /** Game version (TFT, ROC, Reforged) */
  gameVersion?: 'ROC' | 'TFT' | 'Reforged' | 'SC2' | 'Unknown';

  /** Map dimensions (e.g. "256x256") */
  mapSize?: string;

  /** Number of players */
  playerCount?: number;
}

export interface MapGalleryProps {
  /** List of maps to display */
  maps: MapMetadata[];

  /** Callback when map is selected */
  onMapSelect: (map: MapMetadata) => void;

  /** Map previews (Map ID → Data URL) */
  previews?: Map<string, string>;

  /** Preview loading states (per map) */
  previewLoadingStates?: Map<string, PreviewLoadingState>;

  /** Preview loading messages (funny text per map) */
  previewLoadingMessages?: Map<string, string>;

  /** Preview loading progress (per map, 0-100%) */
  previewLoadingProgress?: Map<string, number>;

  /** Loading progress (if batch loading) */
  loadProgress?: Map<string, MapLoadProgress>;

  /** Callback to clear all previews */
  onClearPreviews?: () => void;

  /** Is batch loading in progress */
  isLoading?: boolean;
}

type SortOption = 'name' | 'size' | 'format';
type SizeFilter = 'all' | 'small' | 'medium' | 'large';
type FormatFilter = 'all' | 'w3x' | 'w3n' | 'sc2map';

export const MapGallery: React.FC<MapGalleryProps> = ({
  maps,
  onMapSelect,
  previews,
  previewLoadingStates,
  previewLoadingMessages,
  previewLoadingProgress,
  loadProgress,
  onClearPreviews,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');

  // Filter and sort maps
  const filteredMaps = useMemo(() => {
    let result = [...maps];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((map) => map.name.toLowerCase().includes(query));
    }

    // Format filter
    if (formatFilter !== 'all') {
      result = result.filter((map) => map.format === formatFilter);
    }

    // Size filter
    if (sizeFilter !== 'all') {
      result = result.filter((map) => {
        const sizeMB = map.sizeBytes / (1024 * 1024);
        if (sizeFilter === 'small') return sizeMB < 50;
        if (sizeFilter === 'medium') return sizeMB >= 50 && sizeMB <= 100;
        if (sizeFilter === 'large') return sizeMB > 100;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        return a.sizeBytes - b.sizeBytes;
      } else if (sortBy === 'format') {
        return a.format.localeCompare(b.format);
      }
      return 0;
    });

    return result;
  }, [maps, searchQuery, sortBy, formatFilter, sizeFilter]);

  return (
    <div className="map-gallery">
      {/* Header */}
      <div className="map-gallery-header">
        <h2>Map Gallery</h2>
        <div className="map-gallery-header-actions">
          <div className="map-count">
            {filteredMaps.length} {filteredMaps.length === 1 ? 'map' : 'maps'}
          </div>
          {onClearPreviews && (
            <button
              className="btn-clear-previews"
              onClick={onClearPreviews}
              title="Clear all previews and reload"
            >
              🗑️ Reset Previews
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="map-gallery-controls">
        {/* Search */}
        <input
          type="text"
          className="map-search"
          placeholder="Search maps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search maps"
        />

        {/* Sort */}
        <select
          className="map-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          aria-label="Sort by"
        >
          <option value="name">Sort by Name</option>
          <option value="size">Sort by Size</option>
          <option value="format">Sort by Format</option>
        </select>

        {/* Format Filter */}
        <select
          className="map-filter-format"
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value as FormatFilter)}
          aria-label="Filter by format"
        >
          <option value="all">All Formats</option>
          <option value="w3x">Warcraft 3 Maps (.w3x)</option>
          <option value="w3n">Warcraft 3 Campaigns (.w3n)</option>
          <option value="sc2map">StarCraft 2 (.sc2map)</option>
        </select>

        {/* Size Filter */}
        <select
          className="map-filter-size"
          value={sizeFilter}
          onChange={(e) => setSizeFilter(e.target.value as SizeFilter)}
          aria-label="Filter by size"
        >
          <option value="all">All Sizes</option>
          <option value="small">&lt; 50 MB</option>
          <option value="medium">50 - 100 MB</option>
          <option value="large">&gt; 100 MB</option>
        </select>
      </div>

      {/* Loading Progress */}
      {isLoading && loadProgress && (
        <div className="map-gallery-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${
                  (Array.from(loadProgress.values()).filter((p) => p.status === 'success').length /
                    loadProgress.size) *
                  100
                }%`,
              }}
            />
          </div>
          <div className="progress-text">
            Loading maps:{' '}
            {Array.from(loadProgress.values()).filter((p) => p.status === 'success').length} /{' '}
            {loadProgress.size}
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="map-gallery-grid">
        {filteredMaps.map((map) => (
          <MapCard
            key={map.id}
            mapId={map.id}
            mapName={map.name}
            previewUrl={previews?.get(map.id)}
            loadingState={previewLoadingStates?.get(map.id) || 'idle'}
            loadingMessage={previewLoadingMessages?.get(map.id)}
            loadingProgress={previewLoadingProgress?.get(map.id)}
            format={map.format}
            onClick={() => onMapSelect(map)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredMaps.length === 0 && (
        <div className="map-gallery-empty">
          <p>No maps found matching your filters.</p>
        </div>
      )}
    </div>
  );
};
