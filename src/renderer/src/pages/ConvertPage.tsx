import { useEffect, useRef, useState } from 'react'
import { Play, X, CheckCircle2, AlertCircle, ExternalLink, Mic, Film } from 'lucide-react'
import { useProjectStore } from '@renderer/store/useProjectStore'
import { ipc } from '@renderer/lib/ipc'
import { cn, formatDuration, basename } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import type { ConversionProgress, WhisperProgress } from '@shared/types'

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function whisperPhaseLabel(phase: string): string {
  switch (phase) {
    case 'downloading-binary': return 'Downloading Whisper engine...'
    case 'downloading-model': return 'Downloading model...'
    case 'preparing': return 'Preparing audio...'
    case 'transcribing': return 'Generating subtitles...'
    default: return 'Processing...'
  }
}

function conversionPhaseLabel(phase: string): string {
  switch (phase) {
    case 'probing': return 'Analyzing files...'
    case 'concat': return 'Preparing audio...'
    case 'converting': return 'Converting video...'
    default: return 'Processing...'
  }
}

export function ConvertPage() {
  const {
    audioFiles,
    srtPath,
    subtitleSource,
    whisperModel,
    metadata,
    coverArt,
    background,
    outputFormat,
    outputResolution,
    outputPath,
    burnSubtitles,
    whisperProgress,
    conversionProgress,
    setWhisperProgress,
    setConversionProgress,
    setSrtPath,
    resetProject
  } = useProjectStore()

  const [log, setLog] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)
  const [willRunBothPhases, setWillRunBothPhases] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const unsubWhisperRef = useRef<(() => void) | null>(null)
  const unsubConvertRef = useRef<(() => void) | null>(null)

  const isTranscribing =
    whisperProgress !== null &&
    whisperProgress.phase !== 'done' &&
    whisperProgress.phase !== 'error'

  const isConverting =
    conversionProgress !== null &&
    conversionProgress.phase !== 'done' &&
    conversionProgress.phase !== 'error'

  const isRunning = isTranscribing || isConverting
  const isDone = conversionProgress?.phase === 'done'
  const isError =
    conversionProgress?.phase === 'error' || whisperProgress?.phase === 'error'

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  async function handleStart() {
    if (!outputPath) return
    setLog([])

    const needsTranscription = subtitleSource === 'ai'
    setWillRunBothPhases(needsTranscription)

    let resolvedSrtPath = srtPath

    // Phase 1: Transcription — only when AI mode and no SRT yet
    if (needsTranscription) {
      setWhisperProgress({ phase: 'transcribing', percent: 0, message: 'Starting...' })

      const unsub = ipc.whisper.onProgress((data: WhisperProgress) => {
        setWhisperProgress(data)
        if (data.message) setLog((prev) => [...prev, data.message!])
      })
      unsubWhisperRef.current = unsub

      try {
        resolvedSrtPath = await ipc.whisper.transcribe(
          whisperModel,
          audioFiles.map((f) => f.path)
        )
        setSrtPath(resolvedSrtPath)
      } catch (err) {
        setWhisperProgress({
          phase: 'error',
          percent: 0,
          errorMessage: err instanceof Error ? err.message : String(err)
        })
        unsub()
        unsubWhisperRef.current = null
        return // stop — don't start conversion
      }
      unsub()
      unsubWhisperRef.current = null
    }

    // Phase 2: Conversion
    setConversionProgress({ phase: 'probing', percent: 0, message: 'Starting...' })

    const unsub = ipc.convert.onProgress((data: ConversionProgress) => {
      setConversionProgress(data)
      if (data.message) setLog((prev) => [...prev, data.message!])
      if (data.errorMessage) setLog((prev) => [...prev, `ERROR: ${data.errorMessage}`])
    })
    unsubConvertRef.current = unsub

    const bg = { ...background }
    if (bg.type === 'cover' && coverArt) bg.coverBase64 = coverArt.base64

    try {
      await ipc.convert.start({
        audioFiles,
        srtPath: resolvedSrtPath,
        background: bg,
        metadata,
        options: {
          outputPath,
          format: outputFormat,
          resolution: outputResolution,
          burnSubtitles: outputFormat === 'mp4' ? true : burnSubtitles
        }
      })
    } finally {
      unsub()
      unsubConvertRef.current = null
    }
  }

  function handleCancel() {
    ipc.whisper.cancel()
    ipc.convert.cancel()
    unsubWhisperRef.current?.()
    unsubWhisperRef.current = null
    unsubConvertRef.current?.()
    unsubConvertRef.current = null
    setWhisperProgress(null)
    setConversionProgress(null)
  }

  function handleOpenFolder() {
    if (conversionProgress?.outputPath) {
      ipc.files.showItem(conversionProgress.outputPath)
    }
  }

  function handleReset() {
    resetProject()
  }

  const needsTranscription = subtitleSource === 'ai'
  const canStart = audioFiles.length > 0 && outputPath && !isRunning

  // Current active progress for display
  const activePercent = isTranscribing
    ? (whisperProgress?.percent ?? 0)
    : (conversionProgress?.percent ?? 0)

  const activePhaseLabel = isTranscribing
    ? whisperPhaseLabel(whisperProgress?.phase ?? '')
    : isConverting
      ? conversionPhaseLabel(conversionProgress?.phase ?? '')
      : ''

  const activeElapsed = isTranscribing
    ? whisperProgress?.elapsed
    : conversionProgress?.elapsed
  const activeTotalDuration = isTranscribing
    ? whisperProgress?.totalDuration
    : conversionProgress?.totalDuration

  const activeMessage = isTranscribing
    ? whisperProgress?.message
    : conversionProgress?.message

  const errorMessage =
    conversionProgress?.errorMessage ?? whisperProgress?.errorMessage

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto gap-5">

      {/* Idle — show start button */}
      {!whisperProgress && !conversionProgress && (
        <div className="w-full flex flex-col gap-4">
          {/* What will happen summary */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Ready to Convert</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <span className="text-zinc-500">Audio parts</span>
              <span className="text-zinc-300">{audioFiles.length} file{audioFiles.length !== 1 ? 's' : ''}</span>
              <span className="text-zinc-500">Total duration</span>
              <span className="text-zinc-300">{formatDuration(audioFiles.reduce((s, f) => s + f.duration, 0))}</span>
              <span className="text-zinc-500">Subtitles</span>
              <span className="text-zinc-300">
                {srtPath
                  ? basename(srtPath)
                  : needsTranscription
                    ? <span className="text-violet-400">AI will generate first</span>
                    : <span className="text-zinc-600">None</span>
                }
              </span>
              <span className="text-zinc-500">Output</span>
              <span className="text-zinc-300 truncate">{basename(outputPath)}</span>
            </div>
          </div>

          {/* Two-phase indicator */}
          {needsTranscription && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-violet-400">
                <Mic size={14} />
                <span>Generate subtitles</span>
              </div>
              <div className="h-px w-8 bg-zinc-700" />
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Film size={14} />
                <span>Convert video</span>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={handleStart}
            disabled={!canStart}
            className="w-full"
          >
            <Play size={15} />
            {needsTranscription ? 'Generate & Convert' : 'Start Conversion'}
          </Button>
        </div>
      )}

      {/* Running */}
      {isRunning && (
        <div className="w-full flex flex-col gap-4">
          {/* Two-step indicator when both phases are running */}
          {willRunBothPhases && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <div className={cn(
                'flex items-center gap-1.5',
                isTranscribing ? 'text-violet-400' : 'text-zinc-500 line-through'
              )}>
                <Mic size={14} />
                <span>Generate subtitles</span>
              </div>
              <div className="h-px w-8 bg-zinc-700" />
              <div className={cn(
                'flex items-center gap-1.5',
                isConverting ? 'text-violet-400' : 'text-zinc-500'
              )}>
                <Film size={14} />
                <span>Convert video</span>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-300">{activePhaseLabel}</span>
              <span className="text-sm font-bold text-violet-400">{activePercent}%</span>
            </div>
            <ProgressBar percent={activePercent} />
            {activeElapsed !== undefined && activeTotalDuration !== undefined ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-mono">{formatDuration(activeElapsed)}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-500 font-mono">{formatDuration(activeTotalDuration)}</span>
              </div>
            ) : activeMessage ? (
              <p className="text-xs text-zinc-500">{activeMessage}</p>
            ) : null}
          </div>

          <Button variant="danger" onClick={handleCancel} className="w-full">
            <X size={13} />
            Cancel
          </Button>
        </div>
      )}

      {/* Done */}
      {isDone && (
        <div className="w-full flex flex-col gap-3">
          <div className="rounded-xl border border-green-900/50 bg-green-950/30 p-4 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 size={28} className="text-green-400" />
            <p className="text-sm font-semibold text-green-300">Conversion Complete</p>
            <p className="text-xs text-zinc-500">
              {conversionProgress?.outputPath ? basename(conversionProgress.outputPath) : ''}
            </p>
          </div>
          <Button variant="secondary" onClick={handleOpenFolder} className="w-full">
            <ExternalLink size={13} />
            Open Folder
          </Button>
          <Button variant="ghost" onClick={handleReset} className="w-full">
            Create Another
          </Button>
        </div>
      )}

      {/* Error */}
      {isError && !isRunning && (
        <div className="w-full flex flex-col gap-3">
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 flex flex-col items-center gap-2 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-semibold text-red-300">
              {whisperProgress?.phase === 'error' ? 'Transcription Failed' : 'Conversion Failed'}
            </p>
            <p className="text-xs text-zinc-500 line-clamp-4">{errorMessage}</p>
          </div>
          <Button variant="secondary" onClick={() => setShowLog(true)} className="w-full">
            View Log
          </Button>
          <Button variant="ghost" onClick={handleReset} className="w-full">
            Try Again
          </Button>
        </div>
      )}

      {/* Log toggle */}
      {log.length > 0 && (
        <button
          onClick={() => setShowLog((v) => !v)}
          className="text-xs text-zinc-600 hover:text-zinc-400 text-left transition-colors"
        >
          {showLog ? 'Hide' : 'Show'} log ({log.length} lines)
        </button>
      )}

      {showLog && log.length > 0 && (
        <div
          ref={logRef}
          className="w-full overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[10px] text-zinc-500 leading-relaxed max-h-48"
        >
          {log.map((line, i) => (
            <div key={i} className={cn(line.startsWith('ERROR') && 'text-red-400')}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
