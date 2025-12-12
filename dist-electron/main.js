import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
const require$1 = createRequire(import.meta.url);
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
try {
  if (require$1("electron-squirrel-startup")) {
    app.quit();
  }
} catch {
}
let mainWindow = null;
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    // Hide the menu bar by default for a cleaner look
    autoHideMenuBar: true,
    // Dark theme frame
    backgroundColor: "#1a1a1a",
    title: "ADB Binder",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#1a1a1a",
      symbolColor: "#ffffff",
      height: 30
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
};
app.on("ready", createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);
ipcMain.handle("audio:read-metadata", async (_, filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("Error reading metadata:", err);
        reject(err);
        return;
      }
      const format = metadata.format;
      const common = format.tags || {};
      resolve({
        path: filePath,
        duration: format.duration || 0,
        title: common.title || path.basename(filePath),
        artist: common.artist || "Unknown Artist",
        album: common.album || "Unknown Album"
        // Cover art extraction is more complex, postponing for now
      });
    });
  });
});
