import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { InviteFriends } from "@/components/member/invite-friends";
import { MemberMockNotice } from "@/components/member/mock-notice";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INITIAL_PREFS, NOTIFICATION_TITLE } from "@/lib/member/mock-data";
import { describePrefs } from "@/lib/member/preferences";

export const metadata: Metadata = {
  title: "My account | Signal One Sound",
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) return null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Signal One Sound member";
  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">My account</h1>
      <Link href="/account/settings" data-testid="account-settings-link" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
        Account settings, export and delete
      </Link>
      <MemberMockNotice />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.imageUrl} alt={name} />
              <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{name}</CardTitle>
              {email && <CardDescription>{email}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            <Badge variant="secondary">Sign-in identity (Clerk)</Badge> Your name, email, photo,
            and password are managed by Clerk through the account menu in the header. They are
            real, not mock.
          </p>
          <SignOutButton redirectUrl="/">
            <Button variant="outline" className="w-fit">
              Sign out
            </Button>
          </SignOutButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signal One Sound profile</CardTitle>
          <CardDescription>
            <Badge variant="outline">Not built yet</Badge> Your community profile, notification
            preferences, and saved events will be Signal One Sound application data, kept separate
            from your sign-in identity. What belongs in a profile, and how roles or organization
            access work, is still undecided.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{NOTIFICATION_TITLE}</CardTitle>
          <CardDescription>{describePrefs(INITIAL_PREFS)} (mock example)</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/account/notifications" className={buttonVariants()}>
            Manage notification preferences
          </Link>
        </CardContent>
      </Card>

      <InviteFriends />
    </>
  );
}
