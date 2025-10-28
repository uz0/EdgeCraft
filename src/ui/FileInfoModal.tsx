import React from 'react';
import './FileInfoModal.css';

interface FileInfoModalProps {
  file: {
    name: string;
    size: number;
    compressedSize: number;
    compressionRatio?: number;
    isCompressed?: boolean;
    isEncrypted?: boolean;
    compressionAlgorithm?: string;
  };
  onClose: () => void;
}

export const FileInfoModal: React.FC<FileInfoModalProps> = ({ file, onClose }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const compressionRatio =
    file.compressedSize > 0 ? ((1 - file.compressedSize / file.size) * 100).toFixed(1) : '0.0';

  return (
    <div className="FileInfoModal__overlay" onClick={onClose}>
      <div className="FileInfoModal__content" onClick={(e) => e.stopPropagation()}>
        <div className="FileInfoModal__header">
          <h2>📄 File Details</h2>
          <button className="FileInfoModal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="FileInfoModal__body">
          <div className="FileInfoModal__section">
            <h3>General Information</h3>
            <div className="FileInfoModal__row">
              <span className="FileInfoModal__label">File Name:</span>
              <span className="FileInfoModal__value">{file.name}</span>
            </div>
            <div className="FileInfoModal__row">
              <span className="FileInfoModal__label">Original Size:</span>
              <span className="FileInfoModal__value">{formatBytes(file.size)}</span>
            </div>
            <div className="FileInfoModal__row">
              <span className="FileInfoModal__label">Compressed Size:</span>
              <span className="FileInfoModal__value">{formatBytes(file.compressedSize)}</span>
            </div>
            <div className="FileInfoModal__row">
              <span className="FileInfoModal__label">Compression Ratio:</span>
              <span className="FileInfoModal__value">{compressionRatio}%</span>
            </div>
          </div>

          <div className="FileInfoModal__section">
            <h3>Compression Details</h3>
            <div className="FileInfoModal__row">
              <span className="FileInfoModal__label">Compressed:</span>
              <span
                className={`FileInfoModal__badge ${file.isCompressed === true ? 'FileInfoModal__badge--yes' : 'FileInfoModal__badge--no'}`}
              >
                {file.isCompressed === true ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="FileInfoModal__row">
              <span className="FileInfoModal__label">Encrypted:</span>
              <span
                className={`FileInfoModal__badge ${file.isEncrypted === true ? 'FileInfoModal__badge--yes' : 'FileInfoModal__badge--no'}`}
              >
                {file.isEncrypted === true ? '🔐 Yes' : '✅ No'}
              </span>
            </div>
            {file.compressionAlgorithm !== undefined && file.compressionAlgorithm !== '' && (
              <div className="FileInfoModal__row">
                <span className="FileInfoModal__label">Algorithm:</span>
                <span className="FileInfoModal__value">{file.compressionAlgorithm}</span>
              </div>
            )}
          </div>

          <div className="FileInfoModal__section">
            <h3>File Path</h3>
            <div className="FileInfoModal__path">{file.name}</div>
          </div>
        </div>

        <div className="FileInfoModal__footer">
          <button className="FileInfoModal__button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
