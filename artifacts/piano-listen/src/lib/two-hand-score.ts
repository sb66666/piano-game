export type HandNote = {
  /** Diatonic steps above middle C as written on the staff: B3 = -1, C4 = 0, C5 = 7, G5 = 11. */
  step: number;
  beats: 1 | 2 | 4;
  finger?: number;
};

export type TwoHandMeasure = {
  chord?: string;
  right: readonly HandNote[];
  left: readonly HandNote[];
  lyrics: string;
};

const B3 = -1, C4 = 0, E4 = 2, F4 = 3, G4 = 4;
const C5 = 7, D5 = 8, E5 = 9, F5 = 10, G5 = 11;
const q = (step: number, finger?: number): HandNote => ({ step, beats: 1, finger });
const h = (step: number, finger?: number): HandNote => ({ step, beats: 2, finger });
const w = (step: number, finger?: number): HandNote => ({ step, beats: 4, finger });
const cgeg = (fingers: readonly (number | undefined)[] = []): HandNote[] =>
  [q(C4, fingers[0]), q(G4, fingers[1]), q(E4, fingers[2]), q(G4, fingers[3])];
const bgfg = (fingers: readonly (number | undefined)[] = []): HandNote[] =>
  [q(B3, fingers[0]), q(G4, fingers[1]), q(F4, fingers[2]), q(G4, fingers[3])];

// Transcribed from the supplied two-hand bee score. Its right hand is written an octave
// above the earlier right-hand practice, and this score is the reference for this page.
export const TWO_HAND_BEE_SCORE: readonly TwoHandMeasure[] = [
  { chord: 'C', lyrics: '嗡嗡嗡', right: [q(G5, 5), q(E5, 3), h(E5)], left: cgeg([5, 1, 3, 1]) },
  { chord: 'G7', lyrics: '嗡嗡嗡', right: [q(F5, 4), q(D5, 2), h(D5)], left: bgfg([5, 1, 2, 1]) },
  { chord: 'C', lyrics: '大家一齊', right: [q(C5, 1), q(D5), q(E5), q(F5)], left: cgeg([5]) },
  { lyrics: '勤做工', right: [q(G5), q(G5), h(G5, 5)], left: cgeg() },
  { chord: 'C', lyrics: '來匆匆', right: [q(G5, 5), q(E5, 3), h(E5)], left: cgeg() },
  { chord: 'G7', lyrics: '去匆匆', right: [q(F5, 4), q(D5, 2), h(D5)], left: bgfg() },
  { chord: 'C', lyrics: '做工趣味', right: [q(C5, 1), q(E5, 3), q(G5, 5), q(G5)], left: cgeg() },
  { lyrics: '濃', right: [w(E5, 3)], left: cgeg() },
  { chord: 'G7', lyrics: '天暖花好', right: [q(D5, 2), q(D5), q(D5), q(D5)], left: bgfg() },
  { lyrics: '不做工', right: [q(D5, 2), q(E5, 3), h(F5, 4)], left: bgfg() },
  { chord: 'C', lyrics: '將來哪裡', right: [q(E5, 3), q(E5), q(E5), q(E5)], left: cgeg() },
  { lyrics: '好過冬', right: [q(E5, 3), q(F5, 4), h(G5, 5)], left: cgeg() },
  { chord: 'C', lyrics: '嗡嗡嗡', right: [q(G5, 5), q(E5, 3), h(E5)], left: cgeg() },
  { chord: 'G7', lyrics: '嗡嗡嗡', right: [q(F5, 4), q(D5, 2), h(D5)], left: bgfg([5, 1, 2, 1]) },
  { chord: 'C', lyrics: '別學懶惰', right: [q(C5, 1), q(E5, 3), q(G5, 5), q(G5)], left: cgeg([5, 1, 3, 1]) },
  { lyrics: '蟲', right: [w(C5, 1)], left: [w(C4, 5)] },
];
