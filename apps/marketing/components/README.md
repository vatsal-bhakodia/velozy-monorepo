# Marketing components

The shared layout uses `landing/header.tsx` in a dark theme, and the homepage
uses `landing/hero.tsx`. Homepage sections after the hero use full-width
content with consistent responsive side gutters. The website showcase supports
dark and light appearances with a fixed blue ambient glow. `landing/promotion-bar.tsx` contains the optional promo bar; its import
and render location are commented out in the shared layout, so it is currently
disabled.

`landing/platform.tsx` owns the homepage platform overview after the hero:
four illustrative product cards, eight connected capabilities, and the Velozy
mark, followed by three platform benefits. Tailwind owns the section layout and
typography and one-off preview styling. `landing/platform.module.css` owns the
layered card treatments, shared preview surfaces, illustration positioning and
motion, responsive connector artwork, and reduced-motion treatment.

`landing/how-to-create.tsx` owns the homepage guide to creating and publishing
a site with AI. Four crawlable steps and the free-site call to action sit beside
a labeled ecommerce editor illustration, stacking on mobile. The surrounding
section follows the dark homepage theme. Tailwind classes own the cream
storefront illustration, toolbar, and AI prompt. Container query units keep
the illustration in proportion. The toolbar and AI prompt sit on the homepage
canvas without an outer editor panel.

The onboarding, provider, and Magic UI component trees were relocated here;
their Next.js aliases and dependencies remain unchanged.

`landing/agentic-seo.tsx` owns the homepage SEO specialist section after the
creation guide. A business profile feeds three connected stages: competitor
research, keyword strategy, and content drafting. The workflow passes through
owner publishing rules and branches into page improvements and scheduled blogs.
Stages connect horizontally on desktop and vertically on mobile. Tailwind owns
layout and visual styling, using the process section's dark surfaces, cyan
border highlights, and Montserrat typography. GSAP ScrollTrigger ties card
reveals and connector drawing to scroll position, with separate desktop and
mobile sequences. Reduced motion shows the complete static workflow. GSAP
matchMedia reverts animations on breakpoint changes and unmount. Product claims
preserve owner publishing control.

`solutions/solution-page.tsx` owns the reusable industry page shell, hero
composition, capability cards, creation steps, CTAs, showcase, page-content
cards, SEO guidance, and FAQ pattern. Route copy lives in
`src/content/solutions/*.json`; each entry's `slug` selects the dynamic
`/industries/[slug]` route. `src/content/solutions/index.ts` currently registers
the local JSON entries and can later be replaced by an API-backed lookup. The
salon page is the first complete example and uses a mineral-sage accent on the
shared dark canvas. `solutions/hero-previews.tsx`
owns the reusable service and appointment cards used in the hero. Supply each
industry's card text and `hero.previewTheme` colors in its route content to keep
the same card structure while matching its palette. The calendar is an
illustrative preview, not a live booking flow. Keep later industry pages
specific in their authored content while reusing these section patterns and the
`rounded-md` surface style.

`solutions/industry-use-cases.tsx` replaces the industry gallery with
illustrated niche cards. Route `inspiration` content supplies the heading,
short descriptions, images, and action labels. Keep each card to a niche heading,
one sentence, and a CTA. The section shares the capabilities palette and renders
every card on the server for crawlable content. Actions open onboarding; they do
not preselect a brief. Tailwind owns layout, responsive behavior, image hover,
and focus styling. Use specific customer needs for each niche rather than
repeating keywords.

`solutions/creation-steps.tsx` owns the three-stage creation guide: a guided
planning conversation, a page plan, and a website editor illustration. Route
content supplies the step copy and preview labels, image, and business details;
the section shares the capabilities palette. Tailwind owns layout and preview
styling; configured keyframes power the one-time entrance effects. An ordered
list keeps all three steps readable, with a single column on mobile.
Illustrations animate once on entering the viewport, finish within four seconds,
and remain static when reduced motion is requested. Preview controls are
decorative.

`solutions/capabilities-bento.tsx` owns the reusable industry capabilities bento
structure: service menu, subscription preview, portfolio, illustrative location
map, enquiry form, and mobile preview. Route data supplies the six card labels
and descriptions, every preview image and label, and the section palette. Each
capability item selects one matching visual spec by key, so new industries can
change the examples and wording while keeping the same six visual treatments.
Tailwind owns the layout and visual treatment; preview controls are decorative.
The subscription card demonstrates membership choices with a selection action;
it does not claim a native recurring-payment flow.
