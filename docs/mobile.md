# Mobile

The mobile app lives in `apps/mobile` (React Native, Expo, TypeScript; Android and iPhone).

`apps/mobile` is currently a placeholder containing only a `package.json`. Expo has not been scaffolded yet. This document records the rules the scaffold must follow. (The `mobile-development.md` name from the boilerplate issue is folded into this file to avoid two mobile documents.)

## Web/mobile separation

* Web and mobile are separate apps with independent UI, navigation, and platform behavior. Do not port Next.js/web UI code (Tailwind, shadcn/ui, Server Components) into mobile.
* They share the backend, authentication provider, contracts, and validation via `packages/*` (`/docs/shared-code.md`).

## Backend boundary

* Mobile talks to the Signal One HTTP API only. It never connects to Neon, never imports `drizzle-orm`, and never imports from `apps/web`.
* The API must therefore expose what mobile needs as documented contracts (`/docs/api.md` is still empty and must be defined before mobile features are built).
* API auth for mobile uses Clerk session tokens sent as bearer tokens and validated on the server (`/docs/auth.md` sections 2 and 5).

## Configuration

* Environment config uses `EXPO_PUBLIC_*` variables, which are public in the app bundle. Only client-safe values (Clerk publishable key, API base URL) belong there.
* The API base URL is per environment (`dev`, `qa`, `stage`, `prod`); no production URL is the default in development builds.
* App name, slug, and bundle/application identifiers must come from a single config (`app.config.ts`) and be treated as boilerplate placeholders (`/docs/boilerplate-references-report.md`).

## Scaffolding checklist (when approved)

1. Create the Expo app in `apps/mobile` with TypeScript.
2. Confirm pnpm workspace/Metro compatibility with `packages/*`.
3. Add `@clerk/expo`, secure token storage, and an API client.
4. Add `lint` and `typecheck` scripts so `pnpm lint`/`pnpm typecheck` cover mobile.
5. Decide build/release tooling (EAS) and document it in `/docs/deployment.md`.
6. Decide the mobile test approach in `/docs/testing.md`.
