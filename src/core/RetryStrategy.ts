export class RetryStrategy {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly shouldRetry: (error: unknown) => boolean;

  public constructor(maxAttempts: number, baseDelayMs = 500, shouldRetry: (error: unknown) => boolean = () => true) {
    this.maxAttempts = Math.max(1, maxAttempts);
    this.baseDelayMs = baseDelayMs;
    this.shouldRetry = shouldRetry;
  }

  public async run<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < this.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!this.shouldRetry(error)) {
          throw error;
        }
        attempt += 1;
        if (attempt >= this.maxAttempts) {
          break;
        }
        const delay = this.baseDelayMs * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
