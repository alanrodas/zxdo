import './mocks/fs-extra.mock';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { findAllScriptsWithData, findScript, findScriptWithData, InvalidScript } from '../src/scriptFinder';

describe('scriptFinder', () => {
  const folders = ['.scripts', 'scripts'];
  const extensions = ['', '.mts', '.cts', '.ts', '.mjs', '.cjs', '.js'];
  const rootsD1 = [path.resolve('/A/B/C/D1'), path.resolve('/A/B')];
  const rootsD2 = [path.resolve('/A/B/C/D2'), path.resolve('/A/B')];
  const rootsD3 = [path.resolve('/A/B/C/D3')];

  describe('findScript', () => {
    it('should find first.ts in D1 scripts folder from D1 roots', async () => {
      const p = await findScript(rootsD1, folders, extensions, 'first');
      expect(p).toBe(path.resolve('/A/B/C/D1/.scripts/first.ts'));
    });

    it('should find second.mjs in B scripts folder from D1 roots', async () => {
      const p = await findScript(rootsD1, folders, extensions, 'second');
      expect(p).toBe(path.resolve('/A/B/scripts/second.mjs'));
    });

    it('should find third.mts in D1 scripts folder from D1 roots due to root priority', async () => {
      const p = await findScript(rootsD1, folders, extensions, 'third');
      expect(p).toBe(path.resolve('/A/B/C/D1/.scripts/third.mts'));
    });

    it('should find third.mts in B scripts folder from D2 roots (since D2 has no third)', async () => {
      const p = await findScript(rootsD2, folders, extensions, 'third');
      expect(p).toBe(path.resolve('/A/B/scripts/third.mts'));
    });

    it('should find script when specified with extension (e.g. first.ts)', async () => {
      const p = await findScript(rootsD1, folders, extensions, 'first.ts');
      expect(p).toBe(path.resolve('/A/B/C/D1/.scripts/first.ts'));
    });

    it('should find script that has no extension (e.g. standalone)', async () => {
      const p = await findScript(rootsD3, folders, extensions, 'standalone');
      expect(p).toBe(path.resolve('/A/B/C/D3/scripts/standalone'));
    });

    it('should only search within the provided custom folders', async () => {
      // D1 has .scripts/first.ts, but does not have scripts/first.ts
      await expect(findScript(rootsD1, ['scripts'], extensions, 'first')).rejects.toThrow(InvalidScript);

      // When .scripts is included, it is found
      const p = await findScript(rootsD1, ['.scripts'], extensions, 'first');
      expect(p).toBe(path.resolve('/A/B/C/D1/.scripts/first.ts'));
    });

    it('should filter scripts by provided custom extensions', async () => {
      // second.mjs should not be found if only .ts is allowed
      await expect(findScript(rootsD1, folders, ['.ts'], 'second')).rejects.toThrow(InvalidScript);
      // second.mjs should be found if .mjs is allowed
      const p = await findScript(rootsD1, folders, ['.mjs'], 'second');
      expect(p).toBe(path.resolve('/A/B/scripts/second.mjs'));
    });

    it('should throw InvalidScript when script is not found in any root or folder', async () => {
      await expect(findScript(rootsD2, folders, extensions, 'first')).rejects.toThrow(InvalidScript);
    });
  });

  describe('findAllScriptsWithData', () => {
    it('should list all unique scripts from D1 roots populated and sorted', async () => {
      const list = await findAllScriptsWithData(rootsD1, folders, extensions);
      expect(list).toHaveLength(3);
      expect(list[0].name).toBe('first');
      expect(list[0].path).toBe(path.resolve('/A/B/C/D1/.scripts/first.ts'));
      expect(list[0].documentation?.summary).toBe('First script in D1');

      expect(list[1].name).toBe('second');
      expect(list[1].path).toBe(path.resolve('/A/B/scripts/second.mjs'));
      expect(list[1].documentation?.summary).toBe('Second script in B');

      expect(list[2].name).toBe('third');
      expect(list[2].path).toBe(path.resolve('/A/B/C/D1/.scripts/third.mts'));
      expect(list[2].documentation?.summary).toBe('Third script in D1');
    });

    it('should list only second and third from D2 roots', async () => {
      const list = await findAllScriptsWithData(rootsD2, folders, extensions);
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('second');
      expect(list[1].name).toBe('third');
      expect(list[1].path).toBe(path.resolve('/A/B/scripts/third.mts'));
      expect(list[1].documentation?.summary).toBe('Third script in B');
    });

    it('should list scripts without extension from D3 roots', async () => {
      const list = await findAllScriptsWithData(rootsD3, folders, extensions);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('standalone');
      expect(list[0].path).toBe(path.resolve('/A/B/C/D3/scripts/standalone'));
      expect(list[0].documentation?.summary).toBe('Standalone script without extension');
    });

    it('should filter scripts based on custom folders provided', async () => {
      const list = await findAllScriptsWithData(rootsD1, ['.scripts'], extensions);
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('first');
      expect(list[1].name).toBe('third');
    });

    it('should filter scripts based on custom extensions provided', async () => {
      const list = await findAllScriptsWithData(rootsD1, folders, ['.ts']);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('first');
    });
  });

  describe('findScriptWithData', () => {
    it('should resolve ScriptData for a specific script', async () => {
      const data = await findScriptWithData(rootsD1, folders, extensions, 'first');
      expect(data.name).toBe('first');
      expect(data.path).toBe(path.resolve('/A/B/C/D1/.scripts/first.ts'));
      expect(data.documentation?.summary).toBe('First script in D1');
    });

    it('should resolve ScriptData for a script without extension', async () => {
      const data = await findScriptWithData(rootsD3, folders, extensions, 'standalone');
      expect(data.name).toBe('standalone');
      expect(data.path).toBe(path.resolve('/A/B/C/D3/scripts/standalone'));
      expect(data.documentation?.summary).toBe('Standalone script without extension');
    });

    it('should throw InvalidScript when script cannot be found', async () => {
      await expect(findScriptWithData(rootsD2, folders, extensions, 'nonexistent')).rejects.toThrow(InvalidScript);
    });
  });
});
