import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  audio: {
    readMetadata: (filePath: string) => ipcRenderer.invoke('audio:read-metadata', filePath),
  },
  ping: () => ipcRenderer.invoke('ping'),
});
