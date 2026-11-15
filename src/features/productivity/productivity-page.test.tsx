import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FocusTimerProvider, timerStorageKey, type FocusRepository } from './pomodoro';
import ProductivityPage from './productivity-page';
import type { Habit } from '../../domain/schema';
import type { SavedFocusSession } from './focus-sessions';

const habits: Habit[] = [
  {
    id: 'walk',
    templateId: 'walk',
    title: 'Take a walk',
    normal: 'Walk',
    time: 'Morning',
    icon: '↗',
    created: '2026-11-01',
  },
];
let remote: FocusRepository;
beforeEach(() => {
  localStorage.clear();
  remote = {
    load: vi.fn().mockResolvedValue([]),
    save: vi
      .fn()
      .mockImplementation(async (_userId, session) => ({ ...session, habitTitle: 'Take a walk' })),
  };
});
afterEach(() => vi.useRealTimers());
async function setup(userId = 'account-a') {
  vi.useFakeTimers();
  const view = render(
    <FocusTimerProvider userId={userId} habits={habits} remote={remote}>
      <ProductivityPage />
    </FocusTimerProvider>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  fireEvent.change(screen.getByLabelText('What are you focusing on?'), {
    target: { value: 'walk' },
  });
  return view;
}
const timerSection = () => within(screen.getByRole('region', { name: 'Pomodoro timer' }));
function oneMinute() {
  fireEvent.change(screen.getByLabelText('Focus length (minutes)'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Break length (minutes)'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply durations' }));
}
describe('habit-linked Pomodoro', () => {
  it('requires a habit and supports pause, resume, and reset', async () => {
    await setup();
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');
    fireEvent.change(screen.getByLabelText('What are you focusing on?'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('What are you focusing on?'), {
      target: { value: 'walk' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('timer')).toHaveTextContent('24:58');
    expect(screen.getByLabelText('What are you focusing on?')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('timer')).toHaveTextContent('24:58');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('timer')).toHaveTextContent('24:57');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');
    expect(remote.save).not.toHaveBeenCalled();
  });
  it('records a completed focus session once, updates the report, and does not record breaks', async () => {
    await setup();
    oneMinute();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await act(async () => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
    expect(timerSection().getByText('Focus complete. Time for a break!')).toBeInTheDocument();
    expect(remote.save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('cell', { name: '1 min' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await act(async () => {
      vi.advanceTimersByTime(120000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('01:00');
    expect(timerSection().getByText('Break complete. Ready to focus?')).toBeInTheDocument();
    expect(remote.save).toHaveBeenCalledTimes(1);
  });
  it('recovers an expired session after refresh using its original ID and deadline', async () => {
    const first = await setup();
    oneMinute();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    const original = JSON.parse(localStorage.getItem(timerStorageKey('account-a'))!);
    first.unmount();
    vi.setSystemTime(Date.now() + 70000);
    await setup();
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
    expect(remote.save).toHaveBeenCalledWith(
      'account-a',
      expect.objectContaining({
        id: original.active.id,
        habitId: 'walk',
        completedAt: new Date(original.deadline).toISOString(),
      }),
      expect.any(AbortSignal),
    );
  });
  it('retains failed saves across refresh and retries the same session ID', async () => {
    vi.mocked(remote.save).mockRejectedValue(new Error('Offline'));
    const first = await setup();
    oneMinute();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await act(async () => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByRole('button', { name: 'Retry session save' })).toBeEnabled();
    const queued = JSON.parse(localStorage.getItem(timerStorageKey('account-a'))!).pending[0];
    first.unmount();
    vi.mocked(remote.save).mockImplementation(async (_userId, session) => ({
      ...session,
      habitTitle: 'Take a walk',
    }));
    await setup();
    expect(remote.save).toHaveBeenLastCalledWith(
      'account-a',
      expect.objectContaining({ id: queued.id }),
      expect.any(AbortSignal),
    );
    expect(JSON.parse(localStorage.getItem(timerStorageKey('account-a'))!).pending).toEqual([]);
  });
  it('keeps another account separate from a recovered timer', async () => {
    const first = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(5000));
    first.unmount();
    await setup('account-b');
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(remote.save).not.toHaveBeenCalled();
  });
  it('reports history failures instead of showing false zero totals', async () => {
    vi.mocked(remote.load).mockRejectedValue(new Error('Unavailable'));
    await setup();
    expect(screen.getByRole('alert')).toHaveTextContent('history could not be loaded');
    expect(screen.queryByText('minutes focused')).not.toBeInTheDocument();
  });
});

it('ignores a history response after unmounting', async () => {
  let finish!: (sessions: SavedFocusSession[]) => void;
  vi.mocked(remote.load).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = render(
    <FocusTimerProvider userId="account-a" habits={habits} remote={remote}>
      <ProductivityPage />
    </FocusTimerProvider>,
  );
  first.unmount();
  await act(async () => finish([]));
  await waitFor(() => expect(remote.save).not.toHaveBeenCalled());
});
