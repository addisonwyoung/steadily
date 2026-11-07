import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Brand, ErrorMessage } from '../../components/ui';
import { useAuth } from './auth-context';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      await signIn(email, password);
      setPassword('');
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
      setError(
        code === 'email_not_confirmed'
          ? 'Confirm your email using the link in your inbox, then sign in.'
          : code === 'invalid_credentials'
            ? 'The email or password is incorrect.'
            : 'Sign-in could not finish. Check your details and connection, then try again.',
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <main className="onboard" style={{ maxWidth: 560 }}>
      <Brand />
      <h1>Welcome to Steadily.</h1>
      <p className="muted">Sign in to start your small steps.</p>
      <form className="card" onSubmit={(event) => void submit(event)} aria-busy={pending}>
        <fieldset disabled={pending}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <ErrorMessage error={error} />
          <button className="primary full" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </fieldset>
        <p className="note">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
