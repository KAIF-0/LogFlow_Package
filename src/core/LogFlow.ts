import { LogFlowConfig } from '../types/LogFlowConfig';
import { LogBuffer } from './LogBuffer';
import { LogSender } from './LogSender';
import { StartupValidator } from './StartupValidator';
import { RequestTracker } from './RequestTracker';
import { ResponseInterceptor } from './ResponseInterceptor';
import { ExpressMiddleware } from '../middleware/expressMiddleware';
import { LifecycleLog } from '../types/LifecycleLog';
import type { ErrorRequestHandler, RequestHandler } from 'express';

type NormalizedConfig = {
  apiKey: string;
  baseUrl: string;
  flushIntervalMs: number;
  batchSize: number;
  retries: number;
  timeoutMs: number;
  console: boolean;
};

export class LogFlow {
  private readonly config: NormalizedConfig;
  private readonly validator: StartupValidator;
  private readonly buffer: LogBuffer;
  private readonly sender: LogSender;
  private readonly requestTracker: RequestTracker;
  private readonly responseInterceptor: ResponseInterceptor;
  private readonly expressMiddleware: ExpressMiddleware;
  private initialized: boolean;
  private timer: NodeJS.Timeout | null;
  private flushing: boolean;

  public constructor(config: LogFlowConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey is required');
    }
    if (!config.baseUrl) {
      throw new Error('baseUrl is required');
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: this.normalizeBaseUrl(config.baseUrl),
      flushIntervalMs: this.clampNumber(config.flushIntervalMs ?? 10000, 5000, 60000),
      batchSize: this.clampNumber(config.batchSize ?? 50, 10, 100),
      retries: config.retries ?? 3,
      timeoutMs: 10000,
      console: config.console ?? true
    };

    this.validator = new StartupValidator(
      this.config.baseUrl,
      this.config.apiKey,
      this.config.timeoutMs,
      this.config.retries
    );
    this.buffer = new LogBuffer();
    this.sender = new LogSender(
      this.config.baseUrl,
      this.config.apiKey,
      this.config.timeoutMs,
      this.config.retries
    );
    this.requestTracker = new RequestTracker();
    this.responseInterceptor = new ResponseInterceptor();
    this.expressMiddleware = new ExpressMiddleware(
      this,
      this.requestTracker,
      this.responseInterceptor
    );
    this.initialized = false;
    this.timer = null;
    this.flushing = false;
  }

  public isConsoleEnabled(): boolean {
    return this.config.console;
  }

  private clampNumber(value: number, min: number, max: number): number {
    if (Number.isNaN(value) || value < min) return min;
    if (value > max) return max;
    return Math.floor(value);
  }

  public async initialize(): Promise<void> {
    await this.validator.validate();
    this.initialized = true;
    this.startScheduler();
  }

  public middleware(): Array<RequestHandler | ErrorRequestHandler> {
    if (!this.initialized) {
      throw new Error('LogFlow is not initialized');
    }
    return this.expressMiddleware.handlers();
  }

  public enqueue(log: LifecycleLog): void {
    this.buffer.add(log);
    if (this.buffer.size() >= this.config.batchSize) {
      void this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.flushing) {
      return;
    }
    this.flushing = true;

    try {
      while (this.buffer.size() > 0) {
        const batch = this.buffer.drainBatch(this.config.batchSize);
        try {
          await this.sender.sendBatch(batch);
        } catch (error) {
          this.buffer.prepend(batch);
          break;
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  private startScheduler(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);

    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }
}
