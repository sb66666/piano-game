export type PianoSequenceNote = {
  midi: number;
  name: string;
  finger: string;
};

export type ScoredPianoNote = {
  midi: number;
  name: string;
  duration: 'eighth' | 'quarter' | 'half';
};

export const FIVE_NOTE_SEQUENCE: readonly PianoSequenceNote[] = [
  { midi: 60, name: 'Do', finger: '拇指' },
  { midi: 62, name: 'Re', finger: '食指' },
  { midi: 64, name: 'Mi', finger: '中指' },
  { midi: 65, name: 'Fa', finger: '無名指' },
  { midi: 67, name: 'Sol', finger: '小指' },
];

export const CENTRAL_DO_SEQUENCE: readonly PianoSequenceNote[] = [FIVE_NOTE_SEQUENCE[0]];
// Each 2/4 measure mirrors the supplied score: three notes are two eighths
// and a quarter, four notes are eighths, and a single note is a half note.
const BEE_MEASURE_PITCHES = [
  [67, 64, 64], [65, 62, 62], [60, 62, 64, 65], [67, 67, 67],
  [67, 64, 64], [65, 62, 62], [60, 64, 67, 67], [64],
  [62, 62, 62, 62], [62, 64, 65], [64, 64, 64, 64], [64, 65, 67],
  [67, 64, 64], [65, 62, 62], [60, 64, 67, 67], [60],
] as const;
const BEE_NOTE_NAMES: Record<number, string> = { 60: 'Do', 62: 'Re', 64: 'Mi', 65: 'Fa', 67: 'Sol' };

export const BEE_SONG_MEASURES: readonly (readonly ScoredPianoNote[])[] = BEE_MEASURE_PITCHES.map((measure) =>
  measure.map((midi, index) => ({
    midi,
    name: BEE_NOTE_NAMES[midi],
    duration: measure.length === 1 ? 'half' : measure.length === 3 && index === 2 ? 'quarter' : 'eighth',
  })),
);
export const BEE_SONG_SCORE: readonly ScoredPianoNote[] = BEE_SONG_MEASURES.flat();
export const PITCH_TOLERANCE_CENTS = 25;
export const MIN_PITCH_CLARITY = 0.84;
export const LOW_LEVEL_PITCH_CLARITY = 0.93;
export const STANDARD_PITCH_RMS = 0.007;
export const SEQUENCE_MINIMUM_RMS = 0.0025;
export const REQUIRED_STABLE_FRAMES = 5;
export const SEQUENCE_STABLE_FRAMES_REQUIRED = 3;

export function matchesSequenceNote(
  midi: number,
  cents: number,
  clarity: number,
  targetMidi: number,
  rms = STANDARD_PITCH_RMS,
): boolean {
  const clarityFloor = rms < STANDARD_PITCH_RMS ? LOW_LEVEL_PITCH_CLARITY : MIN_PITCH_CLARITY;
  return midi === targetMidi
    && Math.abs(cents) <= PITCH_TOLERANCE_CENTS
    && clarity >= clarityFloor;
}
