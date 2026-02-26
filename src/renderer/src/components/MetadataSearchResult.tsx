import type { MetadataLookupResult } from '@shared/types'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

const SOURCE_LABELS: Record<MetadataLookupResult['source'], string> = {
  musicbrainz: 'MusicBrainz',
  openlibrary: 'Open Library',
  googlebooks: 'Google Books'
}

interface MetadataSearchResultProps {
  result: MetadataLookupResult
  onApply: (result: MetadataLookupResult) => void
}

export function MetadataSearchResult({ result, onApply }: MetadataSearchResultProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg bg-zinc-900 border border-zinc-800 p-3 hover:border-zinc-700 transition-colors">
      {/* Top row: thumbnail + info */}
      <div className="flex items-start gap-3">
        {result.coverUrl && (
          <img
            src={result.coverUrl}
            alt=""
            className="w-10 h-14 object-cover rounded-md shrink-0 bg-zinc-800"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <Badge
              variant={
                result.source === 'musicbrainz'
                  ? 'violet'
                  : result.source === 'googlebooks'
                    ? 'yellow'
                    : 'green'
              }
            >
              {SOURCE_LABELS[result.source]}
            </Badge>
          </div>
          <p className="text-sm font-medium text-zinc-100 mt-1 line-clamp-2 leading-snug">{result.title}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{result.author}</p>
          <div className="flex flex-wrap gap-x-1.5 mt-1">
            {result.year && (
              <span className="text-xs text-zinc-500">{result.year}</span>
            )}
            {result.genre && (
              <span className="text-xs text-zinc-600">· {result.genre}</span>
            )}
          </div>
        </div>
      </div>

      {result.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{result.description}</p>
      )}

      {/* Apply button always at the bottom, full width */}
      <Button
        variant="primary"
        size="sm"
        onClick={() => onApply(result)}
        className="w-full"
      >
        Apply
      </Button>
    </div>
  )
}
