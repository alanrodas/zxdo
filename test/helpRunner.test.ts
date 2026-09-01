import './mocks/fs-extra.mock';
import './mocks/package.json.mock';

import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { errorAndExit, help, helpCommand, version } from '../src/helpRunner';
import { logger } from '../src/logger';
import { InvalidScript } from '../src/scriptFinder';

describe('helpRunner', () => {
  const folders = ['.scripts', 'scripts'];
  const extensions = ['', '.mts', '.cts', '.ts', '.mjs', '.cjs', '.js'];

  describe('version', () => {
    it('should print and return the version from mocked package.json', async () => {
      const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
      const result = await version();
      expect(result).toBe('2.5.0');
      expect(logSpy).toHaveBeenCalledWith('2.5.0');
      logSpy.mockRestore();
    });
  });

  describe('errorAndExit', () => {
    it('should log error message and exit with 1', () => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      errorAndExit(new Error('Sample error'));

      expect(errorSpy).toHaveBeenCalledWith('Sample error');
      expect(exitSpy).toHaveBeenCalledWith(1);

      errorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('help', () => {
    it('should print general help with available commands and summaries', async () => {
      const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));

      await help(folders, extensions);

      expect(logSpy).toHaveBeenCalledWith('Usage:\n  zxdo [options] <command> [command-options]\n');
      expect(logSpy).toHaveBeenCalledWith('Available commands:');
      expect(logSpy).toHaveBeenCalledWith('  first   First script in D1');
      expect(logSpy).toHaveBeenCalledWith('  second  Second script in B');
      expect(logSpy).toHaveBeenCalledWith('  third   Third script in D1');

      logSpy.mockRestore();
      cwdSpy.mockRestore();
    });

    it('should display message when no scripts are found in scope', async () => {
      const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A'));

      await help(folders, extensions);

      expect(logSpy).toHaveBeenCalledWith('Usage:\n  zxdo [options] <command> [command-options]\n');
      expect(logSpy).toHaveBeenCalledWith('Available commands:');
      expect(logSpy).toHaveBeenCalledWith("  (No scripts found in the project's scope)");

      logSpy.mockRestore();
      cwdSpy.mockRestore();
    });

    it('should respect custom folders passed to help', async () => {
      const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));

      await help(['.scripts'], extensions);

      expect(logSpy).toHaveBeenCalledWith('  first  First script in D1');
      expect(logSpy).toHaveBeenCalledWith('  third  Third script in D1');
      expect(logSpy).not.toHaveBeenCalledWith('  second  Second script in B');

      logSpy.mockRestore();
      cwdSpy.mockRestore();
    });
  });

  describe('helpCommand', () => {
    it('should print command-specific help with usage, body, and parameters', async () => {
      const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));

      await helpCommand('first', folders, extensions);

      expect(logSpy).toHaveBeenCalledWith('Usage:\n  zxdo first [options]\n');
      expect(logSpy).toHaveBeenCalledWith('This is the long description of the script.\nIt may spawn multiple lines.');
      expect(logSpy).toHaveBeenCalledWith('Options:');
      expect(logSpy).toHaveBeenCalledWith('  -f, --force       Force flag');

      logSpy.mockRestore();
      cwdSpy.mockRestore();
    });

    it('should print message when script has no documentation available', async () => {
      const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D4'));

      await helpCommand('undocumented', folders, extensions);

      expect(logSpy).toHaveBeenCalledWith('Usage:\n  zxdo undocumented [options]\n');
      expect(logSpy).toHaveBeenCalledWith('No documentation available for this command.');

      logSpy.mockRestore();
      cwdSpy.mockRestore();
    });

    it('should throw InvalidScript when the command cannot be found', async () => {
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));

      await expect(helpCommand('nonexistent', folders, extensions)).rejects.toThrow(InvalidScript);

      cwdSpy.mockRestore();
    });

    it('should print command help with short-only, long-only, and default option values', async () => {
      const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));

      await helpCommand('detailed', ['custom'], extensions);

      expect(logSpy).toHaveBeenCalledWith('Usage:\n  zxdo detailed [options]\n');
      expect(logSpy).toHaveBeenCalledWith('Detailed explanation of the script behavior.\n@param -\n@param Not a flag');
      expect(logSpy).toHaveBeenCalledWith('Options:');
      expect(logSpy).toHaveBeenCalledWith('  -p                Port number (default: 8080)');
      expect(logSpy).toHaveBeenCalledWith('      --host        Hostname (default: localhost)');

      logSpy.mockRestore();
      cwdSpy.mockRestore();
    });
  });

  describe('errorAndExit', () => {
    it('should log non-Error strings and exit with code 1', () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      errorAndExit('custom string failure');

      expect(errorSpy).toHaveBeenCalledWith('custom string failure');
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
