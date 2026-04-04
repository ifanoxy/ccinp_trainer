// Path: src/main/index.ts

import { app, shell, BrowserWindow, ipcMain, protocol, net, dialog, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import fs from 'fs'

const userDataPath = app.getPath('userData')
const exercicesPath = join(userDataPath, 'exercices')
const profilesPath = join(userDataPath, 'ccinp_profiles.json')

const getProgressPath = (profileId: string) => join(userDataPath, `ccinp_progress_${profileId}.csv`)
const getNotesPath = (profileId: string) => join(userDataPath, `ccinp_notes_${profileId}.json`)

protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true } }
])

function createWindow(): void {
  const iconPath = is.dev
      ? join(__dirname, '../../resources/icon.png')
      : join(process.resourcesPath, 'app.asar.unpacked/resources/icon.png')

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    frame: false, // <-- SUPPRIME LES BORDURES WINDOWS
    titleBarStyle: 'hidden',
    show: false,
    title: "CCINP Oral Trainer",
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false // Facilite le chargement local sans bloquer sur le CSP
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // --- NOUVEAU: IPC POUR LA BARRE DE TITRE ---
  ipcMain.handle('window-min', () => mainWindow.minimize())
  ipcMain.handle('window-max', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
  ipcMain.handle('window-close', () => mainWindow.close())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.ccinp.trainer')

  protocol.handle('local', (request) => {
    const relativePath = request.url.replace('local://', '')
    const absolutePath = join(exercicesPath, decodeURIComponent(relativePath))
    return net.fetch('file:///' + absolutePath.replace(/\\/g, '/'))
  })

  ipcMain.handle('check-exercises', () => fs.existsSync(join(exercicesPath, 'Analyse')))
  ipcMain.handle('import-exercises', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'], title: "Sélectionnez le dossier contenant les exercices PDF" })
    if (result.canceled) return { success: false }
    try {
      if (!fs.existsSync(exercicesPath)) fs.mkdirSync(exercicesPath, { recursive: true })
      fs.cpSync(result.filePaths[0], exercicesPath, { recursive: true })
      return { success: true }
    } catch (err: any) { return { success: false, error: err.message } }
  })

  ipcMain.handle('get-profiles', () => {
    if (!fs.existsSync(profilesPath)) return [{ id: 'default', name: 'Mon Profil', isIncognito: false }]
    return JSON.parse(fs.readFileSync(profilesPath, 'utf-8'))
  })

  ipcMain.handle('save-profiles', (_event, profiles) => {
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2))
    return profiles
  })

  ipcMain.handle('delete-data', (_event, profileId: string) => {
    const pCsv = getProgressPath(profileId); const pNotes = getNotesPath(profileId);
    if (fs.existsSync(pCsv)) fs.unlinkSync(pCsv); if (fs.existsSync(pNotes)) fs.unlinkSync(pNotes);
    return true;
  })

  ipcMain.handle('get-progress', (_event, profileId: string) => {
    const path = getProgressPath(profileId)
    if (!fs.existsSync(path)) return []
    const lines = fs.readFileSync(path, 'utf-8').split('\n').filter(l => l.trim().length > 0)
    return lines.slice(1).map(line => {
      const [id, type, score, timeSpent, date] = line.split(',')
      return { id: parseInt(id), type, score: parseInt(score), timeSpent: parseInt(timeSpent), date }
    })
  })

  ipcMain.handle('save-progress', (_event, profileId: string, record) => {
    const path = getProgressPath(profileId)
    const header = "id,type,score,timeSpent,date\n"
    const currentData = fs.existsSync(path) ? fs.readFileSync(path, 'utf-8').split('\n').filter(l => l.trim().length > 0).slice(1) : []
    currentData.push(`${record.id},${record.type},${record.score},${record.timeSpent},${record.date}`)
    fs.writeFileSync(path, header + currentData.join('\n'))
    return currentData.map(line => {
      const [id, type, score, timeSpent, date] = line.split(',')
      return { id: parseInt(id), type, score: parseInt(score), timeSpent: parseInt(timeSpent), date }
    })
  })

  ipcMain.handle('get-notes', (_event, profileId: string) => {
    const path = getNotesPath(profileId)
    if (!fs.existsSync(path)) return {}
    return JSON.parse(fs.readFileSync(path, 'utf-8'))
  })

  ipcMain.handle('save-note', (_event, profileId: string, note) => {
    const path = getNotesPath(profileId)
    const notes = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf-8')) : {}
    notes[note.id] = note
    fs.writeFileSync(path, JSON.stringify(notes, null, 2))
    return notes
  })

  ipcMain.handle('get-base-path', () => exercicesPath)

  createWindow()
  app.on('activate', function () { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })