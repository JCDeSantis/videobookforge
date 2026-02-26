import { useEffect, useRef } from 'react'
import { Sparkles, X, Download, Cpu } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { WhisperProgress } from '@shared/types'

export interface TranscriptSegment {
  timestamp: string // "HH:MM:SS"
  text: string
}

interface TranscriptionOverlayProps {
  progress: WhisperProgress
  liveTranscript: TranscriptSegment[]
  onCancel: () => void
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1 w-full bg-zinc-800 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export function TranscriptionOverlay({ progress, liveTranscript, onCancel }: TranscriptionOverlayProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const isDownloading = progress.phase === 'downloading-binary' || progress.phase === 'downloading-model'
  const isTranscribing = progress.phase === 'transcribing'

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveTranscript.length])

  const phaseLabel =
    progress.phase === 'downloading-binary' ? 'Downloading AI Engine' :
    progress.phase === 'downloading-model'  ? 'Downloading AI Model' :
    progress.phase === 'transcribing'       ? 'Transcribing' :
    progress.phase

  const hasTime = progress.elapsed !== undefined && progress.totalDuration !== undefined && progress.totalDuration > 0

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles size={14} className="text-violet-400 shrink-0" />
          <span className="text-sm font-semibold text-zinc-200">AI Transcription</span>
          <span className="text-xs text-zinc-600 capitalize">&mdash; {phaseLabel}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Audio position */}
          {hasTime && (
            <span className="text-xs text-zinc-500 font-mono tabular-nums">
              {formatTime(progress.elapsed!)}
              <span className="text-zinc-700"> / </span>
              {formatTime(progress.totalDuration!)}
            </span>
          )}
          {/* Percent */}
          <div className="flex items-center gap-1.5">
            {isDownloading && <Download size={11} className="text-zinc-500" />}
            {isTranscribing && <Cpu size={11} className="text-violet-400 animate-pulse" />}
            <span className="text-xs text-violet-400 font-bold tabular-nums">{progress.percent}%</span>
          </div>
        </div>
      </div>

      {/* Progress bar — flush, no padding */}
      <ProgressBar percent={progress.percent} />

      {/* Body */}
      {isDownloading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
          <div>
            <p className="text-sm font-medium text-zinc-300">{phaseLabel}</p>
            {progress.message && (
              <p className="text-xs text-zinc-500 mt-1">{progress.message}</p>
            )}
            <p className="text-xs text-zinc-600 mt-3">Files are cached — this only downloads once</p>
          </div>
        </div>
      )}

      {isTranscribing && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-status */}
          <div className="flex items-center justify-between px-5 pt-2.5 pb-1">
            <span className="text-xs text-zinc-600">
              {progress.message ?? 'Processing audio...'}
            </span>
            {liveTranscript.length > 0 && (
              <span className="text-[10px] text-zinc-700 tabular-nums">
                {liveTranscript.length} segment{liveTranscript.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Live transcript */}
          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2.5">
            {liveTranscript.length === 0 ? (
              <div className="flex items-center gap-2 mt-4 text-zinc-600 text-sm">
                <div className="w-1.5 h-4 bg-violet-500/60 animate-pulse rounded-sm" />
                <span className="italic">Waiting for first segment...</span>
              </div>
            ) : (
              liveTranscript.map((seg, i) => (
                <div key={i} className="flex gap-3 group">
                  <span className="text-zinc-700 font-mono text-[11px] shrink-0 pt-0.5 tabular-nums group-hover:text-zinc-500 transition-colors">
                    {seg.timestamp}
                  </span>
                  <span className="text-zinc-300 text-sm leading-relaxed">{seg.text}</span>
                </div>
              ))
            )}

            {/* Blinking cursor after last segment */}
            {liveTranscript.length > 0 && (
              <div className="flex gap-3">
                <span className="text-zinc-800 font-mono text-[11px] shrink-0 pt-0.5">▶</span>
                <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse rounded-sm" />
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-zinc-800/80">
        <Button variant="danger" size="sm" onClick={onCancel} className="w-full">
          <X size={13} />
          Cancel Transcription
        </Button>
      </div>
    </div>
  )
}
