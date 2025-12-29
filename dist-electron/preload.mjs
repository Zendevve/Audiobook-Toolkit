import { contextBridge, ipcRenderer, webUtils } from "electron";
contextBridge.exposeInMainWorld("electron", {
  openFiles: () => ipcRenderer.invoke("dialog:open-files"),
  // Window controls
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  audio: {
    getPathForFile: (file) => {
      const path = webUtils.getPathForFile(file);
      console.log("[PRELOAD] getPathForFile:", file.name, "->", path);
      return path;
    },
    readMetadata: (filePath) => ipcRenderer.invoke("audio:read-metadata", filePath),
    process: (options) => ipcRenderer.invoke("audio:process", options),
    detectArtwork: (filePaths) => ipcRenderer.invoke("audio:detect-artwork", filePaths),
    onProgress: (callback) => {
      ipcRenderer.on("audio:progress", (_, progress) => callback(progress));
    },
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners("audio:progress");
    },
    // Format conversion
    convert: (request) => ipcRenderer.invoke("audio:convert", request),
    batchConvert: (requests) => ipcRenderer.invoke("audio:batchConvert", requests),
    // Chapter Splitter
    readChapters: (filePath) => ipcRenderer.invoke("audio:read-chapters", filePath),
    splitByChapters: (options) => ipcRenderer.invoke("audio:split-by-chapters", options),
    onSplitProgress: (callback) => {
      ipcRenderer.on("audio:split-progress", (_, data) => callback(data));
    }
  },
  // For direct IPC access (required for image upload events)
  ipcRenderer: {
    on: (channel, callback) => {
      ipcRenderer.on(channel, callback);
    },
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  project: {
    save: (projectData) => ipcRenderer.invoke("project:save", projectData),
    load: () => ipcRenderer.invoke("project:load")
  }
});
