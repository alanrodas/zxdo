import './mocks/zx.mock';
import { describe, expect, it } from 'vitest';
import { concurrently } from '../src/concurrently';

describe('concurrently', () => {
  it('should execute scripts concurrently with string and object configs', async () => {
    const result = await concurrently({
      lint: { script: 'eslint .', color: 'bgGreen.white.dim' },
      test: 'vitest run'
    });
    expect(result).toBeDefined();
  });

  it('should throw an error if passed invalid script configurations', async () => {
    await expect(concurrently(null as unknown as Record<string, string>)).rejects.toThrow();
    await expect(concurrently('not-an-object' as unknown as Record<string, string>)).rejects.toThrow();
  });

  it('should skip empty or invalid script objects in the definition', async () => {
    const result = await concurrently({
      valid: 'echo valid',
      empty: '',
      invalidObj: {} as unknown as string
    });
    expect(result).toBeDefined();
  });
});
