import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
import { generateAIText } from "../../lib/process-prompt.js";

const message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
  attachments: z.array(z.unknown()).max(4).optional(),
});
export function adminAIRouter(environment: Environment): ExpressRouter {
  const { db, user } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  router.get("/ai/chats", async (req, res) => {
    const current = await user(req);
    const chats = await db.query.aiChats.findMany({
      where: eq(schema.aiChats.userId, current.id),
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
        messages: z.array(message).min(1).max(20),
      })
      .safeParse(req.body);
    if (!body.success)
      throw new HttpError(400, "Messages are required", "validation_error");
    let chat = body.data.chatId
      ? await db.query.aiChats.findFirst({
          where: and(
            eq(schema.aiChats.id, body.data.chatId),
            eq(schema.aiChats.userId, current.id),
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
              "Create a concise 3-6 word title. Return only the title.",
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
        .values({ userId: current.id, title })
        .returning();
    }
    await db.insert(schema.aiChatMessages).values(
      body.data.messages.map((item) => ({
        chatId: chat!.id,
        role: item.role,
        content: item.content,
        attachments: item.attachments ?? null,
      })),
    );
    await db
      .update(schema.aiChats)
      .set({ updatedAt: new Date() })
      .where(eq(schema.aiChats.id, chat!.id));
    res.json({ chatId: chat!.id, title: chat!.title });
  });
  return router;
}
