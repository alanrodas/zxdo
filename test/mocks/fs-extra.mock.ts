import path from 'path';
import { vi } from 'vitest';

const mockRawFs: Record<string, { type: 'file' | 'dir'; content?: string }> = {
  '/A': { type: 'dir' },
  '/A/B': { type: 'dir' },
  '/A/B/C': { type: 'dir' },
  '/A/B/C/D1': { type: 'dir' },
  '/A/B/C/D2': { type: 'dir' },
  '/A/B/C/D1/E': { type: 'dir' },
  '/A/B/scripts': { type: 'dir' },
  '/A/B/scripts/.DS_Store': { type: 'file', content: '' },
  '/A/B/C/D1/.scripts': { type: 'dir' },
  '/A/B/package.json': { type: 'file', content: '{}' },
  '/A/B/C/D1/package.json': { type: 'file', content: '{}' },
  '/A/B/C/D2/package.json': { type: 'file', content: '{}' },
  '/A/B/C/D1/.scripts/first.ts': {
    type: 'file',
    content: `
/**
 * @summary First script in D1
 * 
 * This is the long description of the script.
 * It may spawn multiple lines.
 * 
 * @param -f, --force, Force flag
 */
`
  },
  '/A/B/scripts/second.mjs': {
    type: 'file',
    content: `
/**
 * @summary Second script in B
 */
`
  },
  '/A/B/custom': { type: 'dir' },
  '/A/B/custom/detailed.ts': {
    type: 'file',
    content: `
/**
 * @summary Detailed script
 * @description Detailed explanation of the script behavior.
 * @param -p, Port number, default: 8080
 * @param --host, Hostname default: localhost
 * @param -v, --verbose, Verbose output, default: false
 * @param -c, with comma, default: true
 * @param --flagOnly
 * @param -
 * @param Not a flag
 */
`
  },
  '/A/B/C/D1/.scripts/third.mts': {
    type: 'file',
    content: `
/**
 * @summary Third script in D1
 * 
 * With a long description also.
 */
`
  },
  '/A/B/scripts/third.mts': {
    type: 'file',
    content: `
/**
 * Long description before summary.
 * The order is not important.
 * 
 * @summary Third script in B
 */
`
  },
  '/A/B/C/D3': { type: 'dir' },
  '/A/B/C/D3/package.json': { type: 'file', content: '{}' },
  '/A/B/C/D3/scripts': { type: 'dir' },
  '/A/B/node_modules': { type: 'dir' },
  '/A/B/node_modules/.bin': { type: 'dir' },
  '/A/B/C/D1/node_modules': { type: 'dir' },
  '/A/B/C/D1/node_modules/.bin': { type: 'dir' },
  '/A/B/C/D3/scripts/standalone': {
    type: 'file',
    content: `
/**
 * @summary Standalone script without extension
 */
`
  },
  '/A/B/C/D4': { type: 'dir' },
  '/A/B/C/D4/package.json': { type: 'file', content: '{}' },
  '/A/B/C/D4/scripts': { type: 'dir' },
  '/A/B/C/D4/scripts/undocumented.ts': {
    type: 'file',
    content: `console.log("undocumented");`
  }
};

const mockFsMap = new Map<string, { type: 'file' | 'dir'; content?: string }>();
for (const [key, value] of Object.entries(mockRawFs)) {
  mockFsMap.set(path.resolve(key).toLowerCase(), value);
}

const mockFsExtra = {
  pathExists: async (p: string) => mockFsMap.has(path.resolve(p).toLowerCase()),
  pathExistsSync: (p: string) => mockFsMap.has(path.resolve(p).toLowerCase()),
  existsSync: (p: string) => mockFsMap.has(path.resolve(p).toLowerCase()),
  stat: async (p: string) => {
    const item = mockFsMap.get(path.resolve(p).toLowerCase());
    if (!item) throw new Error(`ENOENT: no such file or directory, stat '${p}'`);
    return {
      isFile: () => item.type === 'file',
      isDirectory: () => item.type === 'dir'
    };
  },
  statSync: (p: string) => {
    const item = mockFsMap.get(path.resolve(p).toLowerCase());
    if (!item) throw new Error(`ENOENT: no such file or directory, stat '${p}'`);
    return {
      isFile: () => item.type === 'file',
      isDirectory: () => item.type === 'dir'
    };
  },
  readdir: async (p: string) => {
    const target = path.resolve(p).toLowerCase();
    const results: string[] = [];
    for (const key of mockFsMap.keys()) {
      const parent = path.dirname(key).toLowerCase();
      if (parent === target && key !== target) {
        results.push(path.basename(key));
      }
    }
    return results;
  },
  readFile: async (p: string, _encoding?: string) => {
    const item = mockFsMap.get(path.resolve(p).toLowerCase());
    if (item?.type !== 'file') throw new Error(`ENOENT: no such file, open '${p}'`);
    return item.content || '';
  },
  ensureDir: async () => {},
  writeFile: async () => {},
  remove: async () => {}
};

vi.mock('fs-extra', () => ({
  default: mockFsExtra,
  ...mockFsExtra
}));
