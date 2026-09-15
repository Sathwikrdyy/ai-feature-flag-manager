# AI Feature Flag Manager

A small, thoughtful first iteration of a feature-flag dashboard for an AI product team. It supports viewing flags, filtering/searching them, enabling or disabling them, and creating new flags with validation.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). For a production build:

```bash
npm run build
npm run preview
```

Run the validation tests with `npm test`.

## How it works

- `src/App.tsx` owns the page state and user flows: loading, filtering, toggling, creating, and feedback messages.
- `src/services/flagService.ts` is the data boundary. It exposes `list`, `setEnabled`, and `create`, and persists the demo workspace to `localStorage` under a versioned key. Replacing this module with HTTP calls would not require redesigning the UI.
- `src/types.ts` defines the domain model. `src/utils.ts` owns key validation and presentation formatting.
- The first load uses realistic seed data. Changes persist in the current browser, so the demo remains useful after a refresh.
- `src/utils.test.ts` covers the key validation contract, including required fields and duplicate keys.

## Assumptions

This is a single-workspace local prototype. Authentication, multi-user permissions, environments, targeting rules, audit history, percentage rollouts, and a remote API are intentionally outside this first iteration. The current user is represented as `You` after a local mutation.

## Engineering choices and tradeoffs

React + TypeScript + Vite keeps the app quick to run and easy for a team to extend. No UI framework is used: the small CSS surface makes the interaction states and responsive behavior explicit. `localStorage` gives the prototype real persistence while keeping setup frictionless, and the service boundary makes that choice replaceable. The UI includes semantic table markup, labels, switch semantics, keyboard-focus styles, inline validation, empty/loading/error states, and an `aria-live` status message. Mutations generate lightweight request IDs and structured console messages for future diagnostics.

## If there were another day

I would add a small backend with an explicit API contract and request IDs, server-side validation, optimistic updates with rollback, an audit log, environment scoping, role-based access, and integration tests covering the browser flows. I would also add targeting rules and a confirmation step for production changes once real operational risk exists.
