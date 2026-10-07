import React from "react";
import { useNode } from "@craftjs/core";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { AccordionProps } from "./types";
import { generateAccordionId } from "./utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableProvided,
} from "@hello-pangea/dnd";

export const AccordionSettings = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as AccordionProps,
  }));

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    setProp((props: AccordionProps) => {
      const items = [...(props.items ?? [])];
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination!.index, 0, reorderedItem);
      props.items = items;
    });
  };

  return (
    <div className="space-y-4">
      {/* Collapsible Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="collapsible"
          checked={props.collapsible}
          onChange={(e) =>
            setProp(
              (props: AccordionProps) => (props.collapsible = e.target.checked),
            )
          }
          className="rounded border-border bg-background text-primary"
        />
        <label
          htmlFor="collapsible"
          className="text-sm text-neutral-800 dark:text-neutral-200"
        >
          Allow collapsible (close all items)
        </label>
      </div>

      {/* Items Management */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Accordion Items
          </label>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {(props.items ?? []).length} items
          </span>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="accordion-items">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2 max-h-64 overflow-y-auto"
              >
                {(props.items ?? []).map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(
                      provided: DraggableProvided,
                      snapshot: DraggableStateSnapshot,
                    ) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`border border-border rounded-md p-3 space-y-2 bg-background transition-colors ${
                          snapshot.isDragging ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <button
                              {...provided.dragHandleProps}
                              className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              Item {index + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setProp((props: AccordionProps) => {
                                props.items = (props.items ?? []).filter(
                                  (_, i) => i !== index,
                                );
                              });
                            }}
                            className="p-1 text-red-500 hover:text-red-600"
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              setProp((props: AccordionProps) => {
                                (props.items ?? [])[index].title =
                                  e.target.value;
                              });
                            }}
                            placeholder="Item title"
                            className="w-full"
                          />
                          <textarea
                            value={item.content}
                            onChange={(e) => {
                              setProp((props: AccordionProps) => {
                                (props.items ?? [])[index].content =
                                  e.target.value;
                              });
                            }}
                            placeholder="Item content"
                            className="w-full min-h-[60px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <Button
          onClick={() => {
            setProp((props: AccordionProps) => {
              const items = props.items ?? [];
              props.items = [
                ...items,
                {
                  id: generateAccordionId(),
                  title: `Item ${items.length + 1}`,
                  content: `Content for item ${items.length + 1}`,
                },
              ];
            });
          }}
          className="w-full"
          variant="outline"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>
    </div>
  );
};
