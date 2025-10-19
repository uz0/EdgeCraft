/**
 * Preview Worker
 *
 * Web Worker that runs in a separate thread to generate map previews
 * without blocking the main UI thread.
 *
 * This worker:
 * - Receives GENERATE_PREVIEW messages from WorkerPoolManager
 * - Uses pure JavaScript MPQParser for fast, freeze-free MPQ extraction
 * - Parses map files using format-specific parsers
 * - Generates terrain previews when embedded previews don't exist
 * - Sends progress updates to main thread
 * - Returns completed preview as data URL
 */

import type {
  WorkerMessage,
  WorkerMessageType,
  GeneratePreviewRequest,
  PreviewProgressUpdate,
  PreviewCompleteMessage,
  PreviewErrorMessage,
  WorkerReadyMessage,
} from './types';

// Worker context (no DOM access!)
declare const self: DedicatedWorkerGlobalScope;

/**
 * Send progress update to main thread
 */
function sendProgress(
  mapId: string,
  progress: number,
  stage: 'parsing' | 'extracting' | 'generating' | 'encoding',
  message: string
): void {
  const progressMessage: PreviewProgressUpdate = {
    type: 'PREVIEW_PROGRESS' as WorkerMessageType.PREVIEW_PROGRESS,
    payload: {
      mapId,
      progress,
      stage,
      message,
    },
  };
  self.postMessage(progressMessage);
}

/**
 * Send completion message to main thread
 */
function sendComplete(
  mapId: string,
  dataUrl: string,
  source: 'embedded' | 'generated',
  extractTimeMs: number
): void {
  const completeMessage: PreviewCompleteMessage = {
    type: 'PREVIEW_COMPLETE' as WorkerMessageType.PREVIEW_COMPLETE,
    payload: {
      mapId,
      dataUrl,
      source,
      extractTimeMs,
    },
  };
  self.postMessage(completeMessage);
}

/**
 * Send error message to main thread
 */
function sendError(mapId: string, error: Error): void {
  console.error(`[PreviewWorker] ❌ ERROR: ${mapId}`, error.message, error.stack);
  const errorMessage: PreviewErrorMessage = {
    type: 'PREVIEW_ERROR' as WorkerMessageType.PREVIEW_ERROR,
    payload: {
      mapId,
      error: error.message,
      stack: error.stack,
    },
  };
  self.postMessage(errorMessage);
}

/**
 * Generate preview for a map file
 *
 * This is the main entry point for preview generation in the worker.
 */
async function generatePreview(request: GeneratePreviewRequest): Promise<void> {
  const { mapId, mapName, mapFile, format } = request.payload;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { options } = request.payload; // Reserved for future preview customization options
  const startTime = performance.now();
  try {
    // Stage 1: Parsing (0-25%)
    sendProgress(mapId, 0, 'parsing', `Parsing ${mapName}...`);

    // Import format-specific parser
    let dataUrl: string;
    let source: 'embedded' | 'generated';

    switch (format) {
      case 'w3x':
        {
          // W3X Classic parser
          const { W3XClassicParser } = await import('./parsers/W3XClassicParser');
          const parser = new W3XClassicParser();
          const result = await parser.parse(mapFile, (progress, stage, msg) => {
            sendProgress(mapId, progress, stage, msg);
          });
          dataUrl = result.dataUrl;
          source = result.source;
        }
        break;

      case 'w3n':
        {
          // W3N Campaign parser
          const { W3NCampaignParser } = await import('./parsers/W3NCampaignParser');
          const parser = new W3NCampaignParser();
          const result = await parser.parse(mapFile, (progress, stage, msg) => {
            sendProgress(mapId, progress, stage, msg);
          });
          dataUrl = result.dataUrl;
          source = result.source;
        }
        break;

      case 'sc2map':
        {
          // SC2 Map parser
          const { SC2MapParser } = await import('./parsers/SC2MapParser');
          const parser = new SC2MapParser();
          const result = await parser.parse(mapFile, (progress, stage, msg) => {
            sendProgress(mapId, progress, stage, msg);
          });
          dataUrl = result.dataUrl;
          source = result.source;
        }
        break;

      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unsupported format: ${format}`);
    }

    // Stage 4: Complete (100%)
    const extractTimeMs = performance.now() - startTime;
    sendComplete(mapId, dataUrl, source, extractTimeMs);
  } catch (error) {
    sendError(mapId, error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Worker message handler
 */
self.onmessage = async (e: MessageEvent<WorkerMessage>): Promise<void> => {
  try {
    const message = e.data;
    switch (message.type) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      case 'GENERATE_PREVIEW':
        await generatePreview(message);
        break;

      default:
        console.error('[PreviewWorker] ❌ Unknown message type:', message);
    }
  } catch (error) {
    console.error('[PreviewWorker] 🔥 FATAL ERROR in message handler:', error);
    // Send error to main thread if possible (only for GENERATE_PREVIEW messages)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (e.data?.type === 'GENERATE_PREVIEW' && 'payload' in e.data && 'mapId' in e.data.payload) {
      sendError(e.data.payload.mapId, error instanceof Error ? error : new Error(String(error)));
    }
  }
};

/**
 * Global error handlers to catch uncaught errors
 */
self.onerror = (event: ErrorEvent): boolean => {
  console.error('[PreviewWorker] 🔥 UNCAUGHT ERROR:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error instanceof Error ? event.error.message : String(event.error),
  });
  return false; // Let the error propagate
};

self.onunhandledrejection = (event: PromiseRejectionEvent): void => {
  console.error('[PreviewWorker] 🔥 UNHANDLED PROMISE REJECTION:', {
    reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
    promise: event.promise,
  });
};
const readyMessage: WorkerReadyMessage = {
  type: 'WORKER_READY' as WorkerMessageType.WORKER_READY,
  payload: {
    workerId: 0, // Will be set by WorkerPoolManager
  },
};
self.postMessage(readyMessage);
