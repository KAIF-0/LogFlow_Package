export class TimeUtils {
  public static nowMs(): number {
    return Date.now();
  }

  public static toIso(ms: number): string {
    return new Date(ms).toISOString();
  }
}
