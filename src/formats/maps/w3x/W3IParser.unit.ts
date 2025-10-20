/**
 * Unit tests for W3IParser - Warcraft 3 Map Info Parser
 */

import { W3IParser } from './W3IParser';

describe('W3IParser', () => {
  describe('constructor', () => {
    it('should create parser with valid buffer', () => {
      const buffer = new ArrayBuffer(100);
      const parser = new W3IParser(buffer);
      expect(parser).toBeDefined();
    });
  });
});
