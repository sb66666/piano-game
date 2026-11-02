export type Reading = {
  frequency: number;
  noteIndex: number;
  cents: number;
  note: string;
  octave: number;
};

export type PitchFrame = { frequency: number; clarity: number; rms: number };

export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const NOTE_TW = ['Do', '升 Do', 'Re', '升 Re', 'Mi', 'Fa', '升 Fa', 'Sol', '升 Sol', 'La', '升 La', 'Si'];

export function pitchFromBuffer(buffer: Float32Array, sampleRate: number, minimumRms = 0.007): PitchFrame | null {
  const size = buffer.length;
  let energy = 0;
  for (let i = 0; i < size; i += 1) energy += buffer[i] * buffer[i];
  const rms = Math.sqrt(energy / size);
  if (rms < minimumRms) return null;

  const minLag = Math.max(2, Math.floor(sampleRate / 4200));
  const maxLag = Math.min(Math.floor(sampleRate / 27), Math.floor(size * 0.48));
  const difference = new Float32Array(maxLag + 1);
  let runningSum = 0;
  for (let tau = 1; tau <= maxLag; tau += 1) {
    let delta = 0;
    const limit = size - tau;
    for (let i = 0; i < limit; i += 1) {
      const diff = buffer[i] - buffer[i + tau];
      delta += diff * diff;
    }
    difference[tau] = delta;
    runningSum += delta;
    difference[tau] = runningSum > 0 ? (delta * tau) / runningSum : 1;
  }

  let candidate = -1;
  for (let tau = minLag; tau < maxLag - 1; tau += 1) {
    if (difference[tau] < 0.16) {
      while (tau + 1 < maxLag && difference[tau + 1] < difference[tau]) tau += 1;
      candidate = tau;
      break;
    }
  }
  if (candidate < 0) {
    let best = 1;
    for (let tau = minLag; tau <= maxLag; tau += 1) {
      if (difference[tau] < best) {
        best = difference[tau];
        candidate = tau;
      }
    }
    if (best > 0.22) return null;
  }
  if (candidate <= minLag || candidate >= maxLag) return null;
  const left = difference[candidate - 1];
  const middle = difference[candidate];
  const right = difference[candidate + 1];
  const curve = left - 2 * middle + right;
  const shift = curve === 0 ? 0 : 0.5 * (left - right) / curve;
  const lag = candidate + shift;
  const frequency = sampleRate / lag;
  if (!Number.isFinite(frequency) || frequency < 25 || frequency > 4500) return null;
  return { frequency, clarity: Math.max(0, Math.min(1, 1 - middle)), rms };
}

export function makeReading(frequency: number): Reading {
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const nearest = Math.round(midi);
  const noteIndex = ((nearest % 12) + 12) % 12;
  return {
    frequency,
    noteIndex,
    cents: Math.round((midi - nearest) * 100),
    note: NOTE_NAMES[noteIndex],
    octave: Math.floor(nearest / 12) - 1,
  };
}

export function midiFromReading(reading: Reading): number {
  return (reading.octave + 1) * 12 + reading.noteIndex;
}
