export type PianoSequenceNote = {
  midi: number;
  name: string;
  finger: string;
};

export const FIVE_NOTE_SEQUENCE: readonly PianoSequenceNote[] = [
  { midi: 60, name: 'Do', finger: '拇指' },
  { midi: 62, name: 'Re', finger: '食指' },
  { midi: 64, name: 'Mi', finger: '中指' },
  { midi: 65, name: 'Fa', finger: '無名指' },
  { midi: 67, name: 'Sol', finger: '小指' },
];

export const CENTRAL_DO_SEQUENCE: readonly PianoSequenceNote[] = [FIVE_NOTE_SEQUENCE[0]];
export const PITCH_TOLERANCE_CENTS = 25;
export const MIN_PITCH_CLARITY = 0.84;
export const REQUIRED_STABLE_FRAMES = 5;

export function matchesSequenceNote(
  midi: number,
  cents: number,
  clarity: number,
  targetMidi: number,
): boolean {
  return midi === targetMidi
    && Math.abs(cents) <= PITCH_TOLERANCE_CENTS
    && clarity >= MIN_PITCH_CLARITY;
}
