# Admin design

Use this guide when building or refreshing admin pages. Match established dashboard, settings, blog, and record-management screens so the admin remains one product.

## Visual direction

- Keep the workspace quiet, focused, and dense enough for daily operations. Use neutral surfaces and reserve cyan/blue for links, focus, and primary actions.
- Use the existing Montserrat font stack. Page titles are usually 18–24px and medium weight; section titles are 14–18px; body text is 14px; metadata is 12px and muted.
- Use modest corners: `rounded-md` for controls and inner regions, `rounded-lg` for cards. Prefer clear borders over shadows, gradients, and decoration.
- Use an 8px spacing rhythm. Common patterns are `gap-3` for compact controls, `gap-4` between cards, `space-y-6` between page sections, and `p-4` or `p-5` inside panels.

## Color and surfaces

| Purpose | Light | Dark |
| --- | --- | --- |
| Main canvas | `white` | `#111111` |
| Card | `white` with `neutral-200` border | `#151517` with `#303034` border |
| Subtle region | `neutral-50` | `#1e1e1f` |
| Primary text | `neutral-900` | `neutral-100` |
| Supporting text | `neutral-600` | `neutral-400` |
| Muted metadata | `neutral-500` | `neutral-500` |
| Accent/focus | `blue-600` or cyan | `blue-400` or cyan |

Use green for success, amber for attention, and red for destructive or error states. Pair color with text or an icon; never use color alone to communicate status. Keep neutral surfaces dominant. Do not introduce unrelated gray scales or purple gradients.

## Page layout

Start with a page title, a concise description when it adds context, and the primary controls. Use a consistent content width and responsive horizontal padding. Pages that own their full frame can follow this pattern:

```tsx
<section className="-m-4 min-h-[calc(100vh-48px)] bg-white text-neutral-900 dark:bg-[#111111] dark:text-[#f0f0f0]">
  <div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 pb-8 pt-5 sm:px-8 lg:px-12">
    {/* header and page sections */}
  </div>
</section>
```

Pages inside shared admin padding should use the established dashboard/settings width and responsive padding instead. Do not apply both layout frames.

## Components and interaction

- Cards use a simple border and consistent surface, for example `rounded-lg border border-neutral-200 bg-white p-4 dark:border-[#303034] dark:bg-[#151517]`.
- Reuse shared shadcn controls and established admin patterns in `components/ui` and `components/admin/manage` for toolbars, filters, date ranges, tables, and row actions.
- Inputs need readable labels, theme-aware surfaces, and a visible focus ring. Buttons need clear verbs, hover/focus/disabled states, and `type="button"` when they do not submit a form.
- Use Lucide icons at `h-4 w-4` for standard actions, aligned consistently with labels. Give icon-only controls accessible names.
- Use semantic headings and landmarks. Hide decorative icons from assistive technology and maintain visible `focus-visible` styling.
- Keep loading, empty, permission, confirmation, error, and success states. Explain why data is unavailable and how to make it available. Do not show sample data that could be mistaken for live results or imply an unimplemented control works.
- Confirm destructive actions. AI actions should show the proposed change and its evidence before applying it; communicate rollback where supported.

## Responsive behavior

- Collapse multi-column layouts to one column below tablet/desktop breakpoints appropriate to the content.
- Let tables scroll horizontally when needed instead of hiding or crushing important values.
- Let page actions wrap or stack below the heading on narrow screens.
- Keep filters usable with stacked controls or horizontal scrolling. Preserve at least 44px touch targets for primary touch interactions.

## Review checklist

Before finishing an admin page, check that it:

1. Matches established content width, typography, neutral surfaces, and corner radius.
2. Has a clear primary action and information hierarchy without redundant badges or decoration.
3. Handles loading, empty, unavailable, permission, and error states with useful text.
4. Works at narrow widths and keeps keyboard focus visible in light and dark themes.
5. Preserves existing behavior and does not claim an action succeeded before it does.
