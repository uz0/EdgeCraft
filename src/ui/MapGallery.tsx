import React from 'react';
import type { MapMetadata } from '../pages/IndexPage';
import './MapGallery.css';

export interface MapGalleryProps {
  maps: MapMetadata[];
  onMapSelect: (mapName: string) => void;
}

export const MapGallery: React.FC<MapGalleryProps> = ({ maps, onMapSelect }) => {
  return (
    <div className="map-gallery-grid">
      {maps.map((map) => (
        <MapCard key={map.id} map={map} onSelect={() => onMapSelect(map.name)} />
      ))}
    </div>
  );
};

interface MapCardProps {
  map: MapMetadata;
  onSelect: () => void;
}

const MapCard: React.FC<MapCardProps> = ({ map, onSelect }) => {
  const hasThumb = map.thumbnailUrl !== undefined && map.thumbnailUrl !== '';

  const formatLabels: Record<string, string> = {
    w3x: 'W3X',
    w3m: 'W3M',
    sc2map: 'SC2',
  };

  const isTheEdgeStory = map.name.toLowerCase().includes('theedgestory');
  const formatLabel = isTheEdgeStory
    ? 'TES'
    : (formatLabels[map.format] ?? map.format.toUpperCase());

  return (
    <button className="map-card" onClick={onSelect} aria-label={`Open map: ${map.name}`}>
      <div
        className="map-card-background"
        style={{
          backgroundImage: hasThumb ? `url(${map.thumbnailUrl})` : undefined,
        }}
      >
        {!hasThumb && (
          <div className="format-placeholder">
            <span className="format-label">{formatLabel}</span>
          </div>
        )}
      </div>
      <div className="map-card-overlay">
        <div className="map-card-title">
          <span className="player-count">{map.players}</span>
          <div className="map-info">
            <span className="map-name">{map.name}</span>
            <span className="map-author">{map.author}</span>
          </div>
        </div>
      </div>
    </button>
  );
};
