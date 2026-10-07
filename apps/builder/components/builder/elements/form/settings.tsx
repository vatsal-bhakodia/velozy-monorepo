import { useNode } from "@craftjs/core";
import React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableProvided,
} from "@hello-pangea/dnd";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Plus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { FormField, FormProps } from "./types";
import { generateNameFromLabel } from "./utils";

export const FormFieldSettings = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as FormProps,
  }));

  const [accordionValue, setAccordionValue] = React.useState<string[]>([]);
  const [newOptionTexts, setNewOptionTexts] = React.useState<{
    [key: number]: string;
  }>({});
  const [syncError, setSyncError] = React.useState("");
  const fieldsValue = JSON.stringify(props.fields);
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    if (!props.formId) return;
    const projectId = sessionStorage.getItem("projectId");
    if (!projectId) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/forms/${props.formId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: props.formName || "Website form",
            purpose: props.formPurpose || "general",
            fields: props.fields.map((field) => ({
              key: field.name,
              label: field.label,
              fieldType: field.type === "password" ? "text" : field.type,
              required: Boolean(field.required),
              options: field.options,
              placeholder: field.placeholder,
              layout: field.colSpan,
            })),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || result.error || "Form changes could not be saved");
        setSyncError("");
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : "Form changes could not be saved");
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [fieldsValue, props.formId, props.formName, props.formPurpose]);

  // Handle drag end for reordering fields
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    if (source.index === destination.index) return;

    setProp((props: FormProps) => {
      const newFields = Array.from(props.fields);
      FormFieldSettings;
      const [reorderedField] = newFields.splice(source.index, 1);
      newFields.splice(destination.index, 0, reorderedField);
      props.fields = newFields;
      return props;
    });
  };

  // Handle adding a new field
  const handleAddField = () => {
    setProp((props: FormProps) => {
      const newFieldNumber = props.fields.length + 1;
      props.fields.push({
        type: "text",
        name: `field_${newFieldNumber}`,
        label: `Field ${newFieldNumber}`,
        placeholder: "",
        required: false,
        colSpan: "col-span-full",
      });
      return props;
    });

    // Open the newly added field's accordion
    const newFieldIndex = props.fields.length - 1;
    setAccordionValue((prev) => [...prev, `field-${newFieldIndex}`]);
  };

  // Handle removing a field
  const handleRemoveField = (fieldIndex: number) => {
    if (props.fields.length <= 1) return; // Prevent removing the last field

    setProp((props: FormProps) => {
      props.fields.splice(fieldIndex, 1);
      return props;
    });

    // Remove from accordion value
    setAccordionValue((prev) =>
      prev.filter((item) => item !== `field-${fieldIndex}`),
    );
  };

  // Handle moving field up
  const handleMoveUp = (fieldIndex: number) => {
    if (fieldIndex <= 0) return;

    setProp((props: FormProps) => {
      const newFields = Array.from(props.fields);
      [newFields[fieldIndex - 1], newFields[fieldIndex]] = [
        newFields[fieldIndex],
        newFields[fieldIndex - 1],
      ];
      props.fields = newFields;
      return props;
    });
  };

  // Handle moving field down
  const handleMoveDown = (fieldIndex: number) => {
    if (fieldIndex >= props.fields.length - 1) return;

    setProp((props: FormProps) => {
      const newFields = Array.from(props.fields);
      [newFields[fieldIndex], newFields[fieldIndex + 1]] = [
        newFields[fieldIndex + 1],
        newFields[fieldIndex],
      ];
      props.fields = newFields;
      return props;
    });
  };

  // Handle label change and auto-generate name
  const handleLabelChange = (fieldIndex: number, newLabel: string) => {
    setProp((props: FormProps) => {
      props.fields[fieldIndex].label = newLabel;
      props.fields[fieldIndex].name = generateNameFromLabel(newLabel);
      return props;
    });
  };

  // Handle adding new option
  const handleAddOption = (fieldIndex: number) => {
    const newOptionText = newOptionTexts[fieldIndex];
    if (!newOptionText?.trim()) return;

    setProp((props: FormProps) => {
      if (!props.fields[fieldIndex].options) {
        props.fields[fieldIndex].options = [];
      }
      props.fields[fieldIndex].options!.push(newOptionText.trim());
      return props;
    });

    setNewOptionTexts((prev) => ({ ...prev, [fieldIndex]: "" }));
  };

  // Handle removing an option
  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    setProp((props: FormProps) => {
      if (props.fields[fieldIndex].options) {
        props.fields[fieldIndex].options!.splice(optionIndex, 1);
      }
      return props;
    });
  };

  // Handle key press in option input
  const handleOptionKeyPress = (e: React.KeyboardEvent, fieldIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOption(fieldIndex);
    }
  };

  // Render individual field settings
  const renderFieldSettings = (field: FormField, fieldIndex: number) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Field Type
        </label>
        <select
          value={field.type}
          onChange={(e) => {
            setProp((props: FormProps) => {
              props.fields[fieldIndex].type = e.target
                .value as FormField["type"];
              return props;
            });
          }}
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
        >
          <option value="text">Text Input</option>
          <option value="email">Email Input</option>
          <option value="password">Password Input</option>
          <option value="textarea">Text Area</option>
          <option value="select">Dropdown Select</option>
          <option value="checkbox">Checkbox</option>
          <option value="radio">Radio Buttons</option>
          <option value="date">Date Picker</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Field Label
        </label>
        <input
          type="text"
          value={field.label || ""}
          onChange={(e) => handleLabelChange(fieldIndex, e.target.value)}
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
          placeholder="Enter field label (e.g., Full Name)"
        />
        {field.label && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Field name:{" "}
            <span className="font-mono text-neutral-800 dark:text-neutral-300">
              {field.name}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Placeholder Text
        </label>
        <input
          type="text"
          value={field.placeholder || ""}
          onChange={(e) => {
            setProp((props: FormProps) => {
              props.fields[fieldIndex].placeholder = e.target.value;
              return props;
            });
          }}
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
          placeholder={`Enter placeholder for ${field.type} field`}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Column Width
        </label>
        <select
          value={field.colSpan || "col-span-full"}
          onChange={(e) => {
            setProp((props: FormProps) => {
              props.fields[fieldIndex].colSpan = e.target.value;
              return props;
            });
          }}
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
        >
          <option value="col-span-1">1/12 Width</option>
          <option value="col-span-2">2/12 Width</option>
          <option value="col-span-3">3/12 Width (1/4)</option>
          <option value="col-span-4">4/12 Width (1/3)</option>
          <option value="col-span-6">6/12 Width (1/2)</option>
          <option value="col-span-8">8/12 Width (2/3)</option>
          <option value="col-span-9">9/12 Width (3/4)</option>
          <option value="col-span-12">12/12 Width</option>
          <option value="col-span-full">Full Width</option>
        </select>
      </div>

      {(field.type === "select" || field.type === "radio") && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Options
          </label>

          {/* Display existing options as boxes */}
          {field.options && field.options.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {field.options.map((option, optionIndex) => (
                <div
                  key={optionIndex}
                  className="flex items-center bg-neutral-700 text-neutral-900 dark:text-white px-2 py-1 rounded-md text-xs"
                >
                  <span>{option}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(fieldIndex, optionIndex)}
                    className="ml-2 text-red-300 hover:text-red-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input for new option */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newOptionTexts[fieldIndex] || ""}
              onChange={(e) =>
                setNewOptionTexts((prev) => ({
                  ...prev,
                  [fieldIndex]: e.target.value,
                }))
              }
              onKeyDown={(e) => handleOptionKeyPress(e, fieldIndex)}
              className="flex-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
              placeholder="Type option and press Enter"
            />
            <button
              type="button"
              onClick={() => handleAddOption(fieldIndex)}
              disabled={!newOptionTexts[fieldIndex]?.trim()}
              className="px-3 py-2 bg-green-600 text-neutral-900 dark:text-white rounded-md text-sm hover:bg-green-700 disabled:bg-neutral-600 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {(!field.options || field.options.length === 0) && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Add options for users to choose from
            </p>
          )}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={`required-${fieldIndex}`}
          checked={field.required || false}
          onChange={(e) => {
            setProp((props: FormProps) => {
              props.fields[fieldIndex].required = e.target.checked;
              return props;
            });
          }}
          className="h-4 w-4 rounded border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-blue-500"
        />
        <label
          htmlFor={`required-${fieldIndex}`}
          className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          Required Field
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {props.formId && <p className="text-xs text-neutral-500">Linked to saved form: <span className="font-medium">{props.formName || props.formId}</span>. Changes sync to every page using this form.</p>}
      {syncError && <p role="alert" className="text-xs text-red-600">{syncError}</p>}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Form Fields
        </h3>
        <button
          onClick={handleAddField}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-neutral-900 dark:text-white rounded-md text-xs hover:bg-blue-700"
        >
          <Plus size={12} />
          Add Field
        </button>
      </div>

      {props.fields.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="form-fields">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                <Accordion
                  type="multiple"
                  value={accordionValue}
                  onValueChange={setAccordionValue}
                  className="space-y-2"
                >
                  {props.fields.map((field, fieldIndex) => (
                    <Draggable
                      key={`field-${fieldIndex}`}
                      draggableId={`field-${fieldIndex}`}
                      index={fieldIndex}
                    >
                      {(
                        provided: DraggableProvided,
                        snapshot: DraggableStateSnapshot,
                      ) => (
                        <AccordionItem
                          value={`field-${fieldIndex}`}
                          className={`border border-neutral-800 rounded-lg bg-neutral-900 ${
                            snapshot.isDragging ? "shadow-lg" : ""
                          }`}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab hover:text-neutral-800 dark:text-neutral-300"
                                >
                                  <GripVertical size={16} />
                                </div>
                                <div className="text-left">
                                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                    {field.label || `Field ${fieldIndex + 1}`}
                                  </div>
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {field.type} •{" "}
                                    {field.required ? "Required" : "Optional"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveUp(fieldIndex);
                                  }}
                                  disabled={fieldIndex === 0}
                                  className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveDown(fieldIndex);
                                  }}
                                  disabled={
                                    fieldIndex === props.fields.length - 1
                                  }
                                  className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <ChevronDown size={14} />
                                </button>
                                {props.fields.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveField(fieldIndex);
                                    }}
                                    className="p-1 text-red-400 hover:text-red-300 ml-2"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            {renderFieldSettings(field, fieldIndex)}
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Draggable>
                  ))}
                </Accordion>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {props.fields.length === 0 && (
        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
          <p className="text-sm">No fields added yet</p>
          <p className="text-xs mt-1">Click "Add Field" to get started</p>
        </div>
      )}
    </div>
  );
};
