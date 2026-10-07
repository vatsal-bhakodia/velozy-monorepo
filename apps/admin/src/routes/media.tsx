"use client";

import { apiFetch } from "@/src/lib/api";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdmin } from "@/src/admin-context";
import { ImageEditor } from "@/components/admin/image-editor";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { toast } from "sonner";
import {
  AudioLines,
  Clipboard,
  File,
  FileArchive,
  FileText,
  Grid2X2,
  Image as ImageIcon,
  List,
  MoreHorizontal,
  Play,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

type MediaItem = {
  id: string;
  name: string;
  fileName: string;
  url: string;
  mimeType: string;
  mediaType: string;
  size: number;
  createdAt: string;
};
type Filter =
  "all" | "image" | "video" | "audio" | "document" | "font" | "archive";
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All files" },
  { id: "image", label: "Images" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "document", label: "Documents" },
  { id: "font", label: "Fonts" },
  { id: "archive", label: "Archives" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
function TypeIcon({
  type,
  className = "h-5 w-5",
}: {
  type: string;
  className?: string;
}) {
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
  return <Icon className={className} />;
}

export default function MediaPage() {
  const { selectedProjectId } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [mediaVersion, setMediaVersion] = useState(0);

  const imageUrl = (url: string) =>
    `${url}${url.includes("?") ? "&" : "?"}v=${mediaVersion}`;

  const fetchMedia = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const response = await apiFetch(
        `/api/admin/media?projectId=${selectedProjectId}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.media || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load media",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);
  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!selectedProjectId || !files.length) return;
    setUploading(true);
    let completed = 0;
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("projectId", selectedProjectId);
      body.append("file", file);
      try {
        const response = await apiFetch("/api/admin/media", {
          method: "POST",
          body,
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        completed++;
      } catch (error) {
        toast.error(
          `${file.name}: ${error instanceof Error ? error.message : "Upload failed"}`,
        );
      }
    }
    if (completed) {
      toast.success(
        `${completed} file${completed > 1 ? "s" : ""} added to your library`,
      );
      fetchMedia();
    }
    setUploading(false);
  };
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (filter === "all" || item.mediaType === filter) &&
          item.fileName.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, filter, query],
  );
  const deleteItem = async (item: MediaItem) => {
    if (!confirm(`Delete ${item.fileName}?`)) return;
    const response = await apiFetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    if (response.ok) {
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSelected(null);
      toast.success("File deleted");
    } else toast.error("Could not delete file");
  };
  const copyUrl = async (item: MediaItem) => {
    await navigator.clipboard.writeText(`${window.location.origin}${item.url}`);
    toast.success("URL copied to clipboard");
  };

  return (
    <PageFrame
      title="Media library"
      headerAction={
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-cyan-400 dark:hover:text-neutral-950 dark:focus-visible:ring-cyan-400/40"
          >
            <Upload className="h-4 w-4" /> Upload files
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.woff,.woff2,.ttf,.otf"
            onChange={(event) => {
              if (event.target.files) uploadFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </>
      }
    >
      <div className="space-y-5 text-neutral-900 dark:text-neutral-100">
        <section
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
          className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5 transition data-[dragging=true]:border-blue-600 data-[dragging=true]:bg-blue-50/70 dark:border-[#38383d] dark:bg-[#151517] dark:data-[dragging=true]:border-[#60a5fa] dark:data-[dragging=true]:bg-[#60a5fa]/5"
          data-dragging={dragging}
        >
          <div className="flex flex-col items-center justify-center gap-2 py-5 text-center sm:flex-row sm:gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-[#60a5fa]/10 dark:text-[#60a5fa]">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {uploading
                  ? "Uploading your files…"
                  : "Drop files here to upload"}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Images, video, audio, docs, fonts & archives · up to 100 MB each
              </p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/30 dark:border-[#38383d] dark:bg-[#202022] dark:text-neutral-100 dark:hover:bg-[#2b2b2e] dark:focus-visible:ring-cyan-400/30"
            >
              Browse files
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-md border border-neutral-200 bg-white p-1 dark:border-[#303034] dark:bg-[#151517]">
            {filters.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setFilter(entry.id)}
                className={`whitespace-nowrap rounded px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:focus-visible:ring-cyan-400/40 ${filter === entry.id ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#202022] dark:hover:text-neutral-100"}`}
              >
                {entry.label}
                {entry.id === "all" && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {items.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-full items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 sm:w-64 dark:border-[#38383d] dark:bg-[#151517] dark:focus-within:border-[#60a5fa] dark:focus-within:ring-[#60a5fa]/20">
              <Search className="h-4 w-4 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 dark:text-neutral-100"
              />
            </div>
            <div className="flex rounded-md border border-neutral-200 bg-white p-1 dark:border-[#303034] dark:bg-[#151517]">
              <button
                onClick={() => setView("grid")}
                className={`rounded p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:focus-visible:ring-cyan-400/40 ${view === "grid" ? "bg-neutral-100 text-neutral-900 dark:bg-[#2b2b2e] dark:text-white" : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"}`}
                aria-label="Grid view"
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:focus-visible:ring-cyan-400/40 ${view === "list" ? "bg-neutral-100 text-neutral-900 dark:bg-[#2b2b2e] dark:text-white" : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"}`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[1.1] animate-pulse rounded-lg bg-neutral-200 dark:bg-[#202022]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 py-24 text-center dark:border-[#38383d]">
            <ImageIcon className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
            <p className="mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {items.length
                ? "No files match your search"
                : "Your library is ready for its first upload"}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Upload an asset to start building your collection.
            </p>
          </div>
        ) : (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-[#303034] dark:bg-[#151517]"
            }
          >
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className={
                  view === "grid"
                    ? "group overflow-hidden rounded-lg border border-neutral-200 bg-white text-left transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:border-[#303034] dark:bg-[#151517] dark:hover:border-[#55555b] dark:focus-visible:ring-cyan-400/40"
                    : "flex w-full items-center gap-4 border-b border-neutral-200 p-4 text-left last:border-0 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600/40 dark:border-[#303034] dark:hover:bg-[#202022] dark:focus-visible:ring-cyan-400/40"
                }
              >
                <div
                  className={
                    view === "grid"
                      ? "relative aspect-[1.15] overflow-hidden bg-neutral-100 dark:bg-[#202022]"
                      : "flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-[#60a5fa]/10 dark:text-[#60a5fa]"
                  }
                >
                  {item.mediaType === "image" ? (
                    <img
                      src={imageUrl(item.url)}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <TypeIcon
                        type={item.mediaType}
                        className={
                          view === "grid"
                            ? "h-9 w-9 text-blue-700 dark:text-[#60a5fa]"
                            : "h-5 w-5"
                        }
                      />
                    </div>
                  )}
                  {view === "grid" && item.mediaType === "video" && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/60 p-1.5 text-white">
                      <Play className="h-3 w-3 fill-current" />
                    </span>
                  )}
                </div>
                <div className={view === "grid" ? "p-3" : "min-w-0 flex-1"}>
                  <p className="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {item.fileName}
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {formatBytes(item.size)} <span className="mx-1">·</span>{" "}
                    {formatDate(item.createdAt)}
                  </p>
                </div>
                {view === "list" && (
                  <MoreHorizontal className="h-4 w-4 text-neutral-400" />
                )}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div
            className="fixed inset-0 z-[60] flex justify-end bg-neutral-950/50"
            onClick={() => setSelected(null)}
          >
            <aside
              onClick={(event) => event.stopPropagation()}
              className="h-full w-full max-w-md overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-2xl dark:border-[#303034] dark:bg-[#111111]"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Asset details
                  </p>
                  <h2 className="mt-1 max-w-[280px] truncate text-lg font-semibold">
                    {selected.fileName}
                  </h2>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:hover:bg-[#202022] dark:focus-visible:ring-cyan-400/40"
                  aria-label="Close asset details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-6 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-[#202022]">
                {selected.mediaType === "image" ? (
                  <img
                    src={imageUrl(selected.url)}
                    alt={selected.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <TypeIcon
                    type={selected.mediaType}
                    className="h-14 w-14 text-blue-700 dark:text-[#60a5fa]"
                  />
                )}
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-neutral-200 pb-3 dark:border-[#303034]">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Type
                  </span>
                  <span className="font-medium capitalize">
                    {selected.mediaType}
                  </span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-3 dark:border-[#303034]">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    File size
                  </span>
                  <span className="font-medium">
                    {formatBytes(selected.size)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-3 dark:border-[#303034]">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Uploaded
                  </span>
                  <span className="font-medium">
                    {formatDate(selected.createdAt)}
                  </span>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {selected.mediaType === "image" && (
                  <button
                    onClick={() => {
                      setEditing({ ...selected, url: imageUrl(selected.url) });
                      setSelected(null);
                    }}
                    className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-cyan-400 dark:hover:text-neutral-950 dark:focus-visible:ring-cyan-400/40"
                  >
                    <ImageIcon className="h-4 w-4" /> Edit image
                  </button>
                )}
                <button
                  onClick={() => copyUrl(selected)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 px-4 text-sm font-medium transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/30 dark:border-[#38383d] dark:hover:bg-[#202022] dark:focus-visible:ring-cyan-400/30"
                >
                  <Clipboard className="h-4 w-4" /> Copy URL
                </button>
                <button
                  onClick={() => deleteItem(selected)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 dark:border-red-900/50 dark:hover:bg-red-950/20 dark:focus-visible:ring-red-500/30"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </aside>
          </div>
        )}
        {editing && (
          <ImageEditor
            item={editing}
            onClose={() => setEditing(null)}
            onSaved={(updated) => {
              setItems((current) =>
                current.map((entry) =>
                  entry.id === editing.id ? { ...entry, ...updated } : entry,
                ),
              );
              setMediaVersion(Date.now());
              setEditing(null);
              toast.success("Image updated");
            }}
          />
        )}
      </div>
    </PageFrame>
  );
}
