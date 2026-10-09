# Architecture decisions

## 1. Client-rendered React with Vite

Steadily is an interactive, local-data application. Server rendering and server actions do not improve its current primary flow. React and TypeScript provide component contracts, familiar tooling, and an accessible ecosystem while Vite produces a small, portable static deployment. Secondary routes load on demand. Hash routing avoids relying on provider-specific SPA fallback rules.

## 2. Explicit state actions

The Zustand store exposes named actions rather than allowing components to mutate records. Every action validates its input and commits an immutable data snapshot. Habit limits, challenge limits, and check-in requirements live in this layer so a second caller cannot bypass UI restrictions. Habit editing preserves IDs, creation dates, and historical completion records.

The store factory accepts storage, a date function, and an ID generator. Tests can control them without replacing global browser objects. React Context owns the store instance, avoiding a shared global store leaking between tests or future app instances.

Check-ins update the reflection and all pending-habit reasons atomically. Recovery reflection cannot erase a completed habit. A storage write failure is reported while preserving the current in-memory state; it is not falsely reported as durable persistence.

## 3. Versioned persistence with validation

Zod schemas are the source of TypeScript domain types and runtime validation. Browser storage is external input, even when written by an earlier version of the same app. The loader validates it before use.

The migration copies a valid v1 payload to `{ version: 2, data }` and retains v1 unchanged. It prefers v2 after migration. Invalid or future-version data is preserved and saving is paused; silent resetting would risk data loss. Future migrations can branch on the envelope version while preserving earlier inputs.

This is intentionally not a database abstraction that pretends localStorage has transactions or cross-device durability. It is a synchronous storage port for a small, single-browser MVP. Cross-tab conflict resolution, export/import, account identity, and synchronization are not implemented.

## 4. Calendar and recovery semantics

All habits are planned daily from their creation date. Completion rate includes today, so it can rise as the day progresses. Normal and minimum completions both count. Edits change the current habit wording without rewriting past completion types.

A return occurs when a completed habit follows at least one missed planned day after an earlier completion. The first-ever completion is not a return. Return latency counts the calendar days from the first missed day to the next completion. Gaps are inferred from missing entries as well as explicit misses.

Local calendar components determine the current day. Date differences use UTC representations of calendar dates to avoid daylight-saving offsets. Progress iterates over recorded dates rather than allocating every empty day since onboarding. Future-dated logs are excluded.

## 5. Explainable recommendations

Three or more check-ins within the last seven calendar days, with at least two low-energy entries, produce a suggestion to try minimum versions and easier timing. Otherwise the most recent missed-habit reason takes precedence, falling back to the onboarding barrier. This rule is deterministic and independently tested. It is not an AI inference or a mental-health diagnosis.

## 6. Accessibility and resilience

Radix Dialog handles modal semantics, focus trapping, and Escape dismissal. The wrapper restores focus to the control that opened the dialog. Fields have explicit labels; goal choices communicate pressed state; charts include readable completion summaries; route changes focus the main content. The error boundary offers recovery without deleting storage.

The existing optional WebMCP operations delegate to the same store actions and validate external input. Registration is feature-detected and cleaned up during hot reload. Tool logic is tested with state read-back. Actual browser protocol availability is environment-dependent and is not claimed by unit tests.

## 7. Verification strategy

Domain and storage tests cover high-impact edge cases. React integration tests exercise complete user journeys through accessible roles and labels. TypeScript, ESLint, Prettier, tests, coverage reporting, and the production build form the repository’s quality workflow. jsdom tests do not establish visual fidelity or full assistive-technology support; those require browser/device checks.
