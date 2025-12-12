import { contextBridge, ipcRenderer, webUtils } from 'electron';

interface FileInfo {
  path: string;
  title: string;
  duration: number;
}

interface ProcessOptions {
  files: FileInfo[];
  outputFormat: 'm4b' | 'aac' | 'mp3';
  bitrate: string;
}

contextBridge.exposeInMainWorld('electron', {
  openFiles: () => ipcRenderer.invoke('dialog:open-files'),
  audio: {
    getPathForFile: (file: File) => {
      const path = webUtils.getPathForFile(file);
      console.log('[PRELOAD] getPathForFile:', file.name, '->', path);
      return path;
    },
    readMetadata: (filePath: string) => ipcRenderer.invoke('audio:read-metadata', filePath),
    process: (options: ProcessOptions) => ipcRenderer.invoke('audio:process', options),
    onProgress: (callback: (progress: { percent: number; timemark: string }) => void) => {
      ipcRenderer.on('audio:progress', (_, progress) => callback(progress));
    },
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners('audio:progress');
    },
  },
});

