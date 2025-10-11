import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MapGallery, type MapMetadata } from '../MapGallery';

describe('MapGallery', () => {
  const mockMaps: MapMetadata[] = [
    {
      id: 'map1',
      name: 'Test Map 1.w3x',
      format: 'w3x',
      sizeBytes: 10 * 1024 * 1024, // 10 MB
      file: new File([], 'Test Map 1.w3x'),
    },
    {
      id: 'map2',
      name: 'Small Map.w3x',
      format: 'w3x',
      sizeBytes: 1 * 1024 * 1024, // 1 MB
      file: new File([], 'Small Map.w3x'),
    },
    {
      id: 'map3',
      name: 'Large Campaign.w3n',
      format: 'w3n',
      sizeBytes: 100 * 1024 * 1024, // 100 MB
      file: new File([], 'Large Campaign.w3n'),
    },
    {
      id: 'map4',
      name: 'StarCraft Map.SC2Map',
      format: 'sc2map',
      sizeBytes: 5 * 1024 * 1024, // 5 MB
      file: new File([], 'StarCraft Map.SC2Map'),
    },
  ];

  const mockOnMapSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render map gallery with correct title', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      expect(screen.getByText('Map Gallery')).toBeInTheDocument();
    });

    it('should display correct map count', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      expect(screen.getByText('4 maps')).toBeInTheDocument();
    });

    it('should display singular "map" for one map', () => {
      render(<MapGallery maps={[mockMaps[0]]} onMapSelect={mockOnMapSelect} />);

      expect(screen.getByText('1 map')).toBeInTheDocument();
    });

    it('should render all map cards', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      expect(screen.getByText('Test Map 1.w3x')).toBeInTheDocument();
      expect(screen.getByText('Small Map.w3x')).toBeInTheDocument();
      expect(screen.getByText('Large Campaign.w3n')).toBeInTheDocument();
      expect(screen.getByText('StarCraft Map.SC2Map')).toBeInTheDocument();
    });

    it('should display format badges correctly', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const w3xBadges = screen.getAllByText('W3X');
      expect(w3xBadges.length).toBe(2);

      expect(screen.getByText('W3N')).toBeInTheDocument();
      expect(screen.getByText('SC2')).toBeInTheDocument();
    });

    it('should display file sizes correctly', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      expect(screen.getByText('10.0 MB')).toBeInTheDocument();
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
      expect(screen.getByText('100.0 MB')).toBeInTheDocument();
      expect(screen.getByText('5.0 MB')).toBeInTheDocument();
    });

    it('should render empty state when no maps match filters', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      // Search for non-existent map
      const searchInput = screen.getByPlaceholderText('Search maps...');
      fireEvent.change(searchInput, { target: { value: 'NonExistentMap' } });

      expect(screen.getByText('No maps found matching your filters.')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter maps by search query', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const searchInput = screen.getByPlaceholderText('Search maps...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      expect(screen.getByText('Test Map 1.w3x')).toBeInTheDocument();
      expect(screen.queryByText('Small Map.w3x')).not.toBeInTheDocument();
    });

    it('should be case-insensitive', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const searchInput = screen.getByPlaceholderText('Search maps...');
      fireEvent.change(searchInput, { target: { value: 'SMALL' } });

      expect(screen.getByText('Small Map.w3x')).toBeInTheDocument();
      expect(screen.getByText('1 map')).toBeInTheDocument();
    });

    it('should update map count after search', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const searchInput = screen.getByPlaceholderText('Search maps...');
      fireEvent.change(searchInput, { target: { value: 'w3x' } });

      expect(screen.getByText('2 maps')).toBeInTheDocument();
    });
  });

  describe('Format Filter', () => {
    it('should filter maps by format', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const formatFilter = screen.getByLabelText('Filter by format');
      fireEvent.change(formatFilter, { target: { value: 'w3n' } });

      expect(screen.getByText('Large Campaign.w3n')).toBeInTheDocument();
      expect(screen.queryByText('Test Map 1.w3x')).not.toBeInTheDocument();
      expect(screen.getByText('1 map')).toBeInTheDocument();
    });

    it('should show all maps when format is "all"', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const formatFilter = screen.getByLabelText('Filter by format');
      fireEvent.change(formatFilter, { target: { value: 'w3x' } });
      fireEvent.change(formatFilter, { target: { value: 'all' } });

      expect(screen.getByText('4 maps')).toBeInTheDocument();
    });
  });

  describe('Size Filter', () => {
    it('should filter maps by size (small)', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const sizeFilter = screen.getByLabelText('Filter by size');
      fireEvent.change(sizeFilter, { target: { value: 'small' } });

      expect(screen.getByText('Test Map 1.w3x')).toBeInTheDocument();
      expect(screen.getByText('Small Map.w3x')).toBeInTheDocument();
      expect(screen.getByText('StarCraft Map.SC2Map')).toBeInTheDocument();
      expect(screen.queryByText('Large Campaign.w3n')).not.toBeInTheDocument();
    });

    it('should filter maps by size (medium)', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const sizeFilter = screen.getByLabelText('Filter by size');
      fireEvent.change(sizeFilter, { target: { value: 'medium' } });

      expect(screen.getByText('Large Campaign.w3n')).toBeInTheDocument();
      expect(screen.getByText('1 map')).toBeInTheDocument();
    });

    it('should filter maps by size (large)', () => {
      const largeMaps = [
        ...mockMaps,
        {
          id: 'map5',
          name: 'Huge Map.w3n',
          format: 'w3n' as const,
          sizeBytes: 200 * 1024 * 1024, // 200 MB
          file: new File([], 'Huge Map.w3n'),
        },
      ];

      render(<MapGallery maps={largeMaps} onMapSelect={mockOnMapSelect} />);

      const sizeFilter = screen.getByLabelText('Filter by size');
      fireEvent.change(sizeFilter, { target: { value: 'large' } });

      expect(screen.getByText('Huge Map.w3n')).toBeInTheDocument();
      expect(screen.getByText('1 map')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort maps by name (default)', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const mapCards = screen.getAllByRole('button');
      expect(mapCards[0]).toHaveTextContent('Large Campaign.w3n');
      expect(mapCards[1]).toHaveTextContent('Small Map.w3x');
      expect(mapCards[2]).toHaveTextContent('StarCraft Map.SC2Map');
      expect(mapCards[3]).toHaveTextContent('Test Map 1.w3x');
    });

    it('should sort maps by size', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const sortSelect = screen.getByLabelText('Sort by');
      fireEvent.change(sortSelect, { target: { value: 'size' } });

      const mapCards = screen.getAllByRole('button');
      expect(mapCards[0]).toHaveTextContent('Small Map.w3x'); // 1 MB
      expect(mapCards[1]).toHaveTextContent('StarCraft Map.SC2Map'); // 5 MB
      expect(mapCards[2]).toHaveTextContent('Test Map 1.w3x'); // 10 MB
      expect(mapCards[3]).toHaveTextContent('Large Campaign.w3n'); // 100 MB
    });

    it('should sort maps by format', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const sortSelect = screen.getByLabelText('Sort by');
      fireEvent.change(sortSelect, { target: { value: 'format' } });

      const mapCards = screen.getAllByRole('button');
      // sc2map comes before w3n and w3x alphabetically
      expect(mapCards[0]).toHaveTextContent('SC2');
    });
  });

  describe('Map Selection', () => {
    it('should call onMapSelect when map card is clicked', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const firstMapCard = screen.getByText('Test Map 1.w3x').closest('div[role="button"]');
      fireEvent.click(firstMapCard!);

      expect(mockOnMapSelect).toHaveBeenCalledTimes(1);
      expect(mockOnMapSelect).toHaveBeenCalledWith(mockMaps[0]);
    });

    it('should support keyboard navigation (Enter)', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const firstMapCard = screen.getByText('Test Map 1.w3x').closest('div[role="button"]');
      fireEvent.keyDown(firstMapCard!, { key: 'Enter' });

      expect(mockOnMapSelect).toHaveBeenCalledTimes(1);
    });

    it('should support keyboard navigation (Space)', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const firstMapCard = screen.getByText('Test Map 1.w3x').closest('div[role="button"]');
      fireEvent.keyDown(firstMapCard!, { key: ' ' });

      expect(mockOnMapSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should display loading progress when isLoading is true', () => {
      const loadProgress = new Map([
        ['map1', { status: 'success' as const, mapId: 'map1', mapName: 'Test Map 1' }],
        ['map2', { status: 'loading' as const, mapId: 'map2', mapName: 'Small Map' }],
      ]);

      render(
        <MapGallery
          maps={mockMaps}
          onMapSelect={mockOnMapSelect}
          isLoading={true}
          loadProgress={loadProgress}
        />
      );

      expect(screen.getByText('Loading maps: 1 / 2')).toBeInTheDocument();
    });

    it('should calculate progress correctly', () => {
      const loadProgress = new Map([
        ['map1', { status: 'success' as const, mapId: 'map1', mapName: 'Test Map 1' }],
        ['map2', { status: 'success' as const, mapId: 'map2', mapName: 'Small Map' }],
        ['map3', { status: 'loading' as const, mapId: 'map3', mapName: 'Large Campaign' }],
        ['map4', { status: 'error' as const, mapId: 'map4', mapName: 'StarCraft Map' }],
      ]);

      render(
        <MapGallery
          maps={mockMaps}
          onMapSelect={mockOnMapSelect}
          isLoading={true}
          loadProgress={loadProgress}
        />
      );

      expect(screen.getByText('Loading maps: 2 / 4')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      expect(screen.getByLabelText('Search maps')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by format')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by size')).toBeInTheDocument();
    });

    it('should have proper button roles', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const mapCards = screen.getAllByRole('button');
      expect(mapCards.length).toBe(4);
    });

    it('should have descriptive aria-label for map cards', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      expect(screen.getByLabelText('Load map: Test Map 1.w3x')).toBeInTheDocument();
      expect(screen.getByLabelText('Load map: Small Map.w3x')).toBeInTheDocument();
    });

    it('should be keyboard navigable with tab index', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const firstMapCard = screen.getByText('Test Map 1.w3x').closest('div[role="button"]');
      expect(firstMapCard).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Combined Filters', () => {
    it('should apply search and format filter together', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const searchInput = screen.getByPlaceholderText('Search maps...');
      const formatFilter = screen.getByLabelText('Filter by format');

      fireEvent.change(searchInput, { target: { value: 'Map' } });
      fireEvent.change(formatFilter, { target: { value: 'w3x' } });

      expect(screen.getByText('Test Map 1.w3x')).toBeInTheDocument();
      expect(screen.getByText('Small Map.w3x')).toBeInTheDocument();
      expect(screen.queryByText('StarCraft Map.SC2Map')).not.toBeInTheDocument();
      expect(screen.getByText('2 maps')).toBeInTheDocument();
    });

    it('should apply all filters together', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const searchInput = screen.getByPlaceholderText('Search maps...');
      const formatFilter = screen.getByLabelText('Filter by format');
      const sizeFilter = screen.getByLabelText('Filter by size');

      fireEvent.change(searchInput, { target: { value: 'Map' } });
      fireEvent.change(formatFilter, { target: { value: 'w3x' } });
      fireEvent.change(sizeFilter, { target: { value: 'small' } });

      expect(screen.getByText('Test Map 1.w3x')).toBeInTheDocument();
      expect(screen.getByText('Small Map.w3x')).toBeInTheDocument();
      expect(screen.getByText('2 maps')).toBeInTheDocument();
    });
  });
});
