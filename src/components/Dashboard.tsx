import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FileMusic, X, Upload, Disc, Settings, GripVertical, AlertTriangle } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetadataPanel, defaultMetadata } from '@/components/MetadataPanel';
import type { BookMetadata } from '@/components/MetadataPanel';
import type { AudioFile } from '@/types';
import { cn } from '@/lib/utils';

type OutputFormat = 'm4b' | 'mp3' | 'aac';
type Bitrate = '64k' | '96k' | '128k' | '192k';

// Sortable Item Component
interface SortableItemProps {
  file: AudioFile;
  index: number;
  onRemove: (id: string) => void;
  onUpdateMetadata: (id: string, field: 'title' | 'artist', value: string) => void;
}

function SortableItem({ file, index, onRemove, onUpdateMetadata }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "p-4 flex items-center gap-4 group hover:bg-accent/50 transition-colors",
        isDragging && "shadow-lg ring-2 ring-primary"
      )}>
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

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
              onUpdateMetadata(file.id, 'title', e.target.value);
            }}
            className="h-8 bg-transparent border-transparent hover:border-input focus:border-input transition-all"
          />
          <Input
            value={file.metadata.artist}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              onUpdateMetadata(file.id, 'artist', e.target.value);
            }}
            className="h-8 text-muted-foreground bg-transparent border-transparent hover:border-input focus:border-input transition-all"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRemove(file.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [metadata, setMetadata] = useState<BookMetadata>(defaultMetadata);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('m4b');
  const [bitrate, setBitrate] = useState<Bitrate>('128k');

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: AudioFile[] = acceptedFiles.map((file) => {
      const resolvedPath = window.electron ? window.electron.audio.getPathForFile(file) : '';
      console.log('[DASHBOARD] File dropped:', file.name, 'Resolved path:', resolvedPath);
      return {
        id: crypto.randomUUID(),
        file,
        path: resolvedPath,
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          duration: 0,
        },
        status: 'pending' as const,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

    // Process metadata in background
    if (window.electron) {
      let isFirstFile = true;
      for (const fileObj of newFiles) {
        try {
          const audioMeta = await window.electron.audio.readMetadata(fileObj.path);
          setFiles(prev => prev.map(f => f.id === fileObj.id ? {
            ...f,
            metadata: {
              ...f.metadata,
              title: audioMeta.title || f.metadata.title,
              artist: audioMeta.artist || f.metadata.artist,
              album: audioMeta.album || f.metadata.album,
              duration: audioMeta.duration
            }
          } : f));

          // Auto-populate book metadata from first file if empty
          if (isFirstFile) {
            setMetadata(prev => ({
              ...prev,
              title: prev.title || audioMeta.album || audioMeta.title || '',
              author: prev.author || audioMeta.artist || '',
            }));
            isFirstFile = false;
          }
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

  const updateMetadata = (id: string, field: 'title' | 'artist', value: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, metadata: { ...f.metadata, [field]: value } } : f));
  };

  // Use native file dialog (reliable absolute paths)
  const handleBrowseFiles = async () => {
    if (!window.electron) return;
    const filePaths = await window.electron.openFiles();
    if (filePaths.length === 0) return;

    const newFiles: AudioFile[] = filePaths.map((filePath) => ({
      id: crypto.randomUUID(),
      file: null as unknown as File, // Not needed for native dialog
      path: filePath,
      metadata: {
        title: filePath.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, "") || 'Unknown',
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration: 0,
      },
      status: 'pending' as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Process metadata in background
    for (const fileObj of newFiles) {
      try {
        const metadata = await window.electron.audio.readMetadata(fileObj.path);
        console.log('[DASHBOARD] Metadata result for', fileObj.path, metadata);
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
  };

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; timemark: string }>({ percent: 0, timemark: '00:00:00' });

  const handleProcess = async () => {
    if (files.length === 0 || !window.electron) return;

    setProcessing(true);
    setProgress({ percent: 0, timemark: '00:00:00' });

    // Listen for progress
    window.electron.audio.onProgress((p) => {
      setProgress(p);
    });

    try {
      const result = await window.electron.audio.process({
        files: files.map(f => ({
          path: f.path,
          title: f.metadata.title,
          duration: f.metadata.duration
        })),
        outputFormat,
        bitrate,
        coverPath: metadata.coverPath,
        bookMetadata: {
          title: metadata.title,
          author: metadata.author,
          genre: metadata.genre,
          year: metadata.year,
          narrator: metadata.narrator,
        },
      });

      if (result.success) {
        console.log('Finished!', result.outputPath);
      } else if (result.cancelled) {
        console.log('Cancelled');
      }
    } catch (err) {
      console.error('Processing failed', err);
    } finally {
      setProcessing(false);
      window.electron.audio.removeProgressListener();
    }
  };

  // Check if MP3 is selected with multiple files (no chapters warning)
  const showMp3Warning = outputFormat === 'mp3' && files.length > 1;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 relative">
      {/* Processing Overlay */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="w-full max-w-md p-8 bg-card border rounded-xl shadow-2xl flex flex-col gap-6 items-center">
              <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Processing Audiobook...</h2>
                <p className="text-muted-foreground font-mono">{progress.percent.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground/60 font-mono">Time: {progress.timemark}</p>
              </div>
              {/* Progress Bar Track */}
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }}
                  transition={{ type: "tween", ease: "linear", duration: 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <Button
            variant="outline"
            className="mt-4"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleBrowseFiles(); }}
          >
            Browse Files
          </Button>
        </div>

        {/* Book Metadata Panel - appears when files exist */}
        {files.length > 0 && (
          <MetadataPanel
            metadata={metadata}
            onChange={setMetadata}
          />
        )}

        {/* File List with Drag & Drop Reorder */}
        <div className="flex-1 overflow-y-auto space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={files.map(f => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence>
                {files.map((file, index) => (
                  <SortableItem
                    key={file.id}
                    file={file}
                    index={index}
                    onRemove={removeFile}
                    onUpdateMetadata={updateMetadata}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>

          {files.length === 0 && !isDragActive && (
            <div className="text-center py-12 text-muted-foreground/40 italic">
              No files added yet.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t pt-6 flex justify-between items-center bg-background/95 backdrop-blur z-10">
          <div className="flex gap-4 items-center">
            <div className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </div>

            {/* Format Selection */}
            <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as OutputFormat)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m4b">M4B</SelectItem>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="aac">AAC</SelectItem>
              </SelectContent>
            </Select>

            {/* Bitrate Selection */}
            <Select value={bitrate} onValueChange={(v) => setBitrate(v as Bitrate)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="64k">64 kbps</SelectItem>
                <SelectItem value="96k">96 kbps</SelectItem>
                <SelectItem value="128k">128 kbps</SelectItem>
                <SelectItem value="192k">192 kbps</SelectItem>
              </SelectContent>
            </Select>

            {/* MP3 Chapter Warning */}
            {showMp3Warning && (
              <div className="flex items-center gap-2 text-amber-500 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>MP3 doesn't support chapters</span>
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="w-48 font-semibold shadow-lg shadow-primary/20"
            disabled={files.length === 0 || processing}
            onClick={handleProcess}
          >
            <Disc className={cn("w-4 h-4 mr-2", processing && "animate-spin")} />
            {processing ? "Processing..." : "Process Audiobook"}
          </Button>
        </div>
      </div>
    </div>
  );
}
