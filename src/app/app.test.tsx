import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './app';
import { StoreProvider } from '../store/context';
import { createSteadilyStore } from '../store/create-store';
import { FeedbackProvider } from '../components/feedback';
import { fixture, memoryStorage } from '../test/fixtures';
import { LEGACY_KEY, STORAGE_KEY } from '../lib/storage';
import { localDay } from '../domain/dates';

function setup(existing = false) {
  const storage = memoryStorage(existing ? { [LEGACY_KEY]: JSON.stringify(fixture()) } : {});
  const store = createSteadilyStore({ storage });
  const user = userEvent.setup();
  render(
    <StoreProvider store={store}>
      <FeedbackProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </FeedbackProvider>
    </StoreProvider>,
  );
  return { user, store, storage };
}
describe('main app journeys', () => {
  it('onboards, completes a minimum habit, and keeps data for a reload', async () => {
    const { user, store, storage } = setup();
    await user.type(screen.getByLabelText(/What should we call you/), 'Alex');
    await user.click(screen.getByRole('button', { name: 'Shape my habits →' }));
    expect(screen.getByRole('heading', { name: 'Make it easy to show up.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Begin my first day →' }));
    expect(
      screen.getByRole('heading', { name: 'A little better, at your pace.' }),
    ).toBeInTheDocument();
    const walk = screen.getByRole('article', { name: 'Take a walk' });
    await user.click(within(walk).getByRole('button', { name: 'Minimum' }));
    expect(within(walk).getByText(/Minimum version completed/)).toBeInTheDocument();
    const reloaded = createSteadilyStore({ storage });
    expect(reloaded.getState().data).toEqual(store.getState().data);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });
  it('saves a check-in and a missed reason, then navigates to progress', async () => {
    const { user, store } = setup(true);
    await user.click(screen.getByRole('button', { name: 'Evening check-in' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/One small win/), 'I made time to rest.');
    await user.selectOptions(within(dialog).getByLabelText(/What got in the way/), 'Tiredness');
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
  it('restores focus after closing a dialog with Escape', async () => {
    const { user } = setup(true);
    const trigger = screen.getByRole('button', { name: 'Evening check-in' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
  it('edits a habit and completes an offline activity through routed views', async () => {
    const { user, store } = setup(true);
    await user.click(screen.getByRole('link', { name: 'My habits' }));
    await user.click(await screen.findByRole('button', { name: 'Edit habit' }));
    const dialog = screen.getByRole('dialog');
    const normal = within(dialog).getByRole('textbox', { name: 'Normal version' });
    await user.clear(normal);
    await user.type(normal, 'Walk for 5 minutes');
    await user.click(within(dialog).getByRole('button', { name: 'Save habit' }));
    expect(store.getState().data.habits[0]?.normal).toBe('Walk for 5 minutes');
    await user.click(screen.getByRole('link', { name: 'Offline reset' }));
    await user.click(await screen.findByRole('button', { name: 'I tried it →' }));
    await user.click(screen.getByRole('button', { name: 'Save today’s activity' }));
    expect(screen.getByRole('button', { name: 'See you tomorrow' })).toBeDisabled();
    expect(store.getState().data.challenge).toHaveLength(1);
  });
});
