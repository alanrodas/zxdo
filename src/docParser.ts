import fs from 'fs-extra';

/**
 * Represents a parsed command-line argument or flag documented in a script's JSDoc comments.
 */
export interface ParsedArgument {
  /**
   * The short flag form (e.g. `-f`).
   */
  short?: string;

  /**
   * The long flag form (e.g. `--force`).
   */
  long?: string;

  /**
   * The human-readable description of the argument.
   */
  description?: string;

  /**
   * The default value of the argument, if specified.
   */
  default?: string;
}

/**
 * Structured documentation extracted from a script file's JSDoc comments.
 */
export interface ParsedDocs {
  /**
   * High-level summary of the script (extracted from `@summary`).
   */
  summary: string;

  /**
   * List of command-line arguments and options documented via `@param`.
   */
  params: ParsedArgument[];

  /**
   * Full descriptive body text explaining the script (extracted from `@description` or unparsed lines).
   */
  body: string;
}

/**
 * Parses a single line representing a command-line parameter.
 * Detects short form (e.g. `-f`), long form (e.g. `--force`), description, and default value.
 *
 * @param line - The raw or cleaned parameter line to parse.
 * @returns The parsed argument object, or `null` if the line does not represent an argument.
 */
function parseParamLine(line: string): ParsedArgument | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('-')) {
    return null;
  }

  let rest = trimmed;
  let short: string | undefined;
  let long: string | undefined;

  // Extract short form: e.g. -F
  const shortMatch = rest.match(/^(-[a-zA-Z])\b/);
  if (shortMatch) {
    short = shortMatch[1];
    rest = rest.slice(shortMatch[0].length).trim();
    if (rest.startsWith(',')) {
      rest = rest.slice(1).trim();
    }
  }

  // Extract long form: e.g. --force
  const longMatch = rest.match(/^(--[a-zA-Z0-9_-]+)\b/);
  if (longMatch) {
    long = longMatch[1];
    rest = rest.slice(longMatch[0].length).trim();
    if (rest.startsWith(',')) {
      rest = rest.slice(1).trim();
    }
  }

  // If neither form is present, this is not a valid argument line
  if (!short && !long) {
    return null;
  }

  let description = rest;
  let defaultValue: string | undefined;

  // Look for "default: value" pattern
  const defaultMatch = rest.match(/,\s*default\s*:\s*(.*?)$/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1].trim();
    description = rest.slice(0, defaultMatch.index).trim();
  } else {
    const defaultMatchNoComma = rest.match(/\bdefault\s*:\s*(.*?)$/i);
    if (defaultMatchNoComma) {
      defaultValue = defaultMatchNoComma[1].trim();
      description = rest.slice(0, defaultMatchNoComma.index).trim();
      if (description.endsWith(',')) {
        description = description.slice(0, -1).trim();
      }
    }
  }

  return {
    ...(short && { short }),
    ...(long && { long }),
    ...(description && { description }),
    ...(defaultValue && { default: defaultValue })
  };
}

/**
 * Reads a script file and parses its JSDoc comments containing `@summary` or `@description`.
 *
 * Extracts:
 * - Summary: text following `@summary`.
 * - Description / Body: text following `@description` and non-tag documentation lines.
 * - Parameters: lines following `@param` declaring flags (short `-f`, long `--force`), descriptions, and default values.
 *
 * @param scriptPath - Absolute path to the script file.
 * @returns A promise resolving to the parsed `ParsedDocs` object, or `undefined` if no matching JSDoc comment is found.
 *
 * @example
 * ```ts
 * const docs = await parseDocs('/path/to/script.ts');
 * if (docs) {
 *   console.log(docs.summary);
 *   console.log(docs.params);
 * }
 * ```
 */
export async function parseDocs(scriptPath: string): Promise<ParsedDocs | undefined> {
  const fileContent = await fs.readFile(scriptPath, 'utf8');
  const comments: string[] = [];
  const blockCommentRegex = /\/\*([\s\S]*?)\*\//g;
  let match: RegExpExecArray | null;

  match = blockCommentRegex.exec(fileContent);
  while (match !== null) {
    comments.push(match[1]);
    match = blockCommentRegex.exec(fileContent);
  }

  const docsComment = comments.find((comment) => comment.includes('@summary') || comment.includes('@description'));
  if (!docsComment) {
    return undefined;
  }

  // Clean each line by stripping JSDoc comment indicators (*) and trimming whitespace
  const lines = docsComment.split(/\r?\n/).map((line) => {
    return line
      .trim()
      .replace(/^\*+\s*/, '')
      .trim();
  });

  let summary = '';
  const parsedArgs: ParsedArgument[] = [];
  const bodyLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('@summary')) {
      summary = line.replace(/^@summary\s*/, '').trim();
      continue;
    }

    if (line.startsWith('@description')) {
      const descText = line.replace(/^@description\s*/, '').trim();
      if (descText) {
        bodyLines.push(descText);
      }
      continue;
    }

    // Strip common JSDoc parameter tags prior to argument parsing
    const cleanedLineForParam = line.replace(/^@param\s*/i, '').trim();
    const param = parseParamLine(cleanedLineForParam);

    if (param) {
      parsedArgs.push(param);
      continue;
    }

    // Any other non-empty line is part of the body
    if (line !== '') {
      bodyLines.push(line);
    }
  }

  return {
    summary,
    params: parsedArgs,
    body: bodyLines.join('\n').trim()
  };
}
