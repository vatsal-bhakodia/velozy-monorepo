"use client";

import { apiFetch } from "@/src/lib/api";

import "react-image-crop/dist/ReactCrop.css";
import { useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
  type ReactCropProps,
} from "react-image-crop";
import {
  Crop as CropIcon,
  Lock,
  Maximize2,
  RotateCcw,
  Unlock,
  X,
} from "lucide-react";

type Aspect = "free" | "1:1" | "4:3" | "16:9";

const CompatibleReactCrop = ReactCrop as unknown as React.ComponentType<ReactCropProps>;

function aspectValue(aspect: Aspect) {
  if (aspect === "1:1") return 1;
  if (aspect === "4:3") return 4 / 3;
  if (aspect === "16:9") return 16 / 9;
  return undefined;
}

function getCenteredAspectCrop(
  width: number,
  height: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
    width,
    height,
  );
}

export function ImageEditor({
  item,
  onClose,
  onSaved,
}: {
  item: { id: string; name: string; url: string; mimeType: string };
  onClose: () => void;
  onSaved: (item: { size: number; mimeType: string }) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<Aspect>("free");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [locked, setLocked] = useState(true);
  const [saving, setSaving] = useState(false);

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    setWidth(image.naturalWidth);
    setHeight(image.naturalHeight);
    setCompletedCrop({
      x: 0,
      y: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
      unit: "px",
    });
  };

  const changeAspect = (nextAspect: Aspect) => {
    setAspect(nextAspect);
    const ratio = aspectValue(nextAspect);
    if (!ratio || !imageSize.width) return;
    const nextCrop = getCenteredAspectCrop(
      imageSize.width,
      imageSize.height,
      ratio,
    );
    setCrop(nextCrop);
    const nextWidth = Math.round((nextCrop.width / 100) * imageSize.width);
    const nextHeight = Math.round((nextCrop.height / 100) * imageSize.height);
    setWidth(nextWidth);
    setHeight(nextHeight);
    setCompletedCrop({
      x: Math.round((nextCrop.x / 100) * imageSize.width),
      y: Math.round((nextCrop.y / 100) * imageSize.height),
      width: nextWidth,
      height: nextHeight,
      unit: "px",
    });
  };

  const reset = () => {
    setAspect("free");
    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
    if (imageSize.width) {
      setWidth(imageSize.width);
      setHeight(imageSize.height);
      setCompletedCrop({
        x: 0,
        y: 0,
        width: imageSize.width,
        height: imageSize.height,
        unit: "px",
      });
    }
  };

  const updateWidth = (value: number) => {
    const next = Math.max(1, Math.min(Math.round(value || 1), 10000));
    setWidth(next);
    if (locked && completedCrop)
      setHeight(
        Math.max(
          1,
          Math.round((next * completedCrop.height) / completedCrop.width),
        ),
      );
  };

  const updateHeight = (value: number) => {
    const next = Math.max(1, Math.min(Math.round(value || 1), 10000));
    setHeight(next);
    if (locked && completedCrop)
      setWidth(
        Math.max(
          1,
          Math.round((next * completedCrop.width) / completedCrop.height),
        ),
      );
  };

  const save = async () => {
    if (!completedCrop || completedCrop.width < 2 || completedCrop.height < 2)
      return;
    setSaving(true);
    try {
      const source = new Image();
      source.src = item.url;
      await new Promise((resolve, reject) => {
        source.onload = resolve;
        source.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Your browser could not prepare this image");
      context.drawImage(
        source,
        completedCrop.x,
        completedCrop.y,
        completedCrop.width,
        completedCrop.height,
        0,
        0,
        width,
        height,
      );
      const outputType =
        item.mimeType === "image/png" ? "image/png" : "image/jpeg";
      const response = await apiFetch("/api/admin/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          dataUrl: canvas.toDataURL(outputType, 0.92),
          width,
          height,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save image");
      onSaved(data.media);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Could not save image",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/70 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 sm:max-h-[calc(100vh-3rem)] lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300">
                <CropIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Edit image</p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {item.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
              aria-label="Close editor"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="flex min-h-[280px] flex-1 items-center justify-center overflow-auto bg-neutral-100 p-4 dark:bg-neutral-950 sm:p-8">
            <div className="max-h-full max-w-full leading-[0] [&_.ReactCrop__crop-selection]:border-cyan-500 [&_.ReactCrop__drag-handle]:h-3 [&_.ReactCrop__drag-handle]:w-3 [&_.ReactCrop__drag-handle]:border-cyan-500">
              <CompatibleReactCrop
                crop={crop}
                onChange={(_pixelCrop: PixelCrop, percentCrop: Crop) =>
                  setCrop(percentCrop)
                }
                onComplete={(pixelCrop: PixelCrop) => {
                  const image = imageRef.current;
                  if (!image || !image.naturalWidth || !image.width) return;
                  const scaleX = image.naturalWidth / image.width;
                  const scaleY = image.naturalHeight / image.height;
                  const sourceCrop = {
                    x: Math.round(pixelCrop.x * scaleX),
                    y: Math.round(pixelCrop.y * scaleY),
                    width: Math.round(pixelCrop.width * scaleX),
                    height: Math.round(pixelCrop.height * scaleY),
                    unit: "px" as const,
                  };
                  setCompletedCrop(sourceCrop);
                  if (sourceCrop.width > 1) {
                    setWidth(sourceCrop.width);
                    setHeight(sourceCrop.height);
                  }
                }}
                aspect={aspectValue(aspect)}
                keepSelection
                minWidth={2}
                minHeight={2}
                ruleOfThirds
              >
                <img
                  ref={imageRef}
                  src={item.url}
                  alt={item.name}
                  onLoad={onImageLoad}
                  className="block max-h-[54vh] max-w-full object-contain"
                />
              </CompatibleReactCrop>
            </div>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-5 py-3 dark:border-neutral-700 sm:px-6">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Drag the selection to move it. Use the corners to crop.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </footer>
        </div>
        <aside className="w-full shrink-0 overflow-y-auto border-t border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6 lg:w-[290px] lg:border-l lg:border-t-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
            Crop & resize
          </p>
          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Aspect ratio
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(["free", "1:1", "4:3", "16:9"] as Aspect[]).map((entry) => (
                <button
                  key={entry}
                  onClick={() => changeAspect(entry)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${aspect === entry ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300" : "border-neutral-200 bg-white text-neutral-500 hover:border-cyan-300 hover:text-cyan-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-cyan-500 dark:hover:text-cyan-300"}`}
                >
                  {entry === "free" ? "Free" : entry}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Output size
              </p>
              <button
                onClick={() => setLocked((current) => !current)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-700 dark:text-cyan-300"
              >
                {locked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
                {locked ? "Locked" : "Unlocked"}
              </button>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <label className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                <span className="block text-[10px] text-neutral-400">
                  Width
                </span>
                <input
                  type="number"
                  min="1"
                  value={width || ""}
                  onChange={(event) => updateWidth(Number(event.target.value))}
                  className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                />
              </label>
              <span className="text-neutral-300 dark:text-neutral-600">×</span>
              <label className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                <span className="block text-[10px] text-neutral-400">
                  Height
                </span>
                <input
                  type="number"
                  min="1"
                  value={height || ""}
                  onChange={(event) => updateHeight(Number(event.target.value))}
                  className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                />
              </label>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              <Maximize2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />{" "}
              Original dimensions
            </div>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {imageSize.width
                ? `${imageSize.width} × ${imageSize.height} px`
                : "Loading image…"}
            </p>
            <p className="mt-3 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">
              Crop first, then resize the result to the output dimensions.
            </p>
          </div>
          <div className="mt-7 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !completedCrop}
              className="flex-1 rounded-xl bg-gradient px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : <>Save image</>}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
