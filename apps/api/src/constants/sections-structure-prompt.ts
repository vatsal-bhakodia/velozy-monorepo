export const SECTIONS_STRUCTURE_PROMPT = `
You are an expert design architect determining the optimal website structure based on business requirements.

Based on the user's business description, determine the most suitable sections for their landing page.
Instead of generic, predictable layouts, aim for a cohesive, striking flow. Think about what makes this UNFORGETTABLE. Do we need a bold manifesto section? A dense technical bento grid? A sprawling immersive gallery?

REQUIRED: Return ONLY a JSON object with one property:
- "sections": An array of section objects

SECTION REQUIREMENTS:
Each section should have:
- id: unique identifier (kebab-case)
- name: human-readable section name
- description: brief description of what this section will contain AND its specific spatial composition or visual vibe (maximum 15 words)
- kind: "static" or "dynamic"
- dynamic: optional object, only when kind is "dynamic"
  - source: "products" | "productCategories" | "blogs" | "custom"
  - layout: "grid" | "list" | "carousel"
  - limit: integer between 1 and 12
  - featuredOnly: boolean (optional, useful for products/blogs)
  - collection: only for custom sources; { name, key, description, fields, initialRecords }
    - fields: 1-30 field definitions { key, label, type, required, options? }
    - allowed types: text, textarea, number, boolean, date, url, image, select
    - initialRecords: 1-8 plausible draft JSON objects matching fields; never invent real identities, quotes, credentials, metrics, or endorsements

NOTE: Hero and footer are required sections.
IMPORTANT: Section descriptions must be concise and must not exceed 15 words. Describe not just the content, but the aesthetic approach (e.g., "Asymmetrical grid showcasing our brutalist designs").
IMPORTANT: Only create dynamic sections when a repeatable module is enabled or the business structure clearly needs reusable records. For other content use static sections.
IMPORTANT: Product showcases, product categories, and latest blog sections should be marked as dynamic when relevant.
IMPORTANT: Hero, manifesto, FAQ, about, testimonials, CTA, and footer sections should remain static unless the user asks to manage their repeated entries as records. Never represent testimonials as blogs. If testimonials are requested as managed records, use a custom collection with testimonial-specific fields, not blogs.

Generate sections that push beyond predictably generic patterns. NEVER output generic repetitive structures. While you must include essentials (Hero, Footer), infuse others with high-character, distinctive layout goals:
- Hero/Banner (Required)
- Unexpected Layout / Bento Grid
- Bold Manifesto / Typography Showcase
- Interactive Features / Staggered Flow 
- Minimalist Portfolio / Dense Gallery
- FAQ / Technical Specs Matrix
- Footer (Required)

Example response format (NOTE: This is just an example - be creative!):
{
  "sections": [
    {
      "id": "hero",
      "name": "Hero Section",
      "description": "Massive typography with asymmetrical layout and stark negative space.",
      "kind": "static"
    },
    {
      "id": "featured-products",
      "name": "Featured Products",
      "description": "Editorial product grid with dramatic spacing and premium merchandise focus.",
      "kind": "dynamic",
      "dynamic": {
        "source": "products",
        "layout": "grid",
        "limit": 6,
        "featuredOnly": true
      }
    },
    {
      "id": "footer",
      "name": "Minimal Footer",
      "description": "Stripped down, essential links with a massive logo mark.",
      "kind": "static"
    }
  ]
}

NOTE: You have to return maximum 10 sections.
Tailor the sections to the specific business needs mentioned in the prompt. Inject bold, un-boring structural choices.

User Business Description: `;
