import path from 'path';
import { parseArgs } from './argParser';
import { configureLocalBin } from './binPath';
import { errorAndExit, help, helpCommand, version } from './helpRunner';
import { findRoots } from './rootsFinder';
import { findScript } from './scriptFinder';
import { runScript } from './scriptRunner';
import { configureShell } from './shellConfig';

/**
 * Main entry point for the zxdo CLI runner.
 * Parses command-line arguments, routes help and version queries, configures the shell environment,
 * resolves script locations across roots, and invokes scripts via Google zx.
 *
 * @param args - The command-line arguments array. Defaults to `process.argv.slice(2)`.
 * @returns A promise resolving when the execution completes.
 */
export async function runner(args: string[] = process.argv.slice(2)): Promise<void> {
  const { toolArgs, command, commandArgs } = parseArgs(args);

  // If version was requested
  if (toolArgs.version) {
    await version();
    return;
  }

  // If help was requested
  if (toolArgs.help) {
    if (!command) {
      await help(toolArgs.scriptFolders, toolArgs.extensions);
    } else {
      await helpCommand(command, toolArgs.scriptFolders, toolArgs.extensions);
    }
    return;
  }

  // Check if zx was called using the --eval or --repl options
  const isEvalOrRepl = toolArgs.zxArgs?.includes('--eval') || toolArgs.zxArgs?.includes('--repl');

  // If no command was provided and this is not an --eval or --repl, then print the help
  if (!command && !isEvalOrRepl) {
    await help(toolArgs.scriptFolders, toolArgs.extensions);
    return;
  }

  // Set the environment variable with the detected shell to be used, so it can be retrieved
  // when using the tool as a library
  toolArgs.shell = configureShell(toolArgs.shell);
  process.env.ZXDO_SHELL = toolArgs.shell;

  // Get all project roots
  const roots = await findRoots();

  // Set the cwd to the closest root if the user didn't specify one, if no root, use process.cwd
  toolArgs.cwd = path.resolve(toolArgs.cwd ?? roots?.[0] ?? process.cwd());
  try {
    process.chdir(toolArgs.cwd);
  } catch (err) {
    if (process.env.VITEST !== 'true') {
      errorAndExit(err);
    }
  }
  process.env.ZXDO_CWD = toolArgs.cwd;

  // Add all binaries in node_modules at every root folder to the path
  configureLocalBin(toolArgs.cwd, roots);

  // If its an eval or repl, just run zx with the given args, and no script
  if (isEvalOrRepl) {
    await runScript(toolArgs.zxArgs);
    return;
  }

  // Get the full script to be executed
  try {
    const script = await findScript(roots, toolArgs.scriptFolders, toolArgs.extensions, command);

    // Call the script with zxArgs, script path, and command arguments
    await runScript(toolArgs.zxArgs, script, commandArgs);
  } catch (err) {
    errorAndExit(err);
  }
}
