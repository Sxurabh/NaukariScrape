// src/logger.js
import chalk from 'chalk';

/**
 * A logger utility with color-coded output for better visualization.
 */
export const logger = {
  // General informational messages
  info: (...args) => {
    console.log(chalk.blue('ℹ'), chalk.blueBright(...args));
  },
  // Success messages
  success: (...args) => {
    console.log(chalk.green('✔'), chalk.green(...args));
  },
  // Warning messages
  warn: (...args) => {
    console.warn(chalk.yellow('⚠'), chalk.yellow(...args));
  },
  // Error messages
  error: (...args) => {
    console.error(chalk.red('✖'), chalk.red.bold(...args));
  },
  // For highlighting steps in the process
  step: (...args) => {
    console.log(chalk.cyan.bold(`\n--- ${args.join(' ')} ---`));
  },
};