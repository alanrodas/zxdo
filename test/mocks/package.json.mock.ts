import { vi } from 'vitest';

vi.mock('../../package.json', () => ({
  default: {
    name: 'zxdo',
    version: '2.5.0'
  }
}));
