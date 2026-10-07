import type { Node, Nodes } from "@craftjs/core";

let imports: { displayName: string; importPath: string }[] = [];

// Helper function to convert JSON component objects to JSX strings
const convertJsonToJsx = (component: any, level: number = 0): string => {
  if (!component || typeof component !== "object") {
    return "";
  }

  if (typeof component === "string") {
    return component;
  }

  if (component.type && component.props) {
    const { children, ...otherProps } = component.props;
    const indentation = "  ".repeat(level);

    // Add import for this component type
    if (!imports.find((item) => item.displayName === component.type)) {
      imports.push({
        displayName: component.type,
        importPath: "", // You might need to adjust this based on your component structure
      });
    }

    const propsString = generatePropsStringFromObject(otherProps);

    if (!children || (Array.isArray(children) && children.length === 0)) {
      return `${indentation}<${component.type}${propsString} />`;
    }

    const childrenJsx = Array.isArray(children)
      ? children.map((child) => convertJsonToJsx(child, level + 1)).join("\n")
      : typeof children === "string"
        ? children
        : convertJsonToJsx(children, level + 1);

    if (childrenJsx.trim()) {
      return `${indentation}<${component.type}${propsString}>\n${childrenJsx}\n${indentation}</${component.type}>`;
    } else {
      return `${indentation}<${component.type}${propsString}></${component.type}>`;
    }
  }

  return "";
};

// Helper function to generate props string from object
const generatePropsStringFromObject = (props: Record<string, any>): string => {
  if (!props || Object.keys(props).length === 0) {
    return "";
  }

  const propsArray = Object.entries(props)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return "";
      }

      if (typeof value === "string") {
        // Handle strings that already contain quotes
        if (value.includes('"')) {
          // Use template literals for strings with quotes
          return ` ${key}={\`${value.replace(/`/g, "\\`")}\`}`;
        }
        return ` ${key}="${value}"`;
      }

      if (typeof value === "boolean") {
        return value ? ` ${key}` : "";
      }

      if (typeof value === "number") {
        return ` ${key}={${value}}`;
      }

      if (typeof value === "object") {
        return ` ${key}={${JSON.stringify(value)}}`;
      }

      return ` ${key}={${String(value)}}`;
    })
    .filter((prop) => prop !== "");

  return propsArray.join("");
};

const generatePropsString = (
  props: Record<string, any>,
  displayName: string,
): string => {
  if (!props || Object.keys(props).length === 0) {
    return "";
  }

  // Special handling for Carousel component
  if (displayName === "Carousel") {
    const carouselProps = { ...props };

    // Convert slides children from JSON to JSX
    if (carouselProps.slides && Array.isArray(carouselProps.slides)) {
      carouselProps.slides = carouselProps.slides.map((slide) => {
        if (slide.children) {
          // Convert JSON children to JSX - don't stringify it
          const jsxChildren = Array.isArray(slide.children)
            ? slide.children
                .map((child: any) => convertJsonToJsx(child, 3))
                .join("\n")
            : convertJsonToJsx(slide.children, 3);

          return {
            ...slide,
            children: jsxChildren,
          };
        }
        return slide;
      });
    }

    // Remove children to avoid duplication
    delete carouselProps.children;

    const propsArray = Object.entries(carouselProps)
      .map(([key, value]) => {
        if (value === null || value === undefined) {
          return "";
        }

        if (typeof value === "string") {
          // Handle strings that already contain quotes
          if (value.includes('"')) {
            // Use template literals for strings with quotes
            return `${key}={\`${value.replace(/`/g, "\\`")}\`}`;
          }
          return `${key}="${value}"`;
        }

        if (typeof value === "boolean") {
          return value ? key : "";
        }

        if (typeof value === "number") {
          return `${key}={${value}}`;
        }

        if (typeof value === "object") {
          // Special handling for slides prop to format it as proper JSX
          if (key === "slides") {
            const slidesArray = (value as any[]).map((slide, index) => {
              const slideProps = Object.entries(slide)
                .filter(([key]) => key !== "children")
                .map(([key, val]) => {
                  if (typeof val === "string") {
                    return `${key}: "${val}"`;
                  }
                  return `${key}: ${JSON.stringify(val)}`;
                })
                .join(", ");

              const slidePropsString = slideProps ? `${slideProps}, ` : "";

              return `            {
              ${slidePropsString}children: (
${slide.children}
              )
            }`;
            });

            const slidesString = `[\n${slidesArray.join(",\n")}\n          ]`;
            return `${key}={${slidesString}}`;
          }
          return `${key}={${JSON.stringify(value)}}`;
        }

        return `${key}={${String(value)}}`;
      })
      .filter((prop) => prop !== "");

    return propsArray.length > 0 ? ` ${propsArray.join(" ")}` : "";
  }

  // Default handling for other components - filter out empty children and ROOT id
  const propsArray = Object.entries(props)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return "";
      }

      // Skip empty children arrays
      if (key === "children" && Array.isArray(value) && value.length === 0) {
        return "";
      }

      // Skip ROOT id
      if (key === "id" && value === "ROOT") {
        return "";
      }

      // Skip empty style objects
      if (
        key === "style" &&
        typeof value === "object" &&
        Object.keys(value).length === 0
      ) {
        return "";
      }

      // Skip empty className
      if (key === "className" && value === "") {
        return "";
      }

      if (typeof value === "string") {
        // Handle strings that already contain quotes
        if (value.includes('"')) {
          // Use template literals for strings with quotes
          return `${key}={\`${value.replace(/`/g, "\\`")}\`}`;
        }
        return `${key}="${value}"`;
      }

      if (typeof value === "boolean") {
        return value ? key : "";
      }

      if (typeof value === "number") {
        return `${key}={${value}}`;
      }

      if (typeof value === "object") {
        return `${key}={${JSON.stringify(value)}}`;
      }

      return `${key}={${String(value)}}`;
    })
    .filter((prop) => prop !== "");

  return propsArray.length > 0 ? ` ${propsArray.join(" ")}` : "";
};

const generateComponentCode = (
  nodesMap: Nodes,
  nodeId: string,
  level: number,
): string => {
  const node = nodesMap[nodeId];
  const { displayName, props, nodes, linkedNodes, custom } = node.data;
  const indentation = getIndentation(level);
  const openingTag = `<${displayName}${generatePropsString(
    props,
    displayName,
  )}>`;
  const closingTag = `</${displayName}>`;

  console.log(" custom ", displayName, custom);

  if (!imports.find((item) => item.displayName === displayName)) {
    imports.push({
      displayName,
      importPath: custom?.importPath || "",
    });
  }

  // Special handling for Carousel component
  if (displayName === "Carousel") {
    // For Carousel, we use self-closing tag since children are now in slides prop as JSX
    const selfClosingTag = `<${displayName}${generatePropsString(
      props,
      displayName,
    )} />`;
    return `${indentation}${selfClosingTag}`;
  }

  // Check if this is a carousel slide container (to skip rendering)
  if (nodeId.startsWith("carousel-slide-")) {
    // Skip rendering carousel slide containers as they're handled by the slides prop
    return "";
  }

  if (nodes.length === 0 && Object.keys(linkedNodes).length === 0) {
    // No child nodes, return the self-closing tag or tag with children prop
    return `${indentation}${openingTag}${generateChildString(
      props.children,
      level + 1,
    )}${closingTag}`;
  } else {
    // Has child nodes, recursively generate code for children
    const childComponents = nodes
      .map((childId) => generateComponentCode(nodesMap, childId, level + 1))
      .filter((code) => code !== ""); // Filter out empty strings (from skipped carousel slides)

    const childComponentsString = childComponents.length
      ? `\n${childComponents.join(`\n`)}`
      : "";

    const linkedChildComponents = Object.entries(linkedNodes)
      .map(([key, value]) => generateComponentCode(nodesMap, value, level + 1))
      .filter((code) => code !== "");

    const linkedChildComponentsString = linkedChildComponents.length
      ? `\n${linkedChildComponents.join(`\n`)}`
      : "";

    // If no children after filtering, use self-closing tag
    if (!childComponentsString && !linkedChildComponentsString) {
      const selfClosingTag = `<${displayName}${generatePropsString(
        props,
        displayName,
      )} />`;
      return `${indentation}${selfClosingTag}`;
    }

    return `${indentation}${openingTag}${childComponentsString}${linkedChildComponentsString}\n${indentation}${closingTag}`;
  }
};

interface ComponentInfo {
  displayName: string;
  importPath: string;
}

const generateImportStatements = (components: ComponentInfo[]): string => {
  const filteredComponents = components.filter(
    (comp) => comp.displayName !== "div",
  );

  const defaultImportPaths: Record<string, string> = {
    DynamicCollection: "@/components/dynamic-collection",
  };

  // Generate individual import statements for each component
  const importStatements = filteredComponents.map((comp) => {
    // Use provided importPath or generate one from displayName
    const importPath =
      comp.importPath ||
      defaultImportPaths[comp.displayName] ||
      `@/components/${comp.displayName.toLowerCase()}`;
    return `import { ${comp.displayName} } from "${importPath}";`;
  });

  // Remove duplicates and sort alphabetically
  const uniqueImports = Array.from(new Set(importStatements)).sort();

  return uniqueImports.join("\n");
};

function wrapInsideComponent(input: string): string {
  return `
export default function Page() {
  return (
    ${input.trim().replace(/^/gm, "  ")}
  );
}
  `.trim();
}

const getIndentation = (level: number): string => {
  if (!level) {
    return "";
  }
  return " ".repeat(level * 2); // Adjust the number of spaces per level as needed
};

const generateChildString = (
  children: string | Node[] | undefined,
  level: number,
): string => {
  if (typeof children === "string") {
    // If children is a string, return it directly
    return children;
  } else if (Array.isArray(children) && children.length > 0) {
    return children
      .map((child) => generateComponentCode({ TEMP: child }, "TEMP", level))
      .join("");
  } else {
    return "";
  }
};

export const getReactOutput = (nodes: Nodes) => {
  imports = [];

  const componentString = generateComponentCode(nodes, "ROOT", 2);
  const importString = generateImportStatements(imports);
  const output = wrapInsideComponent(componentString);
  console.log(generateImportStatements(imports));
  console.log("imports ", imports);

  return { importString, output };
};
