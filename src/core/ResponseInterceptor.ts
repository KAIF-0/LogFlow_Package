import type { Request, Response } from 'express';
import { LifecycleLog } from '../types/LifecycleLog';
import { TimeUtils } from '../utils/TimeUtils';
import { RequestContext } from './RequestTracker';

export class ResponseInterceptor {
  public attach(
    req: Request,
    res: Response,
    context: RequestContext,
    onComplete: (log: LifecycleLog) => void,
    consoleEnabled = false
  ): void {
    let responseBody: string = '';
    let finished = false;

    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    const originalEnd = res.end.bind(res);

    res.send = ((body?: unknown) => {
      if (responseBody === '' && body !== undefined) {
        responseBody = this.serializeBody(body);
      }
      return originalSend(body as never);
    }) as Response['send'];

    res.json = ((body?: unknown) => {
      if (responseBody === '' && body !== undefined) {
        responseBody = this.serializeBody(body);
      }
      return originalJson(body as never);
    }) as Response['json'];

    res.end = ((chunk?: unknown, encoding?: unknown, cb?: unknown) => {
      if (responseBody === '' && chunk !== undefined) {
        responseBody = this.serializeBody(chunk);
      }
      return originalEnd(chunk as never, encoding as never, cb as never);
    }) as Response['end'];

    const finalize = () => {
      if (finished) {
        return;
      }
      finished = true;

      const latencyMs = TimeUtils.nowMs() - context.startMs;
      const log: LifecycleLog = {
        ...context.baseLog,
        statusCode: res.statusCode,
        responseHeaders: this.normalizeHeaders(res.getHeaders()),
        responseBody,
        latencyMs,
        errorMessage: context.errorMessage
      };

      if (consoleEnabled) {
        console.log(`[LogFlow][Response] ${log.statusCode} ${log.path} ${latencyMs}ms`);
      }

      onComplete(log);
    };

    res.on('finish', finalize);
    res.on('close', finalize);
  }

  private normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
    const entries = Object.entries(headers || {});
    const normalized: Record<string, string> = {};
    for (const [key, value] of entries) {
      if (Array.isArray(value)) {
        normalized[key] = value.map((item) => String(item)).join(',');
      } else if (value !== undefined && value !== null) {
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

    if (Buffer.isBuffer(body)) {
      return body.toString('utf8');
    }

    try {
      return JSON.stringify(body);
    } catch {
      return String(body);
    }
  }
}
