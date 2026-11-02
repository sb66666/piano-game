import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FiveNotePracticeScreen } from './lesson';

const mocks = vi.hoisted(() => ({
  setLocation: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/practice-five-notes', mocks.setLocation],
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('five-note practice navigation', () => {
  it('skips to the bee introduction without marking the sequence complete', async () => {
    render(<FiveNotePracticeScreen />);

    expect(screen.getByTestId('status-sequence-progress')).toHaveTextContent('已完成 0 / 5 個音');
    expect(screen.getByTestId('button-skip-sequence')).toBeVisible();

    await act(async () => {
      fireEvent.click(screen.getByTestId('button-skip-sequence'));
    });

    expect(mocks.setLocation).toHaveBeenCalledWith('/bee-intro');
    expect(screen.getByTestId('status-sequence-progress')).not.toHaveTextContent('Do 到 Sol 都彈到了');
  });
});
