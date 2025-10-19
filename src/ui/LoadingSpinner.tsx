/**
 * Loading Spinner Component
 *
 * Shows a spinner with funny Discord-style loading messages.
 * Displayed when worker thread is actively generating preview.
 */

import React, { useEffect, useState } from 'react';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
  message?: string;
  progress?: number; // 0-100
}

/**
 * Funny loading messages (Discord-style)
 */
const FUNNY_MESSAGES = [
  'Summoning terrain vertices...',
  'Brewing heightmap potion...',
  'Calculating doodad coordinates...',
  'Negotiating with StormJS...',
  'Decoding ancient TGA runes...',
  'Extracting MPQ treasures...',
  'Rendering parallel universes...',
  'Consulting the Elder Scrolls...',
  'Channeling mana for preview...',
  'Invoking Babylon.js spirits...',
  'Decompressing Huffman trees...',
  'Triangulating map boundaries...',
  'Optimizing web worker spells...',
  'Materializing preview texture...',
  'Compiling shader incantations...',
];

/**
 * Get random funny message
 */
function getRandomMessage(): string {
  return FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)] as string;
}

/**
 * Loading Spinner Component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, progress }) => {
  const [funnyMessage, setFunnyMessage] = useState<string>(message || getRandomMessage());

  // Rotate funny message every 3 seconds
  useEffect(() => {
    if (message) {
      setFunnyMessage(message);
      return;
    }

    const interval = setInterval(() => {
      setFunnyMessage(getRandomMessage());
    }, 3000);

    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className="loading-spinner">
      {/* Spinner animation */}
      <div className="spinner-circle">
        <div className="spinner-inner"></div>
      </div>

      {/* Loading message */}
      <div className="loading-message">{funnyMessage}</div>

      {/* Progress bar (optional) */}
      {progress !== undefined && (
        <div className="loading-progress-bar">
          <div className="loading-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};
