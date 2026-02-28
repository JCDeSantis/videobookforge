import { useState, useEffect } from 'react'
import { FolderOpen, FileText, Music, SortAsc, Sparkles, X, AlertTriangle, HardDrive, Trash2 } from 'lucide-react'
import { useProjectStore } from '@renderer/store/useProjectStore'
import { ipc } from '@renderer/lib/ipc'
import { basename, formatDuration, cn } from '@renderer/lib/utils'
import { FileDropZone } from '@renderer/components/FileDropZone'
import { FileList } from '@renderer/components/FileList'
import { Button } from '@renderer/components/ui/button'
import type { AudioFile, WhisperModel, WhisperStorageInfo } from '@shared/types'
import { WHISPER_MODELS } from '@renderer/lib/whisperModels'

let fileIdCounter = 0

async function buildAudioFile(path: string): Promise<AudioFile> {
  const probe = await ipc.audio.probe(path)
  const name = basename(path)
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return {
    id: `file-${++fileIdCounter}`,
    path,
    name,
    duration: probe.duration,
    format: ext === 'm4b' ? 'm4b' : ext === 'mp3' ? 'mp3' : 'unknown',
    size: 0
  }
}

export function ImportPage() {
  const {
    audioFiles, srtPath, subtitleSource,
    addAudioFiles, removeAudioFile, reorderAudioFiles, setSrtPath, setSubtitleSource,
    whisperModel, setWhisperModel
  } = useProjectStore()

  const [loading, setLoading] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [storageInfo, setStorageInfo] = useState<WhisperStorageInfo | null>(null)

  // Fetch storage info whenever the manage panel opens
  useEffect(() => {
    if (showManage) {
      ipc.whisper.storageInfo().then(setStorageInfo)
    } else {
      setStorageInfo(null)
    }
  }, [showManage])

  async function handleDeleteBinary() {
    await ipc.whisper.deleteBinary()
    setStorageInfo(await ipc.whisper.storageInfo())
  }

  async function handleDeleteModel(model: WhisperModel) {
    await ipc.whisper.deleteModel(model)
    setStorageInfo(await ipc.whisper.storageInfo())
  }

  async function handleAudioDrop(paths: string[]) {
    setLoading(true)
    try {
      const files = await Promise.all(paths.map(buildAudioFile))
      addAudioFiles(files)
    } finally {
      setLoading(false)
    }
  }

  async function handlePickAudio() {
    const paths = await ipc.files.openDialog({
      title: 'Select Audiobook Files',
      filters: [{ name: 'Audiobook Files', extensions: ['m4b', 'mp3'] }],
      multiple: true
    })
    if (paths.length) await handleAudioDrop(paths)
  }

  async function handlePickSrt() {
    const paths = await ipc.files.openDialog({
      title: 'Select Subtitle File',
      filters: [{ name: 'Subtitle Files', extensions: ['srt'] }]
    })
    if (paths[0]) {
      setSrtPath(paths[0])
      setSubtitleSource('manual')
    }
  }

  function handleAutoSort() {
    const sorted = [...audioFiles].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    )
    useProjectStore.setState({ audioFiles: sorted })
  }

  function handleQueueAiForConvert() {
    setSubtitleSource('ai')
    setShowAiPanel(false)
  }

  const totalDuration = audioFiles.reduce((s, f) => s + f.duration, 0)

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">

      {/* Audio files */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Music size={15} className="text-violet-400" />
            Audio Parts
            {audioFiles.length > 0 && (
              <span className="text-xs text-zinc-500 font-normal">
                ({audioFiles.length} file{audioFiles.length !== 1 ? 's' : ''} · {formatDuration(totalDuration)})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {audioFiles.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handleAutoSort}>
                <SortAsc size={13} />
                Auto-sort
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handlePickAudio} disabled={loading}>
              <FolderOpen size={13} />
              Browse
            </Button>
          </div>
        </div>

        <FileDropZone onFiles={handleAudioDrop} accept={['m4b', 'mp3']} multiple className="min-h-[120px] p-4">
          {audioFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 gap-2 text-center">
              <Music size={28} className="text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Drop <span className="text-zinc-400">.m4b</span> or{' '}
                <span className="text-zinc-400">.mp3</span> files here
              </p>
              <p className="text-xs text-zinc-600">Multiple parts supported — drag to reorder</p>
            </div>
          ) : (
            <FileList files={audioFiles} onRemove={removeAudioFile} onReorder={reorderAudioFiles} />
          )}
        </FileDropZone>
      </div>

      {/* Subtitles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <FileText size={15} className="text-violet-400" />
            Subtitles
            <span className="text-xs text-zinc-500 font-normal">(optional)</span>
          </h2>
          <div className="flex items-center gap-2">
            {!srtPath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAiPanel((v) => !v)}
                className={cn((showAiPanel || subtitleSource === 'ai') && 'text-violet-400')}
              >
                <Sparkles size={13} />
                {subtitleSource === 'ai' ? 'AI queued' : 'Generate with AI'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManage((v) => !v)}
              className={cn(showManage && 'text-violet-400')}
              title="Manage AI downloads"
            >
              <HardDrive size={13} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePickSrt}>
              <FolderOpen size={13} />
              Browse
            </Button>
          </div>
        </div>

        {/* AI storage management panel */}
        {showManage && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 mb-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive size={14} className="text-violet-400" />
                <span className="text-sm font-medium text-zinc-300">AI Storage</span>
              </div>
              <button
                onClick={() => setShowManage(false)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {storageInfo === null ? (
              <p className="text-xs text-zinc-600">Loading...</p>
            ) : (
              <>
                {/* Engine / binary row */}
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5">Engine</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-300 flex-1">
                      whisper.cpp {storageInfo.binaryVersion}
                    </span>
                    {storageInfo.binaryReady && (
                      <span
                        className={
                          storageInfo.gpuEnabled
                            ? 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700'
                        }
                      >
                        {storageInfo.gpuEnabled ? 'GPU' : 'CPU'}
                      </span>
                    )}
                    <span
                      className={cn(
                        'text-[10px]',
                        storageInfo.binaryReady ? 'text-green-400' : 'text-zinc-600'
                      )}
                    >
                      {storageInfo.binaryReady ? 'Downloaded' : 'Not downloaded'}
                    </span>
                    {storageInfo.binaryReady && (
                      <button
                        onClick={handleDeleteBinary}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                        title="Delete engine binary"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* GPU upgrade notice */}
                {storageInfo.gpuDetected && !storageInfo.gpuEnabled && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2.5">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-300 leading-snug">
                      {storageInfo.binaryReady
                        ? 'NVIDIA GPU detected but current engine was downloaded without GPU support. Delete the engine above to re-download with GPU acceleration.'
                        : 'NVIDIA GPU detected — will use GPU acceleration when the engine downloads.'}
                    </p>
                  </div>
                )}

                <div className="h-px bg-zinc-800" />

                {/* Models */}
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5">Models</p>
                  <div className="flex flex-col gap-2">
                    {storageInfo.models.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-300 w-14 shrink-0">{m.name}</span>
                        <span className="text-[10px] text-zinc-600 w-14 shrink-0">{m.size}</span>
                        <span
                          className={cn(
                            'text-[10px] flex-1',
                            m.downloaded ? 'text-green-400' : 'text-zinc-600'
                          )}
                        >
                          {m.downloaded ? 'Downloaded' : 'Not downloaded'}
                        </span>
                        {m.downloaded && (
                          <button
                            onClick={() => handleDeleteModel(m.id as WhisperModel)}
                            className="text-zinc-600 hover:text-red-400 transition-colors"
                            title={`Delete ${m.name} model`}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-700">
                  Deleted files re-download automatically when you next generate subtitles.
                </p>
              </>
            )}
          </div>
        )}

        {/* AI model selection panel */}
        {showAiPanel && !srtPath && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 mb-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-violet-400" />
                <span className="text-sm font-medium text-zinc-300">AI Transcription</span>
              </div>
              <button
                onClick={() => setShowAiPanel(false)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Model picker */}
            <div className="grid grid-cols-2 gap-1.5">
              {WHISPER_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setWhisperModel(m.id as WhisperModel)}
                  className={cn(
                    'flex flex-col gap-0.5 rounded-lg border p-2.5 text-left transition-all',
                    whisperModel === m.id
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-xs font-semibold',
                      whisperModel === m.id ? 'text-violet-300' : 'text-zinc-300'
                    )}>
                      {m.name}
                    </span>
                    <span className="text-[10px] text-zinc-500">{m.size}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600 leading-tight">{m.description}</span>
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleQueueAiForConvert}
              disabled={!audioFiles.length}
              className="w-full"
            >
              <Sparkles size={13} />
              Use AI — generate automatically when converting
            </Button>

            {!audioFiles.length && (
              <p className="text-xs text-zinc-600 text-center">Add audio files first</p>
            )}
          </div>
        )}

        {/* SRT drop zone / status */}
        <FileDropZone
          onFiles={(paths) => { setSrtPath(paths[0]); setSubtitleSource('manual') }}
          accept={['srt']}
          className="p-4"
        >
          {srtPath ? (
            <div className="flex items-center gap-3 py-1">
              <FileText size={16} className="text-violet-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{basename(srtPath)}</p>
                <p className="text-xs text-zinc-500 truncate">{srtPath}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setSrtPath(null); setSubtitleSource('none') }}
                className="text-zinc-600 hover:text-red-400"
              >
                Remove
              </Button>
            </div>
          ) : subtitleSource === 'ai' ? (
            <div className="flex items-center gap-3 py-1">
              <Sparkles size={16} className="text-violet-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-violet-300">AI subtitles — generate on convert</p>
                <p className="text-xs text-zinc-500">Using {WHISPER_MODELS.find(m => m.id === whisperModel)?.name ?? whisperModel} model</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setSubtitleSource('none') }}
                className="text-zinc-600 hover:text-red-400"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-3">
              <FileText size={20} className="text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Drop a <span className="text-zinc-400">.srt</span> file here
              </p>
            </div>
          )}
        </FileDropZone>
      </div>
    </div>
  )
}
