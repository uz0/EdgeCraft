import React, { useState } from 'react';
import { GameCanvas } from './ui/GameCanvas';
import { DebugOverlay } from './ui/DebugOverlay';
import type { EdgeCraftEngine } from './engine/core/Engine';
import './App.css';

const App: React.FC = () => {
  const [engine, setEngine] = useState<EdgeCraftEngine | null>(null);
  const [showDebug, setShowDebug] = useState(true);

  const handleEngineReady = (engine: EdgeCraftEngine): void => {
    setEngine(engine);
    console.log('✅ Babylon.js engine initialized and ready');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏗️ Edge Craft</h1>
        <p>WebGL-Based RTS Game Engine - Phase 1: Babylon.js Integration</p>
      </header>

      <main className="app-main">
        <div className="game-container">
          <GameCanvas height="600px" debug={showDebug} onEngineReady={handleEngineReady} />
          {showDebug && <DebugOverlay engine={engine} />}
        </div>

        <section className="controls">
          <h2>🎮 Controls</h2>
          <div className="controls-grid">
            <div className="control-group">
              <h3>Camera Movement</h3>
              <ul>
                <li><strong>W/↑</strong> - Move forward</li>
                <li><strong>S/↓</strong> - Move backward</li>
                <li><strong>A/←</strong> - Move left</li>
                <li><strong>D/→</strong> - Move right</li>
                <li><strong>Q</strong> - Move up</li>
                <li><strong>E</strong> - Move down</li>
              </ul>
            </div>
            <div className="control-group">
              <h3>Camera Control</h3>
              <ul>
                <li><strong>Mouse Wheel</strong> - Zoom in/out</li>
                <li><strong>Edge Scroll</strong> - Move to screen edges</li>
              </ul>
            </div>
            <div className="control-group">
              <h3>Debug</h3>
              <ul>
                <li>
                  <button onClick={() => setShowDebug(!showDebug)}>
                    {showDebug ? 'Hide' : 'Show'} Debug Overlay
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="status">
          <h2>✨ Features Implemented</h2>
          <ul>
            <li>✅ Babylon.js 7.0 rendering engine</li>
            <li>✅ RTS-style camera with WASD + edge scrolling</li>
            <li>✅ Heightmap terrain rendering (flat terrain demo)</li>
            <li>✅ MPQ archive parser (basic implementation)</li>
            <li>✅ Asset management and caching</li>
            <li>✅ glTF model loader</li>
            <li>✅ Copyright validation system</li>
            <li>✅ Real-time FPS monitoring</li>
          </ul>
        </section>

        <section className="phase-info">
          <h2>Current Phase</h2>
          <p>
            <strong>Phase 1:</strong> Babylon.js Foundation
          </p>
          <p>Core rendering engine, terrain system, and RTS camera controls</p>
        </section>
      </main>

      <footer className="app-footer">
        <p>Edge Craft © 2024 - Clean-room implementation</p>
        <p>
          <a
            href="https://github.com/your-org/edge-craft"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          {' | '}
          <a href="/docs" target="_blank" rel="noopener noreferrer">
            Documentation
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
