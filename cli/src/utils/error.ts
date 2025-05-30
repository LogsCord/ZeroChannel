import chalk from 'chalk';
import { handleAxiosError } from './validation.js';

export function displayError(error: unknown): void {
    console.error(chalk.red(`❌ ${handleAxiosError(error)}`));
}
