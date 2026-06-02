import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp",
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = name.replace(/[^\w.-]/g, ""); // strip separators and anything exotic
  const absDir = resolve(UPLOAD_DIR);
  const absFile = resolve(join(UPLOAD_DIR, safe));
  // Defense in depth: ensure the resolved path is still inside the upload dir.
  if (absFile !== absDir && !absFile.startsWith(absDir + sep))
    return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(absFile);
    return new Response(buf, {
      headers: { "Content-Type": TYPES[extname(safe).toLowerCase()] || "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
