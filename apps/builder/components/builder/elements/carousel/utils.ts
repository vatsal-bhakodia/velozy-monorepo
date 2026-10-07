export const generateUniqueId = (prefix = "slide") => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getDefaultSlides = () => [
  { id: generateUniqueId(), name: "Slide 1", backgroundImage: "" },
  { id: generateUniqueId(), name: "Slide 2", backgroundImage: "" },
  { id: generateUniqueId(), name: "Slide 3", backgroundImage: "" },
];
