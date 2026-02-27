export interface AudioFile {
  id: string
  path: string
  name: string
  duration: number // seconds
  format: 'm4b' | 'mp3' | 'unknown'
  size: number // bytes
}

export interface BookMetadata {
  title: string
  author: string
  narrator: string
  series: string
  seriesPart: string
  year: string
  genre: string
  publisher: string
  description: string
}

export interface CoverArt {
  base64: string // full data URI e.g. "data:image/jpeg;base64,..."
  mimeType: string
}

export type BackgroundType = 'cover' | 'image' | 'solid' | 'gradient'

export interface BackgroundConfig {
  type: BackgroundType
  imagePath?: string
  coverBase64?: string
  color?: string // hex e.g. "#1a1a2e"
  gradientFrom?: string // hex
  gradientTo?: string // hex
  gradientDirection?: 'to-right' | 'to-bottom' | 'to-br' | 'to-tr'
}

export type OutputFormat = 'mkv' | 'mp4'
export type VideoResolution = '1280x720' | '1920x1080'

export interface ConversionOptions {
  outputPath: string
  format: OutputFormat
  resolution: VideoResolution
  burnSubtitles: boolean
}

export interface MetadataLookupResult {
  id: string
  source: 'musicbrainz' | 'openlibrary' | 'googlebooks'
  title: string
  author: string
  narrator?: string
  series?: string
  year?: string
  genre?: string
  publisher?: string
  description?: string
  coverUrl?: string
  confidence: number
}

export type ConversionPhase = 'probing' | 'concat' | 'converting' | 'done' | 'error'

export interface ConversionProgress {
  phase: ConversionPhase
  percent: number
  message?: string
  errorMessage?: string
  outputPath?: string
  elapsed?: number       // seconds converted so far
  totalDuration?: number // total audio seconds
}

export interface ProbeResult {
  duration: number
  format: string
  tags: Record<string, string>
  hasCoverArt: boolean
}

export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium'

export interface WhisperModelInfo {
  id: WhisperModel
  name: string
  size: string
  sizeBytes: number
  description: string
}

export type WhisperPhase =
  | 'idle'
  | 'downloading-binary'
  | 'downloading-model'
  | 'preparing'
  | 'transcribing'
  | 'done'
  | 'error'

export interface WhisperProgress {
  phase: WhisperPhase
  percent: number
  message?: string
  errorMessage?: string
  srtPath?: string
  text?: string             // live transcript segment text
  segmentTimestamp?: string // "HH:MM:SS" start time for the segment
  elapsed?: number          // seconds of audio processed so far
  totalDuration?: number    // total audio duration in seconds
}

export const IPC = {
  FILES_OPEN_DIALOG: 'files:open-dialog',
  FILES_CHECK_EXISTS: 'files:check-exists',
  FILES_SHOW_ITEM: 'files:show-item',
  AUDIO_PROBE: 'audio:probe',
  AUDIO_READ_COVER: 'audio:read-cover',
  METADATA_READ_EMBEDDED: 'metadata:read-embedded',
  METADATA_LOOKUP: 'metadata:lookup',
  CONVERT_START: 'convert:start',
  CONVERT_CANCEL: 'convert:cancel',
  CONVERT_PROGRESS: 'convert:progress',
  WHISPER_TRANSCRIBE: 'whisper:transcribe',
  WHISPER_CANCEL: 'whisper:cancel',
  WHISPER_PROGRESS: 'whisper:progress',
  WHISPER_CHECK_MODEL: 'whisper:check-model',
} as const
