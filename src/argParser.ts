/**
 * Options and flags specific to the zxdo tool runner itself.
 */
export interface ToolArgs {
  /**
   * The shell executable to use for executing scripts (e.g., 'bash', 'pwsh', 'sh').
   * Defaults to 'auto'.
   * Provided via `--shell`.
   */
  shell: string;

  /**
   * Custom folder names or paths to search for scripts, parsed from a colon-separated list.
   * Defaults to ['scripts', '.scripts'].
   * Provided via `--folders`.
   */
  scriptFolders: string[];

  /**
   * Custom file extensions to use when searching for scripts, parsed from a colon-separated list.
   * Defaults to ['', '.mts', '.cts', '.ts', '.mjs', '.cjs', '.js'].
   * Provided via `--extensions`.
   */
  extensions: string[];

  /**
   * Whether to display version information.
   * Provided via `-v` or `--version`.
   */
  version: boolean;

  /**
   * Whether to display help information.
   * Provided via `-h` or `--help`.
   */
  help: boolean;

  /**
   * The path to the directory from which the command should be executed.
   * This value is passed to Google zx via the `--cwd` option.
   * If not specified, zxdo uses the current working directory of the process.
   */
  cwd?: string;

  /**
   * Arguments intended to be forwarded directly to Google zx when executing scripts.
   * Conformed by any non-tool arguments passed before the command name with direct passthrough without validation.
   */
  zxArgs: string[];
}

/**
 * Parsed command-line arguments separated into tool configuration (`toolArgs`),
 * target command name (`command`), and arguments to forward to the target command (`commandArgs`).
 */
export interface ArgsDefinition {
  /**
   * Tool-level flags and options specific to zxdo (including forwarded `zxArgs`).
   */
  toolArgs: ToolArgs;

  /**
   * The name of the command/script to execute (the first non-flag argument).
   */
  command: string;

  /**
   * The remaining arguments to pass directly to the target command.
   */
  commandArgs: string[];
}

/**
 * Parses raw command-line arguments into structured tool options (including zx passthrough arguments),
 * a command name, and command arguments.
 *
 * All flags and options before the first non-flag argument are parsed into `toolArgs`:
 * - Tool-specific options: `shell`, `scriptFolders`, `extensions`, `version`, `help`.
 * - Any other argument before the command is treated as a zx argument with direct passthrough
 *   without validation, conforming a full string of arguments saved in `toolArgs.zxArgs`.
 *   Special case: `--eval` consumes the next argument into `toolArgs.zxArgs`.
 *
 * The first non-flag argument encountered is designated as the `command`.
 * Any subsequent arguments after the command are treated as arguments for that command (`commandArgs`).
 *
 * Supported tool options:
 * - `--shell=<shell>`: Sets `toolArgs.shell` to the specified shell name.
 * - `--folders=<folders>`: Sets `toolArgs.scriptFolders` by splitting colon-separated paths.
 * - `--extensions=<exts>`: Sets `toolArgs.extensions` by splitting colon-separated extensions.
 * - `-v`, `--version`: Sets `toolArgs.version` to `true`.
 * - `-h`, `--help`: Sets `toolArgs.help` to `true`.
 *
 * @param args - An array of raw command-line arguments (e.g., `process.argv.slice(2)`).
 * @returns An `ArgsDefinition` containing `toolArgs`, `command`, and `commandArgs`.
 * @throws {Error} If a tool option or `--eval` expecting a value is missing its argument.
 *
 * @example
 * ```ts
 * const result = parseArgs(['--shell=bash', '--cwd=./app', '--quiet', 'build', '--production']);
 * // result:
 * // {
 * //   toolArgs: {
 * //     shell: 'bash',
 * //     scriptFolders: ['scripts', '.scripts'],
 * //     extensions: ['', '.mts', '.cts', '.ts', '.mjs', '.cjs', '.js'],
 * //     cwd: './app',
 * //     help: false,
 * //     version: false,
 * //     zxArgs: ['--quiet']
 * //   },
 * //   command: 'build',
 * //   commandArgs: ['--production']
 * // }
 * ```
 */
export function parseArgs(args: string[]): ArgsDefinition {
  const argsDefinition: ArgsDefinition = {
    toolArgs: {
      shell: 'auto',
      scriptFolders: ['scripts', '.scripts'],
      extensions: ['', '.mts', '.cts', '.ts', '.mjs', '.cjs', '.js'],
      cwd: undefined,
      help: false,
      version: false,
      zxArgs: []
    },
    command: '',
    commandArgs: []
  };

  // State of what is currently being parsed
  let state: 'toolArgs' | 'commandArgs' = 'toolArgs';

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (state === 'toolArgs') {
      if (arg.startsWith('-')) {
        // --- Tool-specific arguments and flags ---
        if (arg === '-v' || arg === '--version') {
          argsDefinition.toolArgs.version = true;
        } else if (arg === '-h' || arg === '--help') {
          argsDefinition.toolArgs.help = true;
        } else if (arg.startsWith('--shell')) {
          argsDefinition.toolArgs.shell = arg.slice('--shell='.length);
          if (!argsDefinition.toolArgs.shell) {
            throw new Error('Missing value for --shell option');
          }
        } else if (arg.startsWith('--folders')) {
          const folders = arg.slice('--folders='.length);
          if (!folders) {
            throw new Error('Missing value for --folders option');
          }
          argsDefinition.toolArgs.scriptFolders = folders.split(':');
        } else if (arg.startsWith('--extensions')) {
          const extensions = arg.slice('--extensions='.length);
          if (!extensions) {
            throw new Error('Missing value for --extensions option');
          }
          argsDefinition.toolArgs.extensions = extensions.split(':');
        } else if (arg.startsWith('--cwd=')) {
          const cwdVal = arg.slice('--cwd='.length);
          if (!cwdVal) {
            throw new Error('Missing value for --cwd option');
          }
          argsDefinition.toolArgs.cwd = cwdVal;
        } else {
          // Here we should consider --eval which is the only zx argument that expects a value
          // after a space and not an = sign. The next argument is therefor, intended as an argument
          // of zx, and not to be threated as a command.
          if (arg === '--eval') {
            const evalArg = args[i + 1];
            if (!evalArg) {
              throw new Error('Missing value for --eval option');
            }
            argsDefinition.toolArgs.zxArgs.push(arg, evalArg);
            i += 2;
            continue;
          }
          // Any other argument before the command is treated as a zx argument with direct passthrough without validation
          argsDefinition.toolArgs.zxArgs.push(arg);
        }
      } else {
        // First non-flag argument is the command
        argsDefinition.command = arg;
        state = 'commandArgs';
      }
    } else if (state === 'commandArgs') {
      // Remaining args are command arguments
      argsDefinition.commandArgs.push(arg);
    }
    i++;
  }

  return argsDefinition;
}
