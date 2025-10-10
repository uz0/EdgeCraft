import React, { useEffect, useState } from 'react';
import {
  logExternalStatus,
  getLauncherPath,
  getMultiplayerEndpoint,
  LAUNCHER_CONFIG,
} from './config/external';
import './App.css';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [launcherStatus, setLauncherStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [externalDeps, setExternalDeps] = useState({
    launcher: '',
    multiplayer: '',
  });

  useEffect(() => {
    // Initialize app
    console.log('Edge Craft initializing...');

    // Log external dependencies status
    logExternalStatus();

    // Load launcher (REQUIREMENT: Always loads /maps/index.edgecraft)
    const initializeLauncher = async (): Promise<void> => {
      try {
        console.log(`🚀 Loading default launcher: ${LAUNCHER_CONFIG.DEFAULT_MAP}`);

        const launcherPath = getLauncherPath();
        const multiplayerEndpoint = getMultiplayerEndpoint();

        setExternalDeps({
          launcher: launcherPath,
          multiplayer: multiplayerEndpoint,
        });

        // Simulate launcher loading
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));

        console.log(`✅ Launcher loaded from: ${launcherPath}`);
        setLauncherStatus('loaded');
        setIsReady(true);
      } catch (error) {
        console.error('❌ Failed to load launcher:', error);
        setLauncherStatus('error');
        setIsReady(true); // Still show UI even if launcher fails
      }
    };

    void initializeLauncher();

    return () => {
      console.log('Edge Craft cleanup');
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏗️ Edge Craft</h1>
        <p>WebGL-Based RTS Game Engine</p>
      </header>

      <main className="app-main">
        {!isReady ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading {LAUNCHER_CONFIG.DEFAULT_MAP}...</p>
          </div>
        ) : (
          <div className="content">
            <section className="external-deps">
              <h2>🔗 External Dependencies</h2>
              <div className="deps-grid">
                <div className="dep-item">
                  <h3>Launcher Map</h3>
                  <p className={launcherStatus === 'loaded' ? 'status-ok' : 'status-warn'}>
                    {launcherStatus === 'loaded' ? '✅ Loaded' : '⚠️ Mock'}
                  </p>
                  <code>{externalDeps.launcher || 'Loading...'}</code>
                  <a
                    href="https://github.com/uz0/index.edgecraft"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    → Full Launcher Repo
                  </a>
                </div>
                <div className="dep-item">
                  <h3>Multiplayer Server</h3>
                  <p
                    className={
                      externalDeps.multiplayer.includes('localhost') ? 'status-warn' : 'status-ok'
                    }
                  >
                    {externalDeps.multiplayer.includes('localhost') ? '⚠️ Mock' : '✅ Production'}
                  </p>
                  <code>{externalDeps.multiplayer || 'Loading...'}</code>
                  <a
                    href="https://github.com/uz0/core-edge"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    → Core-Edge Server
                  </a>
                </div>
              </div>
            </section>

            <section className="status">
              <h2>Development Environment</h2>
              <ul>
                <li>✅ React {React.version}</li>
                <li>✅ TypeScript Strict Mode</li>
                <li>✅ Vite Build System</li>
                <li>✅ Hot Module Replacement</li>
                <li>✅ Launcher Auto-Load: {LAUNCHER_CONFIG.DEFAULT_MAP}</li>
              </ul>
            </section>

            <section className="phase-info">
              <h2>Current Phase</h2>
              <p>
                <strong>Phase 0:</strong> Project Bootstrap
              </p>
              <p>Setting up development environment and tooling</p>
            </section>

            <section className="next-steps">
              <h2>Next Steps</h2>
              <ol>
                <li>Complete Phase 0 PRPs</li>
                <li>Initialize Babylon.js engine</li>
                <li>Set up testing framework</li>
                <li>Configure CI/CD pipeline</li>
              </ol>
            </section>
          </div>
        )}
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
