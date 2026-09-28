# Deployment

## Vercel

The Web application is deployed to Vercel.

* Vercel project Root Directory: `apps/web`
* Framework preset: Next.js
* Package manager: pnpm (detected from the root `pnpm-lock.yaml`)

Enable "Include source files outside of the Root Directory" in the Vercel project settings so the workspace lockfile and `packages/*` are available during the build.
