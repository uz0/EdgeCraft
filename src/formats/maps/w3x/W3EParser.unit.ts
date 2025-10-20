/**
 * Unit tests for W3EParser - Warcraft 3 Environment/Terrain Parser
 */

import { W3EParser } from './W3EParser';

describe('W3EParser', () => {
  describe('constructor', () => {
    it('should create parser with valid buffer', () => {
      const buffer = new ArrayBuffer(100);
      const parser = new W3EParser(buffer);
      expect(parser).toBeDefined();
    });
  });
});
