import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/account(.*)", "/admin(.*)", "/proof(.*)", "/accept-terms(.*)", "/claim-church(.*)", "/manage(.*)", "/saved(.*)", "/alerts(.*)"]);

// signInUrl and signUpUrl are named here as well as on the provider in the layout: this guard does not see the
// provider's setting, and without them a signed-out visitor to a protected page is sent to Clerk's hosted sign-in
// page (accounts.dev) instead of this app's own pages.
export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
