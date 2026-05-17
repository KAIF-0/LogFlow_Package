export interface LifecycleLog {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseHeaders: Record<string, string>;
  responseBody: string;
  latencyMs: number;
  timestamp: string;
  errorMessage: string | null;
}
