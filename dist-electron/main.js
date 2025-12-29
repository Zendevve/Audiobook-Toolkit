import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import os from "os";
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
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
  }
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: !isDev
      // Enable in production, disable in dev for CORS
    },
    autoHideMenuBar: true,
    backgroundColor: "#050506",
    title: "Audiobook Toolkit",
    frame: false,
    // Frameless for custom titlebar
    minWidth: 900,
    minHeight: 600
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
ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("window:close", () => mainWindow?.close());
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);
ipcMain.handle("audio:read-metadata", async (_event, filePath) => {
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
      });
    });
  });
});
ipcMain.handle("dialog:open-files", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Audio Files",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Audio Files", extensions: ["mp3", "m4a", "m4b", "aac", "wav", "flac", "ogg"] }
    ]
  });
  return result.filePaths;
});
ipcMain.handle("audio:show-save-dialog", async () => {
  const result = await dialog.showSaveDialog({
    title: "Save Audiobook",
    defaultPath: "audiobook.m4b",
    filters: [
      { name: "M4B Audiobook", extensions: ["m4b"] },
      { name: "AAC Audio", extensions: ["aac"] },
      { name: "MP3 Audio", extensions: ["mp3"] }
    ]
  });
  return result.filePath;
});
ipcMain.handle("project:save", async (_event, projectData) => {
  const result = await dialog.showSaveDialog({
    title: "Save Project",
    defaultPath: "audiobook-project.adbp",
    filters: [
      { name: "Audiobook Toolkit Project", extensions: ["adbp"] },
      { name: "JSON Files", extensions: ["json"] }
    ]
  });
  if (!result.filePath) {
    return { success: false, cancelled: true };
  }
  try {
    fs.writeFileSync(result.filePath, JSON.stringify(projectData, null, 2), "utf8");
    console.log("[PROJECT] Saved to:", result.filePath);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error("[PROJECT] Save error:", err);
    return { success: false, error: err.message };
  }
});
ipcMain.handle("project:load", async (_event, filePath) => {
  let targetPath = filePath;
  if (!targetPath) {
    const result = await dialog.showOpenDialog({
      title: "Open Project",
      properties: ["openFile"],
      filters: [
        { name: "Audiobook Toolkit Project", extensions: ["adbp", "json"] }
      ]
    });
    if (!result.filePaths || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }
    targetPath = result.filePaths[0];
  }
  try {
    const content = fs.readFileSync(targetPath, "utf8");
    const projectData = JSON.parse(content);
    console.log("[PROJECT] Loaded from:", targetPath);
    return { success: true, data: projectData, filePath: targetPath };
  } catch (err) {
    console.error("[PROJECT] Load error:", err);
    return { success: false, error: err.message };
  }
});
ipcMain.handle("audio:detect-artwork", async (_event, filePaths) => {
  if (!filePaths || filePaths.length === 0) {
    return { found: false };
  }
  console.log("[ARTWORK] Scanning for artwork from", filePaths.length, "files");
  const firstFilePath = filePaths[0];
  const fileDir = path.dirname(firstFilePath);
  const coverNames = [
    "cover.jpg",
    "cover.jpeg",
    "cover.png",
    "folder.jpg",
    "folder.jpeg",
    "folder.png",
    "album.jpg",
    "album.jpeg",
    "album.png",
    "front.jpg",
    "front.jpeg",
    "front.png",
    "artwork.jpg",
    "artwork.jpeg",
    "artwork.png"
  ];
  for (const coverName of coverNames) {
    const coverPath = path.join(fileDir, coverName);
    if (fs.existsSync(coverPath)) {
      console.log("[ARTWORK] Found cover file:", coverPath);
      try {
        const imageBuffer = fs.readFileSync(coverPath);
        const base64 = imageBuffer.toString("base64");
        const ext = path.extname(coverPath).toLowerCase().slice(1);
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        return {
          found: true,
          source: "folder",
          data: `data:${mimeType};base64,${base64}`
        };
      } catch (err) {
        console.error("[ARTWORK] Error reading cover file:", err);
      }
    }
  }
  for (const filePath of filePaths) {
    try {
      const tempCoverPath = path.join(os.tmpdir(), `cover_${Date.now()}.jpg`);
      await new Promise((resolve, _reject) => {
        ffmpeg(filePath).outputOptions(["-an", "-vcodec", "copy"]).output(tempCoverPath).on("end", () => resolve()).on("error", (_err) => {
          resolve();
        }).run();
      });
      if (fs.existsSync(tempCoverPath)) {
        const stats = fs.statSync(tempCoverPath);
        if (stats.size > 0) {
          console.log("[ARTWORK] Extracted embedded artwork from:", filePath);
          const imageBuffer = fs.readFileSync(tempCoverPath);
          const base64 = imageBuffer.toString("base64");
          fs.unlinkSync(tempCoverPath);
          return {
            found: true,
            source: "embedded",
            data: `data:image/jpeg;base64,${base64}`
          };
        }
        fs.unlinkSync(tempCoverPath);
      }
    } catch (err) {
    }
  }
  console.log("[ARTWORK] No artwork found");
  return { found: false };
});
ipcMain.handle("audio:process", async (_event, options) => {
  const { files, bitrate, outputFormat, coverPath, bookMetadata, defaultOutputDirectory } = options;
  if (!files || files.length === 0) {
    throw new Error("No files to process");
  }
  console.log("[MERGE] Starting merge with", files.length, "files");
  files.forEach((f, i) => console.log(`[MERGE] File ${i}:`, f.path, "duration:", f.duration));
  const defaultExt = outputFormat === "mp3" ? "mp3" : outputFormat === "aac" ? "m4a" : "m4b";
  let defaultPath = `audiobook.${defaultExt}`;
  if (defaultOutputDirectory) {
    defaultPath = path.join(defaultOutputDirectory, defaultPath);
  }
  const result = await dialog.showSaveDialog({
    title: "Save Audiobook",
    defaultPath,
    filters: [
      { name: "M4B Audiobook", extensions: ["m4b"] },
      { name: "MP3 Audio", extensions: ["mp3"] },
      { name: "AAC Audio", extensions: ["m4a"] }
    ]
  });
  if (!result.filePath) {
    return { success: false, cancelled: true };
  }
  const outputPath = result.filePath;
  console.log("[MERGE] Output path:", outputPath);
  const tempDir = os.tmpdir();
  const metadataFilePath = path.join(tempDir, `metadata_${Date.now()}.txt`);
  let metadataContent = ";FFMETADATA1\n";
  let currentTime = 0;
  const isMP3 = outputFormat === "mp3" || outputPath.endsWith(".mp3");
  if (!isMP3) {
    files.forEach((file, index) => {
      const startMs = Math.floor(currentTime * 1e3);
      const endMs = Math.floor((currentTime + file.duration) * 1e3);
      metadataContent += `[CHAPTER]
`;
      metadataContent += `TIMEBASE=1/1000
`;
      metadataContent += `START=${startMs}
`;
      metadataContent += `END=${endMs}
`;
      metadataContent += `title=${file.title || `Chapter ${index + 1}`}
`;
      currentTime += file.duration;
    });
  }
  fs.writeFileSync(metadataFilePath, metadataContent, "utf8");
  console.log("[MERGE] Metadata written to:", metadataFilePath);
  return new Promise((resolve, reject) => {
    const codec = isMP3 ? "libmp3lame" : "aac";
    const inputLabels = files.map((_, i) => `[${i}:a]`).join("");
    const filterComplex = `${inputLabels}concat=n=${files.length}:v=0:a=1[outa]`;
    console.log("[MERGE] Filter complex:", filterComplex);
    console.log("[MERGE] Using codec:", codec, "bitrate:", bitrate || "128k");
    let command = ffmpeg();
    files.forEach((file) => {
      command = command.input(file.path);
    });
    const metadataInputIndex = files.length;
    command = command.input(metadataFilePath);
    let coverInputIndex = -1;
    if (coverPath && fs.existsSync(coverPath) && !isMP3) {
      coverInputIndex = metadataInputIndex + 1;
      command = command.input(coverPath);
      console.log("[MERGE] Cover image added at input", coverInputIndex, ":", coverPath);
    }
    const outputOptions = [
      "-filter_complex",
      filterComplex,
      "-map",
      "[outa]",
      "-c:a",
      codec,
      "-b:a",
      bitrate || "128k"
    ];
    if (coverInputIndex >= 0) {
      outputOptions.push("-map", `${coverInputIndex}:v`);
      outputOptions.push("-c:v", "mjpeg");
      outputOptions.push("-disposition:v", "attached_pic");
    }
    if (!isMP3) {
      outputOptions.push("-map_metadata", String(metadataInputIndex));
      if (bookMetadata) {
        if (bookMetadata.title) outputOptions.push("-metadata", `title=${bookMetadata.title}`);
        if (bookMetadata.author) outputOptions.push("-metadata", `artist=${bookMetadata.author}`);
        if (bookMetadata.author) outputOptions.push("-metadata", `album_artist=${bookMetadata.author}`);
        if (bookMetadata.genre) outputOptions.push("-metadata", `genre=${bookMetadata.genre}`);
        if (bookMetadata.year) outputOptions.push("-metadata", `date=${bookMetadata.year}`);
        if (bookMetadata.narrator) outputOptions.push("-metadata", `composer=${bookMetadata.narrator}`);
      }
    }
    command.outputOptions(outputOptions).output(outputPath).on("start", (cmd) => {
      console.log("[MERGE] FFmpeg command:", cmd);
    }).on("stderr", (stderrLine) => {
      if (stderrLine.includes("Error") || stderrLine.includes("error") || stderrLine.includes("Opening") || stderrLine.includes("Output")) {
        console.log("[MERGE] FFmpeg:", stderrLine);
      }
    }).on("progress", (progress) => {
      const pct = progress.percent || 0;
      if (pct > 0) {
        console.log("[MERGE] Progress:", pct.toFixed(1) + "%");
      }
      if (mainWindow) {
        mainWindow.webContents.send("audio:progress", {
          percent: pct,
          timemark: progress.timemark
        });
      }
    }).on("end", () => {
      console.log("[MERGE] FFmpeg completed successfully!");
      console.log("[MERGE] Output file:", outputPath);
      try {
        fs.unlinkSync(metadataFilePath);
      } catch {
      }
      resolve({ success: true, outputPath });
    }).on("error", (err, _stdout, stderr) => {
      console.error("[MERGE] FFmpeg error:", err.message);
      console.error("[MERGE] FFmpeg stderr:", stderr);
      try {
        fs.unlinkSync(metadataFilePath);
      } catch {
      }
      reject(err);
    });
    command.run();
  });
});
const SETTINGS_FILE = path.join(app.getPath("userData"), "settings.json");
ipcMain.handle("settings:read", async () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("[SETTINGS] Failed to read settings:", err);
  }
  return {};
});
ipcMain.handle("settings:write", async (_event, settings) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
    return { success: true };
  } catch (err) {
    console.error("[SETTINGS] Failed to write settings:", err);
    return { success: false, error: err.message };
  }
});
ipcMain.handle("settings:select-directory", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Default Output Directory",
    properties: ["openDirectory", "createDirectory"]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});
const RECENT_PROJECTS_FILE = path.join(app.getPath("userData"), "recent_projects.json");
const getRecentProjects = () => {
  try {
    if (fs.existsSync(RECENT_PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(RECENT_PROJECTS_FILE, "utf8"));
    }
  } catch (err) {
    console.error("[RECENT] Failed to read recent projects:", err);
  }
  return [];
};
ipcMain.handle("recent:read", async () => {
  return getRecentProjects();
});
ipcMain.handle("recent:add", async (_event, filePath) => {
  try {
    const projects = getRecentProjects();
    const name = path.basename(filePath, path.extname(filePath));
    const filtered = projects.filter((p) => p.path !== filePath);
    filtered.unshift({ path: filePath, name, lastOpened: Date.now() });
    const limited = filtered.slice(0, 10);
    fs.writeFileSync(RECENT_PROJECTS_FILE, JSON.stringify(limited, null, 2));
    return limited;
  } catch (err) {
    console.error("[RECENT] Failed to add recent project:", err);
    return [];
  }
});
ipcMain.handle("recent:clear", async () => {
  try {
    fs.writeFileSync(RECENT_PROJECTS_FILE, "[]");
    return [];
  } catch (err) {
    console.error("[RECENT] Failed to clear recent projects:", err);
    return [];
  }
});
async function convertAudioFile(inputPath, outputFormat, bitrate = "128k", progressCallback) {
  try {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    const parsedPath = path.parse(inputPath);
    let outputPath = path.join(parsedPath.dir, `${parsedPath.name}.${outputFormat}`);
    if (inputPath === outputPath) {
      outputPath = path.join(parsedPath.dir, `${parsedPath.name}_converted.${outputFormat}`);
    }
    const validBitrates = ["64k", "96k", "128k", "192k", "256k", "320k"];
    if (!validBitrates.includes(bitrate)) {
      console.warn(`[CONVERT] Invalid bitrate '${bitrate}', defaulting to 128k`);
      bitrate = "128k";
    }
    let codec;
    let container;
    switch (outputFormat) {
      case "m4b":
        codec = "aac";
        container = "ipod";
        break;
      case "m4a":
        codec = "aac";
        container = "mp4";
        break;
      case "mp3":
        codec = "libmp3lame";
        container = "mp3";
        break;
      case "aac":
        codec = "aac";
        container = "adts";
        break;
      default:
        throw new Error(`Unsupported format: ${outputFormat}`);
    }
    console.log(`[CONVERT] ${inputPath} -> ${outputPath} (${codec})`);
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath).audioCodec(codec).audioBitrate(bitrate).format(container).outputOptions(["-map_metadata", "0"]).on("start", (cmdLine) => {
        console.log("[CONVERT] FFmpeg command:", cmdLine);
      }).on("progress", (progress) => {
        if (progressCallback) {
          progressCallback(progress.percent || 0, progress.timemark);
        }
      }).on("end", () => {
        console.log("[CONVERT] Conversion complete:", outputPath);
        resolve({ success: true, inputPath, outputPath });
      }).on("error", (err) => {
        console.error("[CONVERT] FFmpeg error:", err.message);
        reject({ success: false, inputPath, error: err.message });
      }).save(outputPath);
    });
  } catch (err) {
    console.error("[CONVERT] Error:", err);
    return {
      success: false,
      inputPath,
      error: err.message
    };
  }
}
ipcMain.handle("audio:convert", async (_event, request) => {
  const { inputPath, outputFormat, bitrate } = request;
  return convertAudioFile(inputPath, outputFormat, bitrate, (percent, currentTime) => {
    if (_event.sender && !_event.sender.isDestroyed()) {
      _event.sender.send("audio:convertProgress", {
        inputPath,
        percent,
        currentTime
      });
    }
  });
});
ipcMain.handle("audio:batchConvert", async (_event, requests) => {
  const results = [];
  for (const request of requests) {
    const result = await convertAudioFile(request.inputPath, request.outputFormat, request.bitrate);
    results.push(result);
  }
  return results;
});
