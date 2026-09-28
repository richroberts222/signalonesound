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

## 22. Final Rule

For Web UI, prefer:

**shadcn/ui + Tailwind + React + Next.js**

Use existing components before creating new ones.

Create custom components when they provide genuine Signal One-specific value.

Keep Web and Mobile UI appropriately independent while maintaining one coherent Signal One platform.

---

## Appendix: shadcn/ui Setup

shadcn/ui is initialized in `apps/web`.

* Configuration: `apps/web/components.json` (style `base-nova`, base color `neutral`, CSS variables enabled, icon library `lucide`)
* Components: `apps/web/components/ui` (currently only `button.tsx`, generated by `shadcn init`)
* Utilities: `apps/web/lib/utils.ts` (`cn` built on `clsx` and `tailwind-merge`)
* Theme variables: `apps/web/app/globals.css`

Add components from within `apps/web` with:

```text
pnpm dlx shadcn@latest add <component>
```
