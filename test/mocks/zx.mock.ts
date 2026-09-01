import { vi } from 'vitest';

export const mockTag = vi
  .fn()
  .mockImplementation((..._args: unknown[]) => Promise.resolve({ exitCode: 0, stdout: 'ok', stderr: '' }));

export const mockDollar = vi.fn().mockImplementation((...args: unknown[]) => {
  if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return mockTag;
  }
  return mockTag(...args);
});

Object.assign(mockDollar, {
  shell: 'cmd',
  cwd: process.cwd(),
  stdio: 'inherit',
  preferLocal: true,
  spawn: vi.fn()
});

Object.assign(mockTag, {
  shell: 'cmd',
  cwd: process.cwd(),
  stdio: 'inherit',
  preferLocal: true,
  spawn: vi.fn()
});

vi.mock('zx', () => {
  return {
    $: mockDollar,
    echo: vi.fn(),
    usePwsh: vi.fn(),
    usePowerShell: vi.fn(),
    useBash: vi.fn()
  };
});
