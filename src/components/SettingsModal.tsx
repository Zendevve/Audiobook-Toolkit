import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { UserSettings } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => Promise<void>;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [loading, setLoading] = useState(false);

  // Reset local state when modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(localSettings);
      toast.success('Settings saved');
      onClose();
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseValues = async () => {
    try {
      /* Note: We added selectDirectory to types, but TS might not have picked it up in IDE yet
         if this file isn't open. The type definition IS in types.ts now. */
      const path = await window.electron.settings.selectDirectory();
      if (path) {
        setLocalSettings(prev => ({ ...prev, defaultOutputDirectory: path }));
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-[#0a0a0c] border border-white/[0.08] rounded-xl shadow-2xl relative z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#5E6AD2]" />
                <h2 className="text-lg font-semibold text-[#EDEDEF]">Preferences</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Default Output Directory */}
              <div className="space-y-2">
                <Label className="text-xs text-[#8A8F98]">Default Output Directory</Label>
                <div className="flex gap-2">
                  <Input
                    value={localSettings.defaultOutputDirectory || ''}
                    readOnly
                    placeholder="Same as source file (Default)"
                    className="bg-[#0F0F12] border-white/10 text-[#EDEDEF] placeholder:text-[#8A8F98]/50"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleBrowseValues}
                    className="bg-white/[0.05] hover:bg-white/[0.1] text-[#EDEDEF] border border-white/[0.08]"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-[#8A8F98]">
                  If empty, audiobooks will be saved in the same folder as the first source file.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Default Format */}
                <div className="space-y-2">
                  <Label className="text-xs text-[#8A8F98]">Default Format</Label>
                  <Select
                    value={localSettings.defaultOutputFormat || 'm4b'}
                    onValueChange={(val: any) => setLocalSettings(prev => ({ ...prev, defaultOutputFormat: val }))}
                  >
                    <SelectTrigger className="bg-[#0F0F12] border-white/10 text-[#EDEDEF]">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F0F12] border-white/10 text-[#EDEDEF]">
                      <SelectItem value="m4b">M4B (Audiobook)</SelectItem>
                      <SelectItem value="mp3">MP3 (Audio)</SelectItem>
                      <SelectItem value="aac">AAC (Audio)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Bitrate */}
                <div className="space-y-2">
                  <Label className="text-xs text-[#8A8F98]">Default Bitrate</Label>
                  <Select
                    value={localSettings.defaultBitrate || '64k'}
                    onValueChange={(val) => setLocalSettings(prev => ({ ...prev, defaultBitrate: val }))}
                  >
                    <SelectTrigger className="bg-[#0F0F12] border-white/10 text-[#EDEDEF]">
                      <SelectValue placeholder="Bitrate" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F0F12] border-white/10 text-[#EDEDEF]">
                      <SelectItem value="64k">64k (Spoken Word)</SelectItem>
                      <SelectItem value="96k">96k (Standard)</SelectItem>
                      <SelectItem value="128k">128k (High Quality)</SelectItem>
                      <SelectItem value="192k">192k (Music/FX)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06] bg-[#0F0F12]/50">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.05]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-[#5E6AD2] hover:bg-[#6872D9] text-white"
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
