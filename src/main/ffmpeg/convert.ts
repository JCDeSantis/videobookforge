import { spawn, ChildProcess } from 'child_process'
import { copyFile } from 'fs/promises'
import { dirname, basename, extname, join } from 'path'
import type { BrowserWindow } from 'electron'
import { getFfmpegPath, sumDurations, detectNvenc } from './probe'
import { createTempDir, createConcatListFile, cleanupTempDir } from './concat'
import { prepareBackground } from './background'
import type {
  AudioFile,
  BackgroundConfig,
  BookMetadata,
  ConversionOptions,
  ConversionProgress
} from '../../shared/types'
import { IPC } from '../../shared/types'

let activeProcess: ChildProcess | null = null

function send(win: BrowserWindow, progress: ConversionProgress): void {
  win.webContents.send(IPC.CONVERT_PROGRESS, progress)
}

function hhmmssToSeconds(time: string): number {
  const [h, m, s] = time.split(':').map(parseFloat)
  return h * 3600 + m * 60 + s
}

export async function startConversion(
  win: BrowserWindow,
  audioFiles: AudioFile[],
  srtPath: string | null,
  background: BackgroundConfig,
  metadata: BookMetadata,
  options: ConversionOptions
): Promise<void> {
  const { outputPath, format, resolution, burnSubtitles } = options
  let tempDir: string | null = null

  try {
    send(win, { phase: 'probing', percent: 2, message: 'Analyzing audio files...' })

    const totalDuration = await sumDurations(audioFiles.map((f) => f.path))

    send(win, { phase: 'concat', percent: 5, message: 'Preparing files...' })

    tempDir = await createTempDir()
    const listPath = await createConcatListFile(
      audioFiles.map((f) => f.path),
      tempDir
    )
    const bgResult = await prepareBackground(background, resolution, tempDir)

    const useNvenc = await detectNvenc()

    send(win, {
      phase: 'converting',
      percent: 10,
      message: `Building ${format.toUpperCase()}${useNvenc ? ' (GPU)' : ''}...`
    })

    const [width, height] = resolution.split('x')
    const ffmpeg = getFfmpegPath()
    const args: string[] = []

    // Input 0: audio concat
    args.push('-f', 'concat', '-safe', '0', '-i', listPath)

    // Input 1: background
    args.push(...bgResult.args)

    // Input 2 (optional): subtitles
    let srtIdx = -1
    if (srtPath) {
      srtIdx = 2
      args.push('-i', srtPath)
    }

    const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`

    const shouldBurnSubs = srtPath && srtIdx >= 0 && (burnSubtitles || format === 'mp4')

    if (shouldBurnSubs) {
      const escapedSrt = srtPath!.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
      args.push('-filter_complex', `[1:v]${scaleFilter},subtitles='${escapedSrt}'[vout]`)
    } else {
      args.push('-filter_complex', `[1:v]${scaleFilter}[vout]`)
    }

    args.push('-map', '[vout]', '-map', '0:a')

    // Static image background: encode at the minimum fps needed.
    // Without subtitle burn-in: 1fps — the image never changes, so 1 frame/sec is identical
    //   to 25fps visually but requires 25x less encoding work and produces a ~25x smaller video stream.
    // With subtitle burn-in: 5fps — enough for smooth subtitle transitions at sentence-level timing.
    const outputFps = shouldBurnSubs ? 5 : 1
    args.push('-r', String(outputFps))

    // h264_nvenc: VBR constant-quality mode (closest equivalent to libx264 CRF).
    // Subtitle burn-in and scaling stay on CPU; only the encode step moves to GPU.
    const videoEncArgs = useNvenc
      ? ['-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', '28', '-b:v', '0']
      : ['-c:v', 'libx264', '-tune', 'stillimage', '-crf', '28', '-preset', 'fast']

    if (format === 'mkv') {
      // Soft subtitle track when not burning in
      if (srtIdx >= 0 && !burnSubtitles) {
        args.push('-map', `${srtIdx}:s`, '-c:s', 'srt')
      }
      args.push(...videoEncArgs)
      args.push('-c:a', 'copy')
    } else {
      // MP4
      args.push(...videoEncArgs)
      args.push('-c:a', 'aac', '-b:a', '192k')
      args.push('-movflags', '+faststart')
    }

    // Metadata tags
    const metaMap: [string, string | undefined][] = [
      ['title', metadata.title],
      ['artist', metadata.author],
      ['album_artist', metadata.author],
      ['composer', metadata.narrator],
      ['date', metadata.year],
      ['genre', metadata.genre],
      ['publisher', metadata.publisher],
      ['comment', metadata.description],
    ]
    for (const [key, val] of metaMap) {
      if (val) args.push('-metadata', `${key}=${val}`)
    }

    args.push('-t', String(totalDuration))
    args.push('-y', outputPath)

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpeg, args)
      activeProcess = proc

      let stderrBuf = ''
      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stderrBuf += text
        const match = text.match(/time=(\d{2}:\d{2}:\d{2}[.,]\d+)/)
        if (match) {
          const elapsed = hhmmssToSeconds(match[1].replace(',', '.'))
          const pct = Math.min(10 + (elapsed / totalDuration) * 88, 98)
          send(win, {
            phase: 'converting',
            percent: Math.round(pct),
            message: `Converting...`,
            elapsed,
            totalDuration
          })
        }
      })

      proc.on('close', (code) => {
        activeProcess = null
        if (code === 0) resolve()
        else reject(new Error(`ffmpeg exited with code ${code}\n${stderrBuf.slice(-1500)}`))
      })

      proc.on('error', (err) => {
        activeProcess = null
        reject(err)
      })
    })

    send(win, { phase: 'done', percent: 100, message: 'Conversion complete!', outputPath })

    // Copy SRT alongside the output file when subtitles are not burned in
    if (srtPath && !shouldBurnSubs) {
      const srtOutputPath = join(dirname(outputPath), `${basename(outputPath, extname(outputPath))}.srt`)
      try { await copyFile(srtPath, srtOutputPath) } catch { /* non-fatal */ }
    }
  } catch (err) {
    send(win, {
      phase: 'error',
      percent: 0,
      errorMessage: err instanceof Error ? err.message : String(err)
    })
  } finally {
    if (tempDir) cleanupTempDir(tempDir)
  }
}

export function cancelConversion(): void {
  if (activeProcess) {
    activeProcess.kill('SIGTERM')
    activeProcess = null
  }
}
