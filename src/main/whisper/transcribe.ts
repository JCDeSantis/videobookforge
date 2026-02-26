import { spawn, ChildProcess } from 'child_process'
import { join, dirname } from 'path'
import { mkdirSync, createWriteStream } from 'fs'
import { unlink } from 'fs/promises'
import axios from 'axios'
import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import { getWhisperExe, isBinaryDownloaded, downloadBinary } from './binary'
import { getModelPath, getModelUrl, isModelDownloaded, getModelDir } from './models'
import { getFfmpegPath } from '../ffmpeg/probe'
import { createTempDir, createConcatListFile, cleanupTempDir } from '../ffmpeg/concat'
import { probeFile } from '../ffmpeg/probe'
import type { WhisperModel, WhisperProgress } from '../../shared/types'
import { IPC } from '../../shared/types'

let activeProcess: ChildProcess | null = null

function send(win: BrowserWindow, progress: WhisperProgress): void {
  win.webContents.send(IPC.WHISPER_PROGRESS, progress)
}

function hhmmssToSeconds(time: string): number {
  const parts = time.split(':').map(parseFloat)
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

async function downloadModel(model: WhisperModel, win: BrowserWindow): Promise<void> {
  const modelDir = getModelDir()
  mkdirSync(modelDir, { recursive: true })

  const modelPath = getModelPath(model)
  const url = getModelUrl(model)

  const response = await axios.get(url, {
    responseType: 'stream',
    maxRedirects: 10,
    headers: { 'User-Agent': 'VideoBookForge' }
  })

  const total = parseInt(response.headers['content-length'] || '0', 10)
  let downloaded = 0

  await new Promise<void>((resolve, reject) => {
    const writer = createWriteStream(modelPath)
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
    writer.on('finish', resolve)
    writer.on('error', (err) => {
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
  let tempDir: string | null = null

  try {
    // Step 1: Download whisper binary if needed
    if (!isBinaryDownloaded()) {
      send(win, { phase: 'downloading-binary', percent: 0, message: 'Downloading whisper.cpp...' })
      await downloadBinary((percent, message) => {
        send(win, { phase: 'downloading-binary', percent, message })
      })
    }

    // Step 2: Download model if needed (also re-downloads if the file is incomplete)
    if (!isModelDownloaded(model)) {
      // Remove any partial file from a previous interrupted download before starting fresh
      await unlink(getModelPath(model)).catch(() => {})
      send(win, { phase: 'downloading-model', percent: 0, message: 'Downloading model...' })
      await downloadModel(model, win)
    }

    // Step 3: Concat audio + convert to 16kHz mono WAV (required by whisper.cpp)
    send(win, { phase: 'transcribing', percent: 0, message: 'Preparing audio...' })

    tempDir = await createTempDir()
    const listPath = await createConcatListFile(audioPaths, tempDir)
    const wavPath = join(tempDir, 'audio.wav')

    const ffmpeg = getFfmpegPath()
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpeg, [
        '-f', 'concat', '-safe', '0', '-i', listPath,
        '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
        '-y', wavPath
      ])
      let errBuf = ''
      proc.stderr?.on('data', (c: Buffer) => { errBuf += c.toString() })
      proc.on('close', (code) =>
        code === 0 ? resolve() : reject(new Error(`Audio prep failed (${code})\n${errBuf.slice(-500)}`))
      )
      proc.on('error', reject)
    })

    // Step 4: Run whisper
    const probe = await probeFile(wavPath)
    const totalDuration = probe.duration

    const outputDir = join(app.getPath('userData'), 'whisper', 'output')
    mkdirSync(outputDir, { recursive: true })
    const srtBase = join(outputDir, `transcript_${Date.now()}`)
    const srtPath = `${srtBase}.srt`

    send(win, { phase: 'transcribing', percent: 2, message: 'Transcribing audio...', totalDuration })

    const whisperExe = getWhisperExe()!
    const modelPath = getModelPath(model)

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(whisperExe, [
        '-m', modelPath,
        '-f', wavPath,
        '-osrt',               // output SRT format
        '-of', srtBase,        // output file prefix
        '-l', 'auto',
        '-pp'                  // print progress to stderr
      ], {
        // Run from the binary's own directory so its DLLs are found
        cwd: dirname(whisperExe)
      })
      activeProcess = proc

      let outputBuf = ''
      let txPercent = 2

      // whisper-cli writes progress to stderr
      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        outputBuf += text

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

      // whisper-cli writes segment text to stdout: [HH:MM:SS.fff --> HH:MM:SS.fff]   text
      // It re-prints all prior segments with each new one (rolling context), so deduplicate by start timestamp.
      const seenTimestamps = new Set<string>()

      proc.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        outputBuf += text

        for (const line of text.split('\n')) {
          // Capture start timestamp + text: group 1 = start ts, group 2 = segment text
          const segMatch = line.match(/\[([\d:.,]+)\s*-->\s*[\d:.,]+\]\s+(.+)/)
          if (segMatch) {
            const startTs = segMatch[1]  // e.g. "00:02:34.560"
            const segText = segMatch[2].trim()
            if (segText && !seenTimestamps.has(startTs)) {
              seenTimestamps.add(startTs)
              const elapsed = hhmmssToSeconds(startTs.replace(',', '.'))
              if (totalDuration > 0) {
                txPercent = 2 + Math.min(Math.round((elapsed / totalDuration) * 96), 96)
              }
              // Display timestamp: strip milliseconds → "HH:MM:SS"
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

      proc.on('close', (code) => {
        activeProcess = null
        if (code === 0) resolve()
        else reject(new Error(`Whisper exited with code ${code}\n${outputBuf.slice(-1500)}`))
      })

      proc.on('error', (err) => {
        activeProcess = null
        reject(err)
      })
    })

    send(win, { phase: 'done', percent: 100, message: 'Transcription complete!', srtPath })
    return srtPath
  } catch (err) {
    send(win, {
      phase: 'error',
      percent: 0,
      errorMessage: err instanceof Error ? err.message : String(err)
    })
    throw err
  } finally {
    if (tempDir) cleanupTempDir(tempDir)
  }
}

export function cancelTranscription(): void {
  if (activeProcess) {
    activeProcess.kill('SIGTERM')
    activeProcess = null
  }
}
