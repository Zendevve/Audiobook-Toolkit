import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FileMusic, X, Upload, Disc, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AudioFile } from '@/types';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [files, setFiles] = useState<AudioFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: AudioFile[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      path: (file as any).path,
      metadata: {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration: 0,
      },
      status: 'pending',
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Process metadata in background
    if (window.electron) {
      for (const fileObj of newFiles) {
        try {
          const metadata = await window.electron.audio.readMetadata(fileObj.path);
          setFiles(prev => prev.map(f => f.id === fileObj.id ? {
            ...f,
            metadata: {
              ...f.metadata,
              title: metadata.title || f.metadata.title,
              artist: metadata.artist || f.metadata.artist,
              album: metadata.album || f.metadata.album,
              duration: metadata.duration
            }
          } : f));
        } catch (error) {
          console.error(`Failed to read metadata for ${fileObj.path}`, error);
        }
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.m4a', '.aac', '.wav', '.flac'],
    },
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          ADB Binder
        </h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer",
            isDragActive ? "border-primary bg-primary/10 scale-[1.02]" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className={cn("w-12 h-12 mb-4 text-muted-foreground", isDragActive && "text-primary")} />
          <p className="text-lg font-medium text-muted-foreground">
            {isDragActive ? "Drop audio files here..." : "Drag & drop audio files here, or click to select"}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-2">
            Supports MP3, AAC, M4A, WAV
          </p>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          <AnimatePresence>
            {files.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-4 flex items-center gap-4 group hover:bg-accent/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>

                  <div className="text-sm font-mono text-muted-foreground w-16 text-right">
                    {file.metadata.duration ? new Date(file.metadata.duration * 1000).toISOString().substr(11, 8) : '--:--:--'}
                  </div>
                  <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                    <FileMusic className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <Input
                      value={file.metadata.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const val = e.target.value;
                        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, metadata: { ...f.metadata, title: val } } : f));
                      }}
                      className="h-8 bg-transparent border-transparent hover:border-input focus:border-input transition-all"
                    />
                    <Input
                      value={file.metadata.artist}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const val = e.target.value;
                        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, metadata: { ...f.metadata, artist: val } } : f));
                      }}
                      className="h-8 text-muted-foreground bg-transparent border-transparent hover:border-input focus:border-input transition-all"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); removeFile(file.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {files.length === 0 && !isDragActive && (
            <div className="text-center py-12 text-muted-foreground/40 italic">
              No files added yet.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t pt-6 flex justify-between items-center bg-background/95 backdrop-blur z-10">
          <div className="text-sm text-muted-foreground">
            {files.length} files selected
          </div>
          <Button
            size="lg"
            className="w-48 font-semibold shadow-lg shadow-primary/20"
            disabled={files.length === 0}
          >
            <Disc className="w-4 h-4 mr-2" />
            Process Audiobook
          </Button>
        </div>
      </div>
    </div>
  );
}
