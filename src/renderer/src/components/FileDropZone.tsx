import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { cn } from '@renderer/lib/utils'

interface FileDropZoneProps {
  onFiles: (paths: string[]) => void
  accept?: string[] // file extensions without dot e.g. ['m4b', 'mp3']
  multiple?: boolean
  className?: string
  children?: ReactNode
}

export function FileDropZone({
  onFiles,
  accept,
  multiple = false,
  className,
  children
}: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const counter = useRef(0)

  function matchesAccept(name: string): boolean {
    if (!accept?.length) return true
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    return accept.includes(ext)
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault()
    counter.current++
    setDragging(true)
  }
  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    counter.current--
    if (counter.current === 0) setDragging(false)
  }
  function handleDragOver(e: DragEvent) {
    e.preventDefault()
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault()
    counter.current = 0
    setDragging(false)
    const items = Array.from(e.dataTransfer.files)
    const paths = items
      .filter((f) => matchesAccept(f.name))
      .slice(0, multiple ? undefined : 1)
      .map((f) => window.electron.webUtils.getPathForFile(f))
      .filter(Boolean)
    if (paths.length) onFiles(paths)
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-colors duration-150',
        dragging
          ? 'border-violet-500 bg-violet-500/5'
          : 'border-zinc-700 hover:border-zinc-600',
        className
      )}
    >
      {children}
      {dragging && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-violet-500/10 backdrop-blur-sm pointer-events-none z-10">
          <p className="text-sm font-medium text-violet-400">Drop files here</p>
        </div>
      )}
    </div>
  )
}
