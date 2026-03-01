import { ipcMain } from 'electron'
import { EPub } from 'epub2'
import { IPC } from '../../shared/types'
import type { EpubChapter } from '../../shared/types'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function registerEpubIpc(): void {
  ipcMain.handle(IPC.EPUB_PARSE, async (_event, epubPath: string): Promise<EpubChapter[]> => {
    const epub = await EPub.createAsync(epubPath)
    const chapters: EpubChapter[] = []

    for (const chapter of epub.flow) {
      try {
        const html = await epub.getChapterAsync(chapter.id)
        const text = stripHtml(html)
        if (text.length > 50) {
          chapters.push({
            title: chapter.title || `Chapter ${chapters.length + 1}`,
            text
          })
        }
      } catch {
        // skip chapters that fail to parse (title pages, nav docs, etc.)
      }
    }

    return chapters
  })
}
