"use client";

import { lazy, Suspense } from "react";

const ClientTextEditor = lazy(() => import("./textEditor.client"));

export const TextEditor: React.FC<{
  htmlContent: string;
  setHtmlContent: (content: string) => void;
}> = (props) => <Suspense fallback={<div className="min-h-40 rounded-md border border-neutral-200 p-3 text-sm text-neutral-500 dark:border-neutral-800">Loading editor...</div>}><ClientTextEditor {...props} /></Suspense>;
