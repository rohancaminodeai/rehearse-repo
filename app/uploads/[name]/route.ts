import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp",
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = name.replace(/[^\w.-]/g, ""); // prevent path traversal
  try {
    const buf = await readFile(join(UPLOAD_DIR, safe));
    return new Response(buf, {
      headers: { "Content-Type": TYPES[extname(safe).toLowerCase()] || "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
