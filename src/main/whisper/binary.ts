import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream } from 'fs'
import { unlink } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import axios from 'axios'

const execAsync = promisify(exec)

const WHISPER_VERSION = 'v1.8.3'
const BINARY_URL = `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_VERSION}/whisper-bin-x64.zip`

// Binary may be named differently across versions
const BINARY_NAMES = ['whisper-cli.exe', 'whisper-main.exe', 'main.exe']

export function getBinDir(): string {
  return join(app.getPath('userData'), 'whisper', 'bin')
}

export function getWhisperExe(): string | null {
  const binDir = getBinDir()
  // The zip may extract flat or into a subdirectory depending on the release
  const searchDirs = [
    binDir,
    join(binDir, 'Release'),
    join(binDir, 'whisper-bin-x64'),
    join(binDir, 'whisper-bin-x64', 'Release'),
  ]
  for (const dir of searchDirs) {
    for (const name of BINARY_NAMES) {
      const p = join(dir, name)
      if (existsSync(p)) return p
    }
  }
  return null
}

export function isBinaryDownloaded(): boolean {
  return getWhisperExe() !== null
}

export async function downloadBinary(
  onProgress: (percent: number, message: string) => void
): Promise<void> {
  const binDir = getBinDir()
  mkdirSync(binDir, { recursive: true })

  const zipPath = join(binDir, 'whisper-bin.zip')

  onProgress(0, 'Downloading whisper.cpp...')

  const response = await axios.get(BINARY_URL, {
    responseType: 'stream',
    maxRedirects: 5,
    headers: { 'User-Agent': 'VideoBookForge' }
  })

  const total = parseInt(response.headers['content-length'] || '0', 10)
  let downloaded = 0

  await new Promise<void>((resolve, reject) => {
    const writer = createWriteStream(zipPath)
    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length
      if (total > 0) {
        onProgress(Math.round((downloaded / total) * 70), 'Downloading whisper.cpp...')
      }
    })
    response.data.pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
  })

  onProgress(72, 'Extracting binary...')

  // Windows 10+ tar.exe supports zip extraction natively
  await execAsync(`tar -xf "${zipPath}" -C "${binDir}"`)

  await unlink(zipPath).catch(() => {})

  onProgress(100, 'Binary ready')
}
