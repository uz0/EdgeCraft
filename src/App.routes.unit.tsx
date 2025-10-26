/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

jest.mock('./pages/IndexPage', () => ({
  IndexPage: () => <div>Index Page</div>,
}));

jest.mock('./pages/ComparisonPage', () => ({
  ComparisonPage: () => <div>Comparison Page</div>,
}));

jest.mock('./pages/MapViewerPage', () => ({
  MapViewerPage: () => <div>Map Viewer Page</div>,
}));

describe('App routing', () => {
  it('renders comparison route', () => {
    render(
      <MemoryRouter initialEntries={['/comparison']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Comparison Page')).toBeInTheDocument();
  });

  it('renders map viewer route', () => {
    render(
      <MemoryRouter initialEntries={['/TestMap.w3x']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Map Viewer Page')).toBeInTheDocument();
  });
});
