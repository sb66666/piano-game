export type HandNote = {
  /** Absolute diatonic number: octave * 7 + letter index (C = 0), so C4 = 28, G2 = 18. */
  dn: number;
  midi: number;
  /** Note name such as "G4". */
  name: string;
  /** Solfege syllable (Do, Re, Mi...). */
  solfege: string;
  beats: 1 | 2 | 4;
  finger?: number;
};

export type TwoHandMeasure = {
  chord?: string;
  right: readonly HandNote[];
  left: readonly HandNote[];
  lyrics: string;
};

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;
const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'] as const;

type Pitch = Pick<HandNote, 'dn' | 'midi' | 'name' | 'solfege'>;
const pitch = (letter: number, octave: number): Pitch => ({
  dn: octave * 7 + letter,
  midi: 12 * (octave + 1) + SEMITONES[letter],
  name: `${LETTERS[letter]}${octave}`,
  solfege: SOLFEGE[letter],
});

// Right hand sits in the Do–Sol position at middle C (C4–G4).
const C4 = pitch(0, 4), D4 = pitch(1, 4), E4 = pitch(2, 4), F4 = pitch(3, 4), G4 = pitch(4, 4);
// Left hand is one octave lower, written on the bass clef (B2–G3).
const B2 = pitch(6, 2), C3 = pitch(0, 3), E3 = pitch(2, 3), F3 = pitch(3, 3), G3 = pitch(4, 3);

const q = (p: Pitch, finger?: number): HandNote => ({ ...p, beats: 1, finger });
const h = (p: Pitch, finger?: number): HandNote => ({ ...p, beats: 2, finger });
const w = (p: Pitch, finger?: number): HandNote => ({ ...p, beats: 4, finger });
const cgeg = (fingers: readonly (number | undefined)[] = []): HandNote[] =>
  [q(C3, fingers[0]), q(G3, fingers[1]), q(E3, fingers[2]), q(G3, fingers[3])];
const bgfg = (fingers: readonly (number | undefined)[] = []): HandNote[] =>
  [q(B2, fingers[0]), q(G3, fingers[1]), q(F3, fingers[2]), q(G3, fingers[3])];

// Rhythm, chords, fingering and lyrics follow the supplied two-hand bee score; both hands are
// written an octave lower than that image, with the left hand on the bass clef.
export const TWO_HAND_BEE_SCORE: readonly TwoHandMeasure[] = [
  { chord: 'C', lyrics: '嗡嗡嗡', right: [q(G4, 5), q(E4, 3), h(E4)], left: cgeg([5, 1, 3, 1]) },
  { chord: 'G7', lyrics: '嗡嗡嗡', right: [q(F4, 4), q(D4, 2), h(D4)], left: bgfg([5, 1, 2, 1]) },
  { chord: 'C', lyrics: '大家一齊', right: [q(C4, 1), q(D4), q(E4), q(F4)], left: cgeg([5]) },
  { lyrics: '勤做工', right: [q(G4), q(G4), h(G4, 5)], left: cgeg() },
  { chord: 'C', lyrics: '來匆匆', right: [q(G4, 5), q(E4, 3), h(E4)], left: cgeg() },
  { chord: 'G7', lyrics: '去匆匆', right: [q(F4, 4), q(D4, 2), h(D4)], left: bgfg() },
  { chord: 'C', lyrics: '做工趣味', right: [q(C4, 1), q(E4, 3), q(G4, 5), q(G4)], left: cgeg() },
  { lyrics: '濃', right: [w(E4, 3)], left: cgeg() },
  { chord: 'G7', lyrics: '天暖花好', right: [q(D4, 2), q(D4), q(D4), q(D4)], left: bgfg() },
  { lyrics: '不做工', right: [q(D4, 2), q(E4, 3), h(F4, 4)], left: bgfg() },
  { chord: 'C', lyrics: '將來哪裡', right: [q(E4, 3), q(E4), q(E4), q(E4)], left: cgeg() },
  { lyrics: '好過冬', right: [q(E4, 3), q(F4, 4), h(G4, 5)], left: cgeg() },
  { chord: 'C', lyrics: '嗡嗡嗡', right: [q(G4, 5), q(E4, 3), h(E4)], left: cgeg() },
  { chord: 'G7', lyrics: '嗡嗡嗡', right: [q(F4, 4), q(D4, 2), h(D4)], left: bgfg([5, 1, 2, 1]) },
  { chord: 'C', lyrics: '別學懶惰', right: [q(C4, 1), q(E4, 3), q(G4, 5), q(G4)], left: cgeg([5, 1, 3, 1]) },
  { lyrics: '蟲', right: [w(C4, 1)], left: [w(C3, 5)] },
];

export type PracticeStep = {
  measure: number;
  beat: number;
  right?: HandNote;
  left?: HandNote;
  /** MIDI notes that count as a correct answer for this step. */
  accepts: readonly number[];
};

function onsets(notes: readonly HandNote[]): Map<number, HandNote> {
  const map = new Map<number, HandNote>();
  let beat = 0;
  for (const note of notes) {
    map.set(beat, note);
    beat += note.beats;
  }
  return map;
}

/** One step per beat on which either hand starts a note. */
export const TWO_HAND_STEPS: readonly PracticeStep[] = TWO_HAND_BEE_SCORE.flatMap((measure, index) => {
  const right = onsets(measure.right);
  const left = onsets(measure.left);
  return [0, 1, 2, 3].flatMap((beat): PracticeStep[] => {
    const r = right.get(beat);
    const l = left.get(beat);
    if (!r && !l) return [];
    return [{ measure: index, beat, right: r, left: l, accepts: [r?.midi, l?.midi].filter((m): m is number => m !== undefined) }];
  });
});
