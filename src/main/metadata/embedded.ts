import type { BookMetadata, CoverArt } from '../../shared/types'

export async function readEmbeddedMetadata(filePaths: string[]): Promise<{
  metadata: Partial<BookMetadata>
  coverArt: CoverArt | null
}> {
  // Dynamic import for ESM-only music-metadata
  const mm = await import('music-metadata')

  let bestMetadata: Partial<BookMetadata> = {}
  let bestScore = 0
  let coverArt: CoverArt | null = null

  for (const filePath of filePaths) {
    try {
      const result = await mm.parseFile(filePath, { skipCovers: false })
      const c = result.common

      const candidate: Partial<BookMetadata> = {}
      if (c.title) candidate.title = c.title
      if (c.albumartist) candidate.author = c.albumartist
      else if (c.artist) candidate.author = c.artist
      if (c.composer?.length) candidate.narrator = c.composer[0]
      if (c.album) candidate.series = c.album
      if (c.year) candidate.year = String(c.year)
      if (c.genre?.length) candidate.genre = c.genre[0]
      if (c.label?.length) candidate.publisher = c.label[0]
      if (c.comment?.length) {
        const comment = c.comment[0]
        candidate.description = typeof comment === 'string' ? comment : comment.text ?? ''
      }
      if (c.disk?.no) candidate.seriesPart = String(c.disk.no)

      const score = Object.values(candidate).filter(Boolean).length
      if (score > bestScore) {
        bestScore = score
        bestMetadata = candidate
      }

      if (!coverArt && c.picture?.length) {
        const pic = c.picture[0]
        const base64 = Buffer.from(pic.data).toString('base64')
        coverArt = {
          base64: `data:${pic.format};base64,${base64}`,
          mimeType: pic.format
        }
      }
    } catch {
      // Skip files that fail to parse
    }
  }

  return { metadata: bestMetadata, coverArt }
}
