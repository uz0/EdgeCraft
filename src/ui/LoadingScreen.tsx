/**
 * LoadingScreen - Full-screen loading overlay with progress
 */

import React from 'react';

export interface LoadingScreenProps {
  progress?: string;
  mapName?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, mapName }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner-large" />
        <h2>Loading {mapName ?? 'Map'}...</h2>
        {progress != null && progress !== '' && <p className="loading-progress">{progress}</p>}
      </div>

      <style>{`
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .loading-content {
          text-align: center;
          color: #fff;
        }

        .loading-content h2 {
          margin: 1rem 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 500;
        }

        .loading-progress {
          margin: 0.5rem 0 0;
          color: #aaa;
          font-size: 0.9rem;
        }

        .loading-spinner-large {
          width: 80px;
          height: 80px;
          border: 6px solid #333;
          border-top: 6px solid #4caf50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
