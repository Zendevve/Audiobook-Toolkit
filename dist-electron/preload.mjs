import { contextBridge, ipcRenderer, webUtils } from "electron";
contextBridge.exposeInMainWorld("electron", {
  openFiles: () => ipcRenderer.invoke("dialog:open-files"),
  audio: {
    getPathForFile: (file) => {
      const path = webUtils.getPathForFile(file);
      console.log("[PRELOAD] getPathForFile:", file.name, "->", path);
      return path;
    },
    readMetadata: (filePath) => ipcRenderer.invoke("audio:read-metadata", filePath),
    process: (options) => ipcRenderer.invoke("audio:process", options),
    onProgress: (callback) => {
      ipcRenderer.on("audio:progress", (_, progress) => callback(progress));
    },
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners("audio:progress");
    }
  }
});
