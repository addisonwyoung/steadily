import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { StoreProvider } from '../store/context';
import { createSteadilyStore } from '../store/create-store';
import { FeedbackProvider } from '../components/feedback';
import { fixture, memoryStorage } from '../test/fixtures';
import { LEGACY_KEY, STORAGE_KEY } from '../lib/storage';
import { localDay } from '../domain/dates';
import { AuthContext } from '../features/auth/auth-context';

vi.mock('../features/habits/habit-templates', () => ({
  fetchHabitTemplates: vi.fn().mockResolvedValue(
    Array.from({ length: 6 }, (_, index) => ({
      id: `template-${index}`,
      title: `Suggestion ${index}`,
      task: `Task ${index}`,
      suggested_time: 'Morning',
    })),
  ),
}));

vi.mock('../features/profile/profile', () => ({
  fetchAccountProfile: vi
    .fn()
    .mockResolvedValue({ id: 'test', username: 'test_user', created_at: '2026-10-09' }),
}));

async function setup(existing = false) {
  const storage = memoryStorage(existing ? { [LEGACY_KEY]: JSON.stringify(fixture()) } : {});
  const store = createSteadilyStore({ storage });
  if (existing)
    store
      .getState()
      .saveHabit({ title: 'Read', normal: 'Read a page', time: 'Evening', icon: '✧' });
  const user = userEvent.setup();
  render(
    <AuthContext.Provider
      value={{
        user: { id: 'test', email: 'test@example.com' },
        loading: false,
        error: null,
        signIn: async () => undefined,
        signOut: async () => undefined,
      }}
    >
      <StoreProvider store={store}>
        <FeedbackProvider>
          <MemoryRouter>
            <App />
          </MemoryRouter>
        </FeedbackProvider>
      </StoreProvider>
    </AuthContext.Provider>,
  );
  await screen.findByText(existing ? 'Your small steps' : 'Make room for a small beginning.');
  return { user, store, storage };
}
describe('main app journeys', () => {
  it('onboards, completes a habit, and keeps data for a reload', async () => {
    const { user, store, storage } = await setup();
    await user.type(screen.getByLabelText(/What should we call you/), 'Alex');
    await screen.findByRole('button', { name: 'Suggestion 0' });
    await user.click(screen.getByRole('button', { name: 'Shape my habits →' }));
    expect(screen.getByRole('heading', { name: 'Make it easy to show up.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Begin my first day →' }));
    expect(
      screen.getByRole('heading', { name: 'A little better, at your pace.' }),
    ).toBeInTheDocument();
    const walk = screen.getByRole('article', { name: 'Suggestion 0' });
    await user.click(within(walk).getByRole('button', { name: 'Complete' }));
    expect(within(walk).getByText(/Completed/)).toBeInTheDocument();
    const reloaded = createSteadilyStore({ storage });
    expect(reloaded.getState().data).toEqual(store.getState().data);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });
  it('saves a check-in and a missed reason, then navigates to progress', async () => {
    const { user, store } = await setup(true);
    await user.click(screen.getByRole('button', { name: 'Evening check-in' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/One small win/), 'I made time to rest.');
    for (const field of within(dialog).getAllByLabelText(/What got in the way/)) {
      await user.selectOptions(field, 'Tiredness');
    }
    await user.click(within(dialog).getByRole('button', { name: 'Save my check-in' }));
    expect(
      within(dialog).getByRole('heading', { name: 'Thank you for showing up.' }),
    ).toBeInTheDocument();
    expect(store.getState().data.checks[localDay()]?.win).toBe('I made time to rest.');
    await user.click(within(dialog).getByRole('button', { name: 'Close and enjoy your evening' }));
    await user.click(screen.getByRole('link', { name: 'My progress' }));
    expect(
      await screen.findByRole('heading', { name: 'Look how you’re showing up.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('I made time to rest.')).toBeInTheDocument();
  });
  it('adds suggestions once, persists their identity, and stops at five habits', async () => {
    const { user, store, storage } = await setup(true);
    await user.click(screen.getByRole('link', { name: 'My habits' }));
    const first = await screen.findByRole('button', { name: /Suggestion 0/ });
    await user.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(store.getState().data.habits.at(-1)).toMatchObject({
      templateId: 'template-0',
      normal: 'Task 0',
      time: 'Morning',
    });
    for (let index = 1; store.getState().data.habits.length < 5; index++) {
      await user.click(screen.getByRole('button', { name: new RegExp(`Suggestion ${index}`) }));
    }
    expect(screen.getByRole('button', { name: /Suggestion 5/ })).toBeDisabled();
    expect(screen.getByText('5/5 selected')).toBeInTheDocument();
    await user.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('4/5 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Suggestion 5/ }));
    expect(screen.getByText('5/5 selected')).toBeInTheDocument();

    const reloaded = createSteadilyStore({ storage });
    expect(reloaded.getState().data.habits).toEqual(store.getState().data.habits);
  });

  it('restores focus after closing a dialog with Escape', async () => {
    const { user } = await setup(true);
    const trigger = screen.getByRole('button', { name: 'Evening check-in' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
  it('offers list-only habit selection and completes an offline activity', async () => {
    const { user, store } = await setup(true);
    await user.click(screen.getByRole('link', { name: 'My habits' }));
    await screen.findByRole('heading', { name: 'Your habits' });
    expect(screen.queryByRole('button', { name: 'Add habit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit habit' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Offline reset' }));
    await user.click(await screen.findByRole('button', { name: 'I tried it →' }));
    await user.click(screen.getByRole('button', { name: 'Save today’s activity' }));
    expect(screen.getByRole('button', { name: 'See you tomorrow' })).toBeDisabled();
    expect(store.getState().data.challenge).toHaveLength(1);
  });
});
