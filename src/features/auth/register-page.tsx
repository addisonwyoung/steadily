import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Brand, ErrorMessage } from '../../components/ui';
import { registrationSchema, registerAccount } from './register';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<'confirm-email' | 'signed-in' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const parsed = registrationSchema.safeParse({ username, email: email.trim(), password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      setResult(await registerAccount(parsed.data));
      setPassword('');
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
      setError(
        code === 'username_unavailable'
          ? 'That username is already taken. Choose another.'
          : code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit'
            ? 'Too many attempts. Wait a few minutes before trying again.'
            : code === 'weak_password'
              ? 'Supabase requires a stronger password. Try a longer, unique password.'
              : 'Registration could not finish. Check your connection and try again. If this continues, check your project’s email settings.',
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <main className="onboard" style={{ maxWidth: 560 }}>
      <Brand />
      <h1>
        {result === 'confirm-email'
          ? 'Check your email.'
          : result === 'signed-in'
            ? 'Your account is ready.'
            : 'Create your account.'}
      </h1>
      {result ? (
        <section className="card" role="status">
          <p>
            {result === 'confirm-email'
              ? `If ${email.trim()} is eligible for registration, a confirmation email will arrive. Check your inbox and spam folder, then follow the link.`
              : 'Your project returned a signed-in session without requiring email confirmation.'}
          </p>
          <p className="note">
            For a new account, your username and profile are created during registration. Confirm
            your email, then sign in to get started. Habits still stay in this browser for now.
          </p>
          <Link className="progress-link" to="/login">
            Go to sign in →
          </Link>
        </section>
      ) : (
        <form className="card" onSubmit={(event) => void submit(event)} aria-busy={pending}>
          <p className="muted">Start with a username and your email address.</p>
          <fieldset disabled={pending}>
            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={3}
              maxLength={24}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-describedby="username-help"
            />
            <small id="username-help">
              3–24 letters, numbers, or underscores. Saved in lowercase and reserved during
              registration.
            </small>
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="password-help"
            />
            <small id="password-help">
              Use at least 8 characters. Choose a password you don’t use elsewhere.
            </small>
            <ErrorMessage error={error} />
            <button className="primary full" disabled={pending}>
              {pending ? 'Creating account…' : 'Create account'}
            </button>
          </fieldset>
          <p className="note">
            Account setup is being added step by step. Creating an account does not upload your
            existing habits.
          </p>
          <Link className="progress-link" to="/login">
            Already have an account? Sign in →
          </Link>
        </form>
      )}
    </main>
  );
}
