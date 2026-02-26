import axios from 'axios'
import type { MetadataLookupResult } from '../../shared/types'

export async function lookupOpenLibrary(
  title: string,
  author: string
): Promise<MetadataLookupResult[]> {
  try {
    if (!title && !author) return []

    const res = await axios.get('https://openlibrary.org/search.json', {
      params: {
        title: title || undefined,
        author: author || undefined,
        fields: 'key,title,author_name,first_publish_year,subject,publisher,first_sentence,isbn',
        limit: 5
      },
      timeout: 8000
    })

    return (res.data?.docs ?? []).map((d: Record<string, any>, i: number) => ({
      id: `ol-${d.key ?? i}`,
      source: 'openlibrary' as const,
      title: d.title ?? '',
      author: d.author_name?.[0] ?? author,
      year: d.first_publish_year ? String(d.first_publish_year) : undefined,
      genre: d.subject?.[0],
      publisher: d.publisher?.[0],
      description: d.first_sentence?.value,
      coverUrl: d.isbn?.[0]
        ? `https://covers.openlibrary.org/b/isbn/${d.isbn[0]}-L.jpg`
        : undefined,
      confidence: 0.7
    }))
  } catch {
    return []
  }
}
