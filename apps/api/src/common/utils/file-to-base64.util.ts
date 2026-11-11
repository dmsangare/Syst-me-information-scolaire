import { promises as fs } from "fs";
import * as path from "path";

const POSSIBLE_ROOTS = [
  process.env.STORAGE_ROOT,
  path.resolve(process.cwd(), "app", "storage"),      // <-- Le chemin exact qu'on a trouvé
  path.resolve(process.cwd(), "storage"),
  path.resolve(process.cwd(), "../../storage"),
  path.resolve(process.cwd(), "../../apps/api/app/storage"), 
  "/app/storage",
].filter(Boolean) as string[];

export async function fileToBase64(input: string | null | undefined): Promise<string | null> {
  if (!input) return null;
  if (input.startsWith("data:")) return input;
  if (/^https?:\/\//i.test(input)) return null;

  let relative = input.replace(/^\/+/, "");
  
  // Nettoyage des prefixes d'URL
  if (relative.startsWith("api/v1/files/documents/")) {
    relative = relative.replace(/^api\/v1\/files\/documents\//, "generated/");
  } else {
    relative = relative.replace(/^api\/v1\/files\//, "");
  }

  for (const root of POSSIBLE_ROOTS) {
    const absoluteRoot = path.resolve(root);
    const absolutePath = path.resolve(absoluteRoot, relative);
    
    if (absolutePath !== absoluteRoot && !absolutePath.startsWith(absoluteRoot + path.sep)) {
      continue;
    }

    try {
      const buffer = await fs.readFile(absolutePath);
      const ext = path.extname(absolutePath).toLowerCase().slice(1);
      const mime =
        ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : ext === "svg"
                ? "image/svg+xml"
                : "application/octet-stream";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch {
      // On essaie le prochain chemin
    }
  }

  return null;
}
