"use client";

import { apiFetch } from "@/src/lib/api";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Check,
  File,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Search,
  Upload,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type MediaItem = {
  id: string;
  name: string;
  fileName: string;
  url: string;
  mimeType: string;
  mediaType: string;
  size: number;
};

type MediaPickerProps = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
  allowedTypes?: string[];
  title?: string;
};

const typeOptions = [
  { id: "all", label: "All media" },
  { id: "image", label: "Images" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "document", label: "Documents" },
  { id: "font", label: "Fonts" },
  { id: "archive", label: "Archives" },
];

function TypeIcon({ type }: { type: string }) {
  const Icon =
    type === "image"
      ? ImageIcon
      : type === "video"
        ? Video
        : type === "audio"
          ? AudioLines
          : type === "archive"
            ? FileArchive
            : type === "document"
              ? FileText
              : File;
  return <Icon className="h-6 w-6" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaPicker({
  projectId,
  open,
  onClose,
  onSelect,
  allowedTypes = ["image"],
  title = "Choose media",
}: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeType, setActiveType] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    apiFetch(`/api/admin/media?projectId=${projectId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setItems(data.media || []);
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Could not load media",
        ),
      )
      .finally(() => setLoading(false));
  }, [open, projectId]);

  useEffect(() => {
    if (allowedTypes.length === 1) setActiveType(allowedTypes[0]);
  }, [allowedTypes]);

  const visibleOptions = typeOptions.filter(
    (option) => option.id === "all" || allowedTypes.includes(option.id),
  );
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          allowedTypes.includes(item.mediaType) &&
          (activeType === "all" || item.mediaType === activeType) &&
          item.fileName.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, allowedTypes, activeType, query],
  );

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    setUploading(true);
    for (const file of fileArray) {
      if (
        !file.type.startsWith("image/") &&
        allowedTypes.length === 1 &&
        allowedTypes[0] === "image"
      ) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      const body = new FormData();
      body.append("projectId", projectId);
      body.append("file", file);
      try {
        const response = await apiFetch("/api/admin/media", {
          method: "POST",
          body,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setItems((current) => [data.media, ...current]);
      } catch (error) {
        toast.error(
          `${file.name}: ${error instanceof Error ? error.message : "Upload failed"}`,
        );
      }
    }
    setUploading(false);
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="mt-1 text-lg font-semibold text-neutral-950 dark:text-white">
              {title}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close media picker"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {visibleOptions.map((option) => (
              <Button
                type="button"
                key={option.id}
                variant={activeType === option.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveType(option.id)}
                className="h-9 whitespace-nowrap px-3 text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-blue-400">
              <Search className="h-4 w-4 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search media"
                aria-label="Search media"
                className="w-full bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 sm:w-44"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="h-9 gap-1.5 px-3 text-xs"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept={allowedTypes.includes("image") ? "image/*" : undefined}
              onChange={(event) => {
                if (event.target.files) uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
        </div>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            uploadFiles(event.dataTransfer.files);
          }}
          className={`min-h-0 flex-1 overflow-y-auto border-t p-5 dark:border-neutral-800 ${dragging ? "bg-neutral-50 ring-2 ring-inset ring-blue-500/30 dark:bg-neutral-950" : ""}`}
        >
          {uploading && (
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              Uploading media…
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900"
                />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-lg border border-neutral-200 bg-white text-left transition-colors hover:border-blue-500 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-400 dark:hover:bg-blue-950/30"
                >
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-neutral-100 text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                    {item.mediaType === "image" ? (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <TypeIcon type={item.mediaType} />
                    )}
                    <span className="absolute right-2 top-2 hidden rounded-full bg-blue-600 p-1 text-white group-hover:block group-focus-visible:block">
                      <Check className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                      {item.fileName}
                    </p>
                    <p className="mt-1 text-[10px] text-neutral-400">
                      {formatBytes(item.size)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <ImageIcon className="h-9 w-9 text-neutral-300" />
              <p className="mt-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                No matching media
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Upload an asset or choose another media type.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                className="mt-4 text-xs"
              >
                Upload a file
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 text-xs text-neutral-400 dark:border-neutral-800">
          <span>Drop files anywhere in this window to upload</span>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
