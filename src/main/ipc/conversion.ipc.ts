import { ipcMain, BrowserWindow } from 'electron'
import { startConversion, cancelConversion } from '../ffmpeg/convert'
import type { AudioFile, BackgroundConfig, BookMetadata, ConversionOptions } from '../../shared/types'
import { IPC } from '../../shared/types'

interface ConvertStartPayload {
  audioFiles: AudioFile[]
  srtPath: string | null
  background: BackgroundConfig
  metadata: BookMetadata
  options: ConversionOptions
}

export function registerConversionIpc(): void {
  ipcMain.handle(IPC.CONVERT_START, async (event, payload: ConvertStartPayload) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    await startConversion(
      win,
      payload.audioFiles,
      payload.srtPath,
      payload.background,
      payload.metadata,
      payload.options
    )
  })

  ipcMain.handle(IPC.CONVERT_CANCEL, () => {
    cancelConversion()
  })
}
