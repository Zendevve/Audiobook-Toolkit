"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  audio: {
    readMetadata: (filePath) => electron.ipcRenderer.invoke("audio:read-metadata", filePath)
  },
  ping: () => electron.ipcRenderer.invoke("ping")
});
