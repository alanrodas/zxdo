import fs from 'fs-extra';
import path from 'path';

/** In-memory cache for discovered roots by working directory. */
let cachedRoots: { cwd: string; roots: string[] } | undefined;

/**
 * Clears the in-memory cache of discovered project roots.
 */
export function clearRootsCache(): void {
  cachedRoots = undefined;
}

/**
 * Discovers all project root directories by ascending the filesystem hierarchy from `process.cwd()`.
 *
 * Traversal behavior:
 * 1. Starts at the current working directory (`process.cwd()`).
 * 2. Checks each directory level for the presence of a `package.json` file.
 * 3. Adds any directory containing a `package.json` to the returned list of roots.
 * 4. Ascends to the parent directory until reaching the filesystem root.
 *
 * The resulting array is ordered from the closest directory (nearest to `cwd`)
 * to the outermost directory (e.g., package root followed by monorepo/workspace root).
 * This ordering enables hierarchical script discovery where nested scripts take precedence
 * over root-level scripts.
 *
 * @returns A promise resolving to an array of absolute directory paths that contain a `package.json`.
 *
 * @example
 * ```ts
 * // If current working directory is /repo/packages/app:
 * const roots = await findRoots();
 * // roots: ['/repo/packages/app', '/repo']
 * ```
 */
export async function findRoots(): Promise<string[]> {
  const currentCwd = process.cwd();

  if (cachedRoots && cachedRoots.cwd === currentCwd) {
    return cachedRoots.roots;
  }

  if (process.env.ZXDO_ROOTS && process.env.ZXDO_ROOTS_CWD === currentCwd) {
    const roots = process.env.ZXDO_ROOTS.split(path.delimiter).filter(Boolean);
    cachedRoots = { cwd: currentCwd, roots };
    return roots;
  }

  const roots: string[] = [];
  let currentDir = currentCwd;

  while (true) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      roots.push(currentDir);
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  cachedRoots = { cwd: currentCwd, roots };
  process.env.ZXDO_ROOTS = roots.join(path.delimiter);
  process.env.ZXDO_ROOTS_CWD = currentCwd;

  return roots;
}
