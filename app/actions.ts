"use server";

import { randomBytes } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addRecord, authenticateCustomer, createCustomer, toggleReaction } from "@/lib/db";
import { sign, verify } from "@/lib/session";
import { validateMeasurement } from "@/lib/measurement";
import { validateUpload } from "@/lib/upload";

const TRAINER_PASSWORD = process.env.TRAINER_PASSWORD || "trainer123";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// ---- trainer ----
export async function trainerLogin(formData: FormData) {
  if (formData.get("password") === TRAINER_PASSWORD)
    (await cookies()).set("trainer", "1", { httpOnly: true, path: "/" });
  redirect("/trainer");
}
export async function trainerLogout() {
  (await cookies()).delete("trainer");
  redirect("/trainer");
}
export async function createCustomerAction(formData: FormData) {
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
  const customerId = Number(formData.get("customerId"));
  const file = formData.get("image") as File | null;
  if (!customerId || !file) redirect("/trainer?error=missing");

  const uploadErr = validateUpload({ name: file!.name, size: file!.size });
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

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = randomBytes(8).toString("hex") + "-" + file!.name.replace(/[^\w.]/g, "_");
  await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file!.arrayBuffer()));
  await addRecord(customerId, name, metrics);
  revalidatePath("/trainer");
}

// ---- customer ----
export async function customerLogin(formData: FormData) {
  const customer = await authenticateCustomer(String(formData.get("password") || ""));
  if (customer) (await cookies()).set("cust", sign(customer.id), { httpOnly: true, path: "/" });
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
