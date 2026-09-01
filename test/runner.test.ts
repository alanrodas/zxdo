import './mocks/fs-extra.mock';
import './mocks/zx.mock';
import './mocks/package.json.mock';

import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { logger } from '../src/logger';
import { runner } from '../src/runner';

describe('runner CLI routing', () => {
  it('should show general help if called with no arguments', async () => {
    const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));

    await runner([]);

    expect(logSpy).toHaveBeenCalledWith('Usage:\n  zxdo [options] <command> [command-options]\n');

    logSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should show version if called with -v or --version', async () => {
    const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));

    await runner(['-v']);
    expect(logSpy).toHaveBeenCalledWith('2.5.0');

    await runner(['--version']);
    expect(logSpy).toHaveBeenCalledWith('2.5.0');

    logSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should show general help if called with -h', async () => {
    const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));

    await runner(['-h']);

    expect(logSpy).toHaveBeenCalledWith('Usage:\n  zxdo [options] <command> [command-options]\n');

    logSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should show command specific help if command name and help flag are passed', async () => {
    const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));

    await runner(['--help', 'first']);

    expect(logSpy).toHaveBeenCalledWith('Usage:\n  zxdo first [options]\n');

    logSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should route to runScript in eval mode when --eval is provided without command', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));
    const { mockTag } = await import('./mocks/zx.mock');

    await runner(['--eval', 'console.log(42)']);

    expect(mockTag).toHaveBeenCalledWith(expect.anything(), expect.any(Array), ['--eval', 'console.log(42)']);

    cwdSpy.mockRestore();
  });

  it('should route to runScript if script name is provided', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));
    const { mockTag } = await import('./mocks/zx.mock');

    await expect(runner(['first', '--force'])).resolves.not.toThrow();

    expect(mockTag).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Array),
      [],
      expect.stringMatching(/first\.(ts|js|mjs|cjs)/),
      ['--force']
    );

    cwdSpy.mockRestore();
  });

  it('should configure shell when --shell=bash option is provided', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));
    const zxMock = await import('zx');

    await runner(['--shell=bash', 'first', '--force']);

    expect(zxMock.useBash).toHaveBeenCalled();
    expect(process.env.ZXDO_SHELL).toBe('bash');

    cwdSpy.mockRestore();
  });

  it('should configure shell when --shell=pwsh option is provided', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));
    const zxMock = await import('zx');

    await runner(['--shell=pwsh', 'first', '--force']);

    expect(zxMock.usePwsh).toHaveBeenCalled();
    expect(process.env.ZXDO_SHELL).toBe('pwsh');

    cwdSpy.mockRestore();
  });

  it('should handle missing script by calling errorAndExit', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    await runner(['non-existent-script']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('There is no script with the name "non-existent-script"')
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should call errorAndExit when process.chdir fails in production mode', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));
    const chdirSpy = vi.spyOn(process, 'chdir').mockImplementation(() => {
      throw new Error('chdir error');
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const prevVitest = process.env.VITEST;
    try {
      delete process.env.VITEST;
      await runner(['first']);
      expect(errorSpy).toHaveBeenCalledWith('chdir error');
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      process.env.VITEST = prevVitest;
      chdirSpy.mockRestore();
      exitSpy.mockRestore();
      errorSpy.mockRestore();
      cwdSpy.mockRestore();
    }
  });
});
