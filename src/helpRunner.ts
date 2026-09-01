import pkg from '../package.json';
import { logger } from './logger';
import { findRoots } from './rootsFinder';
import { findAllScriptsWithData, findScriptWithData } from './scriptFinder';

/**
 * Returns and prints the current version of the tool from package.json.
 *
 * @returns A promise resolving to the version string of the tool.
 */
export async function version(): Promise<string> {
  const ver = pkg.version;
  logger.log(ver);
  return ver;
}

/**
 * Logs an error message and exits the process with code 1.
 *
 * @param err - The error object or message to log.
 */
export function errorAndExit(err: unknown): void {
  if (err instanceof Error) {
    logger.error(err.message);
  } else {
    logger.error(err);
  }
  process.exit(1);
}

/**
 * Prints the general help message for the tool itself, listing all available commands and their summaries.
 *
 * @param folders - List of script folder names to scan within each root.
 * @param extensions - List of allowed script file extensions to search for.
 * @returns A promise resolving when help is printed.
 */
export async function help(folders: string[], extensions: string[]): Promise<void> {
  const roots = await findRoots();

  logger.log('Usage:\n  zxdo [options] <command> [command-options]\n');
  logger.log('Available commands:');

  const scripts = await findAllScriptsWithData(roots, folders, extensions);
  if (scripts.length === 0) {
    logger.log("  (No scripts found in the project's scope)");
    return;
  }

  // Find longest script name for aligned padding
  const maxLength = Math.max(...scripts.map((s) => s.name.length));

  for (const script of scripts) {
    const summary = script.documentation?.summary || '';
    const paddedName = script.name.padEnd(maxLength + 2, ' ');
    logger.log(`  ${paddedName}${summary}`);
  }
}

/**
 * Prints the help documentation for a specific command, including usage, general docs body, and options.
 *
 * @param commandName - The name of the script to describe.
 * @param folders - List of script folder names to search within each root.
 * @param extensions - List of allowed script file extensions to search for.
 * @returns A promise resolving when command help is printed.
 */
export async function helpCommand(commandName: string, folders: string[], extensions: string[]): Promise<void> {
  const roots = await findRoots();
  const scriptData = await findScriptWithData(roots, folders, extensions, commandName);

  logger.log(`Usage:\n  zxdo ${commandName} [options]\n`);

  if (!scriptData.documentation) {
    logger.log('No documentation available for this command.');
    return;
  }

  if (scriptData.documentation.body) {
    logger.log(scriptData.documentation.body);
    logger.log('');
  }

  if (scriptData.documentation.params && scriptData.documentation.params.length > 0) {
    logger.log('Options:');
    for (const param of scriptData.documentation.params) {
      let optStr = '  ';
      if (param.short && param.long) {
        optStr += `${param.short}, ${param.long}`;
      } else if (param.short) {
        optStr += `${param.short}`;
      } else if (param.long) {
        optStr += `    ${param.long}`;
      }

      let descStr = param.description || '';
      if (param.default !== undefined) {
        descStr += ` (default: ${param.default})`;
      }

      logger.log(`${optStr.padEnd(20, ' ')}${descStr}`);
    }
  }
}
