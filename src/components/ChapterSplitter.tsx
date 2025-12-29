import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { FileAudio, Scissors, X, Clock, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import type { Chapter } from '@/types';

export function ChapterSplitter() {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ message: '', current: 0, total: 0, percent: 0 });
  const [settings, setSettings] = useState({
    outputFormat: 'copy', // copy, m4b, nmp3
    template: '{index} - {title}',
    outputDir: ''
  });

  // Load default output dir
  useEffect(() => {
    const loadSettings = async () => {
      const s = await window.electron.settings.read();
      if (s.defaultOutputDirectory) {
        setSettings(prev => ({ ...prev, outputDir: s.defaultOutputDirectory! }));
      }
    };
    loadSettings();
  }, []);

  // Progress Listener
  useEffect(() => {
    window.electron.audio.onSplitProgress((data) => {
      setProgress(_ => ({
        ...data,
        percent: (data.current / data.total) * 100
      }));
    });
    return () => window.electron.audio.removeProgressListener();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const f = acceptedFiles[0];
    setFile(f);
    setLoading(true);

    try {
      const path = window.electron.audio.getPathForFile(f);
      const result = await window.electron.audio.readChapters(path);

      if (result.chapters.length === 0) {
        toast.error('No chapters found in this file.');
      } else {
        setChapters(result.chapters);
        setSelectedChapters(result.chapters.map(c => c.id)); // Select all by default
        toast.success(`Found ${result.chapters.length} chapters`);
      }

      // Auto-set format to same extension if possible, or copy
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext && ['m4b', 'm4a', 'mp3'].includes(ext)) {
        // setSettings(s => ({ ...s, outputFormat: ext as any }));
      }

    } catch (error) {
      console.error(error);
      toast.error('Failed to read file chapters');
      setFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.m4b', '.m4a', '.mp3'] },
    maxFiles: 1
  });

  const handleSplit = async () => {
    if (!file || selectedChapters.length === 0) return;

    setProcessing(true);
    setProgress({ message: 'Starting...', current: 0, total: selectedChapters.length, percent: 0 });

    try {
      const path = window.electron.audio.getPathForFile(file);
      const chaptersToExport = chapters.filter(c => selectedChapters.includes(c.id));

      // Determine output format. 'copy' means use input extension
      let format = settings.outputFormat;
      if (format === 'copy') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        format = ext === 'mp3' ? 'mp3' : 'm4b'; // Default to m4b if uncertain
      }

      const result = await window.electron.audio.splitByChapters({
        inputPath: path,
        outputDirectory: settings.outputDir,
        chapters: chaptersToExport,
        outputFormat: format as any,
        fileNameTemplate: settings.template
      });

      if (result.success) {
        toast.success('Splitting complete!', {
          description: `Created ${result.results?.length} files in ${settings.outputDir}`
        });
        setProcessing(false);
        setFile(null);
        setChapters([]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Splitting failed', { description: (error as Error).message });
      setProcessing(false);
    }
  };

  const toggleChapter = (id: number) => {
    setSelectedChapters(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedChapters.length === chapters.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(chapters.map(c => c.id));
    }
  };

  if (processing) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col items-center justify-center p-8 bg-black/60 backdrop-blur-md"
      >
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-[#5E6AD2]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-[#5E6AD2] border-t-transparent animate-spin" />
            <Scissors className="absolute inset-0 m-auto w-8 h-8 text-[#5E6AD2]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-[#EDEDEF]">Splitting Audiobook</h2>
            <p className="text-[#8A8F98]">{progress.message}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-[#5E6AD2]">
              <span>{progress.current} / {progress.total}</span>
              <span>{Math.round(progress.percent)}%</span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#5E6AD2]"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col bg-transparent overflow-hidden"
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/[0.06] flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#EDEDEF]">Chapter Splitter</h1>
          <p className="text-[#8A8F98] text-sm">Split audiobook files into individual chapters</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                "h-64 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer",
                isDragActive
                  ? "border-[#5E6AD2] bg-[#5E6AD2]/5"
                  : "border-white/[0.1] hover:border-white/[0.2] bg-white/[0.02]"
              )}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 rounded-full bg-[#5E6AD2]/10 flex items-center justify-center">
                <FileAudio className="w-8 h-8 text-[#5E6AD2]" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-[#EDEDEF]">
                  {loading ? 'Reading chapters...' : 'Drop audiobook file here'}
                </p>
                <p className="text-sm text-[#8A8F98] mt-1">
                  Supports M4B, M4A, MP3
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: File Info & Settings */}
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#0a0a0c] flex items-center justify-center border border-white/[0.06]">
                    <FileAudio className="w-6 h-6 text-[#5E6AD2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#EDEDEF] truncate">{file.name}</h3>
                    <p className="text-sm text-[#8A8F98]">{chapters.length} chapters found</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#8A8F98] uppercase tracking-wider">Settings</h3>

                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select
                      value={settings.outputFormat}
                      onValueChange={(v) => setSettings(s => ({ ...s, outputFormat: v }))}
                    >
                      <SelectTrigger className="bg-black/20 border-white/10 focus:bg-black/40 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="copy">Stream Copy (Fastest, No Re-encode)</SelectItem>
                        <SelectItem value="mp3">MP3 (Universal)</SelectItem>
                        <SelectItem value="m4b">M4B (Audiobook)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#8A8F98]">
                      'Stream Copy' extracts exact audio data without quality loss.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Filename Template</Label>
                    <Input
                      value={settings.template}
                      onChange={(e) => setSettings(s => ({ ...s, template: e.target.value }))}
                      className="bg-black/20 border-white/10 focus:bg-black/40 transition-colors"
                      placeholder="{index} - {title}"
                    />
                    <p className="text-xs text-[#8A8F98]">Variables: {`{index}`}, {`{title}`}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Output Directory</Label>
                    <div className="flex gap-2">
                      <Input
                        value={settings.outputDir}
                        onChange={(e) => setSettings(s => ({ ...s, outputDir: e.target.value }))}
                        className="bg-black/20 border-white/10 font-mono text-xs focus:bg-black/40 transition-colors"
                        placeholder="Select folder..."
                      />
                      <Button variant="outline" size="icon" onClick={() => {
                        // TODO: Implement directory picker
                        // Temporary: Just assume user types it or default
                      }}>
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-[#5E6AD2] hover:bg-[#6872D9] text-white"
                    size="lg"
                    disabled={selectedChapters.length === 0}
                    onClick={handleSplit}
                  >
                    <Scissors className="w-4 h-4 mr-2" />
                    Split {selectedChapters.length} Chapters
                  </Button>
                </div>
              </div>

              {/* Right: Chapter List */}
              <div className="lg:col-span-2 flex flex-col bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden h-[600px]">
                <div className="p-4 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedChapters.length === chapters.length && chapters.length > 0}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-sm font-medium text-[#EDEDEF]">Select All</span>
                  </div>
                  <span className="text-xs text-[#8A8F98]">{selectedChapters.length} selected</span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors border border-transparent",
                        selectedChapters.includes(chapter.id)
                          ? "bg-[#5E6AD2]/10 border-[#5E6AD2]/20"
                          : "hover:bg-white/[0.02]"
                      )}
                    >
                      <Checkbox
                        checked={selectedChapters.includes(chapter.id)}
                        onCheckedChange={() => toggleChapter(chapter.id)}
                      />
                      <div className="w-8 h-8 rounded bg-[#050506] flex items-center justify-center text-xs font-mono text-[#8A8F98] border border-white/[0.06]">
                        {chapter.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#EDEDEF] truncate">{chapter.title}</p>
                        <div className="flex gap-3 text-xs text-[#8A8F98] mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(chapter.duration, 'human')}
                          </span>
                          <span>{formatDuration(chapter.start)} - {formatDuration(chapter.end)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Helper icon
