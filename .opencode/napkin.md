# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-05-29 | self | Refactored `currentFilteredList` out of `Wordle.jsx` but left one runtime consumer behind | After state refactors, grep the whole client for the old identifier and run a full build, not just editor diagnostics |
| 2026-05-29 | self | A hidden modal still rendered a large remaining-word list on every parent re-render, causing typing lag | For heavy optional UI (modals, tables, large lists), conditionally mount the content only when visible |

## User Preferences
- Keep backend/shared secrets in the existing secrets module pattern rather than adding a root `.env` by default.
- Add explicit DB teardown in backend tests that share connections so test runners do not hang.
- For this app's UX, favor a simple daily-solver flow over dashboard-style density; optional tools should recede behind the main path.
- On the mobile home screen, prefer terse labels and compact spacing over explanatory hints once the structure is clear.

## Patterns That Work
- For UI feedback, inspect both the page shell and the component that renders the primary results before suggesting changes.
- On this app's mobile home screen, prioritize the live result summary and next action above the guess history; history is secondary context.
- For this app, recommendations are strongest when tied to the current `Wordle.jsx` + `DisplayStatus.tsx` flow: input first, result summary second, history/details progressively disclosed.
- For optional heavy UI on the home screen, extract a memoized child component with its own local effect/state rather than keeping the logic inline in `Wordle.jsx`.

## Patterns That Don't Work
- Generic visual advice without checking the actual result-card structure misses the biggest mobile usability issues.

## Domain Notes
- This repo contains a Vite client for a Wordle helper; the mobile home screen combines guess entry, guess history, and remaining-word results.
- `DisplayStatus.tsx` currently renders each guess as a dense card with before/after counts, bin action, and edit/delete buttons, which makes mobile scanning harder than it needs to be.
- The current mobile layout puts the most valuable state (`words left`, suggestions, next analysis step) below the guess-history cards, so users must scroll past dense retrospective information to reach the forward-looking guidance.
- `client/src/dev/state.json` currently stores a replayable list of Redux actions (not a full state snapshot), which is enough to reconstruct realistic fixture sessions during UI work.
