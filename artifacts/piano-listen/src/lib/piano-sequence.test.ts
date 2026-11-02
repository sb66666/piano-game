import { describe, expect, it } from 'vitest';
import {
  BEE_SONG_SCORE,
  BEE_SONG_MEASURES,
  FIVE_NOTE_SEQUENCE,
  matchesSequenceNote,
  SEQUENCE_MINIMUM_RMS,
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

  it('maps the uploaded bee score to the correct note order and staff positions', () => {
    expect(BEE_SONG_SCORE.map(({ midi }) => midi)).toEqual([
      67, 64, 64, 65, 62, 62, 60, 62, 64, 65, 67, 67, 67,
      67, 64, 64, 65, 62, 62, 60, 64, 67, 67, 64,
      62, 62, 62, 62, 62, 64, 65, 64, 64, 64, 64, 64, 65, 67,
      67, 64, 64, 65, 62, 62, 60, 64, 67, 67, 60,
    ]);
    expect(BEE_SONG_SCORE).toHaveLength(49);
    expect(BEE_SONG_MEASURES).toHaveLength(16);
    expect(BEE_SONG_MEASURES[0].map((note) => note.duration)).toEqual(['eighth', 'eighth', 'quarter']);
    expect(BEE_SONG_MEASURES[2].map((note) => note.duration)).toEqual(['eighth', 'eighth', 'eighth', 'eighth']);
    expect(BEE_SONG_MEASURES[7][0].duration).toBe('half');
    expect(BEE_SONG_MEASURES[15][0].duration).toBe('half');
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

  it.each([
    ['balanced piano harmonics', [0.18, 0.35, 0.22, 0.12]],
    ['a strong second harmonic', [0.05, 0.42, 0.19, 0.11]],
  ])('keeps G4 as Sol with %s', (_profile, amplitudes) => {
    const sampleRate = 48_000;
    const fundamental = 440 * 2 ** ((67 - 69) / 12);
    const samples = Float32Array.from({ length: 4096 }, (_, index) =>
      amplitudes.reduce((sum, amplitude, harmonicIndex) => (
        sum + amplitude * Math.sin((2 * Math.PI * fundamental * (harmonicIndex + 1) * index) / sampleRate)
      ), 0),
    );
    const frame = pitchFromBuffer(samples, sampleRate);

    expect(frame).not.toBeNull();
    if (!frame) return;
    expect(midiFromReading(makeReading(frame.frequency))).toBe(67);
  });

  it('can detect a quiet but clear G4 without accepting quiet noise as a target', () => {
    const sampleRate = 48_000;
    const fundamental = 440 * 2 ** ((67 - 69) / 12);
    const quietHarmonics = [0.05, 0.42, 0.19, 0.11];
    const quietG4 = Float32Array.from({ length: 4096 }, (_, index) => (
      quietHarmonics.reduce((sum, amplitude, harmonicIndex) => (
        sum + 0.01 * amplitude * Math.sin(
          (2 * Math.PI * fundamental * (harmonicIndex + 1) * index) / sampleRate,
        )
      ), 0)
    ));
    const quietFrame = pitchFromBuffer(quietG4, sampleRate, SEQUENCE_MINIMUM_RMS);

    expect(quietFrame).not.toBeNull();
    if (!quietFrame) return;
    const quietReading = makeReading(quietFrame.frequency);
    expect(quietFrame.rms).toBeLessThan(0.007);
    expect(matchesSequenceNote(
      midiFromReading(quietReading),
      quietReading.cents,
      quietFrame.clarity,
      67,
      quietFrame.rms,
    )).toBe(true);

    let seed = 17;
    const noise = Float32Array.from({ length: 4096 }, () => {
      seed = (seed * 16_807) % 2_147_483_647;
      return ((seed / 2_147_483_647) * 2 - 1) * 0.005;
    });
    const noiseFrame = pitchFromBuffer(noise, sampleRate, SEQUENCE_MINIMUM_RMS);
    let noiseAccepted = false;
    if (noiseFrame) {
      const noiseReading = makeReading(noiseFrame.frequency);
      noiseAccepted = matchesSequenceNote(
        midiFromReading(noiseReading),
        noiseReading.cents,
        noiseFrame.clarity,
        67,
        noiseFrame.rms,
      );
    }
    expect(noiseAccepted).toBe(false);
  });
});
