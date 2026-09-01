import './mocks/fs-extra.mock';
import './mocks/zx.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runScript } from '../src/scriptRunner';
import { getZxCliPath } from '../src/zx$';
import { mockTag } from './mocks/zx.mock';

describe('scriptRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runScript', () => {
    it('should execute zx with script and args when script is provided', async () => {
      const result = await runScript(['--quiet'], '/path/to/script.ts', ['--force']);
      expect(result).toBeDefined();
      expect(mockTag).toHaveBeenCalledWith(expect.anything(), getZxCliPath(), ['--quiet'], '/path/to/script.ts', [
        '--force'
      ]);
    });

    it('should execute zx without script when script is omitted (eval / repl mode)', async () => {
      const result = await runScript(['--eval', 'console.log(1)']);
      expect(result).toBeDefined();
      expect(mockTag).toHaveBeenCalledWith(expect.anything(), getZxCliPath(), ['--eval', 'console.log(1)']);
    });

    it('should handle default empty parameters', async () => {
      const result = await runScript();
      expect(result).toBeDefined();
      expect(mockTag).toHaveBeenCalledWith(expect.anything(), getZxCliPath(), []);
    });
  });
});
