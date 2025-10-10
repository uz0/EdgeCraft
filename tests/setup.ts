import '@testing-library/jest-dom';

// Mock browser APIs
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock WebGL context for Babylon.js
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: document.createElement('canvas'),
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
    };
  }
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock window globals for Edge Craft
if (typeof window !== 'undefined') {
  window.__EDGE_CRAFT_VERSION__ = '0.1.0';
  window.__EDGE_CRAFT_DEBUG__ = true;
}

// Mock console extensions
interface ConsoleExtensions {
  engine: jest.Mock;
  gameplay: jest.Mock;
}

(console as Console & ConsoleExtensions).engine = jest.fn();
(console as Console & ConsoleExtensions).gameplay = jest.fn();

// Suppress console errors in tests
const originalError = console.error;
beforeAll((): void => {
  console.error = (...args: unknown[]): void => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
