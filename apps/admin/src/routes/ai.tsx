"use client";

import { apiFetch } from "@/src/lib/api";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  History,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import NextImage from "@/components/image";
import { Marquee } from "@/components/magicui/marquee";
import { useAdmin } from "@/src/admin-context";

type Attachment = { name: string; kind: "image" | "file"; previewUrl?: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};
type Chat = { id: string; title: string; messages: Message[] };

function ImageFilePreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative h-24 w-24 overflow-visible rounded-xl border border-neutral-500/70 bg-neutral-800 dark:border-neutral-500">
      {previewUrl && (
        <NextImage
          src={previewUrl}
          alt={`Preview of ${file.name}`}
          fill
          unoptimized
          className="rounded-xl object-cover"
        />
      )}
      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 z-10 grid h-4 w-4 place-items-center rounded-full bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <X className="h-3 w-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}

const suggestions = [
  "Create a product for our new summer collection",
  "Show me the most important analytics insights",
  "Create a landing page for a limited-time offer",
  "Improve our homepage SEO and conversion copy",
];

export default function AdminAiPage() {
  const { selectedProjectId } = useAdmin();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    void apiFetch("/api/admin/ai/chats")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.chats) setChats(data.chats);
      });
    return () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const startNewChat = () => {
    setMessages([]);
    setPrompt("");
    setFiles([]);
    setError("");
    setChatId(null);
  };

  const saveChat = async (nextMessages: Message[]) => {
    const response = await apiFetch("/api/admin/ai/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        messages: nextMessages
          .slice(-2)
          .map(({ role, content, attachments }) => ({
            role,
            content,
            attachments: attachments?.map(({ name, kind }) => ({ name, kind })),
          })),
      }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setChatId(data.chatId);
    setChats((current) => [
      { id: data.chatId, title: data.title, messages: nextMessages },
      ...current.filter((chat) => chat.id !== data.chatId),
    ]);
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const value = prompt.trim();
    if (!value || loading) return;
    const outgoingFiles = [...files];
    const attachments = outgoingFiles.map((file) => {
      if (!file.type.startsWith("image/"))
        return { name: file.name, kind: "file" as const };
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { name: file.name, kind: "image" as const, previewUrl };
    });
    const userMessage: Message = { role: "user", content: value, attachments };
    setPrompt("");
    setError("");
    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("prompt", value);
      form.append("projectId", selectedProjectId || "");
      form.append("mode", "generate");
      form.append("history", JSON.stringify(messages.slice(-8)));
      form.append(
        "context",
        JSON.stringify({ surface: "admin", purpose: "site owner assistant" }),
      );
      outgoingFiles.forEach((file) => form.append("files", file));
      const response = await apiFetch("/api/generate/builder-assistant", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI request failed");
      const operations = Array.isArray(data.operations) ? data.operations : [];
      const operationText = operations.length
        ? `\n\nPlanned actions: ${operations.map((operation: { type?: string }) => operation.type?.replaceAll("_", " ")).join(", ")}.`
        : "";
      const assistantMessage: Message = {
        role: "assistant",
        content: `${data.message || "I’m ready to help with your site."}${operationText}`,
      };
      const nextMessages = [...messages, userMessage, assistantMessage];
      setMessages((current) => [...current, assistantMessage]);
      await saveChat(nextMessages);
      setFiles([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="relative isolate flex min-h-[calc(100vh-5rem)] w-full max-w-none flex-col overflow-x-hidden pb-0">
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-[-14%] bg-[radial-gradient(ellipse_at_12%_42%,rgba(18,222,223,.24),transparent_48%),radial-gradient(ellipse_at_52%_46%,rgba(8,169,237,.18),transparent_48%),radial-gradient(ellipse_at_88%_88%,rgba(21,87,245,.2),transparent_46%),radial-gradient(ellipse_at_18%_96%,rgba(18,169,237,.16),transparent_44%),radial-gradient(ellipse_at_52%_35%,rgba(255,255,255,.84),transparent_55%)] blur-3xl dark:hidden" />
        <div className="absolute inset-x-[-18%] top-[-12%] hidden h-[34rem] bg-[radial-gradient(ellipse_at_38%_24%,rgba(103,232,249,.2),transparent_34%),radial-gradient(ellipse_at_66%_42%,rgba(37,99,235,.14),transparent_42%),radial-gradient(ellipse_at_52%_78%,rgba(99,102,241,.1),transparent_48%)] blur-3xl dark:block" />
      </div>

      <div className="absolute right-20 top-10 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={startNewChat}
          aria-label="Start new chat"
          className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-label="Open chat history"
          className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <History className="h-4 w-4" />
        </button>
      </div>
      <section
        className={`relative z-10 flex min-h-[calc(100vh-9rem)] flex-1 flex-col ${messages.length ? "" : "justify-center"}`}
      >
        <div
          className={`${messages.length ? "flex-1 overflow-y-auto" : "flex-none"} space-y-6 px-2 py-8 sm:px-8`}
        >
          {!messages.length && (
            <div className="flex min-h-[20vh] flex-col items-center justify-center text-center">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                What can I help with?
              </h1>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm ${message.role === "user" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"}`}
              >
                {message.attachments?.length ? (
                  <div className="mb-2 grid gap-1.5 sm:grid-cols-2">
                    {message.attachments.map((attachment, attachmentIndex) =>
                      attachment.kind === "image" && attachment.previewUrl ? (
                        <div
                          key={`${attachment.name}-${attachmentIndex}`}
                          className="relative aspect-[4/3] min-w-32 overflow-hidden rounded-lg bg-neutral-800"
                        >
                          <NextImage
                            src={attachment.previewUrl}
                            alt={attachment.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          key={`${attachment.name}-${attachmentIndex}`}
                          className="rounded-lg bg-black/10 px-2 py-1.5 text-xs"
                        >
                          📎 {attachment.name}
                        </div>
                      ),
                    )}
                  </div>
                ) : null}
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-neutral-200 text-neutral-500 dark:border-neutral-700">
                  <UserRound className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking through your
              request…
            </div>
          )}
        </div>
        <form
          onSubmit={submit}
          className={`rounded-2xl border border-neutral-300 bg-white p-3 shadow-sm dark:border-neutral-600 dark:bg-neutral-800 ${messages.length ? "" : "mx-auto w-full max-w-2xl"}`}
        >
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 px-2">
              {files.map((file, index) =>
                file.type.startsWith("image/") ? (
                  <ImageFilePreview
                    key={`${file.name}-${file.lastModified}-${index}`}
                    file={file}
                    onRemove={() =>
                      setFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  />
                ) : (
                  <span
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
                  >
                    <span className="max-w-48 truncate">{file.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ),
              )}
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your site assistant…"
            rows={2}
            className="w-full resize-none bg-transparent px-2 py-1 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white"
            aria-label="Ask the site owner assistant"
          />
          <div className="mt-2 flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2">
              <label className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-700">
                <Paperclip className="h-4 w-4" />
                <span className="sr-only">Attach files</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                  className="hidden"
                  onChange={(event) =>
                    setFiles((current) => [
                      ...current,
                      ...Array.from(event.target.files || []).slice(
                        0,
                        4 - current.length,
                      ),
                    ])
                  }
                />
              </label>
              <span className="hidden text-xs text-neutral-400 sm:inline">
                Enter to send · Shift+Enter for new line
              </span>
            </div>
            <button
              type="submit"
              aria-label="Send message"
              disabled={loading || !prompt.trim()}
              className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-900 text-white transition hover:bg-cyan-700 dark:hover:bg-cyan-400 dark:hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {error && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
        {!messages.length && (
          <div className="mx-auto mt-3 flex w-full max-w-3xl flex-col gap-1 overflow-hidden">
            <Marquee pauseOnHover repeat={3} className="[--duration:34s]">
              {[
                ...suggestions,
                "Review my site health",
                "Plan this month’s content",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setPrompt(suggestion)}
                  className="mx-1 shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </Marquee>
            <Marquee
              pauseOnHover
              reverse
              repeat={3}
              className="[--duration:38s]"
            >
              {[
                "Add a new blog post",
                "Check my SEO",
                "Show sales analytics",
                "Create a pricing page",
                "Add a product",
                "Improve conversions",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setPrompt(suggestion)}
                  className="mx-1 shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </Marquee>
          </div>
        )}
      </section>
      {historyOpen && (
        <>
          <button
            type="button"
            aria-label="Close chat history"
            onClick={() => setHistoryOpen(false)}
            className="fixed inset-0 z-30 bg-black/20"
          />
          <aside className="fixed right-0 top-0 z-40 flex h-full w-80 flex-col border-l border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900 dark:text-white">
                Chat history
              </h2>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close chat history"
                className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 space-y-2 overflow-y-auto">
              {chats.length ? (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => {
                      setChatId(chat.id);
                      setMessages(chat.messages);
                      setHistoryOpen(false);
                    }}
                    className="w-full rounded-lg border border-neutral-200 p-3 text-left text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <span className="block truncate font-medium">
                      {chat.title}
                    </span>
                    <span className="mt-1 block text-xs text-neutral-400">
                      {chat.messages.length} messages
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-neutral-400">
                  No previous conversations yet.
                </p>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
