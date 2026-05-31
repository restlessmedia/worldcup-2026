import { rmSync } from "node:fs";
import { join } from "node:path";

const appDir = join(import.meta.dirname, "..", "..", "app");

for (const name of ["js", "css", "assets"]) {
  rmSync(join(appDir, name), { recursive: true, force: true });
}
