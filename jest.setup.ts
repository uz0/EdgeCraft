/**
 * Jest setup file for visual regression testing
 */
import { toMatchImageSnapshot } from 'jest-image-snapshot';

// Extend Jest matchers with image snapshot functionality
expect.extend({ toMatchImageSnapshot });

// Configure global image snapshot options
declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchImageSnapshot(options?: {
        failureThreshold?: number;
        failureThresholdType?: 'pixel' | 'percent';
        customDiffDir?: string;
        customSnapshotsDir?: string;
        customSnapshotIdentifier?: string;
      }): R;
    }
  }
}
