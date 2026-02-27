import { ipcMain, BrowserWindow } from 'electron'
import { transcribeAudio, cancelTranscription } from '../whisper/transcribe'
import { isModelDownloaded, deleteModel, WHISPER_MODELS } from '../whisper/models'
import {
  isBinaryDownloaded,
  isGpuEnabled,
  deleteBinary,
  WHISPER_VERSION
} from '../whisper/binary'
import type { WhisperModel } from '../../shared/types'
import { IPC } from '../../shared/types'

export function registerWhisperIpc(): void {
  ipcMain.handle(IPC.WHISPER_TRANSCRIBE, async (event, model: WhisperModel, audioPaths: string[]) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return transcribeAudio(win, audioPaths, model)
  })

  ipcMain.handle(IPC.WHISPER_CANCEL, () => {
    cancelTranscription()
  })

  ipcMain.handle(IPC.WHISPER_CHECK_MODEL, (_event, model: WhisperModel) => {
    return {
      modelReady: isModelDownloaded(model),
      binaryReady: isBinaryDownloaded()
    }
  })

  ipcMain.handle(IPC.WHISPER_STORAGE_INFO, () => {
    return {
      binaryReady: isBinaryDownloaded(),
      binaryVersion: WHISPER_VERSION,
      gpuEnabled: isGpuEnabled(),
      models: WHISPER_MODELS.map((m) => ({
        id: m.id,
        name: m.name,
        size: m.size,
        downloaded: isModelDownloaded(m.id)
      }))
    }
  })

  ipcMain.handle(IPC.WHISPER_DELETE_BINARY, () => {
    deleteBinary()
  })

  ipcMain.handle(IPC.WHISPER_DELETE_MODEL, (_event, model: WhisperModel) => {
    return deleteModel(model)
  })
}
