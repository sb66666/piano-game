import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StaffReadingScreen from './staff-reading';

const mocks = vi.hoisted(() => ({ setLocation: vi.fn() }));

vi.mock('wouter', () => ({
  useLocation: () => ['/staff-reading', mocks.setLocation],
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('treble clef reading page', () => {
  it('shows thirteen notes from middle C to A and continues to the bee song', () => {
    render(<StaffReadingScreen />);

    expect(screen.getByRole('heading', { name: '高音譜號' })).toBeVisible();
    expect(screen.getByText('中央 C')).toBeInTheDocument();
    expect(screen.getByText('中央 G')).toBeInTheDocument();
    expect(screen.getByTestId('staff-reading-chart').querySelectorAll('[data-testid^="staff-note-"]')).toHaveLength(13);

    fireEvent.click(screen.getByTestId('button-staff-understood'));
    expect(mocks.setLocation).toHaveBeenCalledWith('/bee-intro');
  });
});
