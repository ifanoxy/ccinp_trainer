// Path: src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Contrôles fenêtre
  windowMin: () => ipcRenderer.invoke('window-min'),
  windowMax: () => ipcRenderer.invoke('window-max'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // Données
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfiles: (profiles) => ipcRenderer.invoke('save-profiles', profiles),
  deleteData: (profileId) => ipcRenderer.invoke('delete-data', profileId),
  getProgress: (profileId) => ipcRenderer.invoke('get-progress', profileId),
  saveProgress: (profileId, record) => ipcRenderer.invoke('save-progress', profileId, record),
  getNotes: (profileId) => ipcRenderer.invoke('get-notes', profileId),
  saveNote: (profileId, note) => ipcRenderer.invoke('save-note', profileId, note),
  checkExercises: () => ipcRenderer.invoke('check-exercises'),
  importExercises: () => ipcRenderer.invoke('import-exercises'),
  getBasePath: () => ipcRenderer.invoke('get-base-path')
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