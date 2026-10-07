# Admin page design guidelines

Use this guide when creating or refreshing pages in the Velozy admin. Match the existing dashboard, settings, and blog management pages so the admin feels like one product.

## Visual direction

- Keep the interface quiet and work focused. Use neutral surfaces and reserve blue or cyan for actions, links, focus states, and meaningful data marks.
- Use the existing system sans-serif typography. Page titles are compact (`text-lg font-medium`); section titles are usually `text-base font-normal`; supporting copy is `text-sm` or `text-xs` in muted neutral colors.
- Use consistent, modest corners (`rounded-md` for controls and inner regions, `rounded-lg` for cards). Prefer a clear border over shadows or decorative gradients.
- Keep spacing predictable: `gap-3` between compact items, `gap-4` between cards, `space-y-6` between major page sections, and `p-4` or `p-5` inside panels.

## Page frame

For pages that own their full content frame, follow the blogs page:

```tsx
<section className="-m-4 min-h-[calc(100vh-48px)] bg-white text-neutral-900 dark:bg-[#111111] dark:text-[#f0f0f0]">
  <div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 pb-8 pt-5 sm:px-8 lg:px-12">
    {/* header and page sections */}
  </div>
</section>
```

Pages inside the shared admin padding can use the dashboard/settings content width and responsive horizontal padding instead. Avoid applying both frames at once.

## Surfaces and color

Use these established surface and text treatments as a starting point:

| Purpose                | Light                         | Dark                                      |
| ---------------------- | ----------------------------- | ----------------------------------------- |
| Main canvas            | `bg-white`                    | `dark:bg-[#111111]`                       |
| Card                   | `bg-white border-neutral-200` | `dark:bg-[#151517] dark:border-[#303034]` |
| Subtle region          | `bg-neutral-50`               | `dark:bg-[#1e1e1f]`                       |
| Primary text           | `text-neutral-900`            | `dark:text-neutral-100`                   |
| Supporting text        | `text-neutral-500`            | `dark:text-neutral-400`                   |
| Primary action / focus | `blue-600`                    | `blue-400` where appropriate              |

Use semantic green, amber, and red only for success, attention, and destructive states. Do not use color alone to communicate a state; pair it with text or an icon.

## Components and behavior

- Start a page with a title, one concise explanatory sentence when needed, and the page's primary controls. Let the heading hierarchy describe the information, not the visual decoration.
- Build cards with `rounded-lg border border-neutral-200 bg-white p-4 dark:border-[#303034] dark:bg-[#151517]`. Keep card treatments consistent within a page.
- Use compact, readable form controls with visible keyboard focus. Buttons should say what they do, use `type="button"` when they are not submitting a form, and remain usable on narrow screens.
- Use responsive grids that collapse naturally: two columns for summaries on small screens, then three or four columns when space allows. Keep table regions horizontally scrollable when their content requires it.
- For unavailable or empty data, state why it is unavailable and what action makes it available. Do not draw sample data that could be mistaken for live results.
- Keep existing loading, error, permission, confirmation, and success behavior when changing presentation. Do not imply that a control works if the underlying action is not implemented.
- Add accessible names to controls, use semantic headings and landmarks, mark decorative icons as hidden from assistive technology, and provide a visible `focus-visible` treatment.

## Quick review

Before considering an admin page finished, check that it:

1. Uses the same content width, compact type scale, neutral surfaces, and corner radius as dashboard, settings, and blogs.
2. Has a clear primary action and section hierarchy without redundant badges or decoration.
3. Handles loading, empty, unavailable, and error states with useful text.
4. Works at narrow widths and keeps keyboard focus visible in both light and dark themes.
