# Marketing design guide

**Status:** Current visual and interaction guidance for Velozy's public marketing site. The home page is the reference for the brand shell and visual quality; individual routes can use page-specific compositions when they serve their audience and purpose.

## Scope

Use this guide for public product, pricing, solution, industry, tool, guide, and comparison pages in `apps/marketing`. It does not govern the admin dashboard, builder editor, or published customer websites; those have separate visual contexts.

The marketing site pairs a quiet dark canvas with large, tightly set headlines and confident product imagery. The home page uses a direct statement and one primary action above a large product showcase; its later sections shift composition and surface treatment to make each product story easier to understand. Industry pages keep the shared dark shell but may use a distinct, restrained primary accent that reflects the industry. Use real details and visual material from that industry. Keep hierarchy, readability, and clear next steps ahead of effects.

## Design principles

1. **Show the product.** Use current Velozy editor, generated-site, publishing, and feature UI as proof. Use authorized customer examples or label mockups as illustrative.
2. **Lead with one audience need.** Each route gets one clear page purpose, one primary headline, and one primary action. Industry pages use real industry content and workflow examples.
3. **Keep the canvas quiet.** Black is the shared brand base; well-chosen imagery and restrained surfaces provide structure. Gradients, grids, glow, blur, and animation are accents, not the page content.
4. **Make every state usable.** Navigation, controls, text, and forms remain accessible with keyboard, touch, zoom, and reduced motion.
5. **Keep claims concrete and true.** Don't use invented analytics, testimonials, logos, guarantees, or feature claims as decorative content.

## Visual tokens

These values reflect the current marketing page styles in `apps/marketing/components/landing` and `apps/marketing/src/app/globals.css`. Prefer existing Tailwind colors/classes and shared landing components; add a new token only when a recurring need cannot be expressed with the existing palette.

| Role            | Current value/pattern                                            | Rule                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page background | `#000000` / `bg-black`                                           | Use as the shared marketing canvas and header background.                                                                                                  |
| Raised surface  | `#050505` or a clearly differentiated image/illustration surface | Use for product frames and layered panels. A light surface is appropriate inside an illustrative product preview when it reflects the product being shown. |
| Primary text    | `#ffffff` / `text-white`                                         | Reserve for headings and important labels.                                                                                                                 |
| Supporting text | `white/50`, `gray-400`, `slate-400`                              | Use for body copy and descriptions; check contrast on the actual surface.                                                                                  |
| Quiet metadata  | `white/35`, `gray-500`, `slate-500`                              | Use sparingly for captions, not important instructions.                                                                                                    |
| Accent          | Route-specific; home uses cyan/blue, salon uses mineral sage (`#536d49`, `#718a60`, `#b7c8a8`) | Use the route accent for focus, links, active indicators, and short emphasis. Industry accents should be named and restrained. |
| Gradient        | Route accent fading through a lighter tint          | Use selectively on a headline phrase or primary action; a flat accent is equally valid.                                                                                                    |
| Ambient glow    | Low-opacity route accent                         | Keep behind content, blurred and clipped. Avoid colored text panels as a default.                                                                          |
| Border          | `white/10` to `white/15`; muted gray                             | Use subtle borders to define dark surfaces instead of bright outlines.                                                                                     |

Keep the shared dark outer canvas and typography consistent. A page may establish one primary accent for its audience; the salon route uses mineral sage, while the home page retains cyan/blue. Choose surfaces to support the content: the home page includes a light storefront/editor illustration, and industry previews may use a light site mockup where that is true to the example. Keep those surfaces contained within the visual they explain. Avoid unrelated gradients or a second accent system. Use success, warning, and error colors only where the interface communicates those states, and pair each with text or an icon.

## Typography

- Use **Montserrat** throughout the marketing site, loaded in `apps/marketing/src/app/layout.tsx` and configured in Tailwind.
- Use tight tracking for display headlines and generous line height for body copy. The home page uses compact, high-impact headlines paired with restrained supporting copy. Keep body text comfortable to read; don't apply display tracking to paragraphs.
- Use the current responsive scale as a guide:

| Element            | Typical current scale                                                  | Treatment                                                                                     |
| ------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Hero H1            | About 56px mobile, 72px small desktop, up to about 125px large desktop | Medium weight, very tight line height/tracking, short enough to fit without awkward wrapping. |
| Section H2         | About 40px mobile, 48–84px desktop                                     | Medium weight; use a gradient on at most a short phrase when it reinforces hierarchy.         |
| Card H3            | About 30px                                                             | Medium weight with tight tracking; keep the title to one or two lines.                        |
| Body               | 15–18px                                                                | Regular weight, 1.6–1.8 line height, muted white/gray.                                        |
| UI labels          | 10–12px                                                                | Uppercase mono with increased tracking for small section labels, steps, and metadata only.    |
| Buttons/navigation | 14–16px                                                                | Medium or semibold with clear labels.                                                         |

Treat these as ranges, not fixed values. At every breakpoint, avoid clipped headings, orphaned single words, or body text that is too dim to read.

## Layout and spacing

- Use the shared responsive side gutters as the main alignment system: around 16–20px on small screens, 32px at `sm`, and 4.65vw or about 48px at `lg`. Apply padding once at the page or section boundary.
- Do not impose one max-width on every section. Heroes and wide horizontal compositions may use the full available width inside the shared gutters when their visual direction benefits from it. Keep text blocks, descriptions, and other reading areas independently constrained to about 520–760px.
- Use a max-width only when the specific composition needs a contained content area. Keep neighboring full-width sections aligned to the same gutters instead of adding an extra cap that creates larger margins on wide screens.
- Give major sections generous vertical spacing. Existing sections commonly use 80–112px on small/medium screens and 112–144px on large screens.
- Keep paragraph line lengths moderate. Use `max-w` on hero copy, card descriptions, and FAQs rather than letting text span the full container.
- Align section headings and content deliberately. Centered intros work for product highlights; split heading/description layouts work for longer FAQ or editorial sections.
- Use a consistent rhythm within repeated cards, feature lists, and CTA groups. Avoid arbitrary one-off spacing values when standard Tailwind spacing fits.

## Surfaces, cards, and controls

- Use near-black surfaces (`#050505`), thin white/10 borders, and `rounded-md` as the standard radius for cards, controls, image crops, and preview frames. Industry pages should use `rounded-md` throughout unless a product preview requires another radius. Increase the radius only when a large, soft product surface needs it; use the homepage as the reference for each section's surface shape.
- Use a soft shadow only to establish depth or lift a large panel. Avoid stacking thick borders, heavy shadows, and glow on the same component.
- Glass/blur surfaces are for product preview chrome or floating UI, not ordinary text containers.
- The primary CTA uses the existing `PrimaryLink`, white semibold text, modest corner radius, and a small directional icon when it clarifies navigation. The home page uses `.brand-gradient`; industry pages may apply their route accent (the salon CTA uses mineral sage). Keep its label action-oriented (“Start building”, “View pricing”).
- Secondary actions should be text or a transparent/bordered control. Avoid presenting two visually equal primary buttons in the same view.
- Use Lucide icons consistently, usually 16–20px. Decorative icons are hidden from assistive technology; icon-only controls need accessible names and visible focus states.
- Reuse the existing header, footer, primary link, label, FAQ, and other landing components when their behavior and appearance fit. Do not import admin-only controls into the public marketing experience.

## Writing or updating a page style guide

Keep this file as the single canonical style guide for marketing pages. When updating it, inspect the current home page, shared header/footer, global styles, and representative page components first. Describe current code separately from recommendations for future pages.

- Record a small set of named color, type, radius, spacing, and surface roles. Link those roles to existing tokens or component patterns instead of inventing a parallel design system.
- Use screenshots or rendered pages as a visual check when available; distinguish an intentional page-specific visual from a site-wide rule.
- Document the shared shell, page-specific composition guidance, responsive behavior, and accessibility expectations in the same guide.
- Update implementation status and relevant links when a page's structure changes. Keep product planning in the expansion plan and avoid duplicating its requirements here.

## Designing a marketing page

1. Identify the audience, the page's single job, and the next action. Gather the route's real copy, product behavior, assets, and constraints before choosing a layout.
2. Use the home page and shared shell as brand references. Choose a compact palette, type roles, spacing, and surfaces from this guide, then sketch the page's reading order and primary visual.
3. Give the page one recognizable visual idea that comes from its subject or product proof. Keep surrounding details quiet, and remove decoration that does not help explain the offer.
4. Build with existing marketing components where they fit. Make page-specific composition explicit, and keep mockups, claims, and interaction affordances accurate to the product.
5. Review the rendered page at phone and desktop widths, then check keyboard focus, contrast, reduced motion, heading structure, image descriptions, and working links before calling it ready.

## Marketing page structure

Use a shared page shell with the same site header, content container, footer, typography, colors, and metadata conventions. The home page's hero is the current reference for the marketing voice: one clear message, a primary action, and a substantial product visual. Adjust section order and composition to the page's intent; don't force every page to use the homepage's exact animation or later-section layout.

### Product and solution pages

Recommended content order:

1. Header and one clear hero: audience/problem, specific benefit, primary CTA, and a real product preview.
2. Proof of the workflow: show what the visitor provides and what Velozy creates or lets them edit.
3. Relevant capabilities, presented as useful outcomes rather than a generic feature dump.
4. A short how-it-works sequence or a realistic example.
5. Plan/access details when the feature is gated.
6. FAQs that address real product and setup questions.
7. Final CTA and the shared footer.

### Industry pages

- Use the same dark page shell but tailor the headline, preview, generated page examples, setup checklist, copy, FAQs, and one restrained primary accent to the industry. The salon page uses mineral sage and `rounded-md` surfaces.
- Build useful coverage in a deliberate reading sequence: hero, relevant capability examples, creation steps, an in-between CTA, industry imagery or showcase, site sections the visitor can create, practical growth/SEO guidance, FAQs, and a final CTA. Reuse the renderer and section patterns; keep copy, examples, and claims authored for each industry.
- Show a plausible site structure for that specific business (for example menu/hours for a café, projects/service areas for construction, or courses/enrollment for education).
- Replace decorative industry galleries with visual niche cards when explaining who the builder serves. Give each niche a descriptive heading, relevant imagery, useful service details, and a clear onboarding link. Keep all niche copy server-rendered and route-authored so other industries reuse the layout with their own content and palette. Do not label a link as a preset or brief unless it actually applies one.
- Present the three creation steps as illustrated cards: guided planning conversation, page plan, and website editor. Keep the SEO heading and ordered step copy readable independently of the illustrations. Reuse industry colors and route-authored preview content; animate each illustration once as its card enters view and show a static completed state for reduced motion.
- Use existing working Velozy features only. Clearly distinguish a contact/enquiry form from bookings, ordering, ticketing, donations, MLS, a patient portal, or other specialized systems.
- Link to closely related industries/features and the general builder page. Avoid an oversized industry grid repeated on every route.

### Tool pages

- Put the tool itself near the top of the page so visitors can use it without searching through sales content.
- Explain accepted input, output, steps, file handling, limitations, and whether it is free, account-gated, or paid.
- Make the result easy to preview, copy, or download. Show usage cost before a paid AI action.
- Include a concise link to the related Velozy website workflow, without blocking the tool behind an unrelated signup.

### Guides and comparisons

- Use readable editorial typography and a narrow text column with clear heading hierarchy, lists, tables, and sourced claims where relevant.
- Keep calls to action contextual and secondary to the article's answer. Date claims that may change.
- Do not use the display hero scale for long article headings or center every paragraph.

## Product imagery and examples

- Prefer genuine screenshots from `apps/marketing/public/sample`, the configured website screenshots, or real product UI captured from a functioning build. Keep the preview frame visually consistent with browser chrome used in the homepage hero.
- Crop to show the relevant task, preserve the original layout proportions, and use `object-top` when the page header is part of the proof.
- Use illustration or motion to clarify a product step, not to fabricate product capability. Any sample graph, usage number, customer quote, business, or brand must be real and authorized, or explicitly labeled as illustrative.
- Use descriptive alt text for informative screenshots. Mark decorative glows, grids, and background shapes `aria-hidden` and `pointer-events-none`.
- Avoid generic stock imagery as a substitute for product evidence. For industry pages, use a real generated-site preview or a clearly labeled sample that reflects the industry.

## Motion and interaction

- Motion should explain state, hierarchy, or sequence: a restrained entrance, a preview transition, or a short interaction cue. Avoid continuous movement that competes with reading.
- Follow the existing reduced-motion support in the hero and use `prefers-reduced-motion`/`useReducedMotion` for every nonessential animation. Reduced motion should show the completed static state, not hide content or controls.
- Auto-advancing examples must have manual previous/next/select controls, accessible labels, and stop or remain still when reduced motion is requested. Do not autoplay several independent effects in one viewport.
- Keep interaction transitions short and functional. Use cyan/blue hover and focus treatment; don't make hover the only way to reveal information.
- Provide visible `focus-visible` states. Interactive elements should be keyboard-operable, have a clear accessible name, and have a touch target of at least 44×44px where practical.

## Responsive behavior

- Design for mobile first and add columns only when content has room. Common existing breakpoints are Tailwind `sm` (640px), `md` (768px), `lg` (1024px), and `xl` (1280px).
- Collapse split layouts and card grids to one column on narrow screens. Preserve meaningful reading order; don't use CSS ordering to make visual and keyboard order disagree.
- Scale the hero headline and product preview down together. Keep the first CTA visible without forcing a tall empty hero.
- Make navigation work at touch widths; close the mobile menu after navigation and expose its expanded state to assistive technology.
- Keep pricing comparison tables scrollable when their columns cannot fit. Do not hide plan details or force unreadably narrow columns.
- Check long industry names, narrow phones, zoom, landscape, and reduced-motion preferences. No horizontal page overflow or clipped controls.

## Content and accessibility rules

- One descriptive H1 per page; use H2 for major sections and H3 for nested content. Do not choose heading levels for visual size alone.
- Keep text contrast readable on black and translucent surfaces. Muted styles are for supporting copy, never essential legal, pricing, or feature-limit text.
- Use links for navigation and buttons for in-page actions. Give form controls visible labels and explain validation errors next to the field.
- Accordions expose `aria-expanded` and associated content, as in the current FAQ pattern. Do not hide important SEO or product information exclusively inside interaction-only content.
- Maintain semantic header, nav, main, section, and footer landmarks. Make decorative motion and imagery invisible to screen readers.
- Keep page titles, descriptions, canonical URLs, and structured data aligned with the visible page and the [marketing expansion plan](./marketing-site-expansion.md). Design polish does not replace crawlable text or truthful metadata.

## Avoid

- Replacing the dark canvas or Montserrat with unrelated page-specific themes.
- Repeating the same giant gradient headline, glowing grid, and animated cards on every route.
- Long stretches of low-contrast gray text, tiny essential notes, or small tap targets.
- Fake analytics, invented testimonials, unapproved customer logos, unverified claims, or interface previews of features that are not available.
- Keyword-stuffed headings, empty template listings, or repeated industry copy with only the business name changed.
- Autoplaying motion without a static/reduced-motion state, or hover-only controls.

## Review checklist

Before publishing a marketing page, confirm that it:

1. Uses the shared dark brand shell, Montserrat, responsive containers, and established CTA styles.
2. Has one clear audience, headline, primary action, and real page-specific content.
3. Shows current product behavior with authorized or clearly labeled example material.
4. Works on mobile and keyboard, has readable contrast/focus states, and respects reduced motion.
5. Uses semantic headings and landmarks, descriptive image alternatives, and truthful page metadata.
6. Explains access/plan limits and gives each link/control a working destination.
