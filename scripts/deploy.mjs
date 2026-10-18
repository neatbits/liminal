// Publisering: kjører testene, bygger og laster opp innholdet i dist/ til webhotellet over SFTP.
//
//   npm run deploy                      – bruker .env.deploy
//   npm run deploy -- --env .env.deploy.neatbits
//   npm run deploy -- --dry-run         – viser hva som ville blitt lastet opp
//   npm run deploy -- --clean           – fjerner også gamle filer i assets/ på serveren
//
// Tilkoblingen står i .env.deploy (se deploy.example.env) og havner aldri i git.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, posix } from 'node:path';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import SftpClient from 'ssh2-sftp-client';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

function readEnv(file) {
  if (!existsSync(file)) {
    console.error(`Fant ikke ${file}. Kopier deploy.example.env til ${file} og fyll inn tilkoblingen.`);
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/** Alle filer under dir, som stier relativt til dir med skråstrek. */
function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split('\\').join('/'));
    }
  };
  walk(dir);
  return out;
}

const envFile = option('--env', '.env.deploy');
const env = readEnv(envFile);
const remoteRoot = env.DEPLOY_DIR || '/';
const dry = flag('--dry-run');

if (!flag('--skip-tests')) execSync('npm test', { stdio: 'inherit' });
execSync('npm run build', { stdio: 'inherit' });

// Ressursene (assets/, models osv.) først, sidene til slutt – så ingen side peker på filer
// som ikke er lastet opp ennå.
const files = listFiles('dist').sort((a, b) => Number(a.endsWith('.html')) - Number(b.endsWith('.html')));
console.log(`\n${files.length} filer → ${env.DEPLOY_USER}@${env.DEPLOY_HOST}:${remoteRoot}${dry ? ' (prøvekjøring)' : ''}`);
if (dry) {
  for (const f of files) console.log('  ' + f);
  process.exit(0);
}

let password = env.DEPLOY_PASSWORD;
if (!password && !env.DEPLOY_KEY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question('Passord for SFTP: ');
  rl.close();
}

const sftp = new SftpClient();
try {
  await sftp.connect({
    host: env.DEPLOY_HOST,
    port: Number(env.DEPLOY_PORT || 22),
    username: env.DEPLOY_USER,
    ...(env.DEPLOY_KEY ? { privateKey: readFileSync(env.DEPLOY_KEY) } : { password }),
  });
  const made = new Set();
  for (const f of files) {
    const remote = posix.join(remoteRoot, f);
    const dir = posix.dirname(remote);
    if (!made.has(dir)) {
      await sftp.mkdir(dir, true).catch(() => {}); // finnes den, er det greit
      made.add(dir);
    }
    await sftp.fastPut(join('dist', f), remote);
    console.log('  ↑ ' + f);
  }
  if (flag('--clean')) {
    // Bare i assets/: gamle byggfiler (med annen hash) som ingen side bruker lenger.
    const assets = posix.join(remoteRoot, 'assets');
    const keep = new Set(files.filter((f) => f.startsWith('assets/')).map((f) => f.slice(7)));
    for (const item of await sftp.list(assets)) {
      if (item.type === '-' && !keep.has(item.name)) {
        await sftp.delete(posix.join(assets, item.name));
        console.log('  ✕ assets/' + item.name);
      }
    }
  }
  console.log('\nPublisert.');
} catch (e) {
  console.error(`\nPublisering feilet: ${e.message}`);
  process.exitCode = 1;
} finally {
  await sftp.end().catch(() => {});
}
