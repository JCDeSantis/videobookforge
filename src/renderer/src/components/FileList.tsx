import { GripVertical, X, Music } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { AudioFile } from '@shared/types'
import { formatDuration, formatBytes } from '@renderer/lib/utils'
import { Badge } from './ui/badge'

interface FileRowProps {
  file: AudioFile
  index: number
  onRemove: (id: string) => void
}

function FileRow({ file, index, onRemove }: FileRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 group"
    >
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
      >
        <GripVertical size={15} />
      </button>

      <span className="text-xs text-zinc-600 w-4 text-center font-mono">{index + 1}</span>

      <Music size={14} className="text-zinc-500 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge>{file.format.toUpperCase()}</Badge>
          <span className="text-xs text-zinc-500">{formatDuration(file.duration)}</span>
          <span className="text-xs text-zinc-600">{formatBytes(file.size)}</span>
        </div>
      </div>

      <button
        onClick={() => onRemove(file.id)}
        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
      >
        <X size={14} />
      </button>
    </div>
  )
}

interface FileListProps {
  files: AudioFile[]
  onRemove: (id: string) => void
  onReorder: (activeId: string, overId: string) => void
}

export function FileList({ files, onRemove, onReorder }: FileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id))
    }
  }

  if (!files.length) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5">
          {files.map((file, i) => (
            <FileRow key={file.id} file={file} index={i} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
