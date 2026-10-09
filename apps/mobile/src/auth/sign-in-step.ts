// What the sign-in form does after the password is accepted, decided from the status Clerk reports.
// Clerk asks for an emailed code when a person signs in from a device it has not seen before
// ("needs_client_trust") or when a second factor is required ("needs_second_factor").
export type NextStep = "finish" | "email-code" | "unsupported";

export function nextSignInStep(status: string | null | undefined): NextStep {
  if (status === "complete") return "finish";
  if (status === "needs_client_trust" || status === "needs_second_factor") return "email-code";
  return "unsupported";
}
