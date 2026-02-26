import { useEffect, useRef, useState } from 'react'
import { FolderOpen, Film, Tv, Play, X, CheckCircle2, AlertCircle, ExternalLink, Flame } from 'lucide-react'
import { useProjectStore } from '@renderer/store/useProjectStore'
import { ipc } from '@renderer/lib/ipc'
import { cn, formatDuration, basename } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import { Badge } from '@renderer/components/ui/badge'
import type { ConversionProgress } from '@shared/types'

const FORMAT_OPTIONS = [
  {
    value: 'mkv' as const,
    label: 'MKV',
    desc: 'Best quality — selectable subtitle track, full chapter support, no re-encoding'
  },
  {
    value: 'mp4' as const,
    label: 'MP4',
    desc: 'Max compatibility — works on phones, smart TVs, Plex. Subtitles burned in.'
  }
]

const RESOLUTION_OPTIONS = [
  { value: '1280x720' as const, label: '720p', sub: '1280 × 720' },
  { value: '1920x1080' as const, label: '1080p', sub: '1920 × 1080' }
]

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

export function ConvertPage() {
  const {
    audioFiles,
    srtPath,
    metadata,
    coverArt,
    background,
    outputFormat,
    outputResolution,
    outputPath,
    burnSubtitles,
    conversionProgress,
    setOutputFormat,
    setOutputResolution,
    setOutputPath,
    setBurnSubtitles,
    setConversionProgress
  } = useProjectStore()

  const [log, setLog] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const isRunning =
    conversionProgress !== null &&
    conversionProgress.phase !== 'done' &&
    conversionProgress.phase !== 'error'

  const isDone = conversionProgress?.phase === 'done'
  const isError = conversionProgress?.phase === 'error'

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  async function handlePickOutputDir() {
    const paths = await ipc.files.openDialog({ title: 'Select Output Folder', directory: true })
    if (!paths[0]) return
    const ext = outputFormat
    const title = metadata.title || 'audiobook'
    const safe = title.replace(/[<>:"/\\|?*]/g, '_')
    setOutputPath(`${paths[0]}\\${safe}.${ext}`)
  }

  // Update filename extension when format changes
  function handleFormatChange(fmt: 'mkv' | 'mp4') {
    setOutputFormat(fmt)
    if (outputPath) {
      setOutputPath(outputPath.replace(/\.(mkv|mp4)$/, `.${fmt}`))
    }
  }

  async function handleStart() {
    if (!outputPath) return
    setLog([])
    setConversionProgress({ phase: 'probing', percent: 0, message: 'Starting...' })

    // Wire up progress listener
    const unsub = ipc.convert.onProgress((data: ConversionProgress) => {
      setConversionProgress(data)
      if (data.message) setLog((prev) => [...prev, data.message!])
      if (data.errorMessage) setLog((prev) => [...prev, `ERROR: ${data.errorMessage}`])
    })
    unsubRef.current = unsub

    // Build background config — attach coverBase64 if cover type
    const bg = { ...background }
    if (bg.type === 'cover' && coverArt) {
      bg.coverBase64 = coverArt.base64
    }

    try {
      await ipc.convert.start({
        audioFiles,
        srtPath,
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
      unsubRef.current = null
    }
  }

  function handleCancel() {
    ipc.convert.cancel()
    unsubRef.current?.()
    unsubRef.current = null
    setConversionProgress(null)
  }

  function handleOpenFolder() {
    if (conversionProgress?.outputPath) {
      const dir = conversionProgress.outputPath.replace(/[/\\][^/\\]+$/, '')
      ipc.files.showItem(dir)
    }
  }

  function handleReset() {
    setConversionProgress(null)
    setLog([])
  }

  const totalDuration = audioFiles.reduce((s, f) => s + f.duration, 0)
  const canStart = audioFiles.length > 0 && outputPath && !isRunning

  return (
    <div className="flex gap-5 h-full overflow-hidden">
      {/* Left: settings */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto">

        {/* Output format */}
        <div>
          <Label className="text-zinc-300 text-sm mb-2">Output Format</Label>
          <div className="grid grid-cols-2 gap-2">
            {FORMAT_OPTIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => handleFormatChange(value)}
                disabled={isRunning}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all',
                  outputFormat === value
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                )}
              >
                <div className="flex items-center gap-2">
                  <Film size={15} className={outputFormat === value ? 'text-violet-400' : 'text-zinc-500'} />
                  <span className={cn('text-sm font-bold', outputFormat === value ? 'text-violet-400' : 'text-zinc-300')}>
                    {label}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div>
          <Label className="text-zinc-300 text-sm mb-2">Resolution</Label>
          <div className="flex gap-2">
            {RESOLUTION_OPTIONS.map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setOutputResolution(value)}
                disabled={isRunning}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 transition-all',
                  outputResolution === value
                    ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                )}
              >
                <Tv size={14} />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-zinc-500">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle burn-in (only shown when SRT is loaded) */}
        {srtPath && (
          <div>
            <Label className="text-zinc-300 text-sm mb-2">Subtitles</Label>
            <button
              onClick={() => setBurnSubtitles(!burnSubtitles)}
              disabled={isRunning || outputFormat === 'mp4'}
              className={cn(
                'w-full flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all',
                (burnSubtitles || outputFormat === 'mp4')
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
              )}
            >
              <div className={cn(
                'mt-0.5 rounded p-1 shrink-0',
                (burnSubtitles || outputFormat === 'mp4') ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-500'
              )}>
                <Flame size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  (burnSubtitles || outputFormat === 'mp4') ? 'text-violet-300' : 'text-zinc-400'
                )}>
                  Burn subtitles into video
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {outputFormat === 'mp4'
                    ? 'MP4 always burns subtitles in'
                    : burnSubtitles
                      ? 'Subtitles will be permanently visible in the video'
                      : 'MKV default: soft track — viewers can toggle on/off'}
                </p>
              </div>
              <div className={cn(
                'w-4 h-4 rounded border shrink-0 mt-0.5 flex items-center justify-center',
                (burnSubtitles || outputFormat === 'mp4')
                  ? 'border-violet-500 bg-violet-500'
                  : 'border-zinc-600'
              )}>
                {(burnSubtitles || outputFormat === 'mp4') && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Output path */}
        <div>
          <Label className="text-zinc-300 text-sm mb-2">Output File</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm truncate">
              {outputPath ? (
                <span className="text-zinc-200">{outputPath}</span>
              ) : (
                <span className="text-zinc-600">No output path selected</span>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={handlePickOutputDir} disabled={isRunning}>
              <FolderOpen size={13} />
              Browse
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Summary</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-zinc-500">Audio parts</span>
            <span className="text-zinc-300">{audioFiles.length} file{audioFiles.length !== 1 ? 's' : ''}</span>
            <span className="text-zinc-500">Total duration</span>
            <span className="text-zinc-300">{formatDuration(totalDuration)}</span>
            <span className="text-zinc-500">Subtitles</span>
            <span className="text-zinc-300">{srtPath ? basename(srtPath) : <span className="text-zinc-600">None</span>}</span>
            <span className="text-zinc-500">Background</span>
            <span className="text-zinc-300 capitalize">{background.type}</span>
            <span className="text-zinc-500">Format</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="violet">{outputFormat.toUpperCase()}</Badge>
              <span className="text-zinc-400">{outputResolution}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: progress + controls */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        {!conversionProgress && (
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={handleStart}
              disabled={!canStart}
              className="w-full"
            >
              <Play size={15} />
              Start Conversion
            </Button>
            {!outputPath && (
              <p className="text-xs text-zinc-600 text-center">Select an output file to continue</p>
            )}
          </div>
        )}

        {conversionProgress && !isDone && !isError && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300 capitalize">
                  {conversionProgress.phase}
                </span>
                <span className="text-sm font-bold text-violet-400">
                  {conversionProgress.percent}%
                </span>
              </div>
              <ProgressBar percent={conversionProgress.percent} />
              {conversionProgress.elapsed !== undefined && conversionProgress.totalDuration !== undefined ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-mono">
                    {formatDuration(conversionProgress.elapsed)}
                  </span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-500 font-mono">
                    {formatDuration(conversionProgress.totalDuration)}
                  </span>
                </div>
              ) : conversionProgress.message ? (
                <p className="text-xs text-zinc-500">{conversionProgress.message}</p>
              ) : null}
            </div>
            <Button variant="danger" onClick={handleCancel} className="w-full">
              <X size={13} />
              Cancel
            </Button>
          </div>
        )}

        {isDone && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-green-900/50 bg-green-950/30 p-4 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 size={28} className="text-green-400" />
              <p className="text-sm font-semibold text-green-300">Conversion Complete</p>
              <p className="text-xs text-zinc-500">
                {conversionProgress.outputPath ? basename(conversionProgress.outputPath) : ''}
              </p>
            </div>
            <Button variant="secondary" onClick={handleOpenFolder} className="w-full">
              <ExternalLink size={13} />
              Open Folder
            </Button>
            <Button variant="ghost" onClick={handleReset} className="w-full">
              Start Over
            </Button>
          </div>
        )}

        {isError && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 flex flex-col items-center gap-2 text-center">
              <AlertCircle size={28} className="text-red-400" />
              <p className="text-sm font-semibold text-red-300">Conversion Failed</p>
              <p className="text-xs text-zinc-500 line-clamp-4">
                {conversionProgress.errorMessage}
              </p>
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
            className="flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[10px] text-zinc-500 leading-relaxed max-h-48"
          >
            {log.map((line, i) => (
              <div key={i} className={cn(line.startsWith('ERROR') && 'text-red-400')}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
