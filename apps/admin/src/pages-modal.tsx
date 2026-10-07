"use client";

import { RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageFormData } from "@/src/lib/db/schema";
import { generateSlug } from "@/src/lib/utils";

interface ModalProps {
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  formData: PageFormData;
  setFormData: React.Dispatch<React.SetStateAction<PageFormData>>;
  closeModal: () => void;
  handleSubmit: (overrideFormData?: PageFormData) => void;
  isEditing: boolean;
}

const Modal = ({
  isModalOpen,
  setIsModalOpen,
  formData,
  setFormData,
  closeModal,
  handleSubmit,
  isEditing,
}: ModalProps) => {
  const generateSlugFromTitle = () => {
    setFormData({ ...formData, slug: generateSlug(formData.title) });
  };
  return (
    <>
      {/* Single Modal for Create/Edit */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Page Settings" : "Create New Page"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Page title"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="page-url"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateSlugFromTitle}
                    className="px-3"
                    title="Auto generate slug from title"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as "published" | "draft" | "private",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                value={formData.metaTitle ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, metaTitle: e.target.value })
                }
                placeholder="SEO title"
              />
            </div>

            <div>
              <Label htmlFor="metaKeyword">Meta Keywords</Label>
              <Input
                id="metaKeyword"
                value={formData.metaKeyword ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, metaKeyword: e.target.value })
                }
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>

            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                value={formData.metaDescription ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, metaDescription: e.target.value })
                }
                placeholder="Brief description for search engines"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              {formData.status !== "published" ? (
                <Button
                  variant="default"
                  onClick={() =>
                    handleSubmit({ ...formData, status: "published" })
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              ) : null}
              <Button onClick={() => handleSubmit()}>
                {isEditing ? "Update Page" : "Create Page"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Modal;
