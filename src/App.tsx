import './App.css';

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { IndexPage } from './pages/IndexPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { MapViewerPage } from './pages/MapViewerPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/:mapName" element={<MapViewerPage />} />
      <Route path="/comparison" element={<ComparisonPage />} />
    </Routes>
  );
};

export default App;
