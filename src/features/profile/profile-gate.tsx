import { useEffect, useState, type ReactNode } from 'react';
import { Brand, ErrorMessage } from '../../components/ui';
import { AccountControls } from '../auth/account-controls';
import { fetchAccountProfile, type AccountProfile } from './profile';

// One status at a time prevents impossible combinations like "missing + error".
type ProfileState =
  | { status: 'loading' }
  | { status: 'found'; profile: AccountProfile }
  | { status: 'missing' }
  | { status: 'error' };

export function ProfileGate({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetchAccountProfile(userId, controller.signal)
      .then((profile) => {
        if (!controller.signal.aborted) {
          setState(profile ? { status: 'found', profile } : { status: 'missing' });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });
    // Ignore old responses after logout, account changes, retries, or unmounting.
    return () => controller.abort();
  }, [userId, attempt]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }
  if (state.status === 'found') return children;
  return (
    <main className="onboard" style={{ maxWidth: 560 }}>
      <Brand />
      <div className="row wrap">
        <AccountControls />
      </div>
      {state.status === 'loading' ? (
        <p role="status">Opening your account…</p>
      ) : state.status === 'error' ? (
        <section className="card">
          <h1>Let’s try that again.</h1>
          <ErrorMessage error="Your profile could not be loaded. Check your connection and try again." />
          <button className="primary" onClick={retry}>
            Retry
          </button>
        </section>
      ) : (
        <section className="card">
          <h1>Your profile isn’t ready.</h1>
          <p>
            We couldn’t find the profile created during registration. Please contact support to
            restore it.
          </p>
          <button onClick={retry}>Check again</button>
        </section>
      )}
    </main>
  );
}
