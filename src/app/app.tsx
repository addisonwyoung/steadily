import { lazy, Suspense, useEffect, useRef } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { CalendarDays, ChartNoAxesCombined, ListChecks, Leaf, Timer } from 'lucide-react';
import { PomodoroProvider } from '../features/productivity/pomodoro';
import { useSteadily } from '../store/context';
import { Brand, ErrorMessage } from '../components/ui';
import { useToday } from '../lib/use-today';
import { formatDay } from '../domain/dates';
import { Onboarding } from '../features/onboarding/onboarding';
import TodayPage from '../features/habits/today-page';
import { useAuth } from '../features/auth/auth-context';
import { AccountControls } from '../features/auth/account-controls';
import LoginPage from '../features/auth/login-page';
import { ProfileGate } from '../features/profile/profile-gate';

const ProgressPage = lazy(() => import('../features/progress/progress-page'));
const ChallengePage = lazy(() => import('../features/challenge/challenge-page'));
const HabitsPage = lazy(() => import('../features/habits/habits-page'));
const RegisterPage = lazy(() => import('../features/auth/register-page'));
const ProductivityPage = lazy(() => import('../features/productivity/productivity-page'));
const navigation = [
  { to: '/', label: 'My day', icon: CalendarDays },
  { to: '/progress', label: 'My progress', icon: ChartNoAxesCombined },
  { to: '/challenge', label: 'Offline reset', icon: Leaf },
  { to: '/habits', label: 'My habits', icon: ListChecks },
  { to: '/productivity', label: 'Productivity', icon: Timer },
];
function Layout() {
  const profile = useSteadily((state) => state.data.profile);
  const storageError = useSteadily((state) => state.storageError);
  const today = useToday();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    document.title = `Steadily — ${navigation.find((item) => item.to === pathname)?.label ?? 'Your space'}`;
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="tagline">Small steps. Your pace.</div>
        <nav className="nav" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink end key={to} to={to}>
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebottom">
          <p>
            Growth has room
            <br />
            for imperfect days.
          </p>
          <div className="row">
            <span className="avatar">{(profile?.name || 'You')[0]?.toUpperCase()}</span>
            <small>{profile?.name || 'Your space'}</small>
            <span aria-hidden="true">✧</span>
          </div>
        </div>
      </aside>
      <main ref={main} id="main" className="main" tabIndex={-1}>
        <div className="topline">
          <span>{formatDay(today, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <AccountControls />
        </div>
        <ErrorMessage error={storageError} />
        <PomodoroProvider>
          <Suspense fallback={<p role="status">Opening your space…</p>}>
            <Outlet />
          </Suspense>
        </PomodoroProvider>
        <p className="quote">Progress is something you return to, not something you lose.</p>
      </main>
    </div>
  );
}
export function App() {
  const { user, loading, error } = useAuth();
  if (loading)
    return (
      <main className="onboard">
        <Brand />
        <p role="status">Checking your session…</p>
      </main>
    );
  if (error)
    return (
      <main className="onboard">
        <Brand />
        <ErrorMessage error={error} />
        <button onClick={() => window.location.reload()}>Try again</button>
      </main>
    );
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <Suspense fallback={<p role="status">Opening registration…</p>}>
              <RegisterPage />
            </Suspense>
          )
        }
      />
      <Route
        path="/*"
        element={
          user ? (
            <ProfileGate key={user.id} userId={user.id}>
              <LocalApp />
            </ProfileGate>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function LocalApp() {
  const habitCount = useSteadily((state) => state.data.habits.length);
  const location = useLocation();
  const profile = useSteadily((state) => state.data.profile);
  if (!profile)
    return (
      <>
        <div className="row" style={{ justifyContent: 'flex-end', padding: '20px' }}>
          <AccountControls />
        </div>
        <Onboarding />
      </>
    );
  if (habitCount < 2 && location.pathname !== '/habits') return <Navigate to="/habits" replace />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="challenge" element={<ChallengePage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="productivity" element={<ProductivityPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
