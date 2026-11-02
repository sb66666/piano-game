import { describe, expect, it } from 'vitest';
import {
  FIVE_NOTE_SEQUENCE,
  matchesSequenceNote,
} from './piano-sequence';
import { makeReading, midiFromReading, pitchFromBuffer } from './pitch';

describe('five-note piano sequence', () => {
  it('maps the right-hand fingers to ascending C4 through G4', () => {
    expect(FIVE_NOTE_SEQUENCE).toEqual([
      { midi: 60, name: 'Do', finger: '拇指' },
      { midi: 62, name: 'Re', finger: '食指' },
      { midi: 64, name: 'Mi', finger: '中指' },
      { midi: 65, name: 'Fa', finger: '無名指' },
      { midi: 67, name: 'Sol', finger: '小指' },
    ]);
  });

  it('accepts the target note only within the pitch and clarity limits', () => {
    expect(matchesSequenceNote(60, -25, 0.84, 60)).toBe(true);
    expect(matchesSequenceNote(67, 25, 1, 67)).toBe(true);
    expect(matchesSequenceNote(60, -26, 1, 60)).toBe(false);
    expect(matchesSequenceNote(60, 26, 1, 60)).toBe(false);
    expect(matchesSequenceNote(62, 0, 1, 60)).toBe(false);
    expect(matchesSequenceNote(60, 0, 0.839, 60)).toBe(false);
  });

  it.each(FIVE_NOTE_SEQUENCE)('detects $name at the correct octave', ({ midi }) => {
    const sampleRate = 48_000;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const samples = Float32Array.from(
      { length: 4096 },
      (_, index) => 0.25 * Math.sin((2 * Math.PI * frequency * index) / sampleRate),
    );
    const frame = pitchFromBuffer(samples, sampleRate);

    expect(frame).not.toBeNull();
    if (!frame) return;

    const reading = makeReading(frame.frequency);
    expect(midiFromReading(reading)).toBe(midi);
    expect(Math.abs(reading.cents)).toBeLessThanOrEqual(25);
    expect(frame.clarity).toBeGreaterThanOrEqual(0.84);
  });
});
