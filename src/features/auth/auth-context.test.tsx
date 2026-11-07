import { act, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './auth-context';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  unsubscribe: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: mocks } }));
let callback: (event: AuthChangeEvent, session: Session | null) => void;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.onAuthStateChange.mockImplementation((listener) => {
    callback = listener;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
});
function Status() {
  const { user, loading, error } = useAuth();
  return <p>{loading ? 'Loading' : (error ?? user?.id ?? 'Signed out')}</p>;
}
it('restores a session, responds to sign-out, and removes the listener', async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: 'account-a' } } },
    error: null,
  });
  const view = render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  );
  expect(await screen.findByText('account-a')).toBeInTheDocument();
  act(() => callback('SIGNED_OUT', null));
  expect(screen.getByText('Signed out')).toBeInTheDocument();
  view.unmount();
  expect(mocks.unsubscribe).toHaveBeenCalledOnce();
});
it('does not overwrite a newer sign-out with an older restoration result', async () => {
  let resolve!: (value: unknown) => void;
  mocks.getSession.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  );
  await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());
  act(() => callback('SIGNED_OUT', null));
  await act(async () => {
    resolve({ data: { session: { user: { id: 'stale-user' } } }, error: null });
  });
  expect(screen.getByText('Signed out')).toBeInTheDocument();
});
