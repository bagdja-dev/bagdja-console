/* eslint-disable no-console */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function parseDotenv(contents) {
  /** @type {Record<string, string>} */
  const result = {};

  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      } else {
        value = value.replace(/\\\\/g, '\\');
      }
    }

    result[key] = value;
  }

  return result;
}

function loadDotenvFiles(dotenvFiles) {
  /** @type {Record<string, string>} */
  const env = {};

  for (const filePath of dotenvFiles) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const contents = fs.readFileSync(filePath, 'utf8');
      Object.assign(env, parseDotenv(contents));
    } catch (err) {
      console.warn(`[next-with-port] Failed to read ${filePath}:`, err);
    }
  }

  return env;
}

function getNextBin(cwd) {
  const binName = process.platform === 'win32' ? 'next.cmd' : 'next';
  return path.join(cwd, 'node_modules', '.bin', binName);
}

function resolvePort({ cwd, mode }) {
  if (process.env.PORT) return process.env.PORT;

  const effectiveEnv =
    mode === 'dev'
      ? 'development'
      : process.env.NODE_ENV
        ? String(process.env.NODE_ENV)
        : 'production';

  const dotenvFiles = [
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local'),
    path.join(cwd, `.env.${effectiveEnv}`),
    path.join(cwd, `.env.${effectiveEnv}.local`),
  ];

  const parsed = loadDotenvFiles(dotenvFiles);
  if (parsed.PORT) return parsed.PORT;

  return '3000';
}

function normalizePort(port) {
  const num = Number.parseInt(String(port), 10);
  if (!Number.isFinite(num) || num < 1 || num > 65535) return null;
  return String(num);
}

function main() {
  const mode = process.argv[2];
  if (mode !== 'dev' && mode !== 'start') {
    console.error(
      '[next-with-port] Usage: node scripts/next-with-port.js <dev|start> [...nextArgs]',
    );
    process.exit(2);
  }

  const cwd = process.cwd();
  const portRaw = resolvePort({ cwd, mode });
  const port = normalizePort(portRaw);
  if (!port) {
    console.warn(
      `[next-with-port] Invalid PORT "${portRaw}", falling back to 3000`,
    );
  }
  const effectivePort = port || '3000';

  const nextBin = getNextBin(cwd);
  const extraArgs = process.argv.slice(3);
  if (extraArgs[0] === '--') extraArgs.shift();

  const nextArgs =
    mode === 'dev'
      ? ['dev', '-p', effectivePort, ...extraArgs]
      : ['start', '-p', effectivePort, ...extraArgs];

  console.log(`[next-with-port] next ${mode} on port ${effectivePort}`);

  const child = spawn(nextBin, nextArgs, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, PORT: effectivePort },
  });

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

main();
