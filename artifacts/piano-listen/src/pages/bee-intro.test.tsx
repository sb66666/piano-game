import { act, cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BeeIntroScreen from './bee-intro';

const mocks = vi.hoisted(() => ({
  setLocation: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/bee-intro', mocks.setLocation],
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('bee intro transition', () => {
  it('shows only the message and advances after three seconds', () => {
    render(<BeeIntroScreen />);

    expect(screen.getByRole('heading', { name: '現在我們來彈奏「小蜜蜂吧！」' })).toBeVisible();
    expect(screen.queryByLabelText('鋼琴鍵盤')).not.toBeInTheDocument();
    expect(mocks.setLocation).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(2999));
    expect(mocks.setLocation).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(mocks.setLocation).toHaveBeenCalledWith('/bee-practice');
  });
});
