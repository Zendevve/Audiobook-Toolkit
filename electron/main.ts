import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch { /* electron-squirrel-startup not available, ignore */ }

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false, // temporarily disable for debugging local resources if needed, though sandbox: false is usually enough
    },
    // Hide the menu bar by default for a cleaner look
    autoHideMenuBar: true,
    // Dark theme frame
    backgroundColor: '#1a1a1a',
    title: 'ADB Binder',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1a',
      symbolColor: '#ffffff',
      height: 30
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

import { ipcMain, dialog } from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'fs';
import os from 'os';

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath.path);

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

// IPC Handlers
ipcMain.handle('audio:read-metadata', async (_event: Electron.IpcMainInvokeEvent, filePath: string) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error reading metadata:', err);
        reject(err);
        return;
      }

      const format = metadata.format;
      const common = format.tags || {};

      resolve({
        path: filePath,
        duration: format.duration || 0,
        title: common.title || path.basename(filePath),
        artist: common.artist || 'Unknown Artist',
        album: common.album || 'Unknown Album',
      });
    });
  });
});

// Open file dialog from main process
ipcMain.handle('dialog:open-files', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Audio Files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'm4a', 'm4b', 'aac', 'wav', 'flac', 'ogg'] },
    ],
  });
  return result.filePaths;
});

// Show save dialog
ipcMain.handle('audio:show-save-dialog', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Save Audiobook',
    defaultPath: 'audiobook.m4b',
    filters: [
      { name: 'M4B Audiobook', extensions: ['m4b'] },
      { name: 'AAC Audio', extensions: ['aac'] },
      { name: 'MP3 Audio', extensions: ['mp3'] },
    ],
  });
  return result.filePath;
});

// Process and merge audio files using filter_complex
ipcMain.handle('audio:process', async (_event, options: ProcessOptions) => {
  const { files, bitrate, outputFormat } = options;

  if (!files || files.length === 0) {
    throw new Error('No files to process');
  }

  console.log('[MERGE] Starting merge with', files.length, 'files');
  files.forEach((f, i) => console.log(`[MERGE] File ${i}:`, f.path, 'duration:', f.duration));

  // Show save dialog
  const defaultExt = outputFormat === 'mp3' ? 'mp3' : outputFormat === 'aac' ? 'm4a' : 'm4b';
  const result = await dialog.showSaveDialog({
    title: 'Save Audiobook',
    defaultPath: `audiobook.${defaultExt}`,
    filters: [
      { name: 'M4B Audiobook', extensions: ['m4b'] },
      { name: 'MP3 Audio', extensions: ['mp3'] },
      { name: 'AAC Audio', extensions: ['m4a'] },
    ],
  });

  if (!result.filePath) {
    return { success: false, cancelled: true };
  }

  const outputPath = result.filePath;
  console.log('[MERGE] Output path:', outputPath);

  // Create metadata file for chapters
  const tempDir = os.tmpdir();
  const metadataFilePath = path.join(tempDir, `metadata_${Date.now()}.txt`);

  // Generate chapter metadata (only for non-MP3)
  let metadataContent = ';FFMETADATA1\n';
  let currentTime = 0;
  const isMP3 = outputFormat === 'mp3' || outputPath.endsWith('.mp3');

  if (!isMP3) {
    files.forEach((file, index) => {
      const startMs = Math.floor(currentTime * 1000);
      const endMs = Math.floor((currentTime + file.duration) * 1000);

      metadataContent += `[CHAPTER]\n`;
      metadataContent += `TIMEBASE=1/1000\n`;
      metadataContent += `START=${startMs}\n`;
      metadataContent += `END=${endMs}\n`;
      metadataContent += `title=${file.title || `Chapter ${index + 1}`}\n`;

      currentTime += file.duration;
    });
  }

  fs.writeFileSync(metadataFilePath, metadataContent, 'utf8');
  console.log('[MERGE] Metadata written to:', metadataFilePath);

  return new Promise((resolve, reject) => {
    const codec = isMP3 ? 'libmp3lame' : 'aac';

    // Build the filter_complex string for audio concatenation
    // Each input is [0:a], [1:a], etc. - we concatenate all of them
    const inputLabels = files.map((_, i) => `[${i}:a]`).join('');
    const filterComplex = `${inputLabels}concat=n=${files.length}:v=0:a=1[outa]`;

    console.log('[MERGE] Filter complex:', filterComplex);
    console.log('[MERGE] Using codec:', codec, 'bitrate:', bitrate || '128k');

    // Start building the command
    let command = ffmpeg();

    // Add each audio file as an input
    files.forEach((file) => {
      command = command.input(file.path);
    });

    // Add metadata file as last input (for chapters)
    const metadataInputIndex = files.length;
    command = command.input(metadataFilePath);

    // Build output options
    const outputOptions = [
      '-filter_complex', filterComplex,
      '-map', '[outa]',
      '-c:a', codec,
      '-b:a', bitrate || '128k',
    ];

    // Add metadata mapping for non-MP3
    if (!isMP3) {
      outputOptions.push('-map_metadata', String(metadataInputIndex));
    }

    command
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('[MERGE] FFmpeg command:', cmd);
      })
      .on('stderr', (stderrLine) => {
        // Only log important lines to avoid spam
        if (stderrLine.includes('Error') || stderrLine.includes('error') ||
          stderrLine.includes('Opening') || stderrLine.includes('Output')) {
          console.log('[MERGE] FFmpeg:', stderrLine);
        }
      })
      .on('progress', (progress) => {
        const pct = progress.percent || 0;
        if (pct > 0) {
          console.log('[MERGE] Progress:', pct.toFixed(1) + '%');
        }
        if (mainWindow) {
          mainWindow.webContents.send('audio:progress', {
            percent: pct,
            timemark: progress.timemark,
          });
        }
      })
      .on('end', () => {
        console.log('[MERGE] FFmpeg completed successfully!');
        console.log('[MERGE] Output file:', outputPath);
        // Cleanup temp files
        try {
          fs.unlinkSync(metadataFilePath);
        } catch { /* ignore cleanup errors */ }

        resolve({ success: true, outputPath });
      })
      .on('error', (err, _stdout, stderr) => {
        console.error('[MERGE] FFmpeg error:', err.message);
        console.error('[MERGE] FFmpeg stderr:', stderr);
        // Cleanup temp files
        try {
          fs.unlinkSync(metadataFilePath);
        } catch { /* ignore cleanup errors */ }

        reject(err);
      });

    command.run();
  });
});

