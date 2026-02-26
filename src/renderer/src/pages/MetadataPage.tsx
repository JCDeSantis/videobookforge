import { useEffect, useRef } from 'react'
import { Search, RefreshCw, Tag } from 'lucide-react'
import { useProjectStore } from '@renderer/store/useProjectStore'
import { ipc } from '@renderer/lib/ipc'
import { CoverArtDisplay } from '@renderer/components/CoverArtDisplay'
import { MetadataSearchResult } from '@renderer/components/MetadataSearchResult'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Label } from '@renderer/components/ui/label'
import { Button } from '@renderer/components/ui/button'
import type { MetadataLookupResult } from '@shared/types'

export function MetadataPage() {
  const {
    audioFiles,
    metadata,
    coverArt,
    lookupResults,
    isLookingUp,
    setMetadata,
    setCoverArt,
    setLookupResults,
    setIsLookingUp,
    applyLookupResult
  } = useProjectStore()

  const initializedRef = useRef(false)

  // Auto-read embedded metadata on first visit
  useEffect(() => {
    if (initializedRef.current || !audioFiles.length) return
    initializedRef.current = true
    ipc.metadata.readEmbedded(audioFiles.map((f) => f.path)).then(({ metadata: m, coverArt: ca }) => {
      if (Object.values(m).some(Boolean)) setMetadata(m)
      if (ca) setCoverArt(ca)
    })
  }, [audioFiles])

  async function handleLookup() {
    if (!metadata.title && !metadata.author) return
    setIsLookingUp(true)
    setLookupResults([])
    try {
      const results = await ipc.metadata.lookup({ title: metadata.title, author: metadata.author })
      setLookupResults(results)
    } finally {
      setIsLookingUp(false)
    }
  }

  function handleApplyResult(result: MetadataLookupResult) {
    applyLookupResult(result)
    // Also fetch and apply cover art if URL provided
    if (result.coverUrl) {
      fetch(result.coverUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const reader = new FileReader()
          reader.onload = () => {
            setCoverArt({ base64: reader.result as string, mimeType: blob.type })
          }
          reader.readAsDataURL(blob)
        })
        .catch(() => {})
    }
  }

  return (
    <div className="flex gap-5 h-full overflow-hidden">
      {/* Left: metadata form */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Cover art + title/author */}
        <div className="flex gap-4">
          <CoverArtDisplay
            coverArt={coverArt}
            onUpdate={setCoverArt}
            size="lg"
          />
          <div className="flex-1 flex flex-col gap-3">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={metadata.title}
                onChange={(e) => setMetadata({ title: e.target.value })}
                placeholder="Book title"
              />
            </div>
            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={metadata.author}
                onChange={(e) => setMetadata({ author: e.target.value })}
                placeholder="Author name"
              />
            </div>
            <div>
              <Label htmlFor="narrator">Narrator</Label>
              <Input
                id="narrator"
                value={metadata.narrator}
                onChange={(e) => setMetadata({ narrator: e.target.value })}
                placeholder="Narrator name"
              />
            </div>
          </div>
        </div>

        {/* Secondary fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="series">Series</Label>
            <Input
              id="series"
              value={metadata.series}
              onChange={(e) => setMetadata({ series: e.target.value })}
              placeholder="Series name"
            />
          </div>
          <div>
            <Label htmlFor="seriesPart">Part #</Label>
            <Input
              id="seriesPart"
              value={metadata.seriesPart}
              onChange={(e) => setMetadata({ seriesPart: e.target.value })}
              placeholder="e.g. 1"
            />
          </div>
          <div>
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              value={metadata.year}
              onChange={(e) => setMetadata({ year: e.target.value })}
              placeholder="2024"
            />
          </div>
          <div>
            <Label htmlFor="genre">Genre</Label>
            <Input
              id="genre"
              value={metadata.genre}
              onChange={(e) => setMetadata({ genre: e.target.value })}
              placeholder="Fantasy, Thriller..."
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="publisher">Publisher</Label>
            <Input
              id="publisher"
              value={metadata.publisher}
              onChange={(e) => setMetadata({ publisher: e.target.value })}
              placeholder="Publisher name"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={metadata.description}
            onChange={(e) => setMetadata({ description: e.target.value })}
            placeholder="Book description or synopsis..."
            rows={4}
          />
        </div>
      </div>

      {/* Right: online lookup */}
      <div className="w-72 flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Search size={14} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Online Lookup</h3>
        </div>

        <Button
          variant="primary"
          onClick={handleLookup}
          disabled={isLookingUp || (!metadata.title && !metadata.author)}
          className="w-full"
        >
          {isLookingUp ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search size={13} />
              Search Metadata
            </>
          )}
        </Button>

        <p className="text-xs text-zinc-600">
          Searches MusicBrainz, Open Library, and Google Books simultaneously.
        </p>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {lookupResults.length === 0 && !isLookingUp && (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center py-8">
              <Tag size={24} className="text-zinc-700" />
              <p className="text-xs text-zinc-600">
                Enter a title or author then click Search
              </p>
            </div>
          )}
          {lookupResults.map((r) => (
            <MetadataSearchResult key={r.id} result={r} onApply={handleApplyResult} />
          ))}
        </div>
      </div>
    </div>
  )
}
