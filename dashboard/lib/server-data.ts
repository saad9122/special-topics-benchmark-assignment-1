import { promises as fs } from "fs";
import path from "path";
import type {
  DeterminismRow,
  Meta,
  Prompt,
  SummaryRow,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T>(name: string): Promise<T> {
  const raw = await fs.readFile(path.join(DATA_DIR, name), "utf-8");
  return JSON.parse(raw) as T;
}

/**
 * The small files are read on the server so the page renders with its
 * numbers already in place. The large responses file is fetched by the
 * explorer in the browser instead.
 */
export async function loadCoreData() {
  const [meta, summary, determinism, prompts] = await Promise.all([
    readJson<Meta>("meta.json"),
    readJson<SummaryRow[]>("summary.json"),
    readJson<DeterminismRow[]>("determinism.json"),
    readJson<Prompt[]>("prompts.json"),
  ]);

  return { meta, summary, determinism, prompts };
}
