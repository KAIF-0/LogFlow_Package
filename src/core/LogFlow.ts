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
    const apiKey = this.requireString(config.apiKey, 'apiKey');
    const baseUrl = this.requireString(config.baseUrl, 'baseUrl');
    const consoleEnabled = this.requireBoolean(config.console ?? true, 'console');

    this.config = {
      apiKey,
      baseUrl: this.normalizeBaseUrl(baseUrl),
      flushIntervalMs: this.requireIntegerInRange(config.flushIntervalMs ?? 10000, 5000, 60000, 'flushIntervalMs'),
      batchSize: this.requireIntegerInRange(config.batchSize ?? 50, 10, 500, 'batchSize'),
      retries: this.requireIntegerInRange(config.retries ?? 3, 1, 5, 'retries'),
      timeoutMs: this.requireIntegerInRange(config.timeoutMs ?? 10000, 5000, 10000, 'timeoutMs'),
      console: consoleEnabled
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

  private requireIntegerInRange(value: number, min: number, max: number, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`${fieldName} must be an integer`);
    }

    if (value < min || value > max) {
      throw new Error(`${fieldName} must be between ${min} and ${max}`);
    }

    return value;
  }

  private requireString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${fieldName} must be a non-empty string`);
    }

    return value.trim();
  }

  private requireBoolean(value: unknown, fieldName: string): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`${fieldName} must be a boolean`);
    }

    return value;
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
