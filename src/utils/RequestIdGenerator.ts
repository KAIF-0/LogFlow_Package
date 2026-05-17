import { randomUUID } from 'node:crypto';

export class RequestIdGenerator {
  public static generate(): string {
    if (typeof randomUUID === 'function') {
      return randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
