/**
 * Base Logger class defining the logging interface.
 */
export abstract class Logger {
  public abstract log(...args: unknown[]): void;
  public abstract error(...args: unknown[]): void;
}

/**
 * ConsoleLogger subclass that writes directly to stdout/stderr.
 */
export class ConsoleLogger extends Logger {
  public log(...args: unknown[]): void {
    console.log(...args);
  }

  public error(...args: unknown[]): void {
    console.error(...args);
  }
}

/**
 * BufferLogger subclass that collects logs in an in-memory string array.
 */
export class BufferLogger extends Logger {
  private buffer: string[] = [];

  public getBuffer(): string[] {
    return this.buffer;
  }

  public clearBuffer(): void {
    this.buffer = [];
  }

  public log(...args: unknown[]): void {
    this.buffer.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  }

  public error(...args: unknown[]): void {
    this.buffer.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  }
}

export const logger = new ConsoleLogger();
