declare global {
  interface Window {
    __EDGE_CRAFT_VERSION__: string;
    __EDGE_CRAFT_DEBUG__: boolean;
  }

  // Extend console for custom logging
  interface Console {
    engine: (...args: unknown[]) => void;
    gameplay: (...args: unknown[]) => void;
  }
}

export {};
