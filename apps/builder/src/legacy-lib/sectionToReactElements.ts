import React from "react";

export function sectionToReactElements(
  section: any,
  BuilderElements: any,
): React.ReactElement[] {
  const convertComponentToElement = (component: any): React.ReactElement => {
    let Component = BuilderElements[component.type];

    if (
      !Component &&
      typeof component.type === "string" &&
      component.type.toLowerCase() === component.type
    ) {
      Component = component.type;
    }

    if (!Component) {
      console.warn(
        `Component type ${component.type} not found in BuilderElements`,
      );
      return React.createElement(
        "div",
        { key: component.id },
        "Unknown Component",
      );
    }

    const { ...otherProps } = component.props || {};
    let children = component.props?.children;

    // Clean up empty props to prevent them from overriding Craft.js defaults
    // or interfering with Tailwind class-based sizing
    if (
      otherProps.style &&
      typeof otherProps.style === "object" &&
      Object.keys(otherProps.style).length === 0
    ) {
      delete otherProps.style;
    }
    if (otherProps.className === "") {
      delete otherProps.className;
    }

    // Recursively convert children
    const childElements =
      children && Array.isArray(children)
        ? children.map((child: any) => convertComponentToElement(child))
        : undefined;

    return React.createElement(
      Component,
      {
        ...otherProps,
        key: component.id,
      },
      childElements,
    );
  };

  // Convert all components in the section
  return section.components.map((comp: any) => convertComponentToElement(comp));
}
