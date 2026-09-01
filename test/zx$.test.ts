import './mocks/fs-extra.mock';
import './mocks/zx.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearZxCliCache, get$, getZxCliPath, resolveZxCli, zxCliPath } from '../src/zx$';

describe('zx$', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    clearZxCliCache();
  });

  interface CustomDollar {
    stdio?: string;
    preferLocal?: boolean;
    shell?: string;
    cwd?: string;
    spawn?: unknown;
    prefix?: string;
    postfix?: string;
  }

  describe('get$', () => {
    it('should return a configured $ instance with inspectable properties', () => {
      const custom$ = get$() as unknown as CustomDollar;
      expect(custom$).toBeDefined();
      expect(typeof custom$).toBe('function');
      expect(custom$.stdio).toBe('inherit');
      expect(custom$.preferLocal).toBe(true);
      expect(custom$.shell).toBeDefined();
      expect(custom$.cwd).toBeDefined();
      expect(typeof custom$.spawn).toBe('function');
    });

    it('should respect ZXDO_SHELL and ZXDO_CWD environment overrides', () => {
      process.env.ZXDO_SHELL = 'bash';
      process.env.ZXDO_CWD = '/custom/test/cwd';

      const custom$ = get$() as unknown as CustomDollar;
      expect(custom$.shell).toBe('bash');
      expect(custom$.cwd).toBe('/custom/test/cwd');
      expect(custom$.prefix).toBe('set -euo pipefail;');
      expect(custom$.postfix).toBe('');
    });

    it('should configure PowerShell prefix and postfix when shell is pwsh', () => {
      process.env.ZXDO_SHELL = 'pwsh';

      const custom$ = get$() as unknown as CustomDollar;
      expect(custom$.shell).toBe('pwsh');
      expect(custom$.prefix).toBe('');
      expect(custom$.postfix).toBe('; exit $LastExitCode');
    });
  });

  describe('resolveZxCli', () => {
    it('should resolve zx/cli path and cache the result', () => {
      const p1 = resolveZxCli();
      expect(p1).toMatch(/zx[/\\]build[/\\]cli/);

      const p2 = resolveZxCli();
      expect(p2).toBe(p1);
    });

    it('should clear cache when clearZxCliCache is called', () => {
      const p1 = resolveZxCli();
      clearZxCliCache();
      const p2 = resolveZxCli();
      expect(p2).toBe(p1);
    });
  });

  describe('getZxCliPath', () => {
    it('should return command tokens array including runtime and flags', () => {
      const tokens = getZxCliPath();
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(['node', 'bun', 'deno']).toContain(tokens[0]);
      expect(tokens[1]).toMatch(/zx[/\\]build[/\\]cli/);
      expect(tokens.some((t) => t.startsWith('--cwd='))).toBe(true);
      expect(tokens.some((t) => t.startsWith('--shell='))).toBe(true);
    });

    it('should include PowerShell prefix and postfix tokens when shell is pwsh', () => {
      process.env.ZXDO_SHELL = 'pwsh';
      const tokens = getZxCliPath();
      expect(tokens).toContain('--prefix=""');
      expect(tokens).toContain('--postfix="; exit $LastExitCode"');
    });

    it('should fall back to "zx" executable without runtime when resolution fails', () => {
      process.env.ZXDO_ZX_PKG = 'non-existent-zx-package-name';
      clearZxCliCache();

      const zxCli = resolveZxCli();
      expect(zxCli).toBe('zx');

      const tokens = getZxCliPath();
      expect(tokens[0]).toBe('zx');

      delete process.env.ZXDO_ZX_PKG;
      clearZxCliCache();
    });

    it('should export zxCliPath as an array of tokens', () => {
      expect(Array.isArray(zxCliPath)).toBe(true);
      expect(zxCliPath.length).toBeGreaterThanOrEqual(3);
    });
  });
});
