import { spawn, ChildProcess } from 'child_process'
import { join, dirname } from 'path'
import { mkdirSync, createWriteStream } from 'fs'
import { unlink } from 'fs/promises'
import { cpus } from 'os'
import axios from 'axios'
import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import { getWhisperExe, isBinaryDownloaded, downloadBinary } from './binary'
import { getModelPath, getModelUrl, isModelDownloaded, getModelDir } from './models'
import { getFfmpegPath, sumDurations } from '../ffmpeg/probe'
import { createTempDir, createConcatListFile, cleanupTempDir } from '../ffmpeg/concat'
import type { WhisperModel, WhisperProgress } from '../../shared/types'
import { IPC } from '../../shared/types'

let activeProcess: ChildProcess | null = null
let activeAbortController: AbortController | null = null

function send(win: BrowserWindow, progress: WhisperProgress): void {
  win.webContents.send(IPC.WHISPER_PROGRESS, progress)
}

function hhmmssToSeconds(time: string): number {
  const parts = time.split(':').map(parseFloat)
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

// Use as many threads as logical CPUs, capped at 8 (diminishing returns beyond that)
function getThreadCount(): number {
  return Math.max(1, Math.min(cpus().length, 8))
}

async function downloadModel(
  model: WhisperModel,
  win: BrowserWindow,
  signal?: AbortSignal
): Promise<void> {
  const modelDir = getModelDir()
  mkdirSync(modelDir, { recursive: true })

  const modelPath = getModelPath(model)
  const url = getModelUrl(model)

  const response = await axios.get(url, {
    responseType: 'stream',
    maxRedirects: 10,
    headers: { 'User-Agent': 'VideoBookForge' },
    signal
  })

  const total = parseInt(response.headers['content-length'] || '0', 10)
  let downloaded = 0

  await new Promise<void>((resolve, reject) => {
    const writer = createWriteStream(modelPath)

    const onAbort = (): void => {
      writer.destroy()
      unlink(modelPath).catch(() => {})
      reject(new Error('Cancelled'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length
      if (total > 0) {
        const pct = Math.round((downloaded / total) * 100)
        send(win, {
          phase: 'downloading-model',
          percent: pct,
          message: `Downloading model... ${pct}%`
        })
      }
    })
    response.data.pipe(writer)
    writer.on('finish', () => {
      signal?.removeEventListener('abort', onAbort)
      if (signal?.aborted) {
        unlink(modelPath).catch(() => {})
        reject(new Error('Cancelled'))
      } else {
        resolve()
      }
    })
    writer.on('error', (err) => {
      signal?.removeEventListener('abort', onAbort)
      unlink(modelPath).catch(() => {})
      reject(err)
    })
  })
}

export async function transcribeAudio(
  win: BrowserWindow,
  audioPaths: string[],
  model: WhisperModel
): Promise<string> {
  // Abort any previously running transcription before starting a new one
  activeAbortController?.abort()

  const abortController = new AbortController()
  activeAbortController = abortController
  const { signal } = abortController

  let tempDir: string | null = null

  try {
    // Step 1: Download whisper binary if needed
    if (!isBinaryDownloaded()) {
      send(win, { phase: 'downloading-binary', percent: 0, message: 'Downloading whisper.cpp...' })
      await downloadBinary((percent, message) => {
        if (!signal.aborted) send(win, { phase: 'downloading-binary', percent, message })
      }, signal)
    }

    if (signal.aborted) throw new Error('Cancelled')

    // Step 2: Download model if needed (also re-downloads if the file is incomplete)
    if (!isModelDownloaded(model)) {
      await unlink(getModelPath(model)).catch(() => {})
      send(win, { phase: 'downloading-model', percent: 0, message: 'Downloading model...' })
      await downloadModel(model, win, signal)
    }

    if (signal.aborted) throw new Error('Cancelled')

    // Step 3: Probe input files for total duration (used for preparing-phase progress bar)
    const totalDuration = await sumDurations(audioPaths)

    if (signal.aborted) throw new Error('Cancelled')

    // Step 4: Build concat list and prepare audio.
    // For a single file we still go through ffmpeg to ensure 16kHz mono WAV format.
    // ffmpeg output is piped directly to whisper stdin — no temp WAV written to disk.
    tempDir = await createTempDir()
    const listPath = await createConcatListFile(audioPaths, tempDir)

    const outputDir = join(app.getPath('userData'), 'whisper', 'output')
    mkdirSync(outputDir, { recursive: true })
    const srtBase = join(outputDir, `transcript_${Date.now()}`)
    const srtPath = `${srtBase}.srt`

    send(win, { phase: 'preparing', percent: 0, message: 'Preparing audio...', totalDuration })

    const ffmpeg = getFfmpegPath()
    const whisperExe = getWhisperExe()!
    const modelPath = getModelPath(model)
    const threads = getThreadCount()

    // Spawn ffmpeg writing WAV to stdout (pipe:1), whisper reads from stdin
    const ffmpegProc = spawn(ffmpeg, [
      '-f', 'concat', '-safe', '0', '-i', listPath,
      '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
      '-f', 'wav',
      'pipe:1'                   // write WAV to stdout instead of a file
    ])

    const whisperProc = spawn(whisperExe, [
      '-m', modelPath,
      '-f', '-',                 // read audio from stdin
      '-osrt',
      '-of', srtBase,
      '-l', 'auto',
      '-pp',
      '-t', String(threads)      // use all available cores (capped at 8)
    ], {
      cwd: dirname(whisperExe)
    })

    // Pipe ffmpeg stdout → whisper stdin
    ffmpegProc.stdout.pipe(whisperProc.stdin)

    activeProcess = whisperProc  // track for cancellation

    // Wire up cancellation for both processes
    const onAbort = (): void => {
      ffmpegProc.kill('SIGTERM')
      whisperProc.kill('SIGTERM')
    }
    signal.addEventListener('abort', onAbort, { once: true })

    await new Promise<void>((resolve, reject) => {
      let ffmpegErr = ''
      let whisperOut = ''
      let txPercent = 2

      // ffmpeg writes progress to stderr: parse time= for preparing-phase progress
      ffmpegProc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        ffmpegErr += text
        if (totalDuration > 0) {
          const m = text.match(/time=(\d+):(\d+):(\d+)/)
          if (m) {
            const elapsed = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3])
            const pct = Math.min(Math.round((elapsed / totalDuration) * 100), 99)
            send(win, { phase: 'preparing', percent: pct, message: 'Preparing audio...', elapsed, totalDuration })
          }
        }
      })

      ffmpegProc.on('close', (code) => {
        if (code !== 0 && !signal.aborted) {
          whisperProc.kill()
          reject(new Error(`Audio prep failed (${code})\n${ffmpegErr.slice(-500)}`))
        }
        // ffmpeg done — close whisper's stdin so it knows no more input is coming
        whisperProc.stdin?.end()
      })

      // Transition to transcribing once ffmpeg finishes (whisper starts processing)
      send(win, { phase: 'transcribing', percent: 2, message: 'Transcribing audio...', totalDuration })

      // whisper-cli writes progress to stderr
      whisperProc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        whisperOut += text

        const progMatch = text.match(/progress\s*=\s*(\d+)%/)
        if (progMatch) {
          const pct = parseInt(progMatch[1], 10)
          txPercent = 2 + Math.round(pct * 0.96)
          const elapsed = totalDuration > 0 ? (pct / 100) * totalDuration : undefined
          send(win, {
            phase: 'transcribing',
            percent: txPercent,
            message: `Transcribing... ${pct}%`,
            elapsed,
            totalDuration
          })
        }
      })

      // whisper-cli writes segment text to stdout
      const seenTimestamps = new Set<string>()
      whisperProc.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        whisperOut += text

        for (const line of text.split('\n')) {
          const segMatch = line.match(/\[([\d:.,]+)\s*-->\s*[\d:.,]+\]\s+(.+)/)
          if (segMatch) {
            const startTs = segMatch[1]
            const segText = segMatch[2].trim()
            if (segText && !seenTimestamps.has(startTs)) {
              seenTimestamps.add(startTs)
              const elapsed = hhmmssToSeconds(startTs.replace(',', '.'))
              if (totalDuration > 0) {
                txPercent = 2 + Math.min(Math.round((elapsed / totalDuration) * 96), 96)
              }
              const segmentTimestamp = startTs.replace(/[.,]\d+$/, '')
              send(win, {
                phase: 'transcribing',
                percent: txPercent,
                text: segText,
                segmentTimestamp,
                elapsed,
                totalDuration
              })
            }
          }
        }
      })

      whisperProc.on('close', (code) => {
        signal.removeEventListener('abort', onAbort)
        activeProcess = null
        if (signal.aborted) return
        if (code === 0) resolve()
        else reject(new Error(`Whisper exited with code ${code}\n${whisperOut.slice(-1500)}`))
      })

      whisperProc.on('error', (err) => {
        signal.removeEventListener('abort', onAbort)
        activeProcess = null
        reject(err)
      })
    })

    send(win, { phase: 'done', percent: 100, message: 'Transcription complete!', srtPath })
    return srtPath
  } catch (err) {
    const isCancelled = signal.aborted || (err instanceof Error && err.message === 'Cancelled')
    if (!isCancelled) {
      send(win, {
        phase: 'error',
        percent: 0,
        errorMessage: err instanceof Error ? err.message : String(err)
      })
    }
    throw err
  } finally {
    if (activeAbortController === abortController) {
      activeAbortController = null
    }
    activeProcess = null
    if (tempDir) cleanupTempDir(tempDir)
  }
}

export function cancelTranscription(): void {
  activeAbortController?.abort()
  if (activeProcess) {
    activeProcess.kill('SIGTERM')
    activeProcess = null
  }
}
