import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CoursePage from './course';

vi.mock('wouter', () => ({
  useLocation: () => ['/course', vi.fn()],
}));

afterEach(cleanup);

const noOp = vi.fn();

function renderCourse(overrides: Partial<React.ComponentProps<typeof CoursePage>> = {}) {
  const props: React.ComponentProps<typeof CoursePage> = {
    onPlayNote: noOp,
    microphonePhase: 'idle',
    detectedNote: null,
    onStartListening: noOp,
    onStopListening: noOp,
    ...overrides,
  };
  const view = render(<CoursePage {...props} />);
  return { ...view, props };
}

function playKey(note: string) {
  fireEvent.click(screen.getByTestId(`button-piano-${note.toLowerCase()}-4`));
}

function reachMicrophoneStep() {
  playKey('c');
  fireEvent.click(screen.getByTestId('button-next-lesson'));
  playKey('c');
  playKey('d');
  playKey('e');
  fireEvent.click(screen.getByTestId('button-next-lesson'));
}

describe('course lesson feedback', () => {
  it('completes the first step only after the player presses C4', () => {
    renderCourse();
    const nextStep = screen.getByTestId('button-next-lesson');

    expect(nextStep).toBeDisabled();
    expect(screen.getByTestId('button-course-step-2')).toBeDisabled();

    playKey('d');
    expect(nextStep).toBeDisabled();
    expect(screen.getByTestId('status-key-feedback')).toHaveTextContent('再找找標記著 C4');

    playKey('c');
    expect(nextStep).toBeEnabled();
    expect(screen.getByTestId('button-course-step-2')).toBeEnabled();
    expect(screen.getByTestId('status-key-feedback')).toHaveTextContent('這個 C4 就是中央 C');
  });

  it('requires C, D, and E in order before unlocking the next step', () => {
    renderCourse();
    playKey('c');
    fireEvent.click(screen.getByTestId('button-next-lesson'));

    const nextStep = screen.getByTestId('button-next-lesson');
    expect(nextStep).toBeDisabled();

    playKey('d');
    expect(screen.getByTestId('status-sequence')).toHaveTextContent('C');
    expect(nextStep).toBeDisabled();

    playKey('c');
    playKey('e');
    expect(nextStep).toBeDisabled();
    expect(screen.getByTestId('status-current-lesson')).toHaveTextContent('已彈 0 / 3 個音');

    playKey('c');
    playKey('d');
    expect(nextStep).toBeDisabled();
    playKey('e');

    expect(nextStep).toBeEnabled();
    expect(screen.getByTestId('status-current-lesson')).toHaveTextContent('旋律完成');
  });

  it('marks the microphone step complete only when E4 is recognized', () => {
    const view = renderCourse();
    reachMicrophoneStep();

    expect(screen.getByTestId('text-course-progress')).toHaveTextContent('2 / 3 完成');
    expect(screen.getByTestId('status-course-completion')).not.toHaveTextContent('這堂課完成了');

    view.rerender(
      <CoursePage
        {...view.props}
        microphonePhase="listening"
        detectedNote={{ name: 'D', octave: 4, cents: 0 }}
      />,
    );
    expect(screen.getByTestId('text-course-progress')).toHaveTextContent('2 / 3 完成');
    expect(screen.getByTestId('status-course-completion')).not.toHaveTextContent('這堂課完成了');

    view.rerender(
      <CoursePage
        {...view.props}
        microphonePhase="listening"
        detectedNote={{ name: 'E', octave: 4, cents: 0 }}
      />,
    );
    expect(screen.getByTestId('text-course-progress')).toHaveTextContent('3 / 3 完成');
    expect(screen.getByTestId('status-course-completion')).toHaveTextContent('這堂課完成了');
    expect(screen.getByTestId('status-microphone-feedback')).toHaveTextContent('聽見 E4 了');
  });

  it.each([
    ['denied', '目前不允許使用麥克風'],
    ['unavailable', '沒有找到可用的麥克風'],
    ['unsupported', '無法使用即時收音'],
    ['error', '收音剛剛中斷了'],
  ] as const)('shows the right feedback for microphone phase %s', (microphonePhase, message) => {
    renderCourse({ microphonePhase });
    reachMicrophoneStep();

    expect(screen.getByTestId('status-microphone-feedback')).toHaveTextContent(message);
    expect(screen.getByTestId('status-course-completion')).not.toHaveTextContent('這堂課完成了');
    expect(screen.getByTestId('text-course-progress')).toHaveTextContent('2 / 3 完成');
  });
});
