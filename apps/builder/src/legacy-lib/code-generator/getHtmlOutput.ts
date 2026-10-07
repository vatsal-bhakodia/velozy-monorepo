export const getHtmlOutput = (iframeId: string): string => {
  const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (!iframe || !iframe.contentDocument) {
    console.error("Iframe not found or inaccessible");
    return "";
  }

  const iframeDocument =
    iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDocument || !iframeDocument.body) {
    console.error("Unable to access iframe document or body");
    return "";
  }

  // Clone the body to avoid modifying the actual iframe content
  const clone = iframeDocument.body.cloneNode(true) as HTMLElement;

  // Clean unwanted attributes and classes
  const cleanElement = (element: HTMLElement) => {
    const attrsToRemove = ["draggable", "contenteditable"];

    // Remove unwanted attributes
    attrsToRemove.forEach((attr) => {
      if (element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });

    // Remove empty style
    if (
      element.hasAttribute("style") &&
      !element.getAttribute("style")?.trim()
    ) {
      element.removeAttribute("style");
    }

    // Remove resize handle divs
    // This specifically targets the container div that holds all the corner resize handles
    if (
      element.tagName === "DIV" &&
      element.children.length > 0 &&
      Array.from(element.children).every((child) => {
        const childEl = child as HTMLElement;
        return (
          childEl.tagName === "DIV" &&
          childEl.style.position === "absolute" &&
          childEl.style.backgroundColor === "rgb(255, 255, 255)" &&
          childEl.style.borderRadius === "50%"
        );
      })
    ) {
      element.parentNode?.removeChild(element);
      return; // Skip further processing for this element
    }

    // Remove empty divs
    if (
      element.tagName === "DIV" &&
      element.children.length === 0 &&
      element.textContent?.trim() === "" &&
      !element.getAttribute("class") &&
      !element.getAttribute("style")
    ) {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      return; // Skip further processing for this element
    }

    // Recursively clean children
    // Convert to array to avoid issues with live collections when removing elements
    Array.from(element.children).forEach((child) => {
      cleanElement(child as HTMLElement);
    });
  };

  cleanElement(clone);

  // Format HTML with indentation
  const formatHtml = (html: string): string => {
    const tab = "  ";
    let result = "";
    let indent = "";

    html = html.replace(/ [a-z-]+=""/g, "");

    html.split(/>\s*</).forEach((element) => {
      if (element.match(/^\/\w/)) {
        indent = indent.substring(tab.length);
      }

      result += indent + "<" + element + ">\r\n";

      if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith("br")) {
        indent += tab;
      }
    });

    return result.substring(1, result.length - 3);
  };

  const cleanedBodyHtml = formatHtml(clone.outerHTML).replace(/ class=""/g, "");

  // Wrap in HTML boilerplate
  const finalHtml = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Your Website Name</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.1/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body>
  ${cleanedBodyHtml
    .split("\n")
    .map((line) => "    " + line)
    .join("\n")}
    </body>
  </html>`;

  return finalHtml;
};
