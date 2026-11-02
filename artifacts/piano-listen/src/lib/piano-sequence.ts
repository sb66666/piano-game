export type PianoSequenceNote = {
  midi: number;
  name: string;
  finger: string;
};

export type ScoredPianoNote = {
  midi: number;
  name: string;
  x: number;
  y: number;
};

export const FIVE_NOTE_SEQUENCE: readonly PianoSequenceNote[] = [
  { midi: 60, name: 'Do', finger: '拇指' },
  { midi: 62, name: 'Re', finger: '食指' },
  { midi: 64, name: 'Mi', finger: '中指' },
  { midi: 65, name: 'Fa', finger: '無名指' },
  { midi: 67, name: 'Sol', finger: '小指' },
];

export const CENTRAL_DO_SEQUENCE: readonly PianoSequenceNote[] = [FIVE_NOTE_SEQUENCE[0]];
export const BEE_SONG_SCORE: readonly ScoredPianoNote[] = [
  { midi: 67, name: 'Sol', x: 60, y: 38 },
  { midi: 64, name: 'Mi', x: 86, y: 43 },
  { midi: 64, name: 'Mi', x: 113, y: 43 },
  { midi: 65, name: 'Fa', x: 164, y: 40.5 },
  { midi: 62, name: 'Re', x: 190, y: 45.5 },
  { midi: 62, name: 'Re', x: 216, y: 45.5 },
  { midi: 60, name: 'Do', x: 265, y: 48 },
  { midi: 62, name: 'Re', x: 289, y: 45.5 },
  { midi: 64, name: 'Mi', x: 312, y: 43 },
  { midi: 65, name: 'Fa', x: 334, y: 40.5 },
  { midi: 67, name: 'Sol', x: 371, y: 38 },
  { midi: 67, name: 'Sol', x: 398, y: 38 },
  { midi: 67, name: 'Sol', x: 424, y: 38 },
];
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
