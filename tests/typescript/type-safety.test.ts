import { PlayerId, UnitId, assertNever, Result } from '@/utils/types';

describe('Type Safety', () => {
  describe('Branded Types', () => {
    it('should create PlayerId with type branding', () => {
      const playerId: PlayerId = 'player1' as PlayerId;
      expect(playerId).toBe('player1');
    });

    it('should create UnitId with type branding', () => {
      const unitId: UnitId = 'unit1' as UnitId;
      expect(unitId).toBe('unit1');
    });

    // TypeScript compiler tests (these should cause compile-time errors)
    // Uncomment to verify type safety at compile time
    // it('should prevent PlayerId assignment to UnitId', () => {
    //   const playerId: PlayerId = 'player1' as PlayerId;
    //   // @ts-expect-error - Cannot assign PlayerId to UnitId
    //   const unitId: UnitId = playerId;
    // });

    // it('should prevent string assignment to branded types', () => {
    //   // @ts-expect-error - Cannot use string directly
    //   const invalidId: PlayerId = 'player2';
    // });
  });

  describe('Result Type', () => {
    it('should handle success result', () => {
      const success: Result<number> = { ok: true, value: 42 };

      if (success.ok) {
        expect(success.value).toBe(42);
      }
    });

    it('should handle error result', () => {
      const failure: Result<number> = { ok: false, error: new Error('Failed') };

      if (!failure.ok) {
        expect(failure.error.message).toBe('Failed');
      }
    });
  });

  describe('assertNever', () => {
    it('should throw error for unhandled values', () => {
      expect(() => {
        assertNever('unexpected' as never);
      }).toThrow('Unhandled value: unexpected');
    });

    it('should be useful in exhaustive type checking', () => {
      type Status = 'pending' | 'success' | 'error';

      const handleStatus = (status: Status): string => {
        switch (status) {
          case 'pending':
            return 'Pending';
          case 'success':
            return 'Success';
          case 'error':
            return 'Error';
          default:
            return assertNever(status);
        }
      };

      expect(handleStatus('pending')).toBe('Pending');
      expect(handleStatus('success')).toBe('Success');
      expect(handleStatus('error')).toBe('Error');
    });
  });

  describe('Strict Null Checks', () => {
    it('should enforce null checking', () => {
      const value: string | null = 'test';

      // This would cause TypeScript error without null check:
      // console.log(value.length);

      if (value !== null) {
        expect(value.length).toBeGreaterThanOrEqual(0);
      } else {
        expect(value).toBeNull();
      }
    });

    it('should handle undefined checking', () => {
      const value: string | undefined = 'test';

      if (value !== undefined) {
        expect(value.length).toBeGreaterThanOrEqual(0);
      } else {
        expect(value).toBeUndefined();
      }
    });
  });
});
