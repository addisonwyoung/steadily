# Steadily
# Link
https://steadily-tan.vercel.app/

A mobile-friendly habit app for people who find rigid productivity systems hard to sustain. Each habit has one task and a single completion action. Progress measures showing up and returning after missed days, without resetting a streak.

## Run locally

Use Node 22.12 or newer (the project pins Node 22 via `.nvmrc`).

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and publishable key. Open the localhost URL printed by Vite and sign in with a confirmed account, or use Create an account. Onboarding and every habit view require a session. Navigation supports direct links such as `/#/progress`.

## Technology and engineering

| Layer         | Implementation                            | Purpose                                                                   |
| ------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| UI            | React 19, TypeScript with strict checking | Typed feature components and reusable form controls                       |
| Tooling       | Vite 8                                    | Fast development and a static production bundle                           |
| Navigation    | React Router 7                            | Shareable views, history navigation, lazy-loaded secondary pages          |
| State         | Zustand 5                                 | Explicit, validated actions shared by UI and optional browser agent tools |
| Validation    | Zod 4                                     | Runtime validation for saved data, forms, actions, and migrations         |
| Accessibility | Radix Dialog, semantic HTML, Lucide icons | Modal focus management, Escape handling, labels, live feedback, skip link |
| Testing       | Vitest, Testing Library, user-event       | Domain edge cases and user journeys using accessible queries              |
| Quality       | ESLint, Prettier, GitHub Actions          | Repeatable type, lint, test, formatting, and build checks                 |

Supabase Auth handles registration, email confirmation, login, restored sessions, and local-device logout. The app gate controls navigation; database authorization remains the responsibility of Supabase Row Level Security. Selected habits are saved in Supabase `user_habits` and loaded before protected screens open. Completion history, check-ins, and daily priority still use browser storage, with separate keys for each authenticated user. Profile creation is handled by the signup trigger in `supabase/migrations/202610100001_profiles_at_signup.sql`; apply this migration in Supabase before testing registration. It reserves usernames during signup and backfills valid, available names from earlier signup metadata. Selected habits follow the account across devices on reload; completion history and check-ins do not yet sync. Apply the habit-template and user-habit migrations before using selections. CSS preserves the original responsive visual design.

## Product features

- Two-step onboarding for two to five habits from the shared Supabase catalog.
- Habit completions, undo, selection toggles, and a chosen daily priority.
- Daily mood, energy, stress, win, and missed-habit check-ins.
- Deterministic suggestions informed by recent check-ins and missed-habit reasons.
- Seven-day completion view, completion counts, and return-after-gap metrics.
- Seven offline activities with difficulty and enjoyment ratings; one completion per calendar day.

## Code tour

```text
src/
  app/                  Application shell, routing, integration tests
  components/           Shared UI, accessible modal, feedback, error boundary
  domain/               Schemas, calendar functions, progress and recommendation rules
  features/
    onboarding/         Goal selection and habit setup
    habits/             Daily checklist, online selections, supportive recovery
    check-in/           Daily reflection
    challenge/          Offline activities
    progress/           Weekly view and check-in history
  lib/                  Versioned persistence, day refresh, optional WebMCP adapter
  store/                Dependency-injected Zustand store and React binding
  test/                 Test setup and fixtures
```

Start with `src/store/create-store.ts` to review mutation boundaries, `src/lib/storage.ts` for migration safety, and `src/domain/selectors.ts` for product rules. Read [the architecture decisions](docs/architecture.md) for the reasoning and tradeoffs.

## Verification

```sh
npm run check          # TypeScript, ESLint, tests, and formatting
npm run test:coverage  # Coverage for domain, storage, and state boundaries
npm run build          # Production build in dist/
npm run preview        # Serve that production build locally
```

Tests cover v1 migration, malformed/unsupported storage, blocked writes, calendar boundaries, recovery metrics, reason-based suggestions, atomic check-ins, habit limits, challenge limits, the onboarding-to-completion journey, editing, navigation, and dialog focus restoration. Integration tests use jsdom; they do not replace real-browser or device accessibility testing. The CI workflow is ready to run when the repository is hosted on GitHub; a workflow file alone is not evidence of a hosted CI run.

## Data and migration

Authenticated browser storage uses keys such as `steadily-v2:user:<user-id>`. Switching accounts mounts a new store, and signing out unmounts the store and its agent tools. Original unowned `steadily-v1` and `steadily-v2` data stays preserved separately; it is not automatically assigned to an account. The versioned loader still supports v1-to-v2 migration within a storage namespace. A corrupt or unsupported v2 payload pauses saving instead of silently replacing it. If a write fails after a valid load, the change remains in memory and the user sees an error.

Selected habits reload from Supabase on sign-in/app mount. Browser-only completion history and check-ins are isolated by origin; clearing site data removes that progress. Multiple tabs are not a synchronized editing session. The 2–5 selection limit is enforced by app actions, not by a database transaction across concurrent devices.

On an older browser with local selections and an empty online list, the app offers an explicit one-time import of catalog matches. Choosing a fresh list preserves a recovery copy under the account-scoped `steadily-before-online` key. A failed server read shows a retry screen and never becomes an empty successful load.

## Deployment

`npm run build` creates static assets in `dist/`. Hash-based routing works on static hosts without a rewrite rule. `.openai/hosting.json` preserves the existing Sites project identity and points at `dist`. This migration does not require changing hosting providers or provisioning a backend.

Build artifacts are generated from source, not hand-edited. The original implementation remains recoverable in Git history. Never commit local browser data or credentials.

## Interview discussion points

- How completed habits and return-after-gap metrics represent progress.
- How runtime schemas complement TypeScript at persistence and action boundaries.
- How storage migration avoids overwriting the only copy of a user’s progress.
- Why actions inject the clock, ID generator, and storage port for deterministic tests.
- How feature boundaries and lazy routes keep rendering concerns separate from domain rules.
- Where the architecture would need to change for authentication, server persistence, and conflict handling.

## Habit-linked focus sessions

Apply `supabase/migrations/202611070001_create_focus_sessions.sql` in Supabase's SQL Editor after the habit-template migration. The migration creates immutable, account-owned session records with insert/read permissions, duration constraints, and a history index. It has not been applied automatically to the hosted project.

In Productivity, choose a selected habit and start a focus timer. A fully completed focus session is queued locally and uploaded with a stable UUID; retrying cannot create a second record. Pausing excludes paused time from credited minutes. Resetting or changing modes cancels an unfinished session. Breaks do not create records or automatically complete a habit.

Active timers and pending uploads recover from account-scoped browser storage after refresh. Recovery depends on retaining that browser data; an unfinished timer does not transfer to another device. Saved session history does follow the account. Failed uploads show a retry control. The weekly report groups saved completions into seven local calendar days, with daily minutes, habit totals, and recent sessions. These are self-reported focus durations, not proof of activity. Avoid operating the same recovered timer in multiple tabs simultaneously.

Tests cover refresh recovery, offline retries with stable IDs, account isolation, timer controls, history failures, daily aggregation, and database request scoping. Hosted database policies and live cross-device behavior require verification after applying the migration.

## Completion and graph syncing

Apply `supabase/migrations/202611140001_create_habit_completions.sql` in the same Supabase project used by the app, then deploy the updated code. Completed habits and Undo now save to `habit_completions`, keyed by user, template, and local calendar date. Undo writes a false row; this prevents a second browser's legacy import from resurrecting an undone completion.

Startup imports matching older browser completions once without overwriting existing server rows, preserves a local recovery copy, and loads server history before showing progress. Keep the browser containing your old completions and open the updated app there to import them. Progress refreshes when the tab regains focus and every 15 seconds while visible. A failed read never becomes an empty successful result; failed writes leave the visible completion unchanged. Concurrent changes to the same habit/date use last successful database write wins. Check-ins and offline activities remain browser-only.
