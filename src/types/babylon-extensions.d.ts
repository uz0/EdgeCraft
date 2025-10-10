import '@babylonjs/core';

declare module '@babylonjs/core' {
  interface Scene {
    metadata?: {
      edgeCraftVersion?: string;
      mapName?: string;
      playerCount?: number;
    };
  }

  interface Mesh {
    metadata?: {
      unitId?: string;
      team?: number;
      selectable?: boolean;
    };
  }
}
