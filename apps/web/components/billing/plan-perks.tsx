import type { Plan } from "@signalone/validation";

// What a plan includes, in the words an admin chose (S20). Shown on the member and church membership pages.
export function PlanPerks({ plan }: { plan: Plan }) {
  if (plan.perks.length === 0) return null;
  return (
    <ul className="mt-2 list-disc pl-5 text-sm" data-testid={`plan-perks-${plan.id}`}>
      {plan.perks.map((perk) => (
        <li key={perk.key}>
          <span className="font-medium">{perk.label}</span>
          {perk.description ? <span className="text-muted-foreground">{`: ${perk.description}`}</span> : null}
        </li>
      ))}
    </ul>
  );
}
