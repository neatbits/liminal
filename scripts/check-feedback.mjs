// PHP-testene bruker en falsk transport og sender aldri e-post.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const cachedPHP = resolve('node_modules/.cache/php/php.exe');
const php = process.env.PHP_PATH || (existsSync(cachedPHP) ? cachedPHP : 'php');
const cache = resolve('node_modules/.cache');
mkdirSync(cache, { recursive: true });
const state = mkdtempSync(join(cache, 'liminal-feedback-test-'));
try {
  for (const file of ['public/api/feedback.php', 'public/api/feedback-lib.php', 'test/feedback.test.php']) execFileSync(php, ['-l', file], { stdio: 'inherit' });
  execFileSync(php, ['test/feedback.test.php', state], { stdio: 'inherit' });
} catch (e) {
  if (e.code === 'ENOENT') console.error('PHP CLI is required. Install PHP 8+ or set PHP_PATH to its executable.');
  process.exitCode = 1;
} finally {
  if (!resolve(state).startsWith(cache + sep)) throw new Error('Unexpected feedback test path.');
  rmSync(state, { recursive: true, force: true });
}
