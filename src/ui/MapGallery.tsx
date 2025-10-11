import React, { useState, useMemo } from 'react';
import type { MapLoadProgress } from '../formats/maps/BatchMapLoader';
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
}

export interface MapGalleryProps {
  /** List of maps to display */
  maps: MapMetadata[];

  /** Callback when map is selected */
  onMapSelect: (map: MapMetadata) => void;

  /** Loading progress (if batch loading) */
  loadProgress?: Map<string, MapLoadProgress>;

  /** Is batch loading in progress */
  isLoading?: boolean;
}

type SortOption = 'name' | 'size' | 'format';
type SizeFilter = 'all' | 'small' | 'medium' | 'large';
type FormatFilter = 'all' | 'w3x' | 'w3n' | 'sc2map';

export const MapGallery: React.FC<MapGalleryProps> = ({
  maps,
  onMapSelect,
  loadProgress,
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
        <div className="map-count">
          {filteredMaps.length} {filteredMaps.length === 1 ? 'map' : 'maps'}
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
            map={map}
            progress={loadProgress?.get(map.id)}
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

/**
 * Individual map card component
 */
interface MapCardProps {
  map: MapMetadata;
  progress?: MapLoadProgress;
  onClick: () => void;
}

const MapCard: React.FC<MapCardProps> = ({ map, progress, onClick }) => {
  const formatSizeDisplay = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };

  const formatLabel: Record<string, string> = {
    w3x: 'W3X',
    w3n: 'W3N',
    sc2map: 'SC2',
  };

  return (
    <div
      className={`map-card ${progress?.status === 'loading' ? 'loading' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label={`Load map: ${map.name}`}
    >
      {/* Thumbnail */}
      <div className="map-card-thumbnail">
        {map.thumbnailUrl !== undefined && map.thumbnailUrl !== null && map.thumbnailUrl !== '' ? (
          <img src={map.thumbnailUrl} alt={map.name} />
        ) : (
          <div className="map-card-placeholder">
            <span className="format-badge">{formatLabel[map.format]}</span>
          </div>
        )}

        {progress?.status === 'loading' && (
          <div className="map-card-loading">
            <div className="spinner" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="map-card-info">
        <div className="map-card-name" title={map.name}>
          {map.name}
        </div>
        <div className="map-card-meta">
          <span className="map-format">{formatLabel[map.format]}</span>
          <span className="map-size">{formatSizeDisplay(map.sizeBytes)}</span>
        </div>
      </div>
    </div>
  );
};
