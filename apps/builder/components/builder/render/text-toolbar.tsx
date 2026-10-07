import { useNode, useEditor } from "@craftjs/core";
import React, { useRef, useCallback, useState } from "react";
import { Bold, Italic, Underline, Link } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LinkData {
  href: string;
  target: string;
  rel: string;
}

export const TextToolbar: React.FC = () => {
  const { id } = useNode();
  const { actions } = useEditor();
  const { isHover, isActive, dom } = useNode((node) => ({
    isHover: node.events.hovered,
    isActive: node.events.selected,
    dom: node.dom as HTMLElement | null,
  }));

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkData, setLinkData] = useState<LinkData>({
    href: "",
    target: "_blank",
    rel: "noopener noreferrer",
  });
  const currentRef = useRef<HTMLDivElement | null>(null);

  // Get the target document (iframe content or main document)
  const getTargetDocument = useCallback(() => {
    const iframe = document.getElementById("canvas") as HTMLIFrameElement;
    return iframe?.contentDocument || document;
  }, []);

  const applyFormatting = useCallback(
    (format: string) => {
      if (!dom) return;

      const targetDoc = getTargetDocument();
      const selection = targetDoc.getSelection();

      if (!selection || selection.rangeCount === 0) {
        // If no selection, focus the text element and try again
        dom.focus();
        setTimeout(() => {
          const newSelection = targetDoc.getSelection();
          if (newSelection && newSelection.rangeCount > 0) {
            performFormatting(newSelection, format, targetDoc);
          }
        }, 10);
        return;
      }

      if (format === "createLink") {
        setIsLinkModalOpen(true);
        return;
      }

      performFormatting(selection, format, targetDoc);
    },
    [dom, getTargetDocument],
  );

  const performFormatting = useCallback(
    (selection: Selection, format: string, targetDoc: Document) => {
      if (!dom) return;

      try {
        const range = selection.getRangeAt(0);

        // For link creation
        if (format === "createLink") {
          const anchor = targetDoc.createElement("a");
          anchor.href = linkData.href;
          anchor.target = linkData.target;
          anchor.rel = linkData.rel;

          if (!selection.isCollapsed) {
            try {
              range.surroundContents(anchor);
            } catch (err) {
              anchor.textContent = range.toString();
              range.deleteContents();
              range.insertNode(anchor);
            }
          } else {
            anchor.textContent = linkData.href;
            range.insertNode(anchor);
            const nextSibling = anchor.nextSibling;
            if (nextSibling) {
              selection.collapse(nextSibling, 0);
            } else {
              const newRange = targetDoc.createRange();
              newRange.setStartAfter(anchor);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
        }
        // For other formatting (bold, italic, underline)
        else {
          const tagName =
            format === "bold" ? "STRONG" : format === "italic" ? "EM" : "U";

          let currentElement = range.commonAncestorContainer;
          if (
            currentElement.nodeType === Node.TEXT_NODE &&
            currentElement.parentNode
          ) {
            currentElement = currentElement.parentNode;
          }

          let formattingElement: HTMLElement | null = null;
          let node = currentElement;

          while (node && node !== dom && node.parentNode) {
            if ((node as HTMLElement).tagName === tagName) {
              formattingElement = node as HTMLElement;
              break;
            }
            node = node.parentNode;
          }

          if (formattingElement) {
            const parent = formattingElement.parentNode!;
            while (formattingElement.firstChild) {
              parent.insertBefore(
                formattingElement.firstChild,
                formattingElement,
              );
            }
            parent.removeChild(formattingElement);
          } else {
            const wrapper = targetDoc.createElement(
              format === "bold" ? "strong" : format === "italic" ? "em" : "u",
            );

            try {
              range.surroundContents(wrapper);
            } catch (err) {
              const contents = range.extractContents();
              wrapper.appendChild(contents);
              range.insertNode(wrapper);
            }

            const newRange = targetDoc.createRange();
            newRange.selectNodeContents(wrapper);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }

        // Trigger input event
        const event = new Event("input", { bubbles: true });
        dom.dispatchEvent(event);

        // Update craft.js state
        if (dom.innerHTML !== undefined) {
          actions.setProp(id, (props: any) => {
            props.text = dom.innerHTML;
          });
        }
      } catch (error) {
        console.warn("Text formatting error:", error);
      }
    },
    [dom, actions, id, linkData],
  );

  const isFormatActive = useCallback(
    (format: string) => {
      if (!dom) return false;

      const targetDoc = getTargetDocument();
      const selection = targetDoc.getSelection();

      if (!selection || selection.rangeCount === 0) return false;

      try {
        const range = selection.getRangeAt(0);
        let node = range.commonAncestorContainer;

        if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
          node = node.parentNode;
        }

        const tagName =
          format === "bold" ? "STRONG" : format === "italic" ? "EM" : "U";

        // Check if we're inside a formatting element
        while (node && node !== dom && node.parentNode) {
          if (
            (node as HTMLElement).tagName === tagName ||
            (format === "bold" && (node as HTMLElement).tagName === "B") ||
            (format === "italic" && (node as HTMLElement).tagName === "I")
          ) {
            return true;
          }
          node = node.parentNode;
        }

        return false;
      } catch {
        return false;
      }
    },
    [dom, getTargetDocument],
  );

  const handleCreateLink = () => {
    if (!linkData.href.trim()) return;

    const targetDoc = getTargetDocument();
    const selection = targetDoc.getSelection();

    if (selection && selection.rangeCount > 0) {
      performFormatting(selection, "createLink", targetDoc);
    }

    setIsLinkModalOpen(false);
    setLinkData({ href: "", target: "_blank", rel: "noopener noreferrer" });
  };

  if (!(isHover || isActive)) return null;

  return (
    <>
      <div ref={currentRef} className="flex items-center pl-2 gap-1">
        {/* Vertical Divider */}
        <div className="w-px h-5 bg-white/30 mx-1" />

        <button
          className={`p-1.5 rounded-md transition-all duration-200 ${
            isFormatActive("bold")
              ? "bg-white/30 text-white shadow-inner"
              : "hover:bg-white/20 active:bg-white/30 text-blue-100"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            applyFormatting("bold");
          }}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3 h-3" />
        </button>

        <button
          className={`p-1.5 rounded-md transition-all duration-200 ${
            isFormatActive("italic")
              ? "bg-white/30 text-white shadow-inner"
              : "hover:bg-white/20 active:bg-white/30 text-blue-100"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            applyFormatting("italic");
          }}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3 h-3" />
        </button>

        <button
          className={`p-1.5 rounded-md transition-all duration-200 ${
            isFormatActive("underline")
              ? "bg-white/30 text-white shadow-inner"
              : "hover:bg-white/20 active:bg-white/30 text-blue-100"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            applyFormatting("underline");
          }}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-3 h-3" />
        </button>

        <button
          className="p-1.5 rounded-md hover:bg-white/20 active:bg-white/30 text-blue-100 transition-all duration-200"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            applyFormatting("createLink");
          }}
          title="Add Link"
        >
          <Link className="w-3 h-3" />
        </button>
      </div>
      <AlertDialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Add Link</AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="href">URL</Label>
              <Input
                id="href"
                placeholder="https://example.com"
                value={linkData.href}
                onChange={(e) =>
                  setLinkData((prev) => ({ ...prev, href: e.target.value }))
                }
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <Select
                value={linkData.target}
                onValueChange={(value) =>
                  setLinkData((prev) => ({ ...prev, target: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_blank">New Tab (_blank)</SelectItem>
                  <SelectItem value="_self">Same Tab (_self)</SelectItem>
                  <SelectItem value="_parent">
                    Parent Frame (_parent)
                  </SelectItem>
                  <SelectItem value="_top">Top Frame (_top)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rel">Rel Attribute</Label>
              <Input
                id="rel"
                placeholder="noopener noreferrer"
                value={linkData.rel}
                onChange={(e) =>
                  setLinkData((prev) => ({ ...prev, rel: e.target.value }))
                }
              />
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLinkModalOpen(false);
                setLinkData({
                  href: "",
                  target: "_blank",
                  rel: "noopener noreferrer",
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateLink} disabled={!linkData.href.trim()}>
              Add Link
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
