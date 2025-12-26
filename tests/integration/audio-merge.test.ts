/**
 * Integration Tests for Core Audio Processing (Merging)
 *
 * MCAF Compliance:
 * - Uses real FFmpeg processes (no mocks)
 * - Tests with actual audio files
 * - Verifies chapter markers and metadata
 * - Tests error conditions (corrupt files)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test directories
const TEST_ASSETS_DIR = path.resolve(__dirname, '../../test-assets');
const TEST_OUTPUT_DIR = path.join(__dirname, '__merge_output__');

describe('Core Audio Processing - Integration Tests', () => {
  beforeAll(() => {
    // Create test output directory
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
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

  describe('Audio Merge - Two Files', () => {
    it('should merge two audio files into one with correct duration', async () => {
      const audio1 = path.join(TEST_ASSETS_DIR, 'audio1.mp3');
      const audio2 = path.join(TEST_ASSETS_DIR, 'audio2.mp3');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'merged-output.m4b');

      // Verify input files exist
      expect(fs.existsSync(audio1)).toBe(true);
      expect(fs.existsSync(audio2)).toBe(true);

      // Get input durations
      const { stdout: dur1Out } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format "${audio1}"`
      );
      const { stdout: dur2Out } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format "${audio2}"`
      );

      const dur1 = JSON.parse(dur1Out).format.duration;
      const dur2 = JSON.parse(dur2Out).format.duration;
      const expectedDuration = parseFloat(dur1) + parseFloat(dur2);

      // Create metadata file for chapters
      const tempMetadata = path.join(TEST_OUTPUT_DIR, 'metadata.txt');
      const dur1Seconds = parseFloat(dur1);
      const metadataContent = `;FFMETADATA1
[CHAPTER]
TIMEBASE=1/1000
START=0
END=${Math.floor(dur1Seconds * 1000)}
title=Chapter 1

[CHAPTER]
TIMEBASE=1/1000
START=${Math.floor(dur1Seconds * 1000)}
END=${Math.floor(expectedDuration * 1000)}
title=Chapter 2
`;
      fs.writeFileSync(tempMetadata, metadataContent, 'utf8');

      // Run FFmpeg merge command (simulating main.ts logic)
      await execAsync(
        `ffmpeg -i "${audio1}" -i "${audio2}" -i "${tempMetadata}" ` +
        `-filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[outa]" ` +
        `-map "[outa]" -map_metadata 2 -c:a aac -b:a 64k -f ipod "${outputPath}"`
      );

      // Verify output exists
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify duration
      const { stdout: outDur } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format "${outputPath}"`
      );
      const outputDuration = parseFloat(JSON.parse(outDur).format.duration);
      expect(outputDuration).toBeGreaterThan(expectedDuration - 0.5);
      expect(outputDuration).toBeLessThan(expectedDuration + 0.5);

      // Verify chapters exist
      const { stdout: chaptersOut } = await execAsync(
        `ffprobe -v quiet -print_format json -show_chapters "${outputPath}"`
      );
      const chapters = JSON.parse(chaptersOut).chapters;
      expect(chapters).toBeDefined();
      expect(chapters.length).toBe(2);
      expect(chapters[0].tags?.title).toBe('Chapter 1');
      expect(chapters[1].tags?.title).toBe('Chapter 2');

      // Cleanup metadata file
      fs.unlinkSync(tempMetadata);
    }, 60000);

    it('should create M4B with AAC codec', async () => {
      const audio1 = path.join(TEST_ASSETS_DIR, 'audio1.mp3');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'single-codec-test.m4b');

      await execAsync(
        `ffmpeg -i "${audio1}" -c:a aac -b:a 64k -f ipod "${outputPath}"`
      );

      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_streams "${outputPath}"`
      );
      const streams = JSON.parse(stdout);
      const audioStream = streams.streams.find((s: any) => s.codec_type === 'audio');

      expect(audioStream.codec_name).toBe('aac');
    }, 30000);
  });

  describe('Metadata Preservation', () => {
    it('should preserve custom metadata tags', async () => {
      const audio1 = path.join(TEST_ASSETS_DIR, 'audio1.mp3');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'metadata-test.m4b');

      await execAsync(
        `ffmpeg -i "${audio1}" -c:a aac -b:a 64k -f ipod ` +
        `-metadata title="Test Audiobook" ` +
        `-metadata artist="Test Author" ` +
        `-metadata genre="Audiobook" ` +
        `-metadata date="2024" ` +
        `"${outputPath}"`
      );

      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format "${outputPath}"`
      );
      const format = JSON.parse(stdout).format;

      expect(format.tags?.title).toBe('Test Audiobook');
      expect(format.tags?.artist).toBe('Test Author');
      expect(format.tags?.genre).toBe('Audiobook');
      expect(format.tags?.date).toBe('2024');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should fail gracefully with corrupt input file', async () => {
      const corruptFile = path.join(TEST_ASSETS_DIR, 'corrupt.mp3');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'corrupt-output.m4b');

      // Verify corrupt file exists
      expect(fs.existsSync(corruptFile)).toBe(true);

      await expect(async () => {
        await execAsync(
          `ffmpeg -i "${corruptFile}" -c:a aac -b:a 64k -f ipod "${outputPath}"`
        );
      }).rejects.toThrow();

      // Output should not be created
      expect(fs.existsSync(outputPath)).toBe(false);
    });

    it('should fail with non-existent input file', async () => {
      const nonExistent = path.join(TEST_ASSETS_DIR, 'does-not-exist.mp3');
      const outputPath = path.join(TEST_OUTPUT_DIR, 'nonexistent-output.m4b');

      await expect(async () => {
        await execAsync(
          `ffmpeg -i "${nonExistent}" -c:a aac -b:a 64k -f ipod "${outputPath}"`
        );
      }).rejects.toThrow();
    });
  });

  describe('Bitrate Options', () => {
    it('should respect different bitrate settings', async () => {
      const audio1 = path.join(TEST_ASSETS_DIR, 'audio1.mp3');
      const output64k = path.join(TEST_OUTPUT_DIR, 'bitrate-64k.m4b');
      const output128k = path.join(TEST_OUTPUT_DIR, 'bitrate-128k.m4b');

      // 64k
      await execAsync(
        `ffmpeg -i "${audio1}" -c:a aac -b:a 64k -f ipod "${output64k}"`
      );

      // 128k
      await execAsync(
        `ffmpeg -i "${audio1}" -c:a aac -b:a 128k -f ipod "${output128k}"`
      );

      const size64k = fs.statSync(output64k).size;
      const size128k = fs.statSync(output128k).size;

      // 128k should be >= 64k (may be equal for very short files)
      expect(size128k).toBeGreaterThanOrEqual(size64k);
    }, 60000);
  });
});
