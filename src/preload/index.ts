import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '../shared/types'

const api = {
  files: {
    openDialog: (opts: {
      title?: string
      filters?: { name: string; extensions: string[] }[]
      multiple?: boolean
      directory?: boolean
    }): Promise<string[]> => ipcRenderer.invoke(IPC.FILES_OPEN_DIALOG, opts),

    checkExists: (path: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC.FILES_CHECK_EXISTS, path),

    showItem: (path: string): void => {
      ipcRenderer.invoke(IPC.FILES_SHOW_ITEM, path)
    }
  },

  audio: {
    probe: (path: string) => ipcRenderer.invoke(IPC.AUDIO_PROBE, path),
    readCover: (paths: string[]) => ipcRenderer.invoke(IPC.AUDIO_READ_COVER, paths)
  },

  metadata: {
    readEmbedded: (paths: string[]) =>
      ipcRenderer.invoke(IPC.METADATA_READ_EMBEDDED, paths),
    lookup: (query: { title: string; author: string }) =>
      ipcRenderer.invoke(IPC.METADATA_LOOKUP, query)
  },

  convert: {
    start: (payload: unknown) => ipcRenderer.invoke(IPC.CONVERT_START, payload),
    cancel: () => ipcRenderer.invoke(IPC.CONVERT_CANCEL),
    onProgress: (cb: (data: unknown) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: unknown): void => cb(data)
      ipcRenderer.on(IPC.CONVERT_PROGRESS, handler)
      return () => ipcRenderer.removeListener(IPC.CONVERT_PROGRESS, handler)
    }
  },

  whisper: {
    transcribe: (model: string, audioPaths: string[]): Promise<string> =>
      ipcRenderer.invoke(IPC.WHISPER_TRANSCRIBE, model, audioPaths),
    cancel: (): void => { ipcRenderer.invoke(IPC.WHISPER_CANCEL) },
    checkModel: (model: string): Promise<{ modelReady: boolean; binaryReady: boolean }> =>
      ipcRenderer.invoke(IPC.WHISPER_CHECK_MODEL, model),
    storageInfo: (): Promise<unknown> =>
      ipcRenderer.invoke(IPC.WHISPER_STORAGE_INFO),
    deleteBinary: (): Promise<void> =>
      ipcRenderer.invoke(IPC.WHISPER_DELETE_BINARY),
    deleteModel: (model: string): Promise<void> =>
      ipcRenderer.invoke(IPC.WHISPER_DELETE_MODEL, model),
    onProgress: (cb: (data: unknown) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: unknown): void => cb(data)
      ipcRenderer.on(IPC.WHISPER_PROGRESS, handler)
      return () => ipcRenderer.removeListener(IPC.WHISPER_PROGRESS, handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
