import '@testing-library/jest-dom';

// Mock window globals for Edge Craft
if (typeof window !== 'undefined') {
  window.__EDGE_CRAFT_VERSION__ = '0.1.0';
  window.__EDGE_CRAFT_DEBUG__ = true;
}

// Mock console extensions
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(console as any).engine = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(console as any).gameplay = jest.fn();
