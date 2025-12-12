export interface AudioFile {
  id: string; // Unique ID (UUID)
  file: File; // The actual file object (from Drag & Drop)
  path: string; // Absolute path (for Electron/FFmpeg)
  metadata: {
    title: string;
    artist: string;
    album: string;
    duration: number; // in seconds
    cover?: string; // base64 or path
  };
  status: 'pending' | 'processing' | 'done' | 'error';
}

export interface Chapter {
  id: string;
  title: string;
  start: number; // in seconds
  end: number; // in seconds
}

export interface ProcessingOptions {
  outputFormat: 'm4b' | 'mp3';
  bitrate: string; // e.g. '128k'
  useChapters: boolean;
}

declare global {
  interface Window {
    electron: {
      audio: {
        readMetadata: (path: string) => Promise<{
          path: string;
          duration: number;
          title: string;
          artist: string;
          album: string;
        }>;
      };
    };
  }
}
