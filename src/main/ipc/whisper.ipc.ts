import { ipcMain, BrowserWindow } from 'electron'
import { transcribeAudio, cancelTranscription } from '../whisper/transcribe'
import { isModelDownloaded } from '../whisper/models'
import { isBinaryDownloaded } from '../whisper/binary'
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
}
