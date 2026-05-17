import { LifecycleLog } from '../types/LifecycleLog';
import { RetryStrategy } from './RetryStrategy';

export class LogSender {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly retryStrategy: RetryStrategy;

  public constructor(baseUrl: string, apiKey: string, timeoutMs: number, retries: number) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.retryStrategy = new RetryStrategy(retries, 500, (error) => this.shouldRetry(error));
  }

  public async sendBatch(logs: LifecycleLog[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    await this.retryStrategy.run(async () => {
      const payload = { logs };
      const payloadText = JSON.stringify(payload);
      await this.postJson(`${this.baseUrl}/logs/ingest`, { logs });
    });
  }

  private async postJson(url: string, body: unknown): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      

      if (!response.ok) {
        const error = new Error(`Ingest failed with status ${response.status}`) as Error & {
          status?: number;
        };
        error.status = response.status;
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  

  private shouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      const typedError = error as Error & { status?: number };
      if (typeof typedError.status === 'number' && typedError.status >= 400 && typedError.status < 500) {
        return false;
      }
    }

    return true;
  }
}
