import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

// Maps Clerk's UI onto the Signal One shadcn/ui theme variables in globals.css.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "var(--primary)",
    colorBackground: "var(--card)",
    colorForeground: "var(--card-foreground)",
    colorMutedForeground: "var(--muted-foreground)",
    colorDanger: "var(--destructive)",
    colorInput: "var(--input)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--border)",
    colorRing: "var(--ring)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-geist-sans)",
  },
};
