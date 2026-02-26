import { ImageIcon, Palette, Layers, BookOpen } from 'lucide-react'
import { useProjectStore } from '@renderer/store/useProjectStore'
import { ipc } from '@renderer/lib/ipc'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import type { BackgroundType } from '@shared/types'

const BG_OPTIONS: { type: BackgroundType; label: string; icon: typeof ImageIcon; desc: string }[] =
  [
    { type: 'cover', label: 'Book Cover', icon: BookOpen, desc: 'Use embedded or imported cover art' },
    { type: 'image', label: 'Custom Image', icon: ImageIcon, desc: 'Pick any image file' },
    { type: 'solid', label: 'Solid Color', icon: Palette, desc: 'A single flat color' },
    { type: 'gradient', label: 'Gradient', icon: Layers, desc: 'Two-color gradient' }
  ]

const GRADIENT_DIRECTIONS = [
  { value: 'to-right', label: '→ Horizontal' },
  { value: 'to-bottom', label: '↓ Vertical' },
  { value: 'to-br', label: '↘ Diagonal ↗' },
  { value: 'to-tr', label: '↗ Diagonal ↙' }
] as const

function buildPreviewStyle(bg: ReturnType<typeof useProjectStore.getState>['background']): React.CSSProperties {
  if (bg.type === 'solid') return { background: bg.color ?? '#09090b' }
  if (bg.type === 'gradient') {
    const dirMap: Record<string, string> = {
      'to-right': 'to right',
      'to-bottom': 'to bottom',
      'to-br': 'to bottom right',
      'to-tr': 'to top right'
    }
    const dir = dirMap[bg.gradientDirection ?? 'to-br'] ?? 'to bottom right'
    return { background: `linear-gradient(${dir}, ${bg.gradientFrom ?? '#1a1a2e'}, ${bg.gradientTo ?? '#16213e'})` }
  }
  if (bg.type === 'image' && bg.imagePath) return { background: '#09090b' }
  return { background: '#09090b' }
}

export function BackgroundPage() {
  const { background, coverArt, setBackground } = useProjectStore()
  async function handlePickImage() {
    const paths = await ipc.files.openDialog({
      title: 'Select Background Image',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
    })
    if (paths[0]) setBackground({ type: 'image', imagePath: paths[0] })
  }

  // Generate gradient PNG for use in ffmpeg (stored as coverBase64)
  function generateGradientDataUri(from: string, to: string, dir: string): string {
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    const ctx = canvas.getContext('2d')!
    const dirMap: Record<string, [number, number, number, number]> = {
      'to-right': [0, 0, 1280, 0],
      'to-bottom': [0, 0, 0, 720],
      'to-br': [0, 0, 1280, 720],
      'to-tr': [0, 720, 1280, 0]
    }
    const [x0, y0, x1, y1] = dirMap[dir] ?? [0, 0, 1280, 720]
    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    grad.addColorStop(0, from)
    grad.addColorStop(1, to)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1280, 720)
    return canvas.toDataURL('image/png')
  }

  function handleGradientChange(key: 'gradientFrom' | 'gradientTo' | 'gradientDirection', value: string) {
    const updated = { ...background, [key]: value }
    const dataUri = generateGradientDataUri(
      updated.gradientFrom ?? '#1a1a2e',
      updated.gradientTo ?? '#16213e',
      updated.gradientDirection ?? 'to-br'
    )
    setBackground({ [key]: value, coverBase64: dataUri })
  }

  const previewStyle = buildPreviewStyle(background)
  const hasCover = !!(coverArt?.base64)

  return (
    <div className="flex gap-6 h-full overflow-hidden">
      {/* Left: options */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2">
          {BG_OPTIONS.map(({ type, label, icon: Icon, desc }) => {
            const active = background.type === type
            const disabled = type === 'cover' && !hasCover
            return (
              <button
                key={type}
                disabled={disabled}
                onClick={() => setBackground({ type })}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all',
                  active
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50',
                  disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Icon
                  size={18}
                  className={active ? 'text-violet-400' : 'text-zinc-500'}
                />
                <span className={cn('text-sm font-medium', active ? 'text-zinc-100' : 'text-zinc-300')}>
                  {label}
                </span>
                <span className="text-xs text-zinc-500">{desc}</span>
                {type === 'cover' && !hasCover && (
                  <span className="text-xs text-zinc-600">No cover art found</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Controls per type */}
        {background.type === 'image' && (
          <div>
            <Label>Image File</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 truncate">
                {background.imagePath ?? 'No file selected'}
              </div>
              <Button variant="secondary" size="sm" onClick={handlePickImage}>
                Browse
              </Button>
            </div>
          </div>
        )}

        {background.type === 'solid' && (
          <div>
            <Label>Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={background.color ?? '#09090b'}
                onChange={(e) => setBackground({ color: e.target.value })}
                className="h-9 w-14 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-1"
              />
              <span className="text-sm text-zinc-400 font-mono">{background.color ?? '#09090b'}</span>
            </div>
          </div>
        )}

        {background.type === 'gradient' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={background.gradientFrom ?? '#1a1a2e'}
                    onChange={(e) => handleGradientChange('gradientFrom', e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-1"
                  />
                  <span className="text-sm text-zinc-400 font-mono text-xs">
                    {background.gradientFrom ?? '#1a1a2e'}
                  </span>
                </div>
              </div>
              <div>
                <Label>To Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={background.gradientTo ?? '#16213e'}
                    onChange={(e) => handleGradientChange('gradientTo', e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-1"
                  />
                  <span className="text-sm text-zinc-400 font-mono text-xs">
                    {background.gradientTo ?? '#16213e'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label>Direction</Label>
              <div className="grid grid-cols-2 gap-2">
                {GRADIENT_DIRECTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleGradientChange('gradientDirection', value)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm transition-colors',
                      background.gradientDirection === value
                        ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: preview */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <Label>Preview</Label>
        <div className="rounded-xl overflow-hidden border border-zinc-800 aspect-video w-full">
          {background.type === 'cover' && hasCover ? (
            <img src={coverArt!.base64} alt="preview" className="w-full h-full object-cover" />
          ) : background.type === 'image' && background.imagePath ? (
            <div
              className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600 text-xs"
            >
              <img
                src={`file://${background.imagePath}`}
                alt="preview"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          ) : background.type === 'gradient' && background.coverBase64 ? (
            <img src={background.coverBase64} alt="gradient preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={previewStyle} />
          )}
        </div>
        <p className="text-xs text-zinc-600">16:9 aspect ratio · 1280×720 or 1920×1080</p>
      </div>
    </div>
  )
}
