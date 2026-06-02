"use server";

import { randomBytes } from "node:crypto";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addRecord, authenticateCustomer, createCustomer, toggleReaction } from "@/lib/db";
import { sign, verify } from "@/lib/session";
import { validateMeasurement } from "@/lib/measurement";
import { validateUpload } from "@/lib/upload";

const isProd = process.env.NODE_ENV === "production";

// Resolved lazily (at request time, not import time) so a production build with
// the env unset doesn't crash page-data collection.
function trainerPassword(): string {
  const v = process.env.TRAINER_PASSWORD;
  if (v) return v;
  if (isProd) throw new Error("TRAINER_PASSWORD env var is required in production");
  return "trainer123";
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Shared cookie options: httpOnly blocks JS access, sameSite blocks CSRF,
// secure forces HTTPS-only transmission in production.
const COOKIE_OPTS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: isProd,
};

// Server actions are exposed as POST endpoints; the page-level cookie check
// does not protect them, so each mutation must guard itself.
async function requireTrainer() {
  if ((await cookies()).get("trainer")?.value !== "1") redirect("/trainer");
}

// ---- trainer ----
export async function trainerLogin(formData: FormData) {
  if (formData.get("password") === trainerPassword()) {
    (await cookies()).set("trainer", "1", COOKIE_OPTS);
    redirect("/trainer");
  }
  redirect("/trainer?error=1");
}
export async function trainerLogout() {
  (await cookies()).delete("trainer");
  redirect("/trainer");
}
export async function createCustomerAction(formData: FormData) {
  await requireTrainer();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  if (!name || !password) redirect("/trainer?error=missing");
  try {
    await createCustomer(name, password);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    redirect(msg === "DUPLICATE_PASSWORD" ? "/trainer?error=duppw" : "/trainer?error=server");
  }
  revalidatePath("/trainer");
}
export async function addRecordAction(formData: FormData) {
  await requireTrainer();
  const customerId = Number(formData.get("customerId"));
  const image = formData.get("image");
  if (!customerId || !(image instanceof File)) redirect("/trainer?error=missing");
  const file = image as File;

  const uploadErr = validateUpload({ name: file.name, size: file.size });
  if (uploadErr) redirect(`/trainer?error=upload`);

  const num = (k: string) => { const v = formData.get(k); return v ? Number(v) : null; };
  const metrics = {
    comment: String(formData.get("comment") || ""),
    measured_on: String(formData.get("measured_on") || "") || undefined,
    weight: num("weight"),
    skeletal_muscle: num("skeletal_muscle"),
    body_fat_pct: num("body_fat_pct"),
    inbody_score: num("inbody_score"),
  };
  const metricErr = validateMeasurement(metrics);
  if (metricErr) redirect(`/trainer?error=metric`);

  // Derive a random filename and keep only the (sanitized) extension — never
  // trust the client-supplied basename for the stored path.
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1).replace(/[^\w]/g, "").toLowerCase() : "";
  const name = randomBytes(16).toString("hex") + (ext ? "." + ext : "");

  await mkdir(UPLOAD_DIR, { recursive: true });
  const dest = join(UPLOAD_DIR, name);
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  try {
    await addRecord(customerId, name, metrics);
  } catch (e) {
    // Don't leave an orphaned upload if the DB insert fails.
    await unlink(dest).catch(() => {});
    throw e;
  }
  revalidatePath("/trainer");
}

// ---- customer ----
export async function customerLogin(formData: FormData) {
  const customer = await authenticateCustomer(String(formData.get("password") || ""));
  if (customer) (await cookies()).set("cust", sign(customer.id), COOKIE_OPTS);
  else redirect("/?error=1");
  redirect("/");
}
export async function customerLogout() {
  (await cookies()).delete("cust");
  redirect("/");
}
export async function toggleReactionAction(formData: FormData) {
  const id = verify((await cookies()).get("cust")?.value);
  if (!id) redirect("/");
  const recordId = Number(formData.get("recordId"));
  const emoji = String(formData.get("emoji") || "");
  await toggleReaction(id, recordId, emoji);
  revalidatePath("/");
}
