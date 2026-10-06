# Mobile

The mobile app lives in `apps/mobile` (React Native, Expo SDK 57, TypeScript; Android and iPhone). It is a foundation shell only: it starts, compiles, bundles, and loads validated configuration. It has no domain screens, navigation, data models, roles, or API client yet.

## Where mobile fits

```text
Web ------\
           > API / server --> business/service --> data access --> Drizzle --> Neon
Mobile ---/
```

Mobile is a client of the Signal One API, exactly like Web. It never reaches the data-access, Drizzle, or Neon layers. Identity comes from Clerk (shared with Web); the server validates every request.

## Web/mobile separation

* Web and mobile are separate apps with independent UI, navigation, and platform behavior. Do not port Next.js/web UI code (Tailwind, shadcn/ui, Server Components) into mobile.
* They share the backend, authentication provider, contracts, and validation via `packages/*` (`/docs/shared-code.md`).

## What may and may not be shared

| Code | Web | Mobile | Server |
| --- | --- | --- | --- |
| `@signalone/shared` (pure types, constants, `Result`, env parsing, utilities) | yes | yes | yes |
| `@signalone/validation` (Zod schemas, API contracts) | yes | yes | yes |
| React components, Tailwind, shadcn/ui, Next.js APIs | web only | never | never |
| React Native / Expo components and APIs | never | mobile only | never |
| `drizzle-orm`, `@neondatabase/serverless`, `db/`, `server-only` modules | never | never | yes |
| `DATABASE_URL`, `CLERK_SECRET_KEY`, any secret | never | never | yes |
| `apps/web/*` imports | n/a | never | n/a |

Mobile consumes workspace packages as TypeScript source through pnpm workspace links (`"@signalone/shared": "workspace:*"`); Expo SDK 57 configures Metro for monorepos automatically, so no `metro.config.js` is needed. This was verified by bundling both platforms.

`src/boundary.test.ts` statically enforces the boundary: no server/database/Next.js imports, no `apps/web` imports, `process.env` reads limited to `EXPO_PUBLIC_*` literals, and no forbidden packages in `package.json`.

Note: `@signalone/shared` includes pure server/database env parsers. They are bundled into the app as dead code but contain only variable names, never values, and mobile never calls them.

## Backend boundary

* Mobile talks to the Signal One HTTP API only. It never connects to Neon, never imports `drizzle-orm`, and never imports from `apps/web`.
* The API must expose what mobile needs as documented contracts (`/docs/api.md` is still empty and must be defined before mobile features are built).
* API auth for mobile uses Clerk session tokens sent as bearer tokens and validated on the server (`/docs/auth.md` sections 2 and 5). Mobile does not implement its own identity or authorization; the web/backend auth foundation is not redesigned here.

## Configuration

* `src/config/env.ts` (`getMobileEnv()`) reads `EXPO_PUBLIC_*` variables by explicit literal `process.env` access (Expo inlines only literal reads) and validates them with the shared `parseMobileClientEnv`.
* Variables (all public in the app bundle): `EXPO_PUBLIC_APP_ENV` (required, `dev|qa|stage|prod`), `EXPO_PUBLIC_API_BASE_URL` (required; `http` only allowed for `dev`), `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (optional until the Clerk integration; must be `pk_`, live keys only in `prod`).
* Only client-safe values belong in `EXPO_PUBLIC_*`. Never put `DATABASE_URL`, `CLERK_SECRET_KEY`, or any secret in the Expo config, `eas.json`, or `.env` files shipped with the app.
* Local setup: copy `apps/mobile/.env.example` to `apps/mobile/.env.local` (gitignored).
* The API base URL is per environment (`dev`, `qa`, `stage`, `prod`); no production URL is the default in development builds.
* App name, slug, scheme, and bundle/application identifiers come from a single config (`app.config.ts`) and are set when the application is initialized (`/docs/new-app-setup.md`).

## Commands

Run from the repository root (`pnpm --filter mobile <script>`) or inside `apps/mobile`:

| Script | Purpose |
| --- | --- |
| `start` | Start the Expo dev server (Expo Go / dev client). |
| `android` / `ios` | Start and open on an emulator/simulator (needs the Android SDK / macOS+Xcode). |
| `lint` | ESLint with `eslint-config-expo`. Included in `pnpm lint`. |
| `typecheck` | `tsc --noEmit`. Included in `pnpm typecheck`. |
| `test` / `test:watch` | Vitest for pure TypeScript (config and boundary checks). Included in `pnpm test`. |
| `check:deps` | `expo install --check`: dependency versions match the Expo SDK. |
| `export` | Metro-bundle Android and iOS into `dist/` (compile proof; needs `EXPO_PUBLIC_*` set, e.g. via `.env.local`). |

Mobile is intentionally not part of `pnpm build` (that builds Web); `pnpm validate` covers mobile lint, typecheck, and tests.

## Builds (prepared, not exercised)

`eas.json` defines profiles `development`, `qa`, `staging`, `production`, each setting only `EXPO_PUBLIC_APP_ENV` (`dev`, `qa`, `stage`, `prod`; `/docs/deployment.md` section 8). Set `EXPO_PUBLIC_API_BASE_URL` (and later the Clerk publishable key) per profile as EAS environment variables. Store identifiers, signing credentials, EAS project linking, and OTA update policy are undecided. No EAS build has been run.

## Testing

Vitest covers pure TypeScript only. React Native component tests are not set up (see `/docs/testing.md`). The app has not been run on a simulator/device in CI; only Metro bundling for both platforms has been verified.

<!-- boilerplate:proof:start -->
## API client (generic proof, Issue 49)

Mobile calls the API through the same shared client as Web (`createApiClient` / `createProofItemClient` in `@signalone/validation`), configured in `src/proof/proofClient.ts` with `EXPO_PUBLIC_API_BASE_URL` and a token provider. `App.tsx` renders a minimal `ProofItemsScreen`. Until `@clerk/expo` is added the token provider is `noToken`, so a live call is answered `unauthenticated`. Verified: unit tests with a fake fetch (URL, bearer header, envelope validation), static boundary tests, and Metro bundling for Android and iOS. Not verified: running on a device/emulator and an authenticated call to a live server.

<!-- boilerplate:proof:end -->

## Remaining scaffolding work

1. Add `@clerk/expo`, secure token storage, and an API client once `/docs/api.md` and the auth contract exist.
2. Choose a navigation approach when the first feature screens are designed.
3. Decide store identifiers and EAS project setup.
4. Decide a component-test approach (for example `jest-expo`) when the first interactive component warrants it.
