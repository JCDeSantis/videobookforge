import { create } from 'zustand'
import type {
  AudioFile,
  BookMetadata,
  CoverArt,
  BackgroundConfig,
  MetadataLookupResult,
  ConversionProgress,
  WhisperModel,
  WhisperProgress,
  SubtitleSource
} from '@shared/types'

const defaultMetadata: BookMetadata = {
  title: '',
  author: '',
  narrator: '',
  series: '',
  seriesPart: '',
  year: '',
  genre: '',
  publisher: '',
  description: ''
}

const defaultBackground: BackgroundConfig = {
  type: 'cover',
  color: '#000000',
  gradientFrom: '#000000',
  gradientTo: '#8b0000',
  gradientDirection: 'to-br'
}

interface ProjectStore {
  // Navigation
  currentStep: number
  setCurrentStep: (step: number) => void
  resetProject: () => void

  // Step 1 — Import
  audioFiles: AudioFile[]
  srtPath: string | null
  subtitleSource: SubtitleSource
  setAudioFiles: (files: AudioFile[]) => void
  addAudioFiles: (files: AudioFile[]) => void
  removeAudioFile: (id: string) => void
  reorderAudioFiles: (activeId: string, overId: string) => void
  setSrtPath: (path: string | null) => void
  setSubtitleSource: (source: SubtitleSource) => void

  // Step 2 — Metadata
  metadata: BookMetadata
  coverArt: CoverArt | null
  lookupResults: MetadataLookupResult[]
  isLookingUp: boolean
  setMetadata: (patch: Partial<BookMetadata>) => void
  setCoverArt: (art: CoverArt | null) => void
  setLookupResults: (results: MetadataLookupResult[]) => void
  setIsLookingUp: (v: boolean) => void
  applyLookupResult: (result: MetadataLookupResult) => void

  // Step 3 — Background
  background: BackgroundConfig
  setBackground: (patch: Partial<BackgroundConfig>) => void

  // Whisper transcription
  whisperModel: WhisperModel
  whisperProgress: WhisperProgress | null
  setWhisperModel: (model: WhisperModel) => void
  setWhisperProgress: (progress: WhisperProgress | null) => void

  // Step 4 — Convert
  outputFormat: 'mkv' | 'mp4'
  outputResolution: '1280x720' | '1920x1080'
  outputPath: string
  burnSubtitles: boolean
  conversionProgress: ConversionProgress | null
  setOutputFormat: (f: 'mkv' | 'mp4') => void
  setOutputResolution: (r: '1280x720' | '1920x1080') => void
  setOutputPath: (path: string) => void
  setBurnSubtitles: (v: boolean) => void
  setConversionProgress: (progress: ConversionProgress | null) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),
  resetProject: () => set({
    currentStep: 0,
    audioFiles: [],
    srtPath: null,
    subtitleSource: 'none',
    metadata: defaultMetadata,
    coverArt: null,
    lookupResults: [],
    isLookingUp: false,
    background: defaultBackground,
    whisperModel: 'small',
    whisperProgress: null,
    outputFormat: 'mkv',
    outputResolution: '1280x720',
    outputPath: '',
    burnSubtitles: true,
    conversionProgress: null
  }),

  // Import
  audioFiles: [],
  srtPath: null,
  subtitleSource: 'none',
  setAudioFiles: (files) => set({ audioFiles: files }),
  addAudioFiles: (incoming) => {
    const existing = get().audioFiles
    const existingPaths = new Set(existing.map((f) => f.path))
    const fresh = incoming.filter((f) => !existingPaths.has(f.path))
    set({ audioFiles: [...existing, ...fresh] })
  },
  removeAudioFile: (id) =>
    set({ audioFiles: get().audioFiles.filter((f) => f.id !== id) }),
  reorderAudioFiles: (activeId, overId) => {
    const files = [...get().audioFiles]
    const from = files.findIndex((f) => f.id === activeId)
    const to = files.findIndex((f) => f.id === overId)
    if (from === -1 || to === -1) return
    const [moved] = files.splice(from, 1)
    files.splice(to, 0, moved)
    set({ audioFiles: files })
  },
  setSrtPath: (path) => set({ srtPath: path }),
  setSubtitleSource: (source) => set({ subtitleSource: source }),

  // Metadata
  metadata: defaultMetadata,
  coverArt: null,
  lookupResults: [],
  isLookingUp: false,
  setMetadata: (patch) => set({ metadata: { ...get().metadata, ...patch } }),
  setCoverArt: (art) => set({ coverArt: art }),
  setLookupResults: (results) => set({ lookupResults: results }),
  setIsLookingUp: (v) => set({ isLookingUp: v }),
  applyLookupResult: (result) => {
    const patch: Partial<BookMetadata> = {}
    if (result.title) patch.title = result.title
    if (result.author) patch.author = result.author
    if (result.narrator) patch.narrator = result.narrator
    if (result.series) patch.series = result.series
    if (result.year) patch.year = result.year
    if (result.genre) patch.genre = result.genre
    if (result.publisher) patch.publisher = result.publisher
    if (result.description) patch.description = result.description
    set({ metadata: { ...get().metadata, ...patch } })
  },

  // Background
  background: defaultBackground,
  setBackground: (patch) => set({ background: { ...get().background, ...patch } }),

  // Whisper
  whisperModel: 'small',
  whisperProgress: null,
  setWhisperModel: (model) => set({ whisperModel: model }),
  setWhisperProgress: (progress) => set({ whisperProgress: progress }),

  // Convert
  outputFormat: 'mkv',
  outputResolution: '1280x720',
  outputPath: '',
  burnSubtitles: true,
  conversionProgress: null,
  setOutputFormat: (f) => set({ outputFormat: f }),
  setOutputResolution: (r) => set({ outputResolution: r }),
  setOutputPath: (path) => set({ outputPath: path }),
  setBurnSubtitles: (v) => set({ burnSubtitles: v }),
  setConversionProgress: (progress) => set({ conversionProgress: progress })
}))
