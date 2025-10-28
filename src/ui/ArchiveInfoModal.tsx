import React from 'react';
import './ArchiveInfoModal.css';

interface ArchiveInfoModalProps {
  archive: {
    fileName: string;
    fileCount: number;
    archiveSize: number;
    formatVersion: number;
    blockSize: number;
    hashTableSize: number;
    blockTableSize: number;
    hasEncryption: boolean;
    hasUserData: boolean;
    compressionStats: {
      algorithm: string;
      count: number;
    }[];
  };
  onClose: () => void;
  onDownloadListfile: () => void;
}

export const ArchiveInfoModal: React.FC<ArchiveInfoModalProps> = ({
  archive,
  onClose,
  onDownloadListfile,
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="ArchiveInfoModal__overlay" onClick={onClose}>
      <div className="ArchiveInfoModal__content" onClick={(e) => e.stopPropagation()}>
        <div className="ArchiveInfoModal__header">
          <h2>📦 MPQ Archive Details</h2>
          <button className="ArchiveInfoModal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ArchiveInfoModal__body">
          <div className="ArchiveInfoModal__section">
            <h3>Archive Information</h3>
            <div className="ArchiveInfoModal__row">
              <span className="ArchiveInfoModal__label">File Name:</span>
              <span className="ArchiveInfoModal__value">{archive.fileName}</span>
            </div>
            <div className="ArchiveInfoModal__row">
              <span className="ArchiveInfoModal__label">Archive Size:</span>
              <span className="ArchiveInfoModal__value">{formatBytes(archive.archiveSize)}</span>
            </div>
            <div className="ArchiveInfoModal__row">
              <span className="ArchiveInfoModal__label">File Count:</span>
              <span className="ArchiveInfoModal__value">{archive.fileCount} files</span>
            </div>
            <div className="ArchiveInfoModal__row">
              <span className="ArchiveInfoModal__label">Format Version:</span>
              <span className="ArchiveInfoModal__value">{archive.formatVersion}</span>
            </div>
          </div>

          <div className="ArchiveInfoModal__section">
            <h3>Structure Details</h3>
            <div className="ArchiveInfoModal__row">
              <span className="ArchiveInfoModal__label">Block Size:</span>
              <span className="ArchiveInfoModal__value">{formatBytes(archive.blockSize)}</span>
            </div>
            <div className="ArchiveInfoModal__row">
              <span className="ArchiveInfoModal__label">Hash Table Size:</span>
              <span className="ArchiveInfoModal__value">{archive.hashTableSize} entries</span>
            </div>
            <div className="ArchiveInfoModal__row">
              <span className="ArchiveInfoModal__label">Block Table Size:</span>
              <span className="ArchiveInfoModal__value">{archive.blockTableSize} entries</span>
            </div>
          </div>

          <div className="ArchiveInfoModal__section">
            <h3>Security & Features</h3>
            <div className="ArchiveInfoModal__row">
              <span className="ArchiveInfoModal__label">Encrypted Files:</span>
              <span
                className={`ArchiveInfoModal__badge ${archive.hasEncryption ? 'ArchiveInfoModal__badge--warning' : 'ArchiveInfoModal__badge--success'}`}
              >
                {archive.hasEncryption ? '🔐 Yes' : '✅ No'}
              </span>
            </div>
            <div className="ArchiveInfoModal__row">
              <span className="ArchiveInfoModal__label">User Data:</span>
              <span
                className={`ArchiveInfoModal__badge ${archive.hasUserData ? 'ArchiveInfoModal__badge--info' : 'ArchiveInfoModal__badge--neutral'}`}
              >
                {archive.hasUserData ? '📋 Yes' : '❌ No'}
              </span>
            </div>
          </div>

          <div className="ArchiveInfoModal__section">
            <h3>Compression Algorithms Detected</h3>
            <div className="ArchiveInfoModal__compression-list">
              {archive.compressionStats.map((stat, index) => (
                <div key={index} className="ArchiveInfoModal__compression-item">
                  <span className="ArchiveInfoModal__compression-name">✅ {stat.algorithm}</span>
                  <span className="ArchiveInfoModal__compression-count">
                    {stat.count} file{stat.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ArchiveInfoModal__footer">
          <button
            className="ArchiveInfoModal__button ArchiveInfoModal__button--secondary"
            onClick={() => {
              void onDownloadListfile();
            }}
          >
            Download (listfile)
          </button>
          <button className="ArchiveInfoModal__button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
