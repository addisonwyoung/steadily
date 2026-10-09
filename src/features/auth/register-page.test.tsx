import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi, beforeEach } from 'vitest';
import RegisterPage from './register-page';
import { registerAccount } from './register';

vi.mock('./register', async (original) => ({
  ...(await original<typeof import('./register')>()),
  registerAccount: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(registerAccount).mockReset();
});
async function fill(username = 'Alex_123') {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
  await user.type(screen.getByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Email'), 'alex@example.com');
  await user.type(screen.getByLabelText('Password'), 'a-long-test-password');
  return user;
}
it('normalizes the username and shows confirmation without promising a reservation', async () => {
  vi.mocked(registerAccount).mockResolvedValue('confirm-email');
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(registerAccount).toHaveBeenCalledWith({
    username: 'alex_123',
    email: 'alex@example.com',
    password: 'a-long-test-password',
  });
  expect(await screen.findByRole('heading', { name: 'Check your email.' })).toBeInTheDocument();
  expect(screen.getByText(/not reserved/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
});
it('rejects invalid usernames before contacting Supabase', async () => {
  const user = await fill('bad name');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByRole('alert')).toHaveTextContent('3–24');
  expect(registerAccount).not.toHaveBeenCalled();
});
it('disables submission while pending and permits retry after failure', async () => {
  let rejectRequest!: (error: Error) => void;
  vi.mocked(registerAccount).mockImplementation(
    () =>
      new Promise((_, reject) => {
        rejectRequest = reject;
      }),
  );
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByRole('button', { name: 'Creating account…' })).toBeDisabled();
  rejectRequest(new Error('Network failure'));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not finish');
  expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
});
