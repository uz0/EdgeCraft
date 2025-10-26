/**
 * App - Main Application with React Router
 * Routes:
 * - / : Index page with map gallery
 * - /:mapName : Map viewer page
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { IndexPage } from './pages/IndexPage';
import { MapViewerPage } from './pages/MapViewerPage';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { ComparisonPage } from './pages/ComparisonPage';
import './App.css';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/benchmark" element={<BenchmarkPage />} />
      <Route path="/comparison" element={<ComparisonPage />} />
      <Route path="/:mapName(.+\\.(w3x|w3m|sc2map))" element={<MapViewerPage />} />
    </Routes>
  );
};

export default App;
