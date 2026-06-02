import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.SESSION_SECRET || "dev-secret-change-me";

// Signed customer-session cookie: "<id>.<hmac>". Cannot be forged to impersonate.
export function sign(id: number): string {
  const v = String(id);
  return v + "." + createHmac("sha256", secret()).update(v).digest("hex");
}

export function verify(cookie?: string): number | null {
  const [v, mac] = (cookie || "").split(".");
  if (!v || !mac) return null;
  const good = createHmac("sha256", secret()).update(v).digest("hex");
  const a = Buffer.from(mac), b = Buffer.from(good);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Number(v);
}
