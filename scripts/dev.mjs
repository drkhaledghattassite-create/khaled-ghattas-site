import { spawn } from 'node:child_process'
import path from 'node:path'

const env = { ...process.env }
delete env.__NEXT_PRIVATE_STANDALONE_CONFIG
env.NODE_ENV = 'development'

const nextBin = path.join('node_modules', '.bin',
  process.platform === 'win32' ? 'next.cmd' : 'next')

// Turbopack by default — dramatically faster route compile + HMR on Windows
// vs Webpack. Pass `--webpack` (or set NEXT_DEV_USE_WEBPACK=1) to fall back
// to the legacy Webpack pipeline, e.g. when debugging a bundler-specific
// issue or when a webpack-only loader is in play.
const useWebpack =
  process.argv.includes('--webpack') ||
  process.env.NEXT_DEV_USE_WEBPACK === '1' ||
  process.env.NEXT_DEV_USE_WEBPACK === 'true'

const args = ['dev', ...(useWebpack ? [] : ['--turbopack'])]

const child = spawn(nextBin, args, {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('exit', (code) => process.exit(code ?? 0))
