export interface LogFlowConfig {
  apiKey: string;
  baseUrl: string;
  flushIntervalMs?: number;
  batchSize?: number;
  retries?: number;
  console?: boolean;
}
