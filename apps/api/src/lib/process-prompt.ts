import OpenAI from "openai";

export type AITask = "chat" | "coding";
export type AIProvider = "openai" | "gemini";
export type AIInputPart =
  | { type: "text"; text: string }
  | { type: "image"; dataUrl: string }
  | { type: "file"; dataUrl: string; filename: string };
export type AIRequestOptions = { disableReasoning?: boolean };

const DEFAULT_MODELS: Record<AIProvider, Record<AITask, string>> = {
  openai: { chat: "gpt-4o-mini", coding: "gpt-5.2" },
  gemini: { chat: "gemini-3.6-flash", coding: "gemini-2.5-pro" },
};
const NON_REASONING_FALLBACK_MODEL = DEFAULT_MODELS.openai.chat;

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

export async function createTextEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY?.trim() || !text.trim()) return null;
  const result = await getOpenAIClient().embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
    dimensions: 1536,
  });
  return result.data[0]?.embedding ?? null;
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
  options: AIRequestOptions = {},
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
  const client = getOpenAIClient();
  const request = {
    instructions: systemPrompt,
    input: [{ role: "user" as const, content }],
  };
  const reasoningDisabled =
    options.disableReasoning && /^gpt-5(?:[.-]|$)/i.test(model);
  let response: OpenAI.Responses.Response;
  try {
    response = await client.responses.create({
      model,
      ...request,
      // Some GPT-5 models support effort="none"; non-reasoning models such
      // as gpt-4o-mini do not accept the reasoning parameter at all.
      ...(reasoningDisabled
        ? { reasoning: { effort: "none" as const } }
        : {}),
    });
  } catch (error) {
    const apiError = error as { param?: unknown; message?: unknown };
    const reasoningParamRejected =
      typeof apiError.param === "string" &&
      apiError.param.startsWith("reasoning.");
    if (
      !reasoningDisabled ||
      !reasoningParamRejected ||
      model === NON_REASONING_FALLBACK_MODEL
    ) {
      throw error;
    }

    console.warn(
      `OpenAI model ${model} does not support disabling reasoning; retrying onboarding request with ${NON_REASONING_FALLBACK_MODEL}.`,
    );
    response = await client.responses.create({
      model: NON_REASONING_FALLBACK_MODEL,
      ...request,
    });
  }
  if (!response.output_text) throw new Error("OpenAI returned no text");
  return response.output_text;
}

export async function generateAIText(
  systemPrompt: string,
  input: AIInputPart[],
  task: AITask = "chat",
  options: AIRequestOptions = {},
): Promise<string> {
  const provider = getAIProvider();
  const model = getAIModel(task);
  try {
    return provider === "gemini"
      ? await generateWithGemini(systemPrompt, input, model)
      : await generateWithOpenAI(systemPrompt, input, model, options);
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
  options: AIRequestOptions = {},
): Promise<string> {
  return generateAIText(
    systemPrompt,
    [{ type: "text", text: userPrompt }],
    task,
    options,
  );
}
