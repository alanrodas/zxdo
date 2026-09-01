import './mocks/fs-extra.mock';
import path from 'path';
import { describe, expect, it, vi, describe as when } from 'vitest';
import { clearRootsCache, findRoots } from '../src/rootsFinder';

describe('rootsFinder', () => {
  when('CWD is /A/B/C/D1/E', () => {
    it('should find roots', async () => {
      clearRootsCache();
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D1/E'));
      const roots = await findRoots();
      expect(roots).toEqual([path.resolve('/A/B/C/D1'), path.resolve('/A/B')]);
      cwdSpy.mockRestore();
    });
  });

  when('CWD is /A/B/C/D2', () => {
    it('should find roots', async () => {
      clearRootsCache();
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A/B/C/D2'));
      const roots = await findRoots();
      expect(roots).toEqual([path.resolve('/A/B/C/D2'), path.resolve('/A/B')]);
      cwdSpy.mockRestore();
    });
  });

  when('CWD is /A', () => {
    it('should not find roots', async () => {
      clearRootsCache();
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.resolve('/A'));
      const roots = await findRoots();
      expect(roots).toEqual([]);
      cwdSpy.mockRestore();
    });
  });

  when('ZXDO_ROOTS is set in environment for current cwd', () => {
    it('should parse and return roots from ZXDO_ROOTS directly', async () => {
      clearRootsCache();
      const testCwd = path.resolve('/A/B/C/D1/E');
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(testCwd);
      process.env.ZXDO_ROOTS = `${path.resolve('/custom/root1')}${path.delimiter}${path.resolve('/custom/root2')}`;
      process.env.ZXDO_ROOTS_CWD = testCwd;

      const roots = await findRoots();
      expect(roots).toEqual([path.resolve('/custom/root1'), path.resolve('/custom/root2')]);

      delete process.env.ZXDO_ROOTS;
      delete process.env.ZXDO_ROOTS_CWD;
      cwdSpy.mockRestore();
    });
  });
});
