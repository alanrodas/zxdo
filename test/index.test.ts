import './mocks/fs-extra.mock';
import './mocks/zx.mock';
import { describe, expect, it } from 'vitest';
import { $, concurrently, fs } from '../src/index';

describe('index library exports', () => {
  it('should export configured $ runner instance', () => {
    expect($).toBeDefined();
    expect(typeof $).toBe('function');
    const custom$ = $ as unknown as Record<string, unknown>;
    expect(custom$.stdio).toBe('inherit');
    expect(custom$.preferLocal).toBe(true);
  });

  it('should export fs from fs-extra', () => {
    expect(fs).toBeDefined();
    expect(typeof fs.pathExists).toBe('function');
  });

  it('should export concurrently helper', () => {
    expect(concurrently).toBeDefined();
    expect(typeof concurrently).toBe('function');
  });
});
