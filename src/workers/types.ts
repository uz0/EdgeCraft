/**
 * Worker Message Protocol
 *
 * Defines TypeScript interfaces for communication between:
 * - Main thread (React UI) ↔ Worker threads (Preview generation)
 */

/**
 * Message types for worker communication
 */
export enum WorkerMessageType {
  GENERATE_PREVIEW = 'GENERATE_PREVIEW',
  PREVIEW_PROGRESS = 'PREVIEW_PROGRESS',
  PREVIEW_COMPLETE = 'PREVIEW_COMPLETE',
  PREVIEW_ERROR = 'PREVIEW_ERROR',
  WORKER_READY = 'WORKER_READY',
}

/**
 * Preview generation options
 */
export interface PreviewOptions {
  width?: number;
  height?: number;
  extractOnly?: boolean;
  format?: 'png' | 'jpeg';
  quality?: number;
}

/**
 * Request to generate a preview
 * Sent from: Main thread (WorkerPoolManager)
 * Received by: Worker thread (PreviewWorker)
 */
export interface GeneratePreviewRequest {
  type: WorkerMessageType.GENERATE_PREVIEW;
  payload: {
    mapId: string;
    mapName: string;
    mapFile: ArrayBuffer; // Transferable
    format: 'w3x' | 'w3n' | 'sc2map';
    options?: PreviewOptions;
  };
}

/**
 * Progress update during preview generation
 * Sent from: Worker thread (PreviewWorker)
 * Received by: Main thread (useMapPreviews)
 */
export interface PreviewProgressUpdate {
  type: WorkerMessageType.PREVIEW_PROGRESS;
  payload: {
    mapId: string;
    progress: number; // 0-100
    stage: 'parsing' | 'extracting' | 'generating' | 'encoding';
    message: string;
  };
}

/**
 * Preview generation complete
 * Sent from: Worker thread (PreviewWorker)
 * Received by: Main thread (useMapPreviews)
 */
export interface PreviewCompleteMessage {
  type: WorkerMessageType.PREVIEW_COMPLETE;
  payload: {
    mapId: string;
    dataUrl: string; // PNG/JPEG data URL
    source: 'embedded' | 'generated';
    extractTimeMs: number;
  };
}

/**
 * Preview generation error
 * Sent from: Worker thread (PreviewWorker)
 * Received by: Main thread (useMapPreviews)
 */
export interface PreviewErrorMessage {
  type: WorkerMessageType.PREVIEW_ERROR;
  payload: {
    mapId: string;
    error: string;
    stack?: string;
  };
}

/**
 * Worker ready to accept tasks
 * Sent from: Worker thread (PreviewWorker)
 * Received by: Main thread (WorkerPoolManager)
 */
export interface WorkerReadyMessage {
  type: WorkerMessageType.WORKER_READY;
  payload: {
    workerId: number;
  };
}

/**
 * Union type for all worker messages
 */
export type WorkerMessage =
  | GeneratePreviewRequest
  | PreviewProgressUpdate
  | PreviewCompleteMessage
  | PreviewErrorMessage
  | WorkerReadyMessage;

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  poolSize?: number; // Default: 3
  maxQueueSize?: number; // Default: 100
  workerTimeout?: number; // Default: 60000ms (60 seconds)
}

/**
 * Worker pool statistics
 */
export interface WorkerPoolStats {
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTimeMs: number;
}
