import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthHeader } from "@/components/auth/auth-header";
import { clerkAppearance } from "@/lib/clerk-appearance";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Signal One",
  description: "Signal One",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <AuthHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
