# Phase 2 trusted configuration

## GitHub metadata

The Vercel serverless endpoint is `GET /api/github/repository?url=https://github.com/owner/repository`.

It accepts only canonical public GitHub repository URLs and calls the official GitHub REST API. Set `GITHUB_TOKEN` in Vercel only for higher API-rate limits. It is optional and must never be prefixed with `VITE_` or added to Firebase client configuration. `GITHUB_CACHE_TTL_MS` is optional; it defaults to 15 minutes.

## First administrator

Administrator access uses a Firebase Authentication custom claim, `admin: true`. Claims can only be granted by a trusted operator using the Firebase Admin SDK or Firebase CLI-adjacent secure script; users cannot grant themselves roles in the app or Firestore.

1. Sign in as the intended account and retrieve its Firebase UID from Authentication in the Firebase Console.
2. In a trusted local environment that has Firebase Admin credentials, run a script containing `await admin.auth().setCustomUserClaims(uid, {admin: true})`.
3. The user signs out and back in (or refreshes their ID token).
4. Verify the admin dashboard is available and a normal account remains rejected.

Do not commit a service-account key, private key, or an administrator UID. Firestore rules require the signed-in token claim for every moderation write.
