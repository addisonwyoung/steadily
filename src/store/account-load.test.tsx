import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AccountStore, accountStorage } from './account-store';
import { AuthContext } from '../features/auth/auth-context';
import { useSteadily } from './context';
import { fixture } from '../test/fixtures';
import { STORAGE_KEY } from '../lib/storage';
const { fetchUserHabits, initialize } = vi.hoisted(() => ({
  fetchUserHabits: vi.fn(),
  initialize: vi.fn(),
}));
vi.mock('../features/habits/user-habits', () => ({
  fetchUserHabits,
  userHabitRepository: () => ({ initialize, add: vi.fn(), remove: vi.fn() }),
}));
vi.mock('../features/habits/habit-templates', () => ({
  fetchHabitTemplates: vi.fn().mockResolvedValue([
    { id: 'walk', title: 'Take a walk', task: 'Walk for 15 minutes', suggested_time: 'Morning' },
    { id: 'read', title: 'Read', task: 'Read', suggested_time: 'Morning' },
  ]),
}));
function Habits() {
  const habits = useSteadily((state) => state.data.habits);
  return <div>Loaded: {habits.map((habit) => habit.title).join(', ')}</div>;
}
function view(id = 'account-a') {
  return (
    <AuthContext.Provider
      value={{ user: { id }, loading: false, error: null, signIn: vi.fn(), signOut: vi.fn() }}
    >
      <AccountStore>
        <Habits />
      </AccountStore>
    </AuthContext.Provider>
  );
}
const online = (id: string) => ({
  id,
  templateId: id,
  title: id,
  normal: id,
  time: 'Morning',
  icon: '✧',
  created: '2026-09-01',
});
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
it('loads server selections in a fresh browser before displaying the app', async () => {
  fetchUserHabits.mockResolvedValue([online('walk'), online('read')]);
  render(view());
  expect(await screen.findByText('Loaded: walk, read')).toBeInTheDocument();
  expect(fetchUserHabits).toHaveBeenCalledWith('account-a', expect.any(AbortSignal));
});
it('keeps a failed read behind a retry screen rather than treating it as an empty list', async () => {
  fetchUserHabits
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce([online('walk')]);
  render(view());
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText(/^Loaded:/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Loaded: walk')).toBeInTheDocument();
});
it('offers an explicit import when local choices exist but the server is empty', async () => {
  const data = fixture();
  data.habits.push({ ...data.habits[0]!, id: 'read', title: 'Read', normal: 'Read' });
  accountStorage('account-a', localStorage).setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 2, data }),
  );
  fetchUserHabits.mockResolvedValue([]);
  initialize.mockResolvedValue([online('walk'), online('read')]);
  render(view());
  await userEvent.click(await screen.findByRole('button', { name: 'Import my selections' }));
  expect(initialize).toHaveBeenCalledWith(['walk', 'read']);
  expect(await screen.findByText('Loaded: walk, read')).toBeInTheDocument();
});
it('ignores a previous account response after switching accounts', async () => {
  let finish!: (value: unknown) => void;
  fetchUserHabits
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce([online('other')]);
  const { rerender } = render(view());
  rerender(view('account-b'));
  expect(await screen.findByText('Loaded: other')).toBeInTheDocument();
  finish([online('old-account')]);
  expect(screen.queryByText(/Loaded: old-account/)).not.toBeInTheDocument();
});
