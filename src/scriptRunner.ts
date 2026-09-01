import type { ProcessOutput } from 'zx';
import { get$, getZxCliPath } from './zx$';

/**
 * Executes Google zx with the provided zx options, target script, and script arguments.
 *
 * @param zxArgs - Array of arguments forwarded directly to Google zx. Defaults to `[]`.
 * @param script - Path to the script file to execute (optional).
 * @param args - Array of arguments forwarded directly to the target script. Defaults to `[]`.
 * @returns A promise resolving to the ProcessOutput from zx execution.
 */
export const runScript = async (
  zxArgs: string[] = [],
  script?: string,
  args: string[] = []
): Promise<ProcessOutput> => {
  const cli = getZxCliPath();
  const $ = get$();
  if (script) {
    return $`${cli} ${zxArgs} ${script} ${args}`;
  }
  return $`${cli} ${zxArgs}`;
};
