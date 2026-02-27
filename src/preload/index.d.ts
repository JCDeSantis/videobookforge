import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  ProbeResult,
  BookMetadata,
  CoverArt,
  MetadataLookupResult,
  ConversionProgress,
  AudioFile,
  BackgroundConfig,
  ConversionOptions,
  WhisperModel,
  WhisperProgress,
  WhisperStorageInfo
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
  whisper: {
    transcribe(model: WhisperModel, audioPaths: string[]): Promise<string>
    cancel(): void
    checkModel(model: WhisperModel): Promise<{ modelReady: boolean; binaryReady: boolean }>
    storageInfo(): Promise<WhisperStorageInfo>
    deleteBinary(): Promise<void>
    deleteModel(model: WhisperModel): Promise<void>
    onProgress(cb: (data: WhisperProgress) => void): () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
