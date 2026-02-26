import { ipcMain } from 'electron'
import { readEmbeddedMetadata } from '../metadata/embedded'
import { lookupMusicBrainz } from '../metadata/musicbrainz'
import { lookupOpenLibrary } from '../metadata/openlibrary'
import { lookupGoogleBooks } from '../metadata/googlebooks'
import { probeFile } from '../ffmpeg/probe'
import { IPC } from '../../shared/types'

export function registerMetadataIpc(): void {
  ipcMain.handle(IPC.AUDIO_PROBE, async (_event, filePath: string) => {
    return probeFile(filePath)
  })

  ipcMain.handle(IPC.AUDIO_READ_COVER, async (_event, filePaths: string[]) => {
    const { coverArt } = await readEmbeddedMetadata(filePaths)
    return coverArt
  })

  ipcMain.handle(IPC.METADATA_READ_EMBEDDED, async (_event, filePaths: string[]) => {
    return readEmbeddedMetadata(filePaths)
  })

  ipcMain.handle(
    IPC.METADATA_LOOKUP,
    async (_event, { title, author }: { title: string; author: string }) => {
      const [mb, ol, gb] = await Promise.allSettled([
        lookupMusicBrainz(title, author),
        lookupOpenLibrary(title, author),
        lookupGoogleBooks(title, author)
      ])

      const results = [
        ...(mb.status === 'fulfilled' ? mb.value : []),
        ...(ol.status === 'fulfilled' ? ol.value : []),
        ...(gb.status === 'fulfilled' ? gb.value : [])
      ]
      return results.sort((a, b) => b.confidence - a.confidence).slice(0, 12)
    }
  )
}
