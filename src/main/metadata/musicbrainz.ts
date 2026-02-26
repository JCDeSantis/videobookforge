import axios from 'axios'
import type { MetadataLookupResult } from '../../shared/types'

export async function lookupMusicBrainz(
  title: string,
  author: string
): Promise<MetadataLookupResult[]> {
  try {
    const parts = [
      title && `title:${title}`,
      author && `artist:${author}`,
    ].filter(Boolean)
    if (!parts.length) return []

    const res = await axios.get('https://musicbrainz.org/ws/2/release', {
      params: { query: parts.join(' AND '), fmt: 'json', limit: 5 },
      headers: { 'User-Agent': 'VideoBookForge/1.0 (local)' },
      timeout: 8000
    })

    return (res.data?.releases ?? []).map((r: Record<string, any>, i: number) => ({
      id: r.id ?? `mb-${i}`,
      source: 'musicbrainz' as const,
      title: r.title ?? '',
      author: r['artist-credit']?.[0]?.artist?.name ?? author,
      year: r.date?.split('-')[0],
      publisher: r['label-info']?.[0]?.label?.name,
      confidence: r.score ? r.score / 100 : 0.5
    }))
  } catch {
    return []
  }
}
