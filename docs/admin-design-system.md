# Admin Design System

## Product direction

The admin is a dark, high-contrast operations workspace for merchants. It should feel closer to a calm control room than a generic SaaS dashboard: dense enough for real work, but with strong hierarchy and deliberate breathing room.

Reference surfaces: Project Settings, Blog management and Pages/Product record tables.

## Visual language

- Canvas: white in light mode and `#171717` in dark mode.
- Surfaces: white / `neutral-50` in light mode; `neutral-900` / `neutral-800` in dark mode.
- Raised controls: `neutral-100` in light mode and `neutral-800` in dark mode.
- Hairline borders: `neutral-200` / `neutral-700`.
- Primary text: `neutral-900` in light mode and white in dark mode.
- Secondary text: `neutral-600` / `neutral-400`.
- Muted metadata: `neutral-500`.
- Accent: cyan, primarily for focus, links and primary-button hover.
- Success: emerald/green.
- Warning: amber/yellow.
- Destructive: red, reserved for destructive actions and danger zones.

## Color usage

Use neutral surfaces for most of the interface. Cyan is a focus and link accent; use it as a button hover only on primary actions. Never mix unrelated gray systems or introduce purple gradients.

## Typography and spacing

- Continue using the existing Montserrat stack.
- Page eyebrow: 11px, semibold, uppercase, wide tracking, cyan.
- Page title: 18–24px, medium or semibold, theme foreground.
- Section title: 14–18px, medium, theme foreground.
- Body: 14px, theme foreground.
- Metadata: 12px, neutral-500.
- Default page padding: 24px; desktop content max width: 1440px.
- Use 8px spacing increments; prefer `rounded-xl` cards and `rounded-lg` controls.

## Components

- Page shell: eyebrow, title, description and right-aligned actions.
- Cards: `bg-neutral-800`, `border-neutral-700`, modest radius, no excessive nested wrapping.
- Inputs: `bg-neutral-800`, `border-neutral-600`, white text in dark mode, cyan focus ring.
- Tables: neutral-800 header, subtle row dividers, compact metadata, responsive horizontal scroll.
- Primary button: black with white text in light mode; white with black text in dark mode. Cyan hover in both modes.
- Secondary, outline, ghost and toolbar buttons: neutral surfaces and neutral hover, without a colored outline.
- Danger button: red-700 with red-900/50 background.
- Inputs and selects: theme-aware shadcn components with cyan focus treatment.
- Repeated controls: use shared shadcn components in `components/ui` and admin patterns in `components/admin/manage` (toolbar, filters, date range, table actions).
- Icons: Lucide, `h-4 w-4` for standard actions and consistent spacing from labels.
- Status pills: low-saturation tinted backgrounds with matching text.
- Empty states: one clear message and one action, never a blank card.
- Loading states: neutral-800 skeleton blocks.

## Responsive behavior

- Collapse multi-column layouts to one column below 1024px.
- Tables scroll horizontally rather than shrinking important values.
- Actions wrap below page headings on small screens.
- Keep filters usable with horizontal scrolling or stacked controls.
- Preserve 44px minimum touch targets.

## Interaction principles

- Every button has a visible hover, focus and disabled state.
- Destructive actions use confirmation.
- AI actions show evidence, preview and rollback language.
- Dummy data must look operationally plausible but must not imply live integrations.
- Pages are frontend-only for now; controls may update local component state and show toast feedback.
