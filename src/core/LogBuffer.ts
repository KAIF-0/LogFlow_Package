import { LifecycleLog } from '../types/LifecycleLog';

export class LogBuffer {
  private readonly items: LifecycleLog[] = [];

  public add(log: LifecycleLog): void {
    this.items.push(log);
  }

  public size(): number {
    return this.items.length;
  }

  public drainBatch(maxSize: number): LifecycleLog[] {
    if (this.items.length === 0) {
      return [];
    }
    return this.items.splice(0, maxSize);
  }

  public prepend(logs: LifecycleLog[]): void {
    if (logs.length === 0) {
      return;
    }
    this.items.unshift(...logs);
  }

  public clear(): void {
    this.items.length = 0;
  }
}
