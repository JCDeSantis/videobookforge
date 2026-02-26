import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import type { ProbeResult } from '../../shared/types'

const execFileAsync = promisify(execFile)

function findBinary(name: string, knownPaths: string[]): string {
  for (const p of knownPaths) {
    if (existsSync(p)) return p
  }
  return name // fall back to PATH
}

export function getFfmpegPath(): string {
  return findBinary('ffmpeg', [
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  ])
}

export function getFfprobePath(): string {
  return findBinary('ffprobe', [
    'C:\\ffmpeg\\bin\\ffprobe.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe',
  ])
}

export async function probeFile(filePath: string): Promise<ProbeResult> {
  const ffprobe = getFfprobePath()
  const { stdout } = await execFileAsync(ffprobe, [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath
  ])

  const data = JSON.parse(stdout)
  const format = data.format ?? {}
  const streams: Array<{ codec_type: string; codec_name: string }> = data.streams ?? []

  const hasCoverArt = streams.some(
    (s) => s.codec_type === 'video' && ['mjpeg', 'png', 'bmp'].includes(s.codec_name)
  )

  return {
    duration: parseFloat(format.duration ?? '0'),
    format: format.format_name ?? 'unknown',
    tags: format.tags ?? {},
    hasCoverArt
  }
}

export async function sumDurations(filePaths: string[]): Promise<number> {
  const results = await Promise.all(filePaths.map(probeFile))
  return results.reduce((sum, r) => sum + r.duration, 0)
}
