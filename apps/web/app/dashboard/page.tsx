import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  // The proxy already protects this route; currentUser() re-verifies on the server.
  const user = await currentUser();
  if (!user) return null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Signal One user";
  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
      <Card className="w-full max-w-md">
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
        <CardContent>
          <SignOutButton redirectUrl="/">
            <Button variant="outline">Sign out</Button>
          </SignOutButton>
        </CardContent>
      </Card>
    </main>
  );
}
