# Shared Code

## Repository layout

Signal One is a pnpm workspace monorepo (`pnpm-workspace.yaml`):

```text
apps/web          Next.js Web application
apps/mobile       React Native + Expo application (placeholder, not yet scaffolded)
packages/shared   Shared contracts, types, validation schemas, constants (placeholder)
```

## Package manager

pnpm is the package manager. The version is pinned by `packageManager` in the root `package.json`. Use `pnpm`, not npm or yarn.

## Shared package

`packages/shared` (`@signalone/shared`) is reserved for API contracts, TypeScript types, validation schemas, constants, and authoritative business rules that are used by more than one client. It must not contain server-only code or secrets. It currently contains no code.
