import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerFilesIpc } from './ipc/files.ipc'
import { registerMetadataIpc } from './ipc/metadata.ipc'
import { registerConversionIpc } from './ipc/conversion.ipc'
import { registerWhisperIpc } from './ipc/whisper.ipc'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1140,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'VideoBook Forge',
    backgroundColor: '#09090b',
    icon: join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.videobookforge')

  registerFilesIpc()
  registerMetadataIpc()
  registerConversionIpc()
  registerWhisperIpc()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
