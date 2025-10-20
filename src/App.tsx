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
import './App.css';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/:mapName" element={<MapViewerPage />} />
    </Routes>
  );
};

export default App;
