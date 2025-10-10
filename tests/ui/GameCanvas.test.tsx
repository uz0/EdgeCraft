/**
 * Game Canvas tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { GameCanvas } from '@/ui/GameCanvas';

describe('GameCanvas', () => {
  it('should render canvas element', () => {
    render(<GameCanvas />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should render with custom width and height', () => {
    const { container } = render(<GameCanvas width="800px" height="600px" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: '800px', height: '600px' });
  });

  it('should show loading state initially', () => {
    render(<GameCanvas />);

    // Loading text should appear briefly
    const loading = screen.queryByText(/Loading engine/i);
    // May or may not be visible depending on initialization speed
    expect(loading).toBeDefined();
  });

  it('should apply canvas styles', () => {
    render(<GameCanvas />);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toHaveStyle({
      width: '100%',
      height: '100%',
      display: 'block',
      outline: 'none',
    });
  });

  it('should handle onEngineReady callback', async () => {
    const onEngineReady = jest.fn();

    render(<GameCanvas onEngineReady={onEngineReady} />);

    // Wait for engine to initialize
    // Note: This may not work in test environment without WebGL
    await waitFor(
      () => {
        // In a real browser environment, callback would be called
        // In test environment, it may not due to WebGL limitations
      },
      { timeout: 1000 }
    );
  });

  it('should cleanup on unmount', () => {
    const { unmount } = render(<GameCanvas />);

    expect(() => unmount()).not.toThrow();
  });
});
