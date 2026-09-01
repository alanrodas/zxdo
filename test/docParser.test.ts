import './mocks/fs-extra.mock';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { type ParsedDocs, parseDocs } from '../src/docParser';

describe('docParser', () => {
  it('should parse documentation comments correctly', async () => {
    const docPath = path.resolve('/A/B/C/D1/.scripts/first.ts');
    const result = await parseDocs(docPath);
    expect(result).not.toBeUndefined();

    const docs = result as ParsedDocs;
    expect(docs.summary).toBe('First script in D1');
    expect(docs.params).toEqual([{ short: '-f', long: '--force', description: 'Force flag' }]);
  });

  it('should return undefined if no JSDoc containing @summary or @description is found', async () => {
    const p = path.resolve('/A/B/package.json');
    const result = await parseDocs(p);
    expect(result).toBeUndefined();
  });

  it('should parse @description, defaults with and without comma, and short/long only flags', async () => {
    const docPath = path.resolve('/A/B/custom/detailed.ts');
    const result = await parseDocs(docPath);
    expect(result).toBeDefined();

    const docs = result as ParsedDocs;
    expect(docs.summary).toBe('Detailed script');
    expect(docs.body).toBe('Detailed explanation of the script behavior.\n@param -\n@param Not a flag');
    expect(docs.params).toEqual([
      { short: '-p', description: 'Port number', default: '8080' },
      { long: '--host', description: 'Hostname', default: 'localhost' },
      { short: '-v', long: '--verbose', description: 'Verbose output', default: 'false' },
      { short: '-c', description: 'with comma', default: 'true' },
      { long: '--flagOnly' }
    ]);
  });
});
