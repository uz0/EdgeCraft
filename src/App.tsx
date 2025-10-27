import './App.css';

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { IndexPage } from './pages/IndexPage';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { MapViewerPage } from './pages/MapViewerPage';

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
