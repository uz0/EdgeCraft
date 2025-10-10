/**
 * Debug Overlay tests
 */

import { render, screen } from '@testing-library/react';
import { DebugOverlay } from '@/ui/DebugOverlay';
import type { EdgeCraftEngine } from '@/engine/core/Engine';

// Mock engine
const mockEngine = {
  getState: jest.fn().mockReturnValue({
    isRunning: true,
    fps: 60,
    deltaTime: 16.67,
  }),
  engine: {},
  scene: {},
  canvas: document.createElement('canvas'),
  startRenderLoop: jest.fn(),
  stopRenderLoop: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
} as unknown as EdgeCraftEngine;

describe('DebugOverlay', () => {
  it('should not render when engine is null', () => {
    const { container } = render(<DebugOverlay engine={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render debug information when engine is provided', () => {
    render(<DebugOverlay engine={mockEngine} />);

    expect(screen.getByText(/Engine Debug/i)).toBeInTheDocument();
    expect(screen.getByText(/Status:/i)).toBeInTheDocument();
    expect(screen.getByText(/FPS:/i)).toBeInTheDocument();
    expect(screen.getByText(/Delta:/i)).toBeInTheDocument();
  });

  it('should display running status', async () => {
    render(<DebugOverlay engine={mockEngine} updateInterval={50} />);

    // Wait for the state to update
    await screen.findByText('Running');

    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('should display stopped status when not running', () => {
    const stoppedEngine = {
      ...mockEngine,
      getState: jest.fn().mockReturnValue({
        isRunning: false,
        fps: 0,
        deltaTime: 0,
      }),
    } as unknown as EdgeCraftEngine;

    render(<DebugOverlay engine={stoppedEngine} />);

    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('should display FPS value', async () => {
    render(<DebugOverlay engine={mockEngine} updateInterval={50} />);

    // Wait for the state to update and FPS should be rounded to 60
    await screen.findByText('60');

    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('should display delta time', async () => {
    render(<DebugOverlay engine={mockEngine} updateInterval={50} />);

    // Wait for the state to update and delta time should be formatted
    await screen.findByText(/16\.67ms/i);

    expect(screen.getByText(/16\.67ms/i)).toBeInTheDocument();
  });

  it('should display version information', () => {
    render(<DebugOverlay engine={mockEngine} />);

    expect(screen.getByText(/Babylon\.js v7\.0\.0/i)).toBeInTheDocument();
    expect(screen.getByText(/Edge Craft v0\.1\.0/i)).toBeInTheDocument();
  });

  it('should have correct styling', () => {
    const { container } = render(<DebugOverlay engine={mockEngine} />);

    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 1000,
    });
  });

  it('should update state periodically', () => {
    jest.useFakeTimers();

    const getStateMock = jest.fn().mockReturnValue({
      isRunning: true,
      fps: 60,
      deltaTime: 16.67,
    });

    const engine = {
      ...mockEngine,
      getState: getStateMock,
    } as unknown as EdgeCraftEngine;

    const { unmount } = render(<DebugOverlay engine={engine} updateInterval={100} />);

    // Fast-forward time
    jest.advanceTimersByTime(200);

    // getState should be called
    expect(getStateMock).toHaveBeenCalled();

    unmount();
    jest.useRealTimers();
  });
});
