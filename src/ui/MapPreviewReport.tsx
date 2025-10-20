import React from 'react';
import type { MapMetadata } from '../pages/IndexPage';
import './MapPreviewReport.css';

export interface MapPreviewReportProps {
  /** All maps with preview data */
  maps: MapMetadata[];
  /** Preview generation progress */
  previewProgress?: Map<
    string,
    { status: 'pending' | 'generating' | 'success' | 'error'; error?: string }
  >;
}

/**
 * Comprehensive map preview report component
 * Displays all maps in a detailed list format with previews and metadata
 */
export const MapPreviewReport: React.FC<MapPreviewReportProps> = ({ maps, previewProgress }) => {
  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };

  const formatLabel: Record<string, string> = {
    w3x: 'Warcraft 3 Map',
    w3m: 'Warcraft 3 Reforged',
    sc2map: 'StarCraft 2 Map',
  };

  // Group maps by format
  const mapsByFormat = React.useMemo(() => {
    const grouped: Record<string, MapMetadata[]> = {
      sc2map: [],
      w3x: [],
      w3m: [],
    };
    maps.forEach((map) => {
      const formatGroup = grouped[map.format];
      if (formatGroup) {
        formatGroup.push(map);
      } else {
        grouped[map.format] = [map];
      }
    });
    return grouped;
  }, [maps]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = maps.length;
    const withPreviews = maps.filter((m) => m.thumbnailUrl != null && m.thumbnailUrl !== '').length;
    const pending = maps.filter(
      (m) =>
        (m.thumbnailUrl == null || m.thumbnailUrl === '') &&
        previewProgress?.get(m.id)?.status === 'pending'
    ).length;
    const generating = maps.filter(
      (m) => previewProgress?.get(m.id)?.status === 'generating'
    ).length;
    const errors = maps.filter((m) => previewProgress?.get(m.id)?.status === 'error').length;

    return { total, withPreviews, pending, generating, errors };
  }, [maps, previewProgress]);

  const renderMapRow = (map: MapMetadata, index: number): React.ReactElement => {
    const progress = previewProgress?.get(map.id);
    const hasPreview =
      map.thumbnailUrl !== undefined && map.thumbnailUrl !== null && map.thumbnailUrl !== '';

    return (
      <div key={map.id} className="map-preview-row">
        <div className="map-preview-index">{index}</div>

        <div className="map-preview-thumbnail">
          {hasPreview ? (
            <img src={map.thumbnailUrl} alt={`${map.name} preview`} loading="lazy" />
          ) : progress?.status === 'generating' ? (
            <div className="preview-generating">
              <div className="spinner" />
              <span>Generating...</span>
            </div>
          ) : progress?.status === 'error' ? (
            <div className="preview-error" title={progress.error}>
              <span>❌ Error</span>
            </div>
          ) : (
            <div className="preview-pending">
              <span>⏳ Pending</span>
            </div>
          )}
        </div>

        <div className="map-preview-details">
          <div className="map-preview-name">{map.name}</div>
          <div className="map-preview-meta">
            <span className="meta-format">
              {formatLabel[map.format] ?? map.format.toUpperCase()}
            </span>
            <span className="meta-size">{formatSize(map.sizeBytes)}</span>
            {hasPreview && <span className="meta-status">✅ Preview Ready</span>}
            {progress?.status === 'error' && (
              <span className="meta-error" title={progress.error}>
                ⚠️ {progress.error ?? 'Preview generation failed'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="map-preview-report">
      {/* Header */}
      <div className="report-header">
        <h1>Map Preview Report</h1>
        <p className="report-subtitle">Complete list of all maps with preview status</p>
      </div>

      {/* Statistics */}
      <div className="report-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Maps</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{stats.withPreviews}</div>
          <div className="stat-label">Previews Generated</div>
        </div>
        {stats.generating > 0 && (
          <div className="stat-card info">
            <div className="stat-value">{stats.generating}</div>
            <div className="stat-label">Generating</div>
          </div>
        )}
        {stats.pending > 0 && (
          <div className="stat-card warning">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        )}
        {stats.errors > 0 && (
          <div className="stat-card error">
            <div className="stat-value">{stats.errors}</div>
            <div className="stat-label">Errors</div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <div className="report-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(stats.withPreviews / stats.total) * 100}%` }}
            />
          </div>
          <div className="progress-text">
            {stats.withPreviews} / {stats.total} previews ready (
            {Math.round((stats.withPreviews / stats.total) * 100)}%)
          </div>
        </div>
      )}

      {/* Map Lists by Format */}
      {Object.entries(mapsByFormat).map(([format, formatMaps]) => {
        if (formatMaps.length === 0) return null;

        const formatStats = {
          total: formatMaps.length,
          withPreviews: formatMaps.filter((m) => m.thumbnailUrl != null && m.thumbnailUrl !== '')
            .length,
        };

        return (
          <div key={format} className="format-section">
            <div className="format-header">
              <h2>{formatLabel[format] ?? format.toUpperCase()}s</h2>
              <span className="format-count">
                {formatStats.withPreviews} / {formatStats.total} previews
              </span>
            </div>

            <div className="map-preview-list">
              {formatMaps.map((map, idx) => renderMapRow(map, idx + 1))}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {maps.length === 0 && (
        <div className="report-empty">
          <p>No maps found. Add map files to the /maps directory.</p>
        </div>
      )}
    </div>
  );
};
