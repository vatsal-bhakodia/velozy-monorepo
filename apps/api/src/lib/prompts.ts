import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const promptCache = new Map<string, string>();

export function loadPrompt(fileName: string): string {
  if (!/^[a-z0-9-]+\.md$/.test(fileName)) {
    throw new Error(`Invalid prompt file name: ${fileName}`);
  }
  const cached = promptCache.get(fileName);
  if (cached) return cached;

  const candidates = [
    resolve(moduleDirectory, "../../prompts", fileName),
    resolve(moduleDirectory, "prompts", fileName),
  ];
  const promptPath = candidates.find(existsSync);
  if (!promptPath) {
    throw new Error(`Prompt file ${fileName} was not found. Ensure apps/api/prompts is included in the deployment.`);
  }

  const prompt = readFileSync(promptPath, "utf8").trim();
  if (!prompt) throw new Error(`Prompt file ${fileName} is empty`);
  promptCache.set(fileName, prompt);
  return prompt;
}
