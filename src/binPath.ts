import fs from 'fs-extra';
import path from 'path';

/**
 * Returns the PATH environment variable key for the current platform ('Path' or 'PATH').
 *
 * @param env - The environment object to inspect. Defaults to `process.env`.
 * @returns The case-preserved key name of the PATH variable.
 */
export function getPathKey(env: NodeJS.ProcessEnv = process.env): string {
  if (process.platform === 'win32') {
    return (
      Object.keys(env)
        .reverse()
        .find((key) => key.toUpperCase() === 'PATH') || 'Path'
    );
  }
  return 'PATH';
}

/** In-memory cache for resolved local bin paths to avoid redundant filesystem checks. */
const cachedBinPaths = new Map<string, string[]>();

/**
 * Clears the in-memory cache of resolved bin paths.
 */
export function clearBinPathsCache(): void {
  cachedBinPaths.clear();
}

/**
 * Collects all `node_modules/.bin` directory paths from `cwd` up to the filesystem root,
 * as well as from any specified project root directories.
 *
 * @param cwd - The starting directory to search upwards from. Defaults to `process.cwd()`.
 * @param roots - Additional project root directory paths to include. Defaults to `[]`.
 * @returns An array of unique `node_modules/.bin` paths that exist.
 */
export function getLocalBinPaths(cwd: string = process.cwd(), roots: string[] = []): string[] {
  const cacheKey = `${path.resolve(cwd)}::${roots.map((r) => path.resolve(r)).join(';')}`;
  const cached = cachedBinPaths.get(cacheKey);
  if (cached) {
    return cached;
  }

  const binPaths = new Set<string>();
  let currentDir = path.resolve(cwd);

  while (true) {
    const binDir = path.join(currentDir, 'node_modules', '.bin');
    if (fs.existsSync(binDir)) {
      binPaths.add(binDir);
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  for (const root of roots) {
    const binDir = path.join(path.resolve(root), 'node_modules', '.bin');
    if (fs.existsSync(binDir)) {
      binPaths.add(binDir);
    }
  }

  const result = Array.from(binPaths);
  cachedBinPaths.set(cacheKey, result);
  return result;
}

/**
 * Prepends all local and root `node_modules/.bin` directories to the PATH environment variable
 * so that CLI binaries installed in dependencies (e.g. tsc, typedoc, vite, esbuild) are recognized.
 *
 * @param cwd - The starting directory. Defaults to `process.cwd()`.
 * @param roots - Additional project root directory paths. Defaults to `[]`.
 * @returns The updated PATH string.
 */
export function configureLocalBin(cwd: string = process.cwd(), roots: string[] = []): string {
  const binPaths = getLocalBinPaths(cwd, roots);
  if (binPaths.length === 0) {
    return process.env.PATH || '';
  }

  const pathKey = getPathKey(process.env);
  const existingPath = process.env[pathKey] || '';
  const existingSegments = existingPath.split(path.delimiter);

  // Filter out paths that are already in the PATH to prevent duplicates
  const toAdd = binPaths.filter((p) => !existingSegments.includes(p));
  if (toAdd.length === 0) {
    return existingPath;
  }

  const newPath = [...toAdd, existingPath].filter(Boolean).join(path.delimiter);
  process.env[pathKey] = newPath;
  if (process.platform === 'win32') {
    process.env.PATH = newPath;
    process.env.Path = newPath;
  }

  return newPath;
}
