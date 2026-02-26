import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { existsSync } from 'fs'
import { IPC } from '../../shared/types'

interface OpenDialogOpts {
  title?: string
  filters?: { name: string; extensions: string[] }[]
  multiple?: boolean
  directory?: boolean
}

export function registerFilesIpc(): void {
  ipcMain.handle(IPC.FILES_OPEN_DIALOG, async (event, opts: OpenDialogOpts) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const properties: Electron.OpenDialogOptions['properties'] = opts.directory
      ? ['openDirectory']
      : opts.multiple
        ? ['openFile', 'multiSelections']
        : ['openFile']

    const result = await dialog.showOpenDialog(win, {
      title: opts.title,
      filters: opts.filters,
      properties
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle(IPC.FILES_CHECK_EXISTS, (_event, filePath: string) => {
    return existsSync(filePath)
  })

  ipcMain.handle(IPC.FILES_SHOW_ITEM, (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}
