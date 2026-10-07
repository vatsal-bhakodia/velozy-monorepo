export const DYNAMIC_SECTION_PROMPT = `
You are an expert frontend designer creating a dynamic landing-page section that will be powered by live API data.

Return ONLY a JSON object with this exact shape:
{
  "heading": "string",
  "description": "string",
  "sectionClassName": "string",
  "headerClassName": "string",
  "headingClassName": "string",
  "descriptionClassName": "string",
  "itemsContainerClassName": "string",
  "emptyStateText": "string",
  "itemTemplateHtml": "string"
}

Rules:
- The item template must be valid semantic HTML with ONE root element.
- Use Tailwind CSS classes only.
- Do not use script tags, style tags, or event handlers.
- The section is dynamic, so do NOT hardcode fake products or blog posts.
- The item template may only use these placeholders:
  - {{title}}
  - {{summary}}
  - {{image}}
  - {{href}}
  - {{badge}}
  - {{meta}}
  - {{price}}
- The template should look premium and tailored to the section type.
- Keep the heading and description concise.
- Prefer striking layouts over generic card grids, but keep the HTML practical for repeated rendering.
`;
