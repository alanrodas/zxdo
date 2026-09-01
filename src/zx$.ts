/**
 * Shared instance configuration and CLI execution helpers for Google zx.
 *
 * Provides factory functions for generating configured `$` runner instances
 * and resolving the `zx` CLI entry point with appropriate arguments.
 */
import { createRequire } from 'module';
import { $ as $$ } from 'zx';
import { detectShell, spawnNoProfile } from './shellConfig';

/**
 * Returns a configured instance of Google zx's `$` command runner.
 *
 * Configures:
 * - `shell`: The active or detected shell (`pwsh`, `powershell`, `bash`, `cmd`, etc.).
 * - `cwd`: The active project root or user-specified working directory.
 * - `stdio`: Set to `'inherit'` to stream output in real-time.
 * - `preferLocal`: Set to `true` so local binaries in `node_modules/.bin` are discovered.
 * - `spawn`: Configured with `spawnNoProfile` to skip PowerShell profile loading on Windows.
 * - Inspectable properties: Assigns configuration options onto the returned function object.
 *
 * @returns A fully configured zx `$` instance with inspectable properties.
 */
export function get$(): typeof $$ {
  const shell = process.env.ZXDO_SHELL ?? detectShell();
  const cwd = process.env.ZXDO_CWD ?? process.cwd();
  const isPowerShell = shell === 'pwsh' || shell === 'powershell';
  const prefix = process.env.ZXDO_PREFIX ?? (isPowerShell ? '' : 'set -euo pipefail;');
  const postfix = process.env.ZXDO_POSTFIX ?? (isPowerShell ? '; exit $LastExitCode' : '');

  const custom$ = $$({
    shell,
    cwd,
    prefix,
    postfix,
    stdio: 'inherit',
    preferLocal: true,
    spawn: spawnNoProfile
  });

  Object.assign(custom$, {
    shell,
    cwd,
    prefix,
    postfix,
    stdio: 'inherit',
    preferLocal: true,
    spawn: spawnNoProfile
  });

  return custom$ as unknown as typeof $$;
}

/** In-memory cache for the resolved zx CLI entry point path. */
let cachedZxCli: string | undefined;

/**
 * Clears the in-memory cache of the resolved zx CLI entry point.
 */
export function clearZxCliCache(): void {
  cachedZxCli = undefined;
}

/**
 * Resolves and caches the zx CLI entry point file or binary.
 *
 * @returns The resolved absolute path to the zx CLI entry point, or `'zx'` if resolution fails.
 */
export function resolveZxCli(): string {
  if (cachedZxCli) {
    return cachedZxCli;
  }
  try {
    const req = createRequire(import.meta.url);
    cachedZxCli = req.resolve(process.env.ZXDO_ZX_PKG || 'zx/cli');
  } catch {
    cachedZxCli = 'zx';
  }
  return cachedZxCli;
}

/**
 * Resolves the command arguments array to execute the zx CLI entry point.
 *
 * Inspects whether the CLI target is a JavaScript file and pairs it with the current
 * runtime (`node`, `bun`, or `deno`), along with flags for `--cwd`, `--shell`, and prefixes.
 *
 * @returns An array of string arguments representing the full invocation command tokens.
 */
export function getZxCliPath(): string[] {
  const zxCli = resolveZxCli();
  const isScriptFile = zxCli.endsWith('.js') || zxCli.endsWith('.cjs') || zxCli.endsWith('.mjs');
  const runtime = process.versions.bun ? 'bun' : process.versions.deno ? 'deno' : 'node';

  const shell = process.env.ZXDO_SHELL ?? detectShell();
  const cwd = process.env.ZXDO_CWD ?? process.cwd();
  const isPowerShell = shell === 'pwsh' || shell === 'powershell';

  const args: string[] = [`--cwd=${cwd}`, `--shell=${shell}`];
  if (isPowerShell) {
    args.push('--prefix=""', '--postfix="; exit $LastExitCode"');
  }

  if (isScriptFile) {
    return [runtime, zxCli, ...args];
  }
  return [zxCli, ...args];
}

/**
 * Pre-resolved CLI arguments array for invoking Google zx in the current environment.
 */
export const zxCliPath = getZxCliPath();
