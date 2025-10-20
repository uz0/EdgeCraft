/**
 * Debug Overlay - Displays FPS and debug information
 */

import React, { useEffect, useState } from 'react';
import type { EdgeCraftEngine } from '@/engine/core/Engine';
import type { EngineState } from '@/engine/core/types';

/**
 * Debug Overlay props
 */
export interface DebugOverlayProps {
  /** Engine instance */
  engine: EdgeCraftEngine | null;
  /** Update interval in ms */
  updateInterval?: number;
}

/**
 * Debug Overlay component
 *
 * Shows real-time engine statistics
 */
export const DebugOverlay: React.FC<DebugOverlayProps> = ({ engine, updateInterval = 500 }) => {
  const [state, setState] = useState<EngineState>({
    isRunning: false,
    fps: 0,
    deltaTime: 0,
  });

  useEffect(() => {
    if (!engine) return;

    const interval = setInterval(() => {
      setState(engine.getState());
    }, updateInterval);

    return (): void => clearInterval(interval);
  }, [engine, updateInterval]);

  if (!engine) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#0f0',
        padding: '10px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 1000,
        minWidth: '200px',
      }}
    >
      <div style={{ marginBottom: '8px', borderBottom: '1px solid #0f0', paddingBottom: '4px' }}>
        <strong>🎮 Engine Debug</strong>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>
          Status:{' '}
          <span style={{ color: state.isRunning ? '#0f0' : '#f00' }}>
            {state.isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div>
          FPS: <span style={{ color: getFPSColor(state.fps) }}>{Math.round(state.fps)}</span>
        </div>
        <div>Delta: {state.deltaTime.toFixed(2)}ms</div>
        <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>
          <div>Babylon.js v7.0.0</div>
          <div>Edge Craft v0.1.0</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Get color based on FPS value
 */
function getFPSColor(fps: number): string {
  if (fps >= 55) return '#0f0'; // Green
  if (fps >= 30) return '#ff0'; // Yellow
  return '#f00'; // Red
}
