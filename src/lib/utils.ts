import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number, style: 'digital' | 'human' = 'digital'): string {
  if (!seconds || isNaN(seconds)) return style === 'human' ? '0 min' : '0:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (style === 'human') {
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  }

  // Digital (HH:MM:SS or MM:SS)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
