"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { usePublish } from "@/hooks/usePublish";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({ open, onOpenChange }: PublishDialogProps) {
  const [copied, setCopied] = useState(false);

  const {
    isPublishing,
    publishedUrl,
    platformUrl,
    publishError,
    publish,
    clearPublishState,
  } = usePublish();

  const handlePublish = async () => {
    await publish();
  };

  const handleCopyUrl = async () => {
    if (publishedUrl) {
      try {
        await navigator.clipboard.writeText(publishedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy URL:", error);
      }
    }
  };

  const handleOpenUrl = () => {
    if (publishedUrl) {
      window.open(publishedUrl, "_blank");
    }
  };

  const handleConfigureDomain = () => {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || window.location.origin;
    window.open(new URL("/settings/domains", adminUrl).toString(), "_blank", "noopener,noreferrer");
  };

  const handleClose = () => {
    clearPublishState();
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Your Website</DialogTitle>
          <DialogDescription>
            Publish your website to its platform subdomain. Your site will be
            available immediately after publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {publishError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{publishError}</AlertDescription>
            </Alert>
          )}

          {publishedUrl && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your website has been published successfully!
              </AlertDescription>
            </Alert>
          )}

          {publishedUrl && (
            <div className="space-y-2">
              <Label>Your Website URL</Label>
              <div className="flex items-center space-x-2">
                <Input value={publishedUrl} readOnly className="flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  title="Copy URL"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenUrl}
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            {platformUrl && platformUrl !== publishedUrl && (
              <p className="text-xs text-muted-foreground">
                Platform fallback: <a href={platformUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">{platformUrl}</a>
              </p>
            )}
            <Button variant="link" className="h-auto px-0" onClick={handleConfigureDomain}>
                Connect a custom domain
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPublishing}
          >
            {publishedUrl ? "Close" : "Cancel"}
          </Button>

          {!publishedUrl && (
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
