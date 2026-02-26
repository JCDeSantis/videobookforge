import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import type { WhisperModel, WhisperModelInfo } from '../../shared/types'

export const WHISPER_MODELS: WhisperModelInfo[] = [
  {
    id: 'tiny',
    name: 'Tiny',
    size: '78 MB',
    sizeBytes: 77704960,
    description: 'Fastest — basic accuracy, good for clear narration'
  },
  {
    id: 'base',
    name: 'Base',
    size: '148 MB',
    sizeBytes: 147964832,
    description: 'Fast — solid accuracy for most audiobooks'
  },
  {
    id: 'small',
    name: 'Small',
    size: '488 MB',
    sizeBytes: 487636544,
    description: 'Balanced — recommended for best results'
  },
  {
    id: 'medium',
    name: 'Medium',
    size: '1.5 GB',
    sizeBytes: 1533774848,
    description: 'Slow — highest accuracy, multiple speakers'
  }
]

const HF_BASE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main'

export function getModelUrl(model: WhisperModel): string {
  return `${HF_BASE}/ggml-${model}.bin`
}

export function getModelDir(): string {
  return join(app.getPath('userData'), 'whisper', 'models')
}

export function getModelPath(model: WhisperModel): string {
  return join(getModelDir(), `ggml-${model}.bin`)
}

export function isModelDownloaded(model: WhisperModel): boolean {
  return existsSync(getModelPath(model))
}
