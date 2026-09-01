/** biome-ignore-all lint/suspicious/noDuplicateTestHooks: There is an intended beforeEach in different scenarios */
import './mocks/zx.mock';
import { execSync } from 'child_process';
import os from 'os';
import { afterEach, beforeEach, describe, expect, it, vi, describe as when } from 'vitest';
import { $, useBash, usePowerShell, usePwsh } from 'zx';
import { clearShellCache, configureShell, detectShell, spawnNoProfile } from '../src/shellConfig';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn().mockImplementation(() => ({ pid: 1234, on: vi.fn() }))
}));

describe('shellConfig', () => {
  const originalEnv = { ...process.env };
  const mockedExecSync = vi.mocked(execSync);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('detectShell', () => {
    when('process.env.SHELL is defined with a known POSIX shell', () => {
      it.each([
        ['/bin/bash', 'bash'],
        ['/usr/bin/zsh', 'zsh'],
        ['/bin/sh', 'sh'],
        ['/usr/local/bin/fish', 'fish'],
        ['/bin/ksh', 'ksh'],
        ['/usr/bin/bash', 'bash']
      ])('should return "%s" as "%s"', (shellPath, expected) => {
        process.env.SHELL = shellPath;
        expect(detectShell()).toBe(expected);
      });

      it('should fall through if SHELL is not in the recognized list', () => {
        process.env.SHELL = '/usr/bin/customshell';
        delete process.env.PSModulePath;
        vi.spyOn(os, 'platform').mockReturnValue('linux');
        mockedExecSync.mockReturnValue(Buffer.from('bash\n'));

        expect(detectShell()).toBe('bash');
      });
    });

    when('running on Windows (win32)', () => {
      beforeEach(() => {
        delete process.env.SHELL;
        vi.spyOn(os, 'platform').mockReturnValue('win32');
      });

      it.each([
        ['pwsh.exe', 'pwsh'],
        ['powershell.exe', 'powershell'],
        ['cmd.exe', 'cmd'],
        ['bash.exe', 'bash'],
        ['C:\\Program Files\\PowerShell\\7\\pwsh.exe', 'pwsh']
      ])('should detect "%s" as "%s" from parent process', (execOutput, expected) => {
        mockedExecSync.mockReturnValue(Buffer.from(`${execOutput}\n`));

        expect(detectShell()).toBe(expected);
      });

      it('should query the parent process using powershell and process.ppid', () => {
        mockedExecSync.mockReturnValue(Buffer.from('cmd.exe\n'));
        const ppid = process.ppid;

        detectShell();

        expect(mockedExecSync).toHaveBeenCalledWith(`powershell -NoProfile -Command "(Get-Process -Id ${ppid}).Name"`, {
          stdio: ['ignore', 'pipe', 'ignore']
        });
      });

      it('should fall back to "pwsh" if execSync throws and PSModulePath contains PowerShell Core paths', () => {
        mockedExecSync.mockImplementation(() => {
          throw new Error('Command failed');
        });
        process.env.PSModulePath =
          'C:\\Program Files\\PowerShell\\Modules;C:\\Program Files\\WindowsPowerShell\\Modules';

        expect(detectShell()).toBe('pwsh');
      });

      it('should fall back to "powershell" if execSync throws and PSModulePath contains only WindowsPowerShell paths', () => {
        mockedExecSync.mockImplementation(() => {
          throw new Error('Command failed');
        });
        process.env.PSModulePath =
          'C:\\Users\\user\\Documents\\WindowsPowerShell\\Modules;C:\\Program Files\\WindowsPowerShell\\Modules;C:\\Windows\\system32\\WindowsPowerShell\\v1.0\\Modules';

        expect(detectShell()).toBe('powershell');
      });

      it('should fall back to "cmd" if execSync throws and PSModulePath is not set', () => {
        mockedExecSync.mockImplementation(() => {
          throw new Error('Command failed');
        });
        delete process.env.PSModulePath;

        expect(detectShell()).toBe('cmd');
      });

      it('should fall back if parent process name is unrecognized', () => {
        mockedExecSync.mockReturnValue(Buffer.from('explorer.exe\n'));
        delete process.env.PSModulePath;

        expect(detectShell()).toBe('cmd');
      });
    });

    when('running on POSIX systems (linux, darwin)', () => {
      beforeEach(() => {
        delete process.env.SHELL;
        vi.spyOn(os, 'platform').mockReturnValue('linux');
      });

      it('should detect shell name from ps command', () => {
        mockedExecSync.mockReturnValue(Buffer.from('zsh\n'));

        expect(detectShell()).toBe('zsh');
      });

      it('should strip leading hyphen from login shells (e.g. -bash, -zsh)', () => {
        mockedExecSync.mockReturnValue(Buffer.from('-bash\n'));

        expect(detectShell()).toBe('bash');
      });

      it('should query parent process using ps -p <ppid> -o comm=', () => {
        mockedExecSync.mockReturnValue(Buffer.from('sh\n'));
        const ppid = process.ppid;

        detectShell();

        expect(mockedExecSync).toHaveBeenCalledWith(`ps -p ${ppid} -o comm=`, {
          stdio: ['ignore', 'pipe', 'ignore']
        });
      });

      it('should fall back to "bash" when execSync throws', () => {
        mockedExecSync.mockImplementation(() => {
          throw new Error('ps command failed');
        });

        expect(detectShell()).toBe('bash');
      });

      it('should fall back to "bash" when ps output is empty', () => {
        mockedExecSync.mockReturnValue(Buffer.from('\n'));

        expect(detectShell()).toBe('bash');
      });
    });
  });

  describe('configureShell', () => {
    it('should configure pwsh when "pwsh" is passed', () => {
      configureShell('pwsh');
      expect(usePwsh).toHaveBeenCalledTimes(1);
    });

    it('should configure powershell when "powershell" is passed', () => {
      configureShell('powershell');
      expect(usePowerShell).toHaveBeenCalledTimes(1);
    });

    it('should configure bash when "bash" is passed', () => {
      configureShell('bash');
      expect(useBash).toHaveBeenCalledTimes(1);
    });

    it('should assign $.shell directly for custom shells', () => {
      configureShell('/bin/zsh');
      expect($.shell).toBe('/bin/zsh');

      configureShell('sh');
      expect($.shell).toBe('sh');
    });

    when('"auto" is passed', () => {
      it('should detect shell and configure accordingly', () => {
        process.env.SHELL = '/bin/bash';

        configureShell('auto');

        expect(useBash).toHaveBeenCalledTimes(1);
      });

      it('should configure pwsh when auto detects pwsh', () => {
        delete process.env.SHELL;
        vi.spyOn(os, 'platform').mockReturnValue('win32');
        mockedExecSync.mockReturnValue(Buffer.from('pwsh\n'));

        configureShell('auto');

        expect(usePwsh).toHaveBeenCalledTimes(1);
      });

      it('should assign $.shell to "/bin/zsh" when auto detects zsh', () => {
        process.env.SHELL = '/bin/zsh';

        configureShell('auto');

        expect($.shell).toBe('/bin/zsh');
      });

      it('should assign $.shell for other detected shells (e.g. fish)', () => {
        process.env.SHELL = '/usr/local/bin/fish';

        configureShell('auto');

        expect($.shell).toBe('fish');
      });
    });
  });

  describe('clearShellCache and ZXDO_SHELL', () => {
    it('should return ZXDO_SHELL when defined and not auto', () => {
      process.env.ZXDO_SHELL = 'custom_pwsh';
      expect(detectShell()).toBe('custom_pwsh');
    });

    it('should clear cache on clearShellCache', () => {
      clearShellCache();
      process.env.ZXDO_SHELL = 'bash';
      expect(detectShell()).toBe('bash');
    });
  });

  describe('spawnNoProfile', () => {
    it('should add -NoProfile and shell: false when shell includes pwsh or powershell', async () => {
      const cp = await import('child_process');
      const spawnSpy = vi.mocked(cp.spawn);

      spawnNoProfile('echo 1', [], { shell: 'pwsh' });
      expect(spawnSpy).toHaveBeenCalledWith('pwsh', ['-NoProfile', '-c', 'echo 1'], {
        shell: false
      });

      spawnNoProfile('echo 2', [], { shell: 'bash' });
      expect(spawnSpy).toHaveBeenCalledWith('echo 2', [], { shell: 'bash' });
    });
  });

  describe('detectShell production caching', () => {
    it('should cache detected shell when process.env.VITEST is not set', () => {
      const prevVitest = process.env.VITEST;
      try {
        delete process.env.VITEST;
        clearShellCache();
        process.env.SHELL = '/bin/bash';

        const shell = detectShell();
        expect(shell).toBe('bash');
        expect(process.env.ZXDO_SHELL).toBe('bash');

        delete process.env.ZXDO_SHELL;
        const cached = detectShell();
        expect(cached).toBe('bash');
      } finally {
        process.env.VITEST = prevVitest;
      }
    });
  });
});
