import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BassClefScreen from './bass-clef';
import LeftHandIntroScreen from './left-hand-intro';
import TwoHandScoreScreen from './two-hand-score';
import { TWO_HAND_BEE_SCORE } from '@/lib/two-hand-score';

const mocks = vi.hoisted(() => ({ setLocation: vi.fn() }));

vi.mock('wouter', () => ({
  useLocation: () => ['/', mocks.setLocation],
}));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('left-hand lesson flow', () => {
  it('shows only the left-hand message for three seconds, then opens the bass clef page', () => {
    render(<LeftHandIntroScreen />);
    expect(screen.getByRole('heading', { name: '很好！你已經學會了右手，接下來讓我們來繼續學習左手的部分吧！' })).toBeVisible();
    act(() => vi.advanceTimersByTime(2999));
    expect(mocks.setLocation).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(mocks.setLocation).toHaveBeenCalledWith('/bass-clef');
  });

  it('draws thirteen bass-clef notes from E to middle C and continues to the score', () => {
    render(<BassClefScreen />);
    expect(screen.getByRole('heading', { name: '低音譜號' })).toBeVisible();
    expect(screen.getByTestId('staff-reading-chart').querySelectorAll('[data-testid^="staff-note-"]')).toHaveLength(13);
    expect(screen.getByText('中央 C')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-bass-understood'));
    expect(mocks.setLocation).toHaveBeenCalledWith('/two-hand-score');
  });

  it('draws all sixteen measures of the two-hand score with full-length bars', () => {
    expect(TWO_HAND_BEE_SCORE).toHaveLength(16);
    expect(TWO_HAND_BEE_SCORE.every((m) => m.right.reduce((s, n) => s + n.beats, 0) === 4)).toBe(true);
    expect(TWO_HAND_BEE_SCORE.every((m) => m.left.reduce((s, n) => s + n.beats, 0) === 4)).toBe(true);
    expect(TWO_HAND_BEE_SCORE.every((m) => [...m.lyrics].length === m.right.length)).toBe(true);
    render(<TwoHandScoreScreen />);
    expect(screen.getByTestId('two-hand-score')).toBeInTheDocument();
  });
});
