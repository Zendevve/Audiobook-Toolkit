const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

const assetsDir = path.join(__dirname, 'test-assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

const files = ['audio1.mp3', 'audio2.mp3', 'corrupt.mp3'];

console.log('Generating test assets...');

// Generate valid files
[0, 1].forEach(i => {
  const file = files[i];
  const outputPath = path.join(assetsDir, file);

  ffmpeg()
    .input('anullsrc=r=44100:cl=mono')
    .inputFormat('lavfi')
    .duration(5)
    .audioCodec('libmp3lame')
    .save(outputPath)
    .on('end', () => console.log(`Generated ${file}`))
    .on('error', (err) => console.error(`Error generating ${file}:`, err));
});

// Generate corrupt file (just a text file renamed)
fs.writeFileSync(path.join(assetsDir, 'corrupt.mp3'), 'This is not an audio file.');
console.log('Generated corrupt.mp3');
