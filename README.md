# Project Graveyard

Project Graveyard helps makers capture unfinished software projects, choose a way forward, and turn a restart into small tasks. The interface is a React and TypeScript application built with Vite. Firebase Authentication and Cloud Firestore provide real accounts and persistent per-user data.

## Run locally

```bash
npm install
npm run dev
```

Open the Local URL printed by Vite. For a production build, run `npm run build`; the static output is in `dist/` and can be hosted on Vercel or any static site service. The Firebase web configuration in `src/firebase.ts` is public project identification, not a secret. Access is enforced by `firestore.rules`.

## What works

- Dashboard with live metrics and a revival spotlight
- Project vault with search, filters, sorting, grid and list views
- Project creation, editing, deletion, archiving, restoring, and status changes
- Rule based resurrect, repurpose, and archive paths
- Roadmap generation, task creation, editing, completion, deletion, and ordering
- Timeline of actions recorded in the app
- Analytics based on current vault data
- Personal revival wall, theme selection, JSON export and validated import
- Personal task manager with priorities, due dates, project links, filters, and completion tracking
- Idea inbox with pinning and one-click conversion into personal tasks
- Focus Studio with 15, 25, and 50 minute sessions that survive refreshes
- Email/password sign-in, Google sign-in, and password reset
- Profile page with display name, email verification, connected sign-in methods, Google account linking, and sign-out
- Separate cloud workspace for each signed-in user; new accounts start empty
- One-time, opt-in import of projects and personal data from the prior browser-only version

Firestore data lives under `users/{uid}` with separate `projects`, `events`, `wins`, `personalTasks`, `ideas`, and `meta` collections. Security rules permit access only when the authenticated user's UID matches that path. Changes are written to Firebase; another device sees the latest data after sign-in or reload. Theme preference remains local to each browser. Export JSON backups before clearing cloud data. The assistant's suggestions are local rules and do not inspect source repositories.

The personal space has its own export button. The legacy browser data is never deleted by migration. To redeploy database access rules, run `firebase deploy --only firestore:rules --project project-graveyard-2026` from the project root. Email/password and Google providers are enabled in Firebase Authentication. Google OAuth authorizes the Vercel production domain and the private Sites domain. The OAuth support email is configured in Firebase, not committed to this repository.
