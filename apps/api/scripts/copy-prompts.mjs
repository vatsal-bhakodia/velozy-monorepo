import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const source = resolve(scriptDirectory, "../prompts");
const destination = resolve(scriptDirectory, "../dist/prompts");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
