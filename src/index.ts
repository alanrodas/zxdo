/**
 * Library entry point for `zxdo`.
 *
 * When imported by scripts or third-party tools, this module:
 * - Automatically configures the host shell (`configureShell`) using detected or environment settings.
 * - Adds local `node_modules/.bin` directories to `PATH` (`configureLocalBin`).
 * - Exports a pre-configured `$` command runner tailored for the project root and current shell.
 * - Re-exports all utilities from `zx` (e.g., `cd`, `echo`, `chalk`, `which`, `nothrow`, `spinner`).
 * - Re-exports `fs-extra` as `fs` for high-level filesystem operations.
 * - Exports the `concurrently` helper for parallel task execution.
 */
import { configureLocalBin } from './binPath';
import { configureShell } from './shellConfig';
import { get$ } from './zx$';

// Automatically configure zx shell on module initialization
configureShell(process.env.ZXDO_SHELL || 'auto');
configureLocalBin();

const $ = get$();

export * as fs from 'fs-extra';
export * from 'zx';
export { type ConcurrentScript, type ConcurrentScriptDefinition, concurrently } from './concurrently';
export { $ };
