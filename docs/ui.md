# UI Standards

This document defines the UI architecture and coding standards for Signal One.

---

## 1. UI Architecture

Signal One is a multi-client application.

The UI architecture differs by client while sharing the broader Signal One platform architecture.

### Web

The Web application uses:

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui

### Mobile

Android and iPhone use:

* React Native
* Expo
* TypeScript

Web UI components must not be forced onto Mobile.

Mobile UI should follow React Native and platform-appropriate interaction patterns.

---

## 2. Web Component System

**shadcn/ui is the standard component system for the Signal One Web application.**

When a suitable shadcn/ui component exists, use it rather than creating an equivalent custom component.

Examples include:

* Button
* Input
* Label
* Card
* Dialog
* Sheet
* Dropdown Menu
* Select
* Tabs
* Table
* Form
* Toast
* Alert
* Badge
* Avatar

The available shadcn/ui components should be checked before creating a new component that duplicates existing functionality.

---

## 3. shadcn/ui Philosophy

shadcn/ui components are treated as project-owned source code rather than as an opaque component library.

Components should be added to the project using the shadcn/ui tooling and then customized when appropriate for Signal One.

Do not replace shadcn/ui with another Web component framework without an explicit architectural decision.

Do not introduce competing Web UI component libraries unless specifically approved and documented.

---

## 4. Tailwind CSS

Tailwind CSS is the primary styling system for the Signal One Web application.

Prefer Tailwind utility classes and the established shadcn/ui styling patterns over:

* Large custom CSS files
* Inline style objects
* Duplicated styling
* Ad-hoc styling systems

Custom CSS is permitted when it provides a legitimate capability that is not reasonably handled by Tailwind or the existing component system.

Do not introduce another CSS framework without an explicit architectural decision.

---

## 5. Component Reuse

Before creating a new Web UI component, Claude should determine whether an existing component can be reused or composed.

Prefer:

```text
Existing shadcn component
        ↓
Composition
        ↓
Signal One-specific component
```

over repeatedly creating visually similar components.

Signal One-specific components should be created when they provide meaningful application-level behavior or reusable composition.

Avoid creating unnecessary abstractions for one-off elements.

The full reuse order, variant, and override rules are in sections 22 to 26.

---

## 6. Component Boundaries

Components should have clear responsibilities.

Prefer small, composable components over large components containing unrelated UI, data access, and business logic.

UI components should not contain server-only secrets or privileged database access.

Server-side business logic must remain on the server according to the application architecture.

---

## 7. Authentication UI

Authentication UI must follow the rules in:

`/docs/auth.md`

For Web authentication:

* Use Clerk's supported Next.js integration.
* Use the Signal One shadcn/ui visual system.
* Do not create a separate authentication component system that conflicts with Clerk.
* Clerk-provided UI should be styled or themed to integrate naturally with Signal One where supported.

Authentication functionality and UI styling are separate concerns:

```text
Clerk
  ↓
Authentication behavior

shadcn/ui + Tailwind
  ↓
Signal One Web presentation
```

---

## 8. Layout and Responsive Design

Web UI must support responsive layouts.

Do not design only for a single screen size.

Consider:

* Desktop
* Laptop
* Tablet
* Mobile-sized Web screens

Responsive behavior should use the established Tailwind conventions.

Mobile applications are separate client interfaces and should not simply reproduce the Web layout.

---

## 9. Accessibility

UI components should follow accessible Web development practices.

When using shadcn/ui components, preserve the accessibility behavior provided by the component unless there is a documented reason to change it.

Interactive controls should have appropriate:

* Labels
* Keyboard behavior
* Focus states
* Semantic structure
* Accessible names

Do not remove accessibility attributes or behaviors merely to achieve a visual result.

---

## 10. Forms

Web forms should use the established shadcn/ui form components and patterns where applicable.

Forms should provide:

* Clear labels
* Appropriate validation
* Clear error states
* Appropriate loading states
* Appropriate success feedback

Validation rules should remain consistent with the application's shared validation and API architecture where applicable.

Do not rely exclusively on client-side validation for security or data integrity.

---

## 11. Loading, Empty, and Error States

Significant UI flows should account for appropriate states, including:

* Loading
* Empty
* Error
* Success
* Disabled
* Unauthorized

Do not leave users with a blank interface when an operation is loading or has failed.

The appropriate state should be represented using existing shadcn/ui components when applicable.

---

## 12. Visual Consistency

Signal One should maintain a consistent visual language across the Web application.

Prefer established:

* shadcn/ui components
* Tailwind conventions
* Typography
* Spacing
* Borders
* Radius
* Icons
* Interaction patterns

When a visual decision becomes a repeated project convention, document it rather than allowing each feature to establish a different pattern.

---

## 13. Icons

Use a consistent icon system throughout the Web application.

Do not introduce multiple unrelated icon libraries for individual features.

When shadcn/ui components provide an established icon convention, follow the project's existing convention.

The specific icon library should follow the project's installed shadcn/ui configuration and existing conventions.

---

## 14. Theming

The Web application should use a centralized theme rather than hard-coding unrelated colors throughout individual components.

Theme-related values should be defined through the established Tailwind/shadcn/ui configuration.

Components should use semantic theme values where available instead of repeatedly defining arbitrary colors.

This allows the Signal One visual identity to evolve without rewriting individual components.

See sections 22 and 23 for the design-system hierarchy and semantic token rules.

---

## 15. Client-Specific UI

Web, Android, and iPhone may have different:

* Navigation
* Layouts
* Controls
* Interaction patterns
* Gestures
* Platform-specific behaviors

Shared functionality does not require identical UI.

The goal is:

**Shared platform behavior, appropriate client experiences.**

---

## 16. UI and Business Logic

UI components should not independently implement authoritative business rules that belong to the backend.

The client may provide:

* Presentation logic
* Interaction logic
* Local UI state
* Client-side validation
* Optimistic UI where appropriate

The server remains authoritative for:

* Authorization
* Data integrity
* Protected operations
* Business rules that must be enforced consistently

---

## 17. Adding New shadcn/ui Components

When a required shadcn/ui component is not yet installed:

1. Check whether the component exists in the current shadcn/ui system.
2. Add it using the project's established shadcn/ui tooling.
3. Follow the project's existing component structure.
4. Reuse the component rather than creating a duplicate equivalent.
5. Validate that the new component does not introduce conflicting dependencies or styling systems.

Do not manually copy arbitrary component implementations from unrelated projects when the official shadcn/ui component is available.

---

## 18. Custom Components

Custom Web components are allowed when:

* No appropriate shadcn/ui component exists.
* Existing components cannot reasonably be composed to satisfy the requirement.
* The component represents meaningful Signal One-specific functionality.

Custom components should follow the same:

* TypeScript
* Tailwind
* Accessibility
* Naming
* Composition
* Responsive design

conventions as the rest of the Web application.

---

## 19. UI Dependencies

Avoid unnecessary UI dependencies.

Before adding a new UI library or styling framework, Claude must determine whether the requirement can be satisfied using:

* Existing shadcn/ui components
* Existing Tailwind functionality
* Existing project components
* Normal React/Next.js functionality

A new UI dependency that materially changes the Web UI architecture requires an architectural decision.

---

## 20. Validation

After significant UI changes, Claude should verify the implementation using the validation available in the project.

At minimum, when applicable:

* TypeScript/type checking
* Linting
* Build
* Relevant existing tests

For visual changes, Claude should also inspect the resulting UI when an appropriate browser/preview environment is available.

A successful build does not by itself prove that the UI is visually correct.

---

## 21. UI Architecture Changes

Changes to the Web UI architecture should be consistent with:

`/docs/architecture-rules.md`

Significant changes involving:

* Component libraries
* Styling frameworks
* Design systems
* Client architecture
* Shared UI architecture

should be documented before becoming established project conventions.

---

## 22. Design System Hierarchy

The UI is built from the global design system outward, so broad visual changes are inexpensive and predictable:

```text
GLOBAL DESIGN SYSTEM
  -> semantic design tokens                (apps/web/app/globals.css)
  -> shared primitive components           (apps/web/components/ui, shadcn/ui)
  -> application reusable components       (apps/web/components/<area>)
  -> component variants / configuration
  -> feature composition
  -> local override, only when genuinely required
```

Each level consumes the one above it. Feature code does not re-decide visual choices that a higher level already owns. Avoid repeated hard-coded visual decisions (colors, radii, spacing scales, type styles) in feature code.

---

## 23. Semantic Design Tokens

The centralized theme is `apps/web/app/globals.css` (CSS variables on `:root` and `.dark`, exposed to Tailwind through `@theme inline`). Existing semantic tokens include `background`, `foreground`, `card`, `popover`, `primary` (+ `-foreground`), `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-*`, `sidebar-*`, and `radius`. Issue #66 added the exploratory Signal One Sound theme, revised to a dark-only direction: black/charcoal `background`/`card`, a luminous gold `primary`, `highlight` (bright gold), `ember` (amber-orange accent), `hero` (deepest band), and `glow` (shadow color) wired to `shadow-glow`/`shadow-glow-lg`. Atmosphere is built from tokens by the `bg-atmosphere`, `bg-hero-glow`, and `text-gradient-gold` utilities in `globals.css`. `font-heading` is Geist (no serif). `:root` and `.dark` share values and `<html>` carries `dark`. These values are exploratory and refined in `globals.css`, not in components.

* Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`, `rounded-lg`) instead of raw palette values (`text-red-600`) or literal colors (`#999`, `oklch(...)`) in components.
* The goal: "change the application's primary brand color" is a change to the token values, not edits across components.
* Add a token when a visual value has meaning and is (or will clearly be) reused. Semantic states not yet present (for example `success`, `warning`) are added to the theme when first genuinely needed, with their `-foreground` pairing and dark-mode value, and wired through `@theme inline`. Do not create tokens for one-off values.
* Typography, radius, and spacing conventions follow the theme and Tailwind scale; document a spacing/type convention once it is repeated (section 12).
* Third-party UI (Clerk) is themed from the same variables (`lib/clerk-appearance.ts`); do not give it a separate palette.

---

## 24. Centralized Brand Assets

Repeatedly used identity assets are defined once: primary logo, wordmark, application icon, approved brand marks.

* Feature code must not import, copy, or hard-code logo/wordmark assets or the product name styling independently. It uses one canonical reusable brand component or asset reference (for example `BrandLogo`, `BrandWordmark`, `AppIcon`) once identity assets exist.
* Changing the canonical logo/wordmark should require changing one authoritative implementation or asset, not many screens.
* Exact implementation (component vs. asset module, where it lives) follows the existing architecture and is decided when the brand assets are approved. These names are examples, not an instruction to create them now.
* Web and Mobile may implement the brand component natively (section 27), but share the same source asset files/identity.
* Exceptions: a genuinely distinct asset or variant (for example a monochrome mark for a specific surface, an OAuth provider logo, a favicon/store icon with a platform-mandated format) is allowed. It is defined once as a named variant of the brand asset or in its authoritative platform location, not ad hoc in a feature.

---

## 25. Component Reuse Order

Before adding UI, work down this order and stop at the first that satisfies the requirement:

1. Existing shadcn/ui primitive (`components/ui`; add via the official tooling, section 17)
2. Existing shared project component
3. Composition of existing components
4. Existing component variant/configuration
5. New reusable application component
6. Feature-local component, when genuinely feature-specific
7. Local styling override, only when justified (section 26)

Do not copy an existing component because a new screen needs a slightly different version. Prefer variants (the shadcn `cva` pattern), composition, slots/children, or configuration when that gives a clearer design.

Do not build giant universal components with many flags to avoid duplication. If a component needs many unrelated options, split it or compose smaller ones. Do not abstract coincidental visual similarity (`/docs/code-quality.md` section 1).

### Reusable product components

Repeated product concepts should normally have one reusable UI representation. Possible future examples: `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState`, `BrandLogo`.<!-- boilerplate:reference:start --> Signal One Sound domain examples: `EventCard`, `RevivalTypeBadge`, `OrganizationCard`, `SpeakerCard`. Domain terms follow `/docs/naming-conventions.md` (terms marked UNDECIDED, such as Organizer, must not be invented for component names), and product need is established by `/docs/product/product-plan.md` and approved specs under `/docs/features/`.<!-- boilerplate:reference:end -->

These are **examples, not authorization**. A component is created only when approved product requirements establish the need, and it is created once, in the shared location, before a second screen copies it. `EmptyState`/`LoadingState`/`ErrorState` would implement the states required by section 11.

---

## 26. Controlled Overrides

Default appearance and behavior come from the design system and shared component. A feature may override when it has a legitimate distinct requirement. Overrides must:

* be intentional (the reason is evident or commented);
* remain scoped to that usage;
* not silently establish a competing design system or palette;
* not duplicate an existing variant or token;
* be promoted to a shared variant or token when repeated use shows it is a project convention.

Repeated overrides are a signal to evaluate whether the shared component or theme needs another supported variant, not to keep copying the override.

---

## 27. Web and Mobile Sharing

Web and Mobile remain separate client UI implementations. Do not force React Web components or Tailwind/shadcn classes into React Native.

Share where it is reasonable and does not force inappropriate code:

* design vocabulary and semantic color names (`primary`, `destructive`, ...)
* component and product-concept naming and terminology
* shared contracts, validation, and behavior (`@signalone/shared`, `@signalone/validation`)
* accessibility intent (labels, roles, focus, contrast)
* brand identity and source asset files

Shared product identity does not require identical component implementations. A shared token source consumed by both clients is an architectural decision that must be documented before it is built; it is not established today.

---

## 28. Magic Values in UI

Repeated design values belong in the theme (section 23). Repeated domain constants and limits belong with the contract that owns them<!-- boilerplate:proof:start --> (for example `PROOF_ITEM_LABEL_MAX` in `@signalone/validation`)<!-- boilerplate:proof:end -->, never re-typed in a component. Do not extract every literal; see `/docs/code-quality.md` section 5.

---

## 29. Relationship to Code Quality

`/docs/code-quality.md` is authoritative for general code-quality, dependency-direction, and refactoring rules. This document is authoritative for UI, component, design-system, and brand-asset architecture. Existing UI that predates these rules is reported<!-- boilerplate:reference:start --> in `/docs/code-quality-audit.md`;<!-- boilerplate:reference:end --> and is not refactored without an approved issue.

---

## 30. Final Rule

For Web UI, prefer:

**shadcn/ui + Tailwind + React + Next.js**

Use existing components before creating new ones.

Create custom components when they provide genuine Signal One-specific value.

Keep Web and Mobile UI appropriately independent while maintaining one coherent Signal One platform.

---

## Appendix: shadcn/ui Setup

shadcn/ui is initialized in `apps/web`.

* Configuration: `apps/web/components.json` (style `base-nova`, base color `neutral`, CSS variables enabled, icon library `lucide`)
* Components: `apps/web/components/ui` (`button.tsx` from `shadcn init`; `card.tsx` and `avatar.tsx` added for authentication UI; `tabs.tsx`, `badge.tsx`, `input.tsx` added for Discover Revival). Product components: `components/brand/brand-wordmark.tsx` (`BrandWordmark`, the temporary text wordmark; the one place the name is styled) and `components/discover/*` (`EventCard`, `RevivalTypeBadge`, `FilterChip`, `RevivalMap`, ...)
* Utilities: `apps/web/lib/utils.ts` (`cn` built on `clsx` and `tailwind-merge`)
* Theme variables: `apps/web/app/globals.css`

Add components from within `apps/web` with:

```text
pnpm dlx shadcn@latest add <component>
```
