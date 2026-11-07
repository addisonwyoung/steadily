import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { App } from '../../app/app';
import { AuthContext, type AuthState } from './auth-context';
import { StoreProvider } from '../../store/context';
import { createSteadilyStore } from '../../store/create-store';
import { memoryStorage } from '../../test/fixtures';

vi.mock('../profile/profile', () => ({
  fetchAccountProfile: vi
    .fn()
    .mockResolvedValue({ id: 'a', username: 'test_user', created_at: '2026-10-09' }),
}));

const signedOut: AuthState = {
  user: null,
  loading: false,
  error: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
};
function setup(path: string, state: AuthState = signedOut) {
  return render(
    <AuthContext.Provider value={state}>
      <StoreProvider store={createSteadilyStore({ storage: memoryStorage() })}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </StoreProvider>
    </AuthContext.Provider>,
  );
}
it.each(['/', '/progress', '/habits', '/challenge'])('requires sign-in for %s', (path) => {
  setup(path);
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByText('Make room for a small beginning.')).not.toBeInTheDocument();
});
it('does not flash onboarding while restoring a session', () => {
  setup('/', { ...signedOut, loading: true });
  expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
  expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
});
it('shows onboarding only for a signed-in user with a database profile but without habits', async () => {
  setup('/', { ...signedOut, user: { id: 'a', email: 'a@example.com' } });
  expect(await screen.findByText('Make room for a small beginning.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
});
it('passes entered credentials to sign-in and displays failures', async () => {
  const signIn = vi.fn().mockRejectedValue({ code: 'invalid_credentials' });
  setup('/login', { ...signedOut, signIn });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), 'a@example.com');
  await user.type(screen.getByLabelText('Password'), 'password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(signIn).toHaveBeenCalledWith('a@example.com', 'password');
  expect(await screen.findByRole('alert')).toHaveTextContent('incorrect');
});
