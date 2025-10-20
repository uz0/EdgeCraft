import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MapGallery } from './MapGallery';
import type { MapMetadata } from '../pages/IndexPage';

describe('MapGallery', () => {
  const mockMaps: MapMetadata[] = [
    {
      id: 'map1',
      name: 'Test Map 1.w3x',
      format: 'w3x',
      sizeBytes: 10 * 1024 * 1024,
      file: new File([], 'Test Map 1.w3x'),
      players: 1,
      author: 'Author',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
    },
    {
      id: 'map2',
      name: 'Small Map.w3x',
      format: 'w3x',
      sizeBytes: 1 * 1024 * 1024,
      file: new File([], 'Small Map.w3x'),
      players: 1,
      author: 'Author',
    },
    {
      id: 'map3',
      name: 'Large Map.w3m',
      format: 'w3m',
      sizeBytes: 100 * 1024 * 1024,
      file: new File([], 'Large Map.w3m'),
      players: 1,
      author: 'Author',
    },
    {
      id: 'map4',
      name: 'StarCraft Map.SC2Map',
      format: 'sc2map',
      sizeBytes: 5 * 1024 * 1024,
      file: new File([], 'StarCraft Map.SC2Map'),
      players: 1,
      author: 'Author',
    },
  ];

  const mockOnMapSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all map cards', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      expect(screen.getByText('Test Map 1.w3x')).toBeInTheDocument();
      expect(screen.getByText('Small Map.w3x')).toBeInTheDocument();
      expect(screen.getByText('Large Map.w3m')).toBeInTheDocument();
      expect(screen.getByText('StarCraft Map.SC2Map')).toBeInTheDocument();
    });

    it('should display author names', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const authors = screen.getAllByText('Author');
      expect(authors).toHaveLength(4);
    });

    it('should display player counts', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const playerCounts = screen.getAllByText('1');
      expect(playerCounts.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Map Selection', () => {
    it('should call onMapSelect with map name when card is clicked', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const firstCard = screen.getByLabelText('Open map: Test Map 1.w3x');
      fireEvent.click(firstCard);

      expect(mockOnMapSelect).toHaveBeenCalledTimes(1);
      expect(mockOnMapSelect).toHaveBeenCalledWith('Test Map 1.w3x');
    });

    it('should call onMapSelect with correct map name for different cards', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const secondCard = screen.getByLabelText('Open map: Small Map.w3x');
      fireEvent.click(secondCard);

      expect(mockOnMapSelect).toHaveBeenCalledWith('Small Map.w3x');
    });
  });

  describe('Empty State', () => {
    it('should render nothing when maps array is empty', () => {
      const { container } = render(<MapGallery maps={[]} onMapSelect={mockOnMapSelect} />);

      const grid = container.querySelector('.map-gallery-grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.children.length).toBe(0);
    });
  });

  describe('Thumbnail Display', () => {
    it('should render thumbnail image when thumbnailUrl is provided', () => {
      render(<MapGallery maps={mockMaps} onMapSelect={mockOnMapSelect} />);

      const backgroundDiv = document.querySelector(
        '[style*="https://example.com/thumb1.jpg"]'
      );
      expect(backgroundDiv).toBeInTheDocument();
    });

    it('should render without thumbnail when thumbnailUrl is not provided', () => {
      render(<MapGallery maps={mockMaps.slice(1, 2)} onMapSelect={mockOnMapSelect} />);

      expect(screen.getByText('Small Map.w3x')).toBeInTheDocument();
    });
  });
});
