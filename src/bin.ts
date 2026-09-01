#!/usr/bin/env node
/**
 * Main CLI executable entry point for the `zxdo` command.
 *
 * Catches any unhandled errors from the CLI runner and exits with code 1.
 */
import { logger } from './logger';
import { runner } from './runner';

runner().catch((err) => {
  logger.error('zxdo CLI Execution Error:', err);
  process.exit(1);
});
