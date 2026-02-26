import { useState } from 'react'
import { FolderOpen, FileText, Music, SortAsc } from 'lucide-react'
import { useProjectStore } from '@renderer/store/useProjectStore'
import { ipc } from '@renderer/lib/ipc'
import { basename, formatDuration } from '@renderer/lib/utils'
import { FileDropZone } from '@renderer/components/FileDropZone'
import { FileList } from '@renderer/components/FileList'
import { Button } from '@renderer/components/ui/button'
import type { AudioFile } from '@shared/types'

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
  const { audioFiles, srtPath, addAudioFiles, removeAudioFile, reorderAudioFiles, setSrtPath } =
    useProjectStore()
  const [loading, setLoading] = useState(false)

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
      title: 'Select Subtitle / Chapter File',
      filters: [{ name: 'Subtitle Files', extensions: ['srt'] }]
    })
    if (paths[0]) setSrtPath(paths[0])
  }

  function handleAutoSort() {
    const sorted = [...audioFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    useProjectStore.setState({ audioFiles: sorted })
  }

  const totalDuration = audioFiles.reduce((s, f) => s + f.duration, 0)

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">
      {/* Audio files drop zone */}
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

        <FileDropZone
          onFiles={handleAudioDrop}
          accept={['m4b', 'mp3']}
          multiple
          className="min-h-[120px] p-4"
        >
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
            <FileList
              files={audioFiles}
              onRemove={removeAudioFile}
              onReorder={reorderAudioFiles}
            />
          )}
        </FileDropZone>
      </div>

      {/* SRT file */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <FileText size={15} className="text-violet-400" />
            Subtitle / Chapter File
            <span className="text-xs text-zinc-500 font-normal">(optional)</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={handlePickSrt}>
            <FolderOpen size={13} />
            Browse
          </Button>
        </div>

        <FileDropZone
          onFiles={(paths) => setSrtPath(paths[0])}
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
                onClick={(e) => { e.stopPropagation(); setSrtPath(null) }}
                className="text-zinc-600 hover:text-red-400"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-4">
              <FileText size={22} className="text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Drop a <span className="text-zinc-400">.srt</span> file here
              </p>
              <p className="text-xs text-zinc-600">Chapters will be embedded from SRT timestamps</p>
            </div>
          )}
        </FileDropZone>
      </div>
    </div>
  )
}
