import { FolderOpen, Film, Tv, Flame } from 'lucide-react'
import { useProjectStore } from '@renderer/store/useProjectStore'
import { ipc } from '@renderer/lib/ipc'
import { cn, formatDuration, basename } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import { Badge } from '@renderer/components/ui/badge'

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

export function ExportSettingsPage() {
  const {
    audioFiles,
    srtPath,
    subtitleSource,
    metadata,
    background,
    outputFormat,
    outputResolution,
    outputPath,
    burnSubtitles,
    setOutputFormat,
    setOutputResolution,
    setOutputPath,
    setBurnSubtitles
  } = useProjectStore()

  async function handlePickOutputDir() {
    const paths = await ipc.files.openDialog({ title: 'Select Output Folder', directory: true })
    if (!paths[0]) return
    const ext = outputFormat
    const title = metadata.title || 'audiobook'
    const safe = title.replace(/[<>:"/\\|?*]/g, '_')
    setOutputPath(`${paths[0]}\\${safe}.${ext}`)
  }

  function handleFormatChange(fmt: 'mkv' | 'mp4') {
    setOutputFormat(fmt)
    if (outputPath) {
      setOutputPath(outputPath.replace(/\.(mkv|mp4)$/, `.${fmt}`))
    }
  }

  const totalDuration = audioFiles.reduce((s, f) => s + f.duration, 0)
  const hasOrWillHaveSrt = srtPath !== null || subtitleSource === 'ai'

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto max-w-2xl">

      {/* Output format */}
      <div>
        <Label className="text-zinc-300 text-sm mb-2">Output Format</Label>
        <div className="grid grid-cols-2 gap-2">
          {FORMAT_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => handleFormatChange(value)}
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

      {/* Subtitle burn-in */}
      {hasOrWillHaveSrt && (
        <div>
          <Label className="text-zinc-300 text-sm mb-2">Subtitles</Label>
          <button
            onClick={() => setBurnSubtitles(!burnSubtitles)}
            disabled={outputFormat === 'mp4'}
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
                    : subtitleSource === 'ai' && !srtPath
                      ? 'MKV default: soft track — AI subtitles generated automatically on convert'
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
          <Button variant="secondary" size="sm" onClick={handlePickOutputDir}>
            <FolderOpen size={13} />
            Browse
          </Button>
        </div>
        {!outputPath && (
          <p className="text-xs text-zinc-600 mt-1.5">Select an output file to proceed to convert</p>
        )}
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
          <span className="text-zinc-300">
            {srtPath
              ? basename(srtPath)
              : subtitleSource === 'ai'
                ? <span className="text-violet-400">AI generate on convert</span>
                : <span className="text-zinc-600">None</span>
            }
          </span>
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
  )
}
