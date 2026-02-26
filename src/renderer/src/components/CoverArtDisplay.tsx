import { ImageIcon, Upload } from 'lucide-react'
import type { CoverArt } from '@shared/types'
import { ipc } from '@renderer/lib/ipc'

interface CoverArtDisplayProps {
  coverArt: CoverArt | null
  onUpdate: (art: CoverArt) => void
  size?: 'sm' | 'lg'
}

export function CoverArtDisplay({ coverArt, onUpdate, size = 'lg' }: CoverArtDisplayProps) {
  const dim = size === 'lg' ? 'w-40 h-40' : 'w-20 h-20'

  async function handleClick() {
    const paths = await ipc.files.openDialog({
      title: 'Select Cover Art',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    })
    if (!paths[0]) return

    // Read as base64 via file input
    const res = await fetch(`file://${paths[0]}`)
    const blob = await res.blob()
    const reader = new FileReader()
    reader.onload = () => {
      onUpdate({ base64: reader.result as string, mimeType: blob.type })
    }
    reader.readAsDataURL(blob)
  }

  return (
    <button
      onClick={handleClick}
      title="Click to change cover art"
      className={`${dim} relative rounded-xl overflow-hidden border-2 border-zinc-700 hover:border-violet-500 transition-colors group shrink-0`}
    >
      {coverArt ? (
        <img
          src={coverArt.base64}
          alt="Cover art"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
          <ImageIcon size={size === 'lg' ? 32 : 18} className="text-zinc-600" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Upload size={16} className="text-white" />
      </div>
    </button>
  )
}
