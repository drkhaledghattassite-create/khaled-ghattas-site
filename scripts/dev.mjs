import { spawn } from 'node:child_process'
import path from 'node:path'

const env = { ...process.env }
delete env.__NEXT_PRIVATE_STANDALONE_CONFIG
env.NODE_ENV = 'development'

const nextBin = path.join('node_modules', '.bin',
  process.platform === 'win32' ? 'next.cmd' : 'next')

const child = spawn(nextBin, ['dev'], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('exit', (code) => process.exit(code ?? 0))
