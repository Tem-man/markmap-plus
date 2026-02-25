import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';
// On Windows, `.cmd` files (like pnpm.cmd) cannot be spawned directly without a shell.
// Use `cmd.exe /c` to run pnpm reliably.
const command = isWin ? 'cmd.exe' : 'pnpm';

function run(label, args) {
  const fullArgs = isWin ? ['/d', '/s', '/c', 'pnpm', ...args] : args;
  const child = spawn(command, fullArgs, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    // If one watcher exits, bring down the whole dev session.
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
  child.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error(`[${label}] failed to start`, err);
    process.exit(1);
  });
  return child;
}

const children = [
  run('types', ['run', 'dev:types']),
  run('js', ['run', 'dev:js']),
];

function shutdown(signal) {
  for (const child of children) {
    try {
      child.kill(signal);
    } catch {
      // ignore
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

