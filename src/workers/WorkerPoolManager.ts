/**
 * Worker Pool Manager
 *
 * Manages a pool of 2-3 Web Workers for parallel map preview generation.
 * Distributes tasks round-robin across workers to prevent main thread blocking.
 *
 * Uses pure JavaScript MPQParser (no WASM) for fast, freeze-free initialization.
 */

import type {
  WorkerMessage,
  WorkerMessageType,
  GeneratePreviewRequest,
  PreviewCompleteMessage,
  PreviewErrorMessage,
  PreviewProgressUpdate,
  WorkerPoolConfig,
  WorkerPoolStats,
  PreviewOptions,
} from './types';

interface WorkerTask {
  mapId: string;
  mapName: string;
  mapFile: ArrayBuffer;
  format: 'w3x' | 'w3n' | 'sc2map';
  options?: PreviewOptions;
  resolve: (result: PreviewCompleteMessage['payload']) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: PreviewProgressUpdate['payload']) => void;
}

interface WorkerState {
  worker: Worker;
  id: number;
  busy: boolean;
  currentTask: WorkerTask | null;
}

/**
 * Worker Pool Manager
 * Manages multiple workers for parallel preview generation
 */
export class WorkerPoolManager {
  private workers: WorkerState[] = [];
  private queue: WorkerTask[] = [];
  private config: Required<WorkerPoolConfig>;
  private stats: WorkerPoolStats = {
    activeWorkers: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageTimeMs: 0,
  };
  private taskTimes: number[] = [];

  constructor(config?: WorkerPoolConfig) {
    this.config = {
      poolSize: config?.poolSize ?? 3,
      maxQueueSize: config?.maxQueueSize ?? 100,
      workerTimeout: config?.workerTimeout ?? 30000,
    };

    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   * Using pure JavaScript MPQParser (no WASM), so workers can spawn immediately
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.config.poolSize; i++) {
      this.spawnWorker(i);
    }
  }

  /**
   * Spawn a single worker
   */
  private spawnWorker(id: number): void {
    try {
      const worker = new Worker(new URL('./PreviewWorker.ts', import.meta.url), { type: 'module' });

      const workerState: WorkerState = {
        worker,
        id,
        busy: false,
        currentTask: null,
      };

      worker.onmessage = (e: MessageEvent<WorkerMessage>): void => {
        this.handleWorkerMessage(workerState, e.data);
      };

      worker.onerror = (error: ErrorEvent): void => {
        this.handleWorkerError(workerState, error);
      };

      this.workers[id] = workerState;
      this.stats.activeWorkers++;
    } catch (error) {
      console.error(`[WorkerPoolManager] Failed to spawn worker ${id}:`, error);
    }
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(workerState: WorkerState, message: WorkerMessage): void {
    switch (message.type) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      case 'WORKER_READY':
        // Worker is ready - process any queued tasks
        this.processQueue();
        break;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      case 'PREVIEW_PROGRESS':
        // Forward progress update to task callback
        if (workerState.currentTask?.onProgress) {
          workerState.currentTask.onProgress(message.payload);
        }
        break;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      case 'PREVIEW_COMPLETE':
        // Task completed successfully
        this.handleTaskComplete(workerState, message);
        break;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      case 'PREVIEW_ERROR':
        // Task failed
        this.handleTaskError(workerState, message);
        break;
    }
  }

  /**
   * Handle task completion
   */
  private handleTaskComplete(workerState: WorkerState, message: PreviewCompleteMessage): void {
    if (workerState.currentTask) {
      workerState.currentTask.resolve(message.payload);
      this.stats.completedTasks++;
      this.taskTimes.push(message.payload.extractTimeMs);
      this.updateAverageTime();
    }

    // Free worker for next task
    workerState.busy = false;
    workerState.currentTask = null;
    this.processQueue();
  }

  /**
   * Handle task error
   */
  private handleTaskError(workerState: WorkerState, message: PreviewErrorMessage): void {
    if (workerState.currentTask) {
      workerState.currentTask.reject(new Error(message.payload.error));
      this.stats.failedTasks++;
    }

    // Free worker for next task
    workerState.busy = false;
    workerState.currentTask = null;
    this.processQueue();
  }

  /**
   * Handle worker error (crash)
   */
  private handleWorkerError(workerState: WorkerState, error: ErrorEvent): void {
    console.error(`[WorkerPoolManager] Worker ${workerState.id} crashed:`, error.message);

    // Reject current task if any
    if (workerState.currentTask) {
      workerState.currentTask.reject(new Error(`Worker crashed: ${error.message}`));
      this.stats.failedTasks++;
    }

    // Terminate crashed worker
    workerState.worker.terminate();
    this.stats.activeWorkers--;

    // Respawn worker
    this.spawnWorker(workerState.id);
  }

  /**
   * Generate preview for a map
   */
  public async generatePreview(
    mapId: string,
    mapName: string,
    mapFile: File,
    format: 'w3x' | 'w3n' | 'sc2map',
    options?: PreviewOptions,
    onProgress?: (progress: PreviewProgressUpdate['payload']) => void
  ): Promise<PreviewCompleteMessage['payload']> {
    return new Promise((resolve, reject) => {
      // Convert File to ArrayBuffer
      mapFile
        .arrayBuffer()
        .then((buffer) => {
          const task: WorkerTask = {
            mapId,
            mapName,
            mapFile: buffer,
            format,
            options,
            resolve,
            reject,
            onProgress,
          };

          // Check queue size limit
          if (this.queue.length >= this.config.maxQueueSize) {
            console.error('[WorkerPoolManager] ❌ Queue full!');
            reject(new Error('Worker queue full, max ' + this.config.maxQueueSize));
            return;
          }

          // Add task to queue
          this.queue.push(task);
          this.stats.queuedTasks = this.queue.length;
          // Try to process immediately
          this.processQueue();
        })
        .catch(reject);
    });
  }

  /**
   * Process queued tasks
   * Assigns tasks to available workers (round-robin)
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      return;
    }

    // Find available worker
    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) {
      return; // All workers busy
    }

    // Get next task from queue
    const task = this.queue.shift();
    if (!task) {
      return;
    }
    // Assign task to worker
    availableWorker.busy = true;
    availableWorker.currentTask = task;
    this.stats.queuedTasks = this.queue.length;

    // Send task to worker (copy ArrayBuffer to prevent corruption)
    // NOTE: Previously used Transferable objects ([task.mapFile]) but this caused
    // ArrayBuffer corruption where sector offset tables read garbage values.
    // Copying is slower but ensures data integrity.
    const message: GeneratePreviewRequest = {
      type: 'GENERATE_PREVIEW' as WorkerMessageType.GENERATE_PREVIEW,
      payload: {
        mapId: task.mapId,
        mapName: task.mapName,
        mapFile: task.mapFile,
        format: task.format,
        options: task.options,
      },
    };
    availableWorker.worker.postMessage(message);

    // Set timeout for task
    setTimeout(() => {
      if (availableWorker.currentTask === task) {
        console.error(`[WorkerPoolManager] ⏱️ Task timeout for ${task.mapName}`);
        this.handleWorkerError(
          availableWorker,
          new ErrorEvent('timeout', {
            message: `Task timeout after ${this.config.workerTimeout}ms`,
          })
        );
      }
    }, this.config.workerTimeout);

    // Process next task if more in queue
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Update average task time
   */
  private updateAverageTime(): void {
    if (this.taskTimes.length === 0) {
      this.stats.averageTimeMs = 0;
      return;
    }

    // Keep only last 100 times
    if (this.taskTimes.length > 100) {
      this.taskTimes = this.taskTimes.slice(-100);
    }

    const sum = this.taskTimes.reduce((a, b) => a + b, 0);
    this.stats.averageTimeMs = sum / this.taskTimes.length;
  }

  /**
   * Get worker pool statistics
   */
  public getStats(): WorkerPoolStats {
    return { ...this.stats };
  }

  /**
   * Get worker count
   */
  public getWorkerCount(): number {
    return this.workers.length;
  }

  /**
   * Dispose all workers
   */
  public dispose(): void {
    for (const workerState of this.workers) {
      workerState.worker.terminate();
    }
    this.workers = [];
    this.queue = [];
    this.stats.activeWorkers = 0;
    this.stats.queuedTasks = 0;
  }
}
