import type { Request } from 'express';
import { LifecycleLog } from '../types/LifecycleLog';
import { RequestIdGenerator } from '../utils/RequestIdGenerator';
import { TimeUtils } from '../utils/TimeUtils';

export class RequestContext {
  public baseLog: LifecycleLog;
  public startMs: number;
  public errorMessage: string | null;

  public constructor(baseLog: LifecycleLog, startMs: number) {
    this.baseLog = baseLog;
    this.startMs = startMs;
    this.errorMessage = null;
  }
}

export class RequestTracker {
  public start(req: Request): RequestContext {
    const requestId = RequestIdGenerator.generate();
    const startMs = TimeUtils.nowMs();
    const baseLog: LifecycleLog = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url || '',
      statusCode: 0,
      requestHeaders: this.normalizeHeaders(req.headers),
      requestBody: this.serializeBody(req.body),
      responseHeaders: {},
      responseBody: '',
      latencyMs: 0,
      timestamp: TimeUtils.toIso(startMs),
      errorMessage: null
    };

    return new RequestContext(baseLog, startMs);
  }

  private normalizeHeaders(headers: Request['headers']): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        normalized[key] = value.join(',');
      } else if (value !== undefined) {
        normalized[key] = String(value);
      }
    }

    return normalized;
  }

  private serializeBody(body: unknown): string {
    if (body === undefined || body === null) {
      return '';
    }

    if (typeof body === 'string') {
      return body;
    }

    try {
      return JSON.stringify(body);
    } catch {
      return String(body);
    }
  }
}
