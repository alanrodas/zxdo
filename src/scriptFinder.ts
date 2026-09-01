import fs from 'fs-extra';
import path from 'path';
import { type ParsedDocs, parseDocs } from './docParser';

/**
 * Metadata and documentation for a discovered script.
 */
export interface ScriptData {
  /**
   * The canonical name of the script (filename without extension).
   */
  name: string;

  /**
   * The absolute path to the script file on disk.
   */
  path: string;

  /**
   * Parsed JSDoc documentation, if available in the script.
   */
  documentation?: ParsedDocs;
}

/**
 * Custom error thrown when a script cannot be found in any of the search roots and folders.
 */
export class InvalidScript extends Error {
  /** The name of the script that was searched for. */
  public scriptName: string;

  /** The list of root paths searched. */
  public roots: string[];

  /**
   * Creates a new `InvalidScript` error instance.
   *
   * @param scriptName - The name of the script that could not be found.
   * @param roots - The root directories that were searched.
   */
  constructor(scriptName: string, roots: string[]) {
    super(
      `There is no script with the name "${scriptName}" in the project's scope. Searched roots: ${roots.join(', ')}`
    );
    this.name = 'InvalidScript';
    this.scriptName = scriptName;
    this.roots = roots;

    Object.setPrototypeOf(this, InvalidScript.prototype);
  }
}

/**
 * Searches for a script matching the given name within the specified folders across project roots.
 *
 * Checks exact matches (scripts without extensions, like in `zx`) as well as multiple script extensions
 * (`.mts`, `.cts`, `.ts`, `.mjs`, `.cjs`, `.js`) in the specified search folders in order.
 * Returns the absolute path of the first matching file found.
 *
 * @param roots - Project root paths to search.
 * @param folders - Relative folder names/paths within each root to check (e.g. `['.scripts', 'scripts']`).
 * @param scriptName - The name of the script to find (with or without extension).
 * @returns A promise resolving to the absolute path of the found script.
 * @throws {InvalidScript} If the script is not found in any of the candidate paths.
 */
export async function findScript(
  roots: string[],
  folders: string[],
  extensions: string[],
  scriptName: string
): Promise<string> {
  const scriptPaths = await getScriptPaths(roots, folders);
  const candidates = await getCandidates(scriptPaths, extensions, scriptName);

  if (candidates.length === 0) {
    throw new InvalidScript(scriptName, roots);
  }

  return candidates[0];
}

/**
 * Finds a specific script by name and returns its metadata along with parsed documentation.
 *
 * @param roots - Project root paths to search.
 * @param folders - Relative folder names/paths within each root to check (e.g. `['.scripts', 'scripts']`).
 * @param scriptName - The name of the script to find (with or without extension).
 * @returns A promise resolving to the `ScriptData` of the found script.
 * @throws {InvalidScript} If the script cannot be found.
 */
export async function findScriptWithData(
  roots: string[],
  folders: string[],
  extensions: string[],
  scriptName: string
): Promise<ScriptData> {
  const filePath = await findScript(roots, folders, extensions, scriptName);
  const documentation = await parseDocs(filePath);

  return {
    name: scriptName,
    path: filePath,
    documentation
  };
}

/**
 * Discovers and lists all unique scripts found in the specified folders across the provided roots.
 *
 * Collects scripts with and without extensions (ignoring hidden dotfiles), parses their JSDoc
 * documentation, and returns them sorted alphabetically by script name.
 *
 * @param roots - Project root paths to search.
 * @param folders - Relative folder names/paths within each root to check (e.g. `['.scripts', 'scripts']`).
 * @returns A promise resolving to a sorted array of unique `ScriptData` objects.
 */
export async function findAllScriptsWithData(
  roots: string[],
  folders: string[],
  extensions: string[]
): Promise<ScriptData[]> {
  const scriptPaths = await getScriptPaths(roots, folders);
  const candidateMap = await getCandidateMap(scriptPaths, extensions);
  const candidateNames = Array.from(candidateMap.keys()).sort((a, b) => a.localeCompare(b));

  const scriptData: ScriptData[] = [];

  for (const name of candidateNames) {
    // biome-ignore lint/style/noNonNullAssertion: This is safe at this point as names are keys from the map
    const candidatePath = candidateMap.get(name)!;
    const documentation = await parseDocs(candidatePath);
    scriptData.push({
      name,
      path: candidatePath,
      documentation
    });
  }

  return scriptData;
}

/**
 * Resolves existing folder paths from project root paths and relative folder names.
 *
 * @param roots - Project root paths.
 * @param folders - Relative folder names/paths to search within each root.
 * @returns A promise resolving to the list of absolute folder paths that exist on disk.
 */
async function getScriptPaths(roots: string[], folders: string[]): Promise<string[]> {
  const scriptPaths: string[] = [];

  for (const root of roots) {
    for (const folder of folders) {
      const folderPath = path.resolve(root, folder);

      if (await fs.pathExists(folderPath)) {
        scriptPaths.push(folderPath);
      }
    }
  }

  return scriptPaths;
}

/**
 * Scans directories and builds a map of unique script names to their absolute file paths.
 * Ignores hidden dotfiles and files with unsupported extensions.
 *
 * @param folders - Absolute folder paths to scan.
 * @param extensions - Supported file extensions (including empty string for extensionless scripts).
 * @returns A promise resolving to a Map of script names to their absolute file paths.
 */
async function getCandidateMap(folders: string[], extensions: string[]): Promise<Map<string, string>> {
  const candidateList: Map<string, string> = new Map();

  for (const folder of folders) {
    const files = await fs.readdir(folder);
    for (const file of files) {
      if (file.startsWith('.')) continue;

      const filePath = path.join(folder, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          const scriptName = path.basename(file, ext);
          if (!candidateList.has(scriptName)) {
            candidateList.set(scriptName, filePath);
          }
        }
      }
    }
  }
  return candidateList;
}

/**
 * Searches folder paths for existing files matching the script name with any supported extension.
 *
 * @param folders - Absolute folder paths to search.
 * @param extensions - Supported file extensions (including empty string for extensionless scripts).
 * @param scriptName - The script name to look for.
 * @returns A promise resolving to an array of existing candidate file paths.
 */
async function getCandidates(folders: string[], extensions: string[], scriptName: string): Promise<string[]> {
  const candidates: string[] = [];

  for (const folder of folders) {
    for (const extension of extensions) {
      const candidate = path.resolve(folder, `${scriptName}${extension}`);

      if (await fs.pathExists(candidate)) {
        const stat = await fs.stat(candidate);
        if (stat.isFile()) {
          candidates.push(candidate);
        }
      }
    }
  }

  return candidates;
}
