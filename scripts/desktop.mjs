// Starter programmet (Electron, desktop/main.mjs) på bygget i dist/. Fjerner ELECTRON_RUN_AS_NODE,
// som VS Code og andre Electron-programmer kan arve videre – da kjører Electron som vanlig Node.
// Argumenter sendes videre (f.eks. --check, se npm run desktop:check).
import { spawn } from 'node:child_process';
import electron from 'electron';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ['.', ...process.argv.slice(2)], { stdio: 'inherit', env });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
