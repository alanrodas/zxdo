import { describe, expect, it, describe as when } from 'vitest';
import { parseArgs } from '../src/argParser';

describe('parseArgs', () => {
  const defaultToolArgs = {
    shell: 'auto',
    scriptFolders: ['scripts', '.scripts'],
    extensions: ['', '.mts', '.cts', '.ts', '.mjs', '.cjs', '.js'],
    cwd: undefined,
    help: false,
    version: false,
    zxArgs: []
  };

  it('should parse an empty argument list with default toolArgs', () => {
    const result = parseArgs([]);
    expect(result).toEqual({
      toolArgs: defaultToolArgs,
      command: '',
      commandArgs: []
    });
  });

  when('tool flags are given', () => {
    it('should parse version flags (-v and --version)', () => {
      expect(parseArgs(['-v']).toolArgs.version).toBe(true);
      expect(parseArgs(['--version']).toolArgs.version).toBe(true);
    });

    it('should parse help flags (-h and --help)', () => {
      expect(parseArgs(['-h']).toolArgs.help).toBe(true);
      expect(parseArgs(['--help']).toolArgs.help).toBe(true);
    });

    it('should parse multiple tool flags simultaneously', () => {
      const result = parseArgs(['-v', '-h']);
      expect(result.toolArgs).toEqual({
        ...defaultToolArgs,
        version: true,
        help: true
      });
      expect(result.command).toBe('');
      expect(result.commandArgs).toEqual([]);
    });
  });

  when('tool options with values are given', () => {
    it('should parse --shell option with value', () => {
      expect(parseArgs(['--shell=pwsh']).toolArgs.shell).toBe('pwsh');
      expect(parseArgs(['--shell=bash']).toolArgs.shell).toBe('bash');
    });

    it('should throw an error when --shell option is missing its value', () => {
      expect(() => parseArgs(['--shell'])).toThrow('Missing value for --shell option');
      expect(() => parseArgs(['--shell='])).toThrow('Missing value for --shell option');
    });

    it('should parse script folders option (--folders) separated by colon', () => {
      expect(parseArgs(['--folders=scripts:custom']).toolArgs.scriptFolders).toEqual(['scripts', 'custom']);
      expect(parseArgs(['--folders=tools']).toolArgs.scriptFolders).toEqual(['tools']);
    });

    it('should throw an error when --folders option is missing its value', () => {
      expect(() => parseArgs(['--folders'])).toThrow('Missing value for --folders option');
      expect(() => parseArgs(['--folders='])).toThrow('Missing value for --folders option');
    });

    it('should parse script extensions option (--extensions) separated by colon', () => {
      expect(parseArgs(['--extensions=.ts:.mts']).toolArgs.extensions).toEqual(['.ts', '.mts']);
      expect(parseArgs(['--extensions=.mjs']).toolArgs.extensions).toEqual(['.mjs']);
    });

    it('should throw an error when --extensions option is missing its value', () => {
      expect(() => parseArgs(['--extensions'])).toThrow('Missing value for --extensions option');
      expect(() => parseArgs(['--extensions='])).toThrow('Missing value for --extensions option');
    });

    it('should parse --cwd= option with value', () => {
      expect(parseArgs(['--cwd=./custom/path']).toolArgs.cwd).toBe('./custom/path');
    });

    it('should throw an error when --cwd= option is missing its value', () => {
      expect(() => parseArgs(['--cwd='])).toThrow('Missing value for --cwd option');
    });
  });

  when('zx arguments are given before the command', () => {
    it('should pass single zx flag through to toolArgs.zxArgs', () => {
      expect(parseArgs(['--install']).toolArgs.zxArgs).toEqual(['--install']);
      expect(parseArgs(['-i']).toolArgs.zxArgs).toEqual(['-i']);
      expect(parseArgs(['--quiet']).toolArgs.zxArgs).toEqual(['--quiet']);
      expect(parseArgs(['--verbose']).toolArgs.zxArgs).toEqual(['--verbose']);
    });

    it('should pass options with values through without validation', () => {
      expect(parseArgs(['--prefix=time']).toolArgs.zxArgs).toEqual(['--prefix=time']);
      expect(parseArgs(['--postfix=echo done']).toolArgs.zxArgs).toEqual(['--postfix=echo done']);
      expect(parseArgs(['--registry=https://registry.npmjs.org/']).toolArgs.zxArgs).toEqual([
        '--registry=https://registry.npmjs.org/'
      ]);
      expect(parseArgs(['--env=.env.local']).toolArgs.zxArgs).toEqual(['--env=.env.local']);
      expect(parseArgs(['--ext=.ts']).toolArgs.zxArgs).toEqual(['--ext=.ts']);
    });

    it('should handle --eval option and consume the next token as its argument', () => {
      const result = parseArgs(['--eval', 'console.log("hello")', 'deploy']);
      expect(result.toolArgs.zxArgs).toEqual(['--eval', 'console.log("hello")']);
      expect(result.command).toBe('deploy');
    });

    it('should throw an error when --eval option is missing its value', () => {
      expect(() => parseArgs(['--eval'])).toThrow('Missing value for --eval option');
    });

    it('should conform a list of multiple zx arguments without validation', () => {
      const result = parseArgs(['--quiet', '--verbose', '--unknown-flag']);
      expect(result.toolArgs.zxArgs).toEqual(['--quiet', '--verbose', '--unknown-flag']);
    });
  });

  when('commands and command arguments are given', () => {
    it('should identify the first non-flag argument as the command', () => {
      const result = parseArgs(['build']);
      expect(result.command).toBe('build');
      expect(result.commandArgs).toEqual([]);
      expect(result.toolArgs.zxArgs).toEqual([]);
    });

    it('should collect subsequent arguments as commandArgs', () => {
      const result = parseArgs(['test', 'unit', '--watch', '-v']);
      expect(result.command).toBe('test');
      expect(result.commandArgs).toEqual(['unit', '--watch', '-v']);
      // Flags after the command name are not parsed into toolArgs
      expect(result.toolArgs.version).toBe(false);
      expect(result.toolArgs.zxArgs).toEqual([]);
    });

    it('should handle tool args, zx passthrough args, command, and command args combined', () => {
      const result = parseArgs([
        '--shell=bash',
        '--folders=scripts:custom',
        '--extensions=.ts:.mts',
        '--cwd=./packages/app',
        '--env=.env.production',
        '--install',
        'deploy',
        '--stage',
        'production',
        '--verbose'
      ]);

      expect(result).toEqual({
        toolArgs: {
          shell: 'bash',
          scriptFolders: ['scripts', 'custom'],
          extensions: ['.ts', '.mts'],
          cwd: './packages/app',
          help: false,
          version: false,
          zxArgs: ['--env=.env.production', '--install']
        },
        command: 'deploy',
        commandArgs: ['--stage', 'production', '--verbose']
      });
    });
  });
});
