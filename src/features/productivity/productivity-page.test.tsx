import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PomodoroProvider } from './pomodoro';
import ProductivityPage from './productivity-page';

afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers();
  return render(
    <PomodoroProvider>
      <ProductivityPage />
    </PomodoroProvider>,
  );
}
describe('Pomodoro timer', () => {
  it('starts at 25 minutes, pauses, resumes, and resets', () => {
    setup();
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('timer')).toHaveTextContent('24:58');
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('timer')).toHaveTextContent('24:58');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('timer')).toHaveTextContent('24:57');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  });
  it('applies custom durations and prepares the next phase on completion', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Focus length (minutes)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Break length (minutes)'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply durations' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
    expect(screen.getByRole('status')).toHaveTextContent('Focus complete');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(120000));
    expect(screen.getByRole('timer')).toHaveTextContent('01:00');
    expect(screen.getByRole('status')).toHaveTextContent('Break complete');
  });
});
