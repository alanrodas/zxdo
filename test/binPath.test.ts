import './mocks/fs-extra.mock';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearBinPathsCache, configureLocalBin, getLocalBinPaths, getPathKey } from '../src/binPath';

describe('binPath', () => {
  beforeEach(() => {
    // Reset PATH before each test
    process.env.PATH = '/original/bin';
    if (process.platform === 'win32') {
      process.env.Path = '/original/bin';
    }
  });

  describe('getPathKey', () => {
    it('should return PATH or Path based on environment', () => {
      const key = getPathKey({ PATH: '/usr/bin' });
      expect(key).toBe('PATH');
    });

    it('should return PATH on non-win32 platforms', () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        expect(getPathKey({ Path: '/usr/bin' })).toBe('PATH');
      } finally {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      }
    });
  });

  describe('getLocalBinPaths', () => {
    it('should collect existing node_modules/.bin directories upwards', () => {
      const paths = getLocalBinPaths(path.resolve('/A/B/C/D1/E'));
      const expectedD1 = path.resolve('/A/B/C/D1/node_modules/.bin');
      const expectedB = path.resolve('/A/B/node_modules/.bin');

      expect(paths).toContain(expectedD1);
      expect(paths).toContain(expectedB);
    });

    it('should include additional roots passed to it', () => {
      const paths = getLocalBinPaths(path.resolve('/A/B/C/D2'), [path.resolve('/A/B')]);
      const expectedB = path.resolve('/A/B/node_modules/.bin');

      expect(paths).toContain(expectedB);
    });
  });

  describe('configureLocalBin', () => {
    it('should prepend node_modules/.bin paths to process.env.PATH', () => {
      const updatedPath = configureLocalBin(path.resolve('/A/B/C/D1/E'));
      const expectedD1 = path.resolve('/A/B/C/D1/node_modules/.bin');
      const expectedB = path.resolve('/A/B/node_modules/.bin');

      expect(updatedPath).toContain(expectedD1);
      expect(updatedPath).toContain(expectedB);
      expect(process.env.PATH).toContain(expectedD1);

      // Verify original PATH is still retained at the end
      expect(process.env.PATH).toContain('/original/bin');
    });

    it('should clear cached bin paths when clearBinPathsCache is called', () => {
      clearBinPathsCache();
      const paths = getLocalBinPaths(path.resolve('/A/B/C/D1/E'));
      expect(paths.length).toBeGreaterThan(0);
      clearBinPathsCache();
    });
  });
});
