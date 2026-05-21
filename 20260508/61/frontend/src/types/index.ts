export interface Note {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}

export type MusicStyle = 'jazz' | 'classical' | 'electronic';

export interface StyleInfo {
  id: MusicStyle;
  name: string;
  nameEn: string;
  description: string;
  color: string;
  accentColor: string;
  icon: string;
}

export interface GenerateRequest {
  style: MusicStyle;
  startNotes?: number[];
  midiFile?: string;
  duration: number;
  temperature: number;
  seed?: number;
}

export interface GenerateResponse {
  success: boolean;
  taskId: string;
  midiData: string;
  mp3Data: string;
  notes: Note[];
  duration: number;
  tempo: number;
  style: string;
  isMp3: boolean;
}

export interface FeedbackRequest {
  taskId: string;
  rating: 'like' | 'dislike';
  comment?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  feedbackId: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  isLoading: boolean;
  error: string | null;
}

export const MUSIC_STYLES: StyleInfo[] = [
  {
    id: 'jazz',
    name: '爵士',
    nameEn: 'Jazz',
    description: '摇摆节奏与即兴和弦',
    color: '#8b0000',
    accentColor: '#dc2626',
    icon: '🎷',
  },
  {
    id: 'classical',
    name: '古典',
    nameEn: 'Classical',
    description: '优雅旋律与古典和声',
    color: '#006400',
    accentColor: '#16a34a',
    icon: '🎻',
  },
  {
    id: 'electronic',
    name: '电子',
    nameEn: 'Electronic',
    description: '动感节拍与未来音效',
    color: '#00bfff',
    accentColor: '#06b6d4',
    icon: '🎛️',
  },
];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

export function noteNameToMidi(note: string): number {
  const match = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 60;
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteIndex = NOTE_NAMES.indexOf(noteName);
  return (octave + 1) * 12 + noteIndex;
}
