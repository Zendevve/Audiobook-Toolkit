/**
 * Integration Tests for Format Converter
 *
 * MCAF Compliance:
 * - Uses real FFmpeg processes (no mocks)
 * - Tests with actual audio files
 * - Verifies metadata preservation
 * - Tests error conditions
 * - Integration over unit tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test fixtures directory
const TEST_FIXTURES_DIR = path.join(__dirname, '__fixtures__');
const TEST_OUTPUT_DIR = path.join(__dirname, '__test_output__');

describe('Format Converter - Integration Tests', () => {
  beforeAll(async () => {
    // Create test directories
    if (!fs.existsSync(TEST_FIXTURES_DIR)) {
      fs.mkdirSync(TEST_FIXTURES_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }

    // Generate a test WAV file using FFmpeg (5 seconds of silence)
    const testWavPath = path.join(TEST_FIXTURES_DIR, 'test-audio.wav');
    if (!fs.existsSync(testWavPath)) {
      await execAsync(
        `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -metadata title="Test Audio" -metadata artist="Test Artist" "${testWavPath}"`
      );
    }
  });

  afterAll(() => {
    // Cleanup test output
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      const files = fs.readdirSync(TEST_OUTPUT_DIR);
      files.forEach((file: string) => {
        fs.unlinkSync(path.join(TEST_OUTPUT_DIR, file));
      });
      fs.rmdirSync(TEST_OUTPUT_DIR);
    }
  });

  describe('Single File Conversion', () => {
    it('should convert WAV to M4B with metadata preservation', async () => {
      const inputPath = path.join(TEST_FIXTURES_DIR, 'test-audio.wav');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'test-audio.m4b');

      // Use FFmpeg directly (simulating what the IPC handler does)
      await execAsync(
        `ffmpeg -i "${inputPath}" -c:a aac -b:a 128k -f ipod -map_metadata 0 "${outputPath}"`
      );

      // Verify output exists
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify metadata is preserved
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format "${outputPath}"`);
      const metadata = JSON.parse(stdout);

      expect(metadata.format.tags?.title).toBe('Test Audio');
      expect(metadata.format.tags?.artist).toBe('Test Artist');
    }, 30000); // 30s timeout for conversion

    it('should convert WAV to MP3', async () => {
      const inputPath = path.join(TEST_FIXTURES_DIR, 'test-audio.wav');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'test-audio.mp3');

      // MP3 format doesn't support all metadata tags, skip map_metadata
      await execAsync(
        `ffmpeg -y -i "${inputPath}" -c:a libmp3lame -b:a 128k "${outputPath}"`
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify it's a valid MP3
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format "${outputPath}"`);
      const metadata = JSON.parse(stdout);
      expect(metadata.format.format_name).toContain('mp3');
    }, 30000);

    it('should convert WAV to M4A', async () => {
      const inputPath = path.join(TEST_FIXTURES_DIR, 'test-audio.wav');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'test-audio.m4a');

      await execAsync(
        `ffmpeg -i "${inputPath}" -c:a aac -b:a 128k -f mp4 -map_metadata 0 "${outputPath}"`
      );

      expect(fs.existsSync(outputPath)).toBe(true);
    }, 30000);

    it('should handle different bitrates', async () => {
      const inputPath = path.join(TEST_FIXTURES_DIR, 'test-audio.wav');
      const output64k = path.join(TEST_OUTPUT_DIR, 'test-64k.m4b');
      const output192k = path.join(TEST_OUTPUT_DIR, 'test-192k.m4b');

      // 64k bitrate
      await execAsync(
        `ffmpeg -i "${inputPath}" -c:a aac -b:a 64k -f ipod "${output64k}"`
      );

      // 192k bitrate
      await execAsync(
        `ffmpeg -i "${inputPath}" -c:a aac -b:a 192k -f ipod "${output192k}"`
      );

      // Both should exist
      expect(fs.existsSync(output64k)).toBe(true);
      expect(fs.existsSync(output192k)).toBe(true);

      // 192k should be >= 64k (may be equal for very short files)
      const size64k = fs.statSync(output64k).size;
      const size192k = fs.statSync(output192k).size;
      expect(size192k).toBeGreaterThanOrEqual(size64k);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should fail gracefully with non-existent input file', async () => {
      const inputPath = path.join(TEST_FIXTURES_DIR, 'non-existent.wav');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'should-not-exist.m4b');

      await expect(async () => {
        await execAsync(
          `ffmpeg -i "${inputPath}" -c:a aac -b:a 128k -f ipod "${outputPath}"`
        );
      }).rejects.toThrow();

      // Output should not be created
      expect(fs.existsSync(outputPath)).toBe(false);
    });

    it('should fail with corrupted input file', async () => {
      // Create a fake "audio" file (just text)
      const corruptedPath = path.join(TEST_FIXTURES_DIR, 'corrupted.wav');
      fs.writeFileSync(corruptedPath, 'This is not audio data');

      const outputPath = path.join(TEST_OUTPUT_DIR, 'corrupted-output.m4b');

      await expect(async () => {
        await execAsync(
          `ffmpeg -i "${corruptedPath}" -c:a aac -b:a 128k -f ipod "${outputPath}"`
        );
      }).rejects.toThrow();

      // Cleanup
      fs.unlinkSync(corruptedPath);
    });
  });

  describe('Batch Conversion', () => {
    it('should convert multiple files sequentially', async () => {
      const inputPath = path.join(TEST_FIXTURES_DIR, 'test-audio.wav');

      const conversions = [
        { output: 'batch-1.m4b', codec: 'aac', format: 'ipod' },
        { output: 'batch-2.mp3', codec: 'libmp3lame', format: null },
        { output: 'batch-3.m4a', codec: 'aac', format: 'mp4' },
      ];

      for (const conv of conversions) {
        const outputPath = path.join(TEST_OUTPUT_DIR, conv.output);
        const formatArg = conv.format ? `-f ${conv.format}` : '';
        await execAsync(
          `ffmpeg -y -i "${inputPath}" -c:a ${conv.codec} -b:a 128k ${formatArg} "${outputPath}"`
        );
      }

      // All outputs should exist
      conversions.forEach(conv => {
        const outputPath = path.join(TEST_OUTPUT_DIR, conv.output);
        expect(fs.existsSync(outputPath)).toBe(true);
      });
    }, 60000); // 60s timeout for batch
  });

  describe('Format-Specific Tests', () => {
    it('should create M4B with proper container format', async () => {
      const inputPath = path.join(TEST_FIXTURES_DIR, 'test-audio.wav');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'container-test.m4b');

      await execAsync(
        `ffmpeg -i "${inputPath}" -c:a aac -b:a 128k -f ipod "${outputPath}"`
      );

      // Verify container format
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format "${outputPath}"`);
      const metadata = JSON.parse(stdout);

      // M4B uses mp4/ipod container
      expect(metadata.format.format_name).toMatch(/mov,mp4,m4a,3gp,3g2,mj2/);
    }, 30000);

    it('should use correct codecs for each format', async () => {
      const inputPath = path.join(TEST_FIXTURES_DIR, 'test-audio.wav');

      const formats = [
        { ext: 'm4b', codec: 'aac' },
        { ext: 'mp3', codec: 'mp3' },
        { ext: 'm4a', codec: 'aac' },
      ];

      for (const fmt of formats) {
        const outputPath = path.join(TEST_OUTPUT_DIR, `codec-test.${fmt.ext}`);
        const codecArg = fmt.codec === 'mp3' ? 'libmp3lame' : 'aac';

        await execAsync(
          `ffmpeg -i "${inputPath}" -c:a ${codecArg} -b:a 128k "${outputPath}"`
        );

        // Verify codec
        const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_streams "${outputPath}"`);
        const streams = JSON.parse(stdout);
        const audioStream = streams.streams.find((s: any) => s.codec_type === 'audio');

        expect(audioStream.codec_name).toBe(fmt.codec);
      }
    }, 60000);
  });
});
