import { useState } from "react";

interface PublishResult {
  success: boolean;
  subdomain?: string;
  url?: string;
  platformUrl?: string;
  version?: number;
  error?: string;
}

interface UsePublishReturn {
  isPublishing: boolean;
  publishedUrl: string | null;
  platformUrl: string | null;
  publishError: string | null;
  publish: () => Promise<PublishResult>;
  clearPublishState: () => void;
}

export function usePublish(): UsePublishReturn {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [platformUrl, setPlatformUrl] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const publish = async (): Promise<PublishResult> => {
    setIsPublishing(true);
    setPublishError(null);
    setPublishedUrl(null);
    setPlatformUrl(null);

    try {
      const projectId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("projectId")
          : null;
      const pageId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("id")
          : null;
      if (!projectId || !pageId)
        throw new Error("Missing project or page context");

      // Send to publish API
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          pageId,
        }),
      });

      const result: PublishResult = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to publish project");
      }

      setPublishedUrl(result.url || null);
      setPlatformUrl(result.platformUrl || result.url || null);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setPublishError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsPublishing(false);
    }
  };

  const clearPublishState = () => {
    setPublishError(null);
    setPublishedUrl(null);
    setPlatformUrl(null);
  };

  return {
    isPublishing,
    publishedUrl,
    platformUrl,
    publishError,
    publish,
    clearPublishState,
  };
}
