# Steadily

A mobile-friendly habit app for people who find rigid productivity systems hard to sustain. Every habit has a normal and minimum version. Progress measures showing up and returning after missed days, without resetting a streak.

## Run locally

Use Node 22.12 or newer (the project pins Node 22 via `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. No API keys, database setup, or account are required. To try the main flow, choose one or two habits, complete a minimum version, record an evening check-in, and view progress. Navigation supports direct links such as `/#/progress`.

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

The project deliberately remains a browser-only app. There is no server, authentication system, remote database, or cross-device syncing. This matches the MVP’s storage requirement. CSS preserves the original responsive visual design; there is no unnecessary styling framework migration.

## Product features

- Two-step onboarding for one to five habits, including custom goals and typical barriers.
- Normal and minimum completions, undo, editable habit versions and schedules, and a chosen daily priority.
- Daily mood, energy, stress, win, and missed-habit check-ins.
- Deterministic suggestions informed by recent check-ins and missed-habit reasons.
- Seven-day completion view, normal/minimum counts, and return-after-gap metrics.
- Seven offline activities with difficulty and enjoyment ratings; one completion per calendar day.

## Code tour

```text
src/
  app/                  Application shell, routing, integration tests
  components/           Shared UI, accessible modal, feedback, error boundary
  domain/               Schemas, calendar functions, progress and recommendation rules
  features/
    onboarding/         Goal selection and habit setup
    habits/             Daily checklist, editing, supportive recovery
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

Existing `steadily-v1` browser data is validated and copied into a versioned `steadily-v2` envelope on the same origin. The v1 key remains intact as a recovery copy. A corrupt or unsupported v2 payload pauses saving instead of silently replacing it. If a write fails after a valid load, the change remains in memory and the user sees an error.

Browser storage is isolated by origin. Data from the hosted site does not appear automatically in localhost, another hostname, or another browser. Clearing site data removes saved progress. Multiple tabs are not a synchronized editing session; avoid editing in several tabs at once.

## Deployment

`npm run build` creates static assets in `dist/`. Hash-based routing works on static hosts without a rewrite rule. `.openai/hosting.json` preserves the existing Sites project identity and points at `dist`. This migration does not require changing hosting providers or provisioning a backend.

Build artifacts are generated from source, not hand-edited. The original implementation remains recoverable in Git history. Never commit local browser data or credentials.

## Interview discussion points

- Why minimum completions count equally, and how recovery metrics encode that product decision.
- How runtime schemas complement TypeScript at persistence and action boundaries.
- How storage migration avoids overwriting the only copy of a user’s progress.
- Why actions inject the clock, ID generator, and storage port for deterministic tests.
- How feature boundaries and lazy routes keep rendering concerns separate from domain rules.
- Where the architecture would need to change for authentication, server persistence, and conflict handling.
