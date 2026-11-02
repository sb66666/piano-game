import { act, cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BEE_SONG_SCORE } from '@/lib/piano-sequence';
import BeePracticeScreen from './bee-practice';

const audio = vi.hoisted(() => ({ midi: null as number | null }));

vi.mock('@/lib/pitch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/pitch')>();
  return {
    ...actual,
    pitchFromBuffer: () => audio.midi === null ? null : {
      frequency: 440 * 2 ** ((audio.midi - 69) / 12),
      clarity: 0.99,
      rms: 0.1,
    },
  };
});

class FakeAudioContext {
  sampleRate = 48000;
  state = 'running';
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
  createAnalyser() {
    return { fftSize: 4096, smoothingTimeConstant: 0, getFloatTimeDomainData: vi.fn(), disconnect: vi.fn() };
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  audio.midi = null;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('navigator', {
    ...navigator,
    mediaDevices: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn() }],
        getAudioTracks: () => [{ addEventListener: vi.fn() }],
      })),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('full bee score practice', () => {
  it('draws the complete score and advances one blue note at a time', async () => {
    render(<BeePracticeScreen />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });

    expect(screen.getByRole('img', { name: '小蜜蜂完整五線譜' })).toBeInTheDocument();
    expect(screen.getByTestId('bee-score-viewport').querySelectorAll('ellipse')).toHaveLength(49);
    expect(screen.getByTestId('bee-score-viewport').querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByTestId('bee-song-progress')).toHaveTextContent('已彈 0 / 49 個音');
    expect(screen.getByTestId('bee-score-note-0')).toHaveClass('is-current');

    audio.midi = 60;
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByTestId('bee-song-progress')).toHaveTextContent('已彈 0 / 49 個音');

    for (let index = 0; index < BEE_SONG_SCORE.length; index += 1) {
      audio.midi = BEE_SONG_SCORE[index].midi;
      await act(async () => { await vi.advanceTimersByTimeAsync(300); });
      expect(screen.getByTestId(`bee-score-note-${index}`)).toHaveClass('is-played');
      if (index < BEE_SONG_SCORE.length - 1) {
        expect(screen.getByTestId('bee-song-progress')).toHaveTextContent(`已彈 ${index + 1} / 49 個音`);
        expect(screen.getByTestId(`bee-score-note-${index + 1}`)).toHaveClass('is-current');
      }
      audio.midi = null;
      await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    }
    expect(screen.getByTestId('bee-song-progress')).toHaveTextContent('完成！');
  });

  it('does not count one held note twice when the score repeats it', async () => {
    render(<BeePracticeScreen />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    audio.midi = 67;
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    audio.midi = 64;
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByTestId('bee-song-progress')).toHaveTextContent('已彈 2 / 49 個音');
    audio.midi = null;
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    audio.midi = 64;
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByTestId('bee-song-progress')).toHaveTextContent('已彈 3 / 49 個音');
  });
});
