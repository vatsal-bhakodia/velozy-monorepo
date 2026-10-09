import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
import { createTextEmbedding, generateAIText } from "../../lib/process-prompt.js";
import { loadPrompt } from "../../lib/prompts.js";

const CHAT_TITLE_PROMPT = loadPrompt("chat-title.md");

const message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
  attachments: z.array(z.unknown()).max(4).optional(),
});
export function adminAIRouter(environment: Environment): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  router.get("/ai/chats", async (req, res) => {
    const current = await user(req);
    const projectId = z.string().uuid().safeParse(req.query.projectId);
    if (!projectId.success) throw new HttpError(400, "Select a project to view AI history", "project_required");
    await project(projectId.data, current.id, "content:read");
    const chats = await db.query.aiChats.findMany({
      where: and(eq(schema.aiChats.userId, current.id), eq(schema.aiChats.projectId, projectId.data)),
      orderBy: [desc(schema.aiChats.updatedAt)],
    });
    const result = await Promise.all(
      chats.map(async (chat) => ({
        ...chat,
        messages: await db.query.aiChatMessages.findMany({
          where: eq(schema.aiChatMessages.chatId, chat.id),
          orderBy: [desc(schema.aiChatMessages.createdAt)],
        }),
      })),
    );
    res.json({ chats: result });
  });
  router.post("/ai/chats", async (req, res) => {
    const current = await user(req);
    const body = z
      .object({
        chatId: z.string().uuid().optional(),
        projectId: z.string().uuid(),
        surface: z.enum(["admin", "builder", "onboarding"]),
        messages: z.array(message).min(1).max(20),
      })
      .safeParse(req.body);
    if (!body.success)
      throw new HttpError(400, "Messages are required", "validation_error");
    await project(body.data.projectId, current.id, "content:write");
    let chat = body.data.chatId
      ? await db.query.aiChats.findFirst({
          where: and(
            eq(schema.aiChats.id, body.data.chatId),
            eq(schema.aiChats.userId, current.id),
            eq(schema.aiChats.projectId, body.data.projectId),
            eq(schema.aiChats.surface, body.data.surface),
          ),
        })
      : undefined;
    if (!chat) {
      const titleSource =
        body.data.messages.find((item) => item.role === "user")?.content ||
        "New chat";
      let title = titleSource.slice(0, 48);
      try {
        title =
          (
            await generateAIText(
              CHAT_TITLE_PROMPT,
              [{ type: "text", text: titleSource }],
              "chat",
            )
          )
            .trim()
            .replace(/[\"\n]/g, "")
            .slice(0, 255) || title;
      } catch {
        /* fallback */
      }
      [chat] = await db
        .insert(schema.aiChats)
        .values({ userId: current.id, projectId: body.data.projectId, surface: body.data.surface, title })
        .returning();
    }
    const savedMessages = await db.insert(schema.aiChatMessages).values(
      body.data.messages.map((item) => ({
        chatId: chat!.id,
        role: item.role,
        content: item.content,
        attachments: item.attachments ?? null,
      })),
    ).returning();
    for (const saved of savedMessages) {
      try {
        const embedding = await createTextEmbedding(saved.content);
        await db.insert(schema.aiContextChunks).values({
          chatId: chat!.id,
          messageId: saved.id,
          content: saved.content.slice(0, 8000),
          embedding,
          metadata: { surface: body.data.surface, role: saved.role },
        });
      } catch (error) {
        console.warn("Could not index AI conversation message:", error);
      }
    }
    await db
      .update(schema.aiChats)
      .set({ updatedAt: new Date() })
      .where(eq(schema.aiChats.id, chat!.id));
    res.json({ chatId: chat!.id, title: chat!.title });
  });
  return router;
}
