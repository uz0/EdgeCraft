/**
 * Unit tests for funnyLoadingMessages
 */

import {
  FUNNY_LOADING_MESSAGES,
  getRandomLoadingMessage,
  LoadingMessageGenerator,
} from './funnyLoadingMessages';

describe('funnyLoadingMessages', () => {
  describe('FUNNY_LOADING_MESSAGES', () => {
    it('should have at least 20 messages', () => {
      expect(FUNNY_LOADING_MESSAGES.length).toBeGreaterThanOrEqual(20);
    });

    it('should have non-empty messages', () => {
      FUNNY_LOADING_MESSAGES.forEach((message) => {
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should have messages that are non-empty strings', () => {
      FUNNY_LOADING_MESSAGES.forEach((message) => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicate messages', () => {
      const uniqueMessages = new Set(FUNNY_LOADING_MESSAGES);
      expect(uniqueMessages.size).toBe(FUNNY_LOADING_MESSAGES.length);
    });
  });

  describe('getRandomLoadingMessage', () => {
    it('should return a message from the list', () => {
      const message = getRandomLoadingMessage();
      expect(FUNNY_LOADING_MESSAGES).toContain(message);
    });

    it('should return a non-empty string', () => {
      const message = getRandomLoadingMessage();
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return different messages on multiple calls (probabilistic)', () => {
      const messages = new Set<string>();
      for (let i = 0; i < 10; i++) {
        messages.add(getRandomLoadingMessage());
      }
      expect(messages.size).toBeGreaterThan(1);
    });

    it('should handle edge case when message is undefined', () => {
      const message = getRandomLoadingMessage();
      expect(message).toBeDefined();
      expect(message).not.toBe(null);
    });
  });

  describe('LoadingMessageGenerator', () => {
    let generator: LoadingMessageGenerator;

    beforeEach(() => {
      generator = new LoadingMessageGenerator();
    });

    describe('getNext', () => {
      it('should return a message from the list', () => {
        const message = generator.getNext();
        expect(FUNNY_LOADING_MESSAGES).toContain(message);
      });

      it('should not repeat messages until all have been shown', () => {
        const messages = new Set<string>();
        const messageCount = FUNNY_LOADING_MESSAGES.length;

        for (let i = 0; i < messageCount; i++) {
          const message = generator.getNext();
          expect(messages.has(message)).toBe(false);
          messages.add(message);
        }

        expect(messages.size).toBe(messageCount);
      });

      it('should reset and repeat messages after all have been shown', () => {
        const messageCount = FUNNY_LOADING_MESSAGES.length;
        const firstCycle: string[] = [];
        const secondCycle: string[] = [];

        for (let i = 0; i < messageCount; i++) {
          firstCycle.push(generator.getNext());
        }

        for (let i = 0; i < messageCount; i++) {
          secondCycle.push(generator.getNext());
        }

        expect(firstCycle.length).toBe(messageCount);
        expect(secondCycle.length).toBe(messageCount);

        const firstSet = new Set(firstCycle);
        const secondSet = new Set(secondCycle);
        expect(firstSet.size).toBe(messageCount);
        expect(secondSet.size).toBe(messageCount);

        expect([...firstSet].sort()).toEqual([...secondSet].sort());
      });

      it('should return a non-empty string', () => {
        const message = generator.getNext();
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });

      it('should continue working after many calls', () => {
        const messageCount = FUNNY_LOADING_MESSAGES.length;
        for (let i = 0; i < messageCount * 3; i++) {
          const message = generator.getNext();
          expect(FUNNY_LOADING_MESSAGES).toContain(message);
        }
      });
    });

    describe('reset', () => {
      it('should allow the same messages to be returned again', () => {
        const message1 = generator.getNext();
        generator.reset();

        const messagesAfterReset = new Set<string>();
        const messageCount = FUNNY_LOADING_MESSAGES.length;

        for (let i = 0; i < messageCount; i++) {
          messagesAfterReset.add(generator.getNext());
        }

        expect(messagesAfterReset).toContain(message1);
        expect(messagesAfterReset.size).toBe(messageCount);
      });

      it('should not repeat messages after reset until exhausted', () => {
        generator.getNext();
        generator.getNext();
        generator.reset();

        const messages = new Set<string>();
        const messageCount = FUNNY_LOADING_MESSAGES.length;

        for (let i = 0; i < messageCount; i++) {
          const message = generator.getNext();
          expect(messages.has(message)).toBe(false);
          messages.add(message);
        }
      });

      it('should work correctly when called multiple times', () => {
        generator.reset();
        generator.reset();
        generator.reset();

        const message = generator.getNext();
        expect(FUNNY_LOADING_MESSAGES).toContain(message);
      });
    });

    describe('internal state management', () => {
      it('should track used messages correctly', () => {
        const messageCount = FUNNY_LOADING_MESSAGES.length;
        const firstHalf = Math.floor(messageCount / 2);

        for (let i = 0; i < firstHalf; i++) {
          generator.getNext();
        }

        const remainingMessages = new Set<string>();
        for (let i = firstHalf; i < messageCount; i++) {
          remainingMessages.add(generator.getNext());
        }

        expect(remainingMessages.size).toBe(messageCount - firstHalf);
      });

      it('should handle being called exactly once per message', () => {
        const messageCount = FUNNY_LOADING_MESSAGES.length;
        const allMessages = new Set<string>();

        for (let i = 0; i < messageCount; i++) {
          allMessages.add(generator.getNext());
        }

        expect(allMessages.size).toBe(messageCount);
      });
    });
  });

  describe('message quality', () => {
    it('should have humorous/creative messages', () => {
      const creativeWords = [
        'summoning',
        'ancient',
        'wizards',
        'magic',
        'arcane',
        'ritual',
        'gods',
        'oracle',
        'spirits',
        'negotiating',
        'bribing',
        'convincing',
        'asking nicely',
        'reticulating',
        'splines',
      ];

      const hasCreativeContent = FUNNY_LOADING_MESSAGES.some((message) =>
        creativeWords.some((word) => message.toLowerCase().includes(word.toLowerCase()))
      );

      expect(hasCreativeContent).toBe(true);
    });

    it('should reference technical concepts', () => {
      const technicalTerms = ['MPQ', 'ZLIB', 'LZMA', 'TGA', 'compression', 'decompression'];

      const hasTechnicalContent = FUNNY_LOADING_MESSAGES.some((message) =>
        technicalTerms.some((term) => message.includes(term))
      );

      expect(hasTechnicalContent).toBe(true);
    });
  });
});
