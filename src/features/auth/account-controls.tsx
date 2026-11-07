import { useState } from 'react';
import { useAuth } from './auth-context';
import { useFeedback } from '../../components/feedback';

export function AccountControls() {
  const { user, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const notify = useFeedback();
  return (
    <div className="row wrap">
      <small>{user?.email}</small>
      <button
        className="small"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signOut().catch(() => {
            notify('Sign-out could not finish. Try again.');
            setPending(false);
          });
        }}
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
