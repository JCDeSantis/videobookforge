import axios from 'axios'
import type { MetadataLookupResult } from '../../shared/types'

export async function lookupGoogleBooks(
  title: string,
  author: string
): Promise<MetadataLookupResult[]> {
  try {
    const parts = [title, author ? `inauthor:${author}` : ''].filter(Boolean)
    if (!parts.length) return []

    const res = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: { q: parts.join(' '), maxResults: 5, printType: 'books' },
      timeout: 8000
    })

    return (res.data?.items ?? []).map((item: Record<string, any>, i: number) => {
      const info = item.volumeInfo ?? {}
      return {
        id: `gb-${item.id ?? i}`,
        source: 'googlebooks' as const,
        title: info.title ?? '',
        author: info.authors?.[0] ?? author,
        year: info.publishedDate?.split('-')[0],
        genre: info.categories?.[0],
        publisher: info.publisher,
        description: info.description,
        coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
        confidence: 0.65
      }
    })
  } catch {
    return []
  }
}
