import { $, type ProcessOutput } from 'zx';

/**
 * The definition for a concurrently run script.
 */
export interface ConcurrentScriptDefinition {
  /**
   * The actual bash script command to run.
   */
  script: string;
  /**
   * The color to use when prefixing this script.
   */
  color?: string;
}

/**
 * Represent a concurrent script to run.
 */
export type ConcurrentScript = ConcurrentScriptDefinition | string;

/**
 * Generates a bash command that uses `concurrently` to run
 * scripts concurrently. Adds a few flags to make it
 * behave as you probably want (like --kill-others-on-fail).
 * In addition, it adds color and labels where the color
 * can be specified or is defaulted and the label is based
 * on the key for the script.
 *
 * @param scripts - The scripts to run.
 *
 * @example
 * // returns a bit of a long script that can vary slightly
 * // based on your environment...
 * concurrent({
 *   lint: {
 *     script: 'eslint .',
 *     color: 'bgGreen.white.dim',
 *   },
 *   test: 'jest',
 *   build: {
 *     script: 'webpack'
 *   }
 * })
 *
 * @return The bash command string.
 */
export const concurrently = async (scripts: Record<string, ConcurrentScript>): Promise<ProcessOutput> => {
  if (typeof scripts !== 'object') {
    throw new Error(`concurrently expects an object with names as keys, and commands as values.`);
  }

  interface ReducedScriptDefinition {
    colors: string[];
    scripts: string[];
    names: string[];
  }

  const reduceScripts = (
    accumulator: ReducedScriptDefinition,
    scriptName: string,
    index: number
  ): ReducedScriptDefinition => {
    if (!scripts[scriptName] || (typeof scripts[scriptName] === 'object' && !scripts[scriptName].script)) {
      return accumulator;
    }

    const defaultColors = [
      'bgBlue.bold',
      'bgMagenta.bold',
      'bgGreen.bold',
      'bgBlack.bold',
      'bgCyan.bold',
      'bgRed.bold',
      'bgWhite.bold',
      'bgYellow.bold'
    ];

    const scriptObj: ConcurrentScriptDefinition =
      typeof scripts[scriptName] === 'object' ? scripts[scriptName] : { script: scripts[scriptName] };

    scriptObj.color = scriptObj.color ?? defaultColors[index % defaultColors.length];

    accumulator.names.push(scriptName);
    accumulator.colors.push(scriptObj.color);
    accumulator.scripts.push(scriptObj.script);
    return accumulator;
  };

  const Object$keys$reduce = Object.keys(scripts).reduce(reduceScripts, {
    colors: [],
    scripts: [],
    names: []
  });
  const colors = Object$keys$reduce.colors;
  const quotedScripts = Object$keys$reduce.scripts;
  const names = Object$keys$reduce.names;

  const flags = [
    '--kill-others-on-fail',
    `--prefix-colors`,
    colors.join(','),
    `--names`,
    names.join(','),
    ...quotedScripts
  ];
  return $({ stdio: 'inherit' })`concurrently ${flags}`;
};
