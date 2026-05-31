import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const source = join(import.meta.dirname, "..", "..", "app", "data");
const target = join(import.meta.dirname, "..", "public", "data");

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
