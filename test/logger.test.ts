import { describe, expect, it, vi } from 'vitest';
import { BufferLogger, ConsoleLogger } from '../src/logger';

describe('logger classes', () => {
  describe('ConsoleLogger', () => {
    it('should call console.log and console.error', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const consoleLogger = new ConsoleLogger();
      consoleLogger.log('message');
      consoleLogger.error('error message');

      expect(logSpy).toHaveBeenCalledWith('message');
      expect(errorSpy).toHaveBeenCalledWith('error message');

      logSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('BufferLogger', () => {
    it('should store messages and clear correctly', () => {
      const bufferLogger = new BufferLogger();

      bufferLogger.log('hello');
      bufferLogger.error('world');
      expect(bufferLogger.getBuffer()).toEqual(['hello', 'world']);

      bufferLogger.clearBuffer();
      expect(bufferLogger.getBuffer()).toEqual([]);
    });

    it('should format object arguments as JSON strings', () => {
      const bufferLogger = new BufferLogger();
      bufferLogger.log({ foo: 'bar' });
      bufferLogger.error({ error: 'critical' });

      expect(bufferLogger.getBuffer()).toEqual([JSON.stringify({ foo: 'bar' }), JSON.stringify({ error: 'critical' })]);
    });
  });
});
