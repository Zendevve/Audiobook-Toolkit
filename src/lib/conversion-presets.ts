export const AUDIO_FORMATS = {
  M4B: {
    ext: '.m4b',
    codec: 'aac',
    container: 'ipod',
    description: 'M4B (Audiobook)',
    supportsChapters: true,
  },
  M4A: {
    ext: '.m4a',
    codec: 'aac',
    container: 'mp4',
    description: 'M4A (AAC Audio)',
    supportsChapters: false,
  },
  MP3: {
    ext: '.mp3',
    codec: 'libmp3lame',
    container: 'mp3',
    description: 'MP3',
    supportsChapters: true, // ID3v2 CHAP frames
  },
  AAC: {
    ext: '.aac',
    codec: 'aac',
    container: 'adts',
    description: 'AAC',
    supportsChapters: false,
  },
  FLAC: {
    ext: '.flac',
    codec: 'flac',
    container: 'flac',
    description: 'FLAC (Lossless)',
    supportsChapters: true,
  },
} as const;

export type AudioFormat = keyof typeof AUDIO_FORMATS;

export interface ConversionPreset {
  name: string;
  targetFormat: AudioFormat;
  bitrate: string;
  description: string;
}

export const CONVERSION_PRESETS: ConversionPreset[] = [
  {
    name: 'Audiobook Standard',
    targetFormat: 'M4B',
    bitrate: '64k',
    description: 'M4B format, 64kbps AAC (best for audiobooks)',
  },
  {
    name: 'High Quality',
    targetFormat: 'M4B',
    bitrate: '128k',
    description: 'M4B format, 128kbps AAC (higher quality)',
  },
  {
    name: 'MP3 Compatible',
    targetFormat: 'MP3',
    bitrate: '128k',
    description: 'MP3 format for maximum device compatibility',
  },
  {
    name: 'Lossless Archive',
    targetFormat: 'FLAC',
    bitrate: '',
    description: 'Lossless FLAC (large files, archival quality)',
  },
];
