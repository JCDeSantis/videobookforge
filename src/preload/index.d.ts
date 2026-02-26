import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  ProbeResult,
  BookMetadata,
  CoverArt,
  MetadataLookupResult,
  ConversionProgress,
  AudioFile,
  BackgroundConfig,
  ConversionOptions
} from '../shared/types'

interface ConvertStartPayload {
  audioFiles: AudioFile[]
  srtPath: string | null
  background: BackgroundConfig
  metadata: BookMetadata
  options: ConversionOptions
}

interface AppAPI {
  files: {
    openDialog(opts: {
      title?: string
      filters?: { name: string; extensions: string[] }[]
      multiple?: boolean
      directory?: boolean
    }): Promise<string[]>
    checkExists(path: string): Promise<boolean>
    showItem(path: string): void
  }
  audio: {
    probe(path: string): Promise<ProbeResult>
    readCover(paths: string[]): Promise<CoverArt | null>
  }
  metadata: {
    readEmbedded(paths: string[]): Promise<{ metadata: Partial<BookMetadata>; coverArt: CoverArt | null }>
    lookup(query: { title: string; author: string }): Promise<MetadataLookupResult[]>
  }
  convert: {
    start(payload: ConvertStartPayload): Promise<void>
    cancel(): Promise<void>
    onProgress(cb: (data: ConversionProgress) => void): () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
