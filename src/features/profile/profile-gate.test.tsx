import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ProfileGate } from './profile-gate';
import { fetchAccountProfile, type AccountProfile } from './profile';
import { AuthContext } from '../auth/auth-context';

vi.mock('./profile', () => ({ fetchAccountProfile: vi.fn() }));
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const profile = { id: a, username: 'alex_123', created_at: '2026-10-09' };
beforeEach(() => {
  vi.mocked(fetchAccountProfile).mockReset();
});
function view(id = a) {
  return (
    <AuthContext.Provider
      value={{
        user: { id, email: 'alex@example.com' },
        loading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
      }}
    >
      <ProfileGate key={id} userId={id}>
        <h1>Habit app</h1>
      </ProfileGate>
    </AuthContext.Provider>
  );
}
it('keeps the app hidden while loading and opens it when a profile is found', async () => {
  let resolve!: (profile: AccountProfile) => void;
  vi.mocked(fetchAccountProfile).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(view());
  expect(screen.getByRole('status')).toHaveTextContent('Opening your account');
  expect(screen.queryByText('Habit app')).not.toBeInTheDocument();
  await act(async () => {
    resolve(profile);
  });
  expect(screen.getByText('Habit app')).toBeInTheDocument();
});
it('shows profile-recovery information after a successful empty lookup', async () => {
  vi.mocked(fetchAccountProfile).mockResolvedValue(null);
  render(view());
  expect(await screen.findByText('Your profile isn’t ready.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText('Habit app')).not.toBeInTheDocument();
});
it('keeps errors distinct from missing profiles and retries successfully', async () => {
  vi.mocked(fetchAccountProfile)
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce(profile);
  render(view());
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText('Your profile isn’t ready.')).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Habit app')).toBeInTheDocument();
  expect(fetchAccountProfile).toHaveBeenCalledTimes(2);
});
it('ignores a previous account response and aborts its request', async () => {
  let resolveA!: (profile: AccountProfile) => void;
  vi.mocked(fetchAccountProfile)
    .mockReturnValueOnce(
      new Promise((done) => {
        resolveA = done;
      }),
    )
    .mockResolvedValueOnce(null);
  const rendered = render(view(a));
  const oldSignal = vi.mocked(fetchAccountProfile).mock.calls[0]![1];
  rendered.rerender(view(b));
  expect(await screen.findByText('Your profile isn’t ready.')).toBeInTheDocument();
  expect(oldSignal.aborted).toBe(true);
  await act(async () => {
    resolveA(profile);
  });
  expect(screen.queryByText('Habit app')).not.toBeInTheDocument();
});
