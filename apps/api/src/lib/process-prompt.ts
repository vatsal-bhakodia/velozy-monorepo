import OpenAI from "openai";

export type AITask = "chat" | "coding";
export type AIProvider = "openai" | "gemini";
export type AIInputPart =
  | { type: "text"; text: string }
  | { type: "image"; dataUrl: string }
  | { type: "file"; dataUrl: string; filename: string };

const DEFAULT_MODELS: Record<AIProvider, Record<AITask, string>> = {
  openai: { chat: "gpt-4o-mini", coding: "gpt-5.2" },
  gemini: { chat: "gemini-3.6-flash", coding: "gemini-2.5-pro" },
};

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "openai";
  if (provider !== "openai" && provider !== "gemini") {
    throw new Error('AI_PROVIDER must be "openai" or "gemini"');
  }
  return provider;
}

export function getAIModel(task: AITask = "chat"): string {
  const provider = getAIProvider();
  const prefix = provider === "openai" ? "OPENAI" : "GEMINI";
  const configuredModel =
    process.env[`${prefix}_${task.toUpperCase()}_MODEL`] ||
    process.env[`${prefix}_MODEL`];

  return configuredModel?.trim() || DEFAULT_MODELS[provider][task];
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey)
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
  return new OpenAI({ apiKey });
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("AI attachment must be a base64 data URL");
  return { mimeType: match[1], data: match[2] };
}

async function generateWithGemini(
  systemPrompt: string,
  input: AIInputPart[],
  model: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey)
    throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini");

  const parts = input.map((part) => {
    if (part.type === "text") return { text: part.text };
    const { mimeType, data } = parseDataUrl(part.dataUrl);
    return { inline_data: { mime_type: mimeType, data } };
  });
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts }],
      }),
    },
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Gemini API returned ${response.status}`,
    );
  }
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("");
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

async function generateWithOpenAI(
  systemPrompt: string,
  input: AIInputPart[],
  model: string,
): Promise<string> {
  const content: OpenAI.Responses.ResponseInputContent[] = input.map((part) => {
    if (part.type === "text") return { type: "input_text", text: part.text };
    if (part.type === "image") {
      return { type: "input_image", detail: "auto", image_url: part.dataUrl };
    }
    return {
      type: "input_file",
      filename: part.filename,
      file_data: part.dataUrl,
    };
  });
  const response = await getOpenAIClient().responses.create({
    model,
    instructions: systemPrompt,
    input: [{ role: "user", content }],
  });
  if (!response.output_text) throw new Error("OpenAI returned no text");
  return response.output_text;
}

export async function generateAIText(
  systemPrompt: string,
  input: AIInputPart[],
  task: AITask = "chat",
): Promise<string> {
  const provider = getAIProvider();
  const model = getAIModel(task);
  try {
    return provider === "gemini"
      ? await generateWithGemini(systemPrompt, input, model)
      : await generateWithOpenAI(systemPrompt, input, model);
  } catch (error) {
    console.error(`${provider} ${task} request failed:`, error);
    throw new Error(
      `${provider} ${task} request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function processPrompt(
  systemPrompt: string,
  userPrompt: string,
  task: AITask = "chat",
): Promise<string> {
  return generateAIText(
    systemPrompt,
    [{ type: "text", text: userPrompt }],
    task,
  );
}
