import { execSync, spawn as nodeSpawn } from 'child_process';
import os from 'os';
import path from 'path';
import { $, useBash, usePowerShell, usePwsh } from 'zx';

/** In-memory cache for the detected shell identifier. */
let cachedShell: string | undefined;

/**
 * Clears the in-memory detected shell cache.
 */
export function clearShellCache(): void {
  cachedShell = undefined;
}

/**
 * Detects the shell that launched the current process.
 *
 * Employs a multi-step detection strategy across operating systems:
 * 1. Checks `process.env.ZXDO_SHELL` for pre-configured or previously detected shell (0ms fast path).
 * 2. Checks in-memory cache (`cachedShell`) for subsequent calls in the same process.
 * 3. Checks `process.env.SHELL` for known POSIX shells (`bash`, `zsh`, `sh`, `fish`, `ksh`).
 * 4. Attempts to query the parent process (`process.ppid`):
 *    - On Windows (`win32`): runs a lightweight PowerShell query to inspect the parent process name
 *      and matches against `pwsh`, `powershell`, `cmd`, or `bash`.
 *    - On POSIX systems: invokes `ps -p <ppid> -o comm=` to identify the parent command name.
 * 5. Falls back to platform defaults if detection fails or throws:
 *    - Windows: defaults to `'pwsh'` if `process.env.PSModulePath` is set, otherwise `'cmd'`.
 *    - POSIX: defaults to `'bash'`.
 *
 * Once detected, the value is cached in memory and saved to `process.env.ZXDO_SHELL` so that
 * child processes and nested script invocations skip detection entirely.
 *
 * @returns The identified shell identifier (e.g., `'bash'`, `'zsh'`, `'pwsh'`, `'powershell'`, `'cmd'`).
 */
export function detectShell(): string {
  if (process.env.ZXDO_SHELL && process.env.ZXDO_SHELL !== 'auto') {
    return process.env.ZXDO_SHELL;
  }

  if (cachedShell && !process.env.VITEST) {
    return cachedShell;
  }

  let detected: string | undefined;

  if (process.env.SHELL) {
    const name = path.basename(process.env.SHELL).toLowerCase();
    if (['bash', 'zsh', 'sh', 'fish', 'ksh'].includes(name)) {
      detected = name;
    }
  }

  if (!detected) {
    try {
      if (os.platform() === 'win32') {
        const parentId = process.ppid;
        const out = execSync(`powershell -NoProfile -Command "(Get-Process -Id ${parentId}).Name"`, {
          stdio: ['ignore', 'pipe', 'ignore']
        })
          .toString()
          .trim()
          .toLowerCase();
        if (out.includes('pwsh')) detected = 'pwsh';
        else if (out.includes('powershell')) detected = 'powershell';
        else if (out.includes('cmd')) detected = 'cmd';
        else if (out.includes('bash')) detected = 'bash';
      } else {
        const out = execSync(`ps -p ${process.ppid} -o comm=`, {
          stdio: ['ignore', 'pipe', 'ignore']
        })
          .toString()
          .trim()
          .toLowerCase();
        const name = out.replace(/^-/, '');
        if (name) detected = name;
      }
    } catch {
      // Ignore errors and fall through
    }
  }

  if (!detected) {
    // Fallbacks
    if (os.platform() === 'win32') {
      if (process.env.PSModulePath) {
        const paths = process.env.PSModulePath.split(';').map((p) => p.trim().toLowerCase());
        // PowerShell Core (pwsh) paths contain "powershell" without "windows"
        // (e.g. "PowerShell\7\Modules" or "PowerShell\Modules")
        const hasPwsh = paths.some((p) => p.includes('powershell') && !p.includes('windowspowershell'));
        if (hasPwsh) {
          detected = 'pwsh';
        } else {
          detected = 'powershell';
        }
      } else {
        detected = 'cmd';
      }
    } else {
      detected = 'bash';
    }
  }

  if (!process.env.VITEST) {
    cachedShell = detected;
    process.env.ZXDO_SHELL = detected;
  }

  return detected;
}

/**
 * Configures the zx `$` command runner instance to execute commands using the specified shell.
 *
 * If `'auto'` is provided, the shell is automatically detected via {@link detectShell}.
 *
 * Built-in shell handling:
 * - `'pwsh'`: Uses `usePwsh()` from zx to configure PowerShell Core.
 * - `'powershell'`: Uses `usePowerShell()` from zx to configure Windows PowerShell.
 * - `'bash'`: Uses `useBash()` from zx to configure Bash.
 * - Any other string: Assigns the value directly to `$.shell` (e.g. `'zsh'`, `'sh'`, or a custom executable path).
 *
 * @param shell - The desired shell name (`'auto'`, `'pwsh'`, `'powershell'`, `'bash'`, or a custom shell executable/path).
 *
 * @example
 * ```ts
 * // Auto-detect and configure the invoking shell:
 * configureShell('auto');
 *
 * // Explicitly configure PowerShell Core:
 * configureShell('pwsh');
 *
 * // Explicitly configure a custom shell path:
 * configureShell('/bin/zsh');
 * ```
 */
/**
 * Custom spawn implementation that adds `-NoProfile` when executing through PowerShell
 * to prevent slow startup caused by loading interactive user profiles and themes.
 */
export const spawnNoProfile: typeof nodeSpawn = ((cmd: string, argsOrOpts?: unknown, maybeOpts?: unknown) => {
  const isArgs = Array.isArray(argsOrOpts);
  const args = isArgs ? (argsOrOpts as readonly string[]) : [];
  const opts = (isArgs ? maybeOpts : argsOrOpts) as Parameters<typeof nodeSpawn>[2];

  if (
    opts?.shell &&
    typeof opts.shell === 'string' &&
    (opts.shell.includes('pwsh') || opts.shell.includes('powershell'))
  ) {
    return nodeSpawn(opts.shell, ['-NoProfile', '-c', cmd], {
      ...opts,
      shell: false
    });
  }
  return nodeSpawn(cmd, args, opts ?? {});
}) as typeof nodeSpawn;

export function configureShell(shell: string): string {
  let resolvedShell = shell;
  if (shell === 'auto') {
    resolvedShell = detectShell();
  }

  if (resolvedShell === 'pwsh') {
    usePwsh();
    $.spawn = spawnNoProfile;
  } else if (resolvedShell === 'powershell') {
    usePowerShell();
    $.spawn = spawnNoProfile;
  } else if (resolvedShell === 'bash') {
    useBash();
  } else if (resolvedShell === 'zsh') {
    $.shell = '/bin/zsh';
  } else {
    $.shell = resolvedShell;
  }
  return resolvedShell;
}
