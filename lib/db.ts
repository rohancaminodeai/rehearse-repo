import { Pool } from "pg";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type Customer = { id: number; name: string };
export type Record = {
  id: number;
  image_path: string;
  comment: string;
  measured_on: string;
  weight: number | null;
  skeletal_muscle: number | null;
  body_fat_pct: number | null;
  inbody_score: number | null;
  created_at: string;
};
export type Reaction = { emoji: string; count: number };

let _pool: Pool | null = null;
let _ready: Promise<void> | null = null;

// setPool lets tests inject a pg-mem pool; resets schema init.
export function setPool(p: Pool) {
  _pool = p;
  _ready = null;
}
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // #3 without this, an idle-client error (e.g. Postgres restart) crashes the process
    _pool.on("error", (e) => console.error("[pg pool error]", e.message));
  }
  return _pool;
}
function ready(): Promise<void> {
  // #2 if init fails (DB warming up / transient), clear the cache so the next call retries
  if (!_ready)
    _ready = pool()
      .query(
        `CREATE TABLE IF NOT EXISTS customers (
           id serial PRIMARY KEY, name text NOT NULL, password_hash text NOT NULL,
           created_at timestamptz DEFAULT now());
         CREATE TABLE IF NOT EXISTS records (
           id serial PRIMARY KEY, customer_id int NOT NULL REFERENCES customers(id),
           image_path text NOT NULL, comment text DEFAULT '',
           measured_on date NOT NULL DEFAULT CURRENT_DATE,
           weight numeric, skeletal_muscle numeric,
           body_fat_pct numeric, inbody_score int,
           created_at timestamptz DEFAULT now());
         CREATE TABLE IF NOT EXISTS reactions (
           id serial PRIMARY KEY, record_id int NOT NULL REFERENCES records(id),
           emoji text NOT NULL, created_at timestamptz DEFAULT now(),
           UNIQUE(record_id, emoji));`
      )
      .then(() => undefined)
      .catch((e) => {
        _ready = null;
        throw e;
      });
  return _ready;
}

function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  return salt.toString("hex") + ":" + scryptSync(pw, salt, 64).toString("hex");
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false; // #4 malformed/corrupt row must not throw
  try {
    const want = Buffer.from(hash, "hex");
    const got = scryptSync(pw, Buffer.from(salt, "hex"), 64);
    return got.length === want.length && timingSafeEqual(got, want);
  } catch {
    return false;
  }
}

export async function createCustomer(name: string, password: string): Promise<Customer> {
  await ready();
  // #1 password identifies the customer, so it must be unique; reject collisions
  if (await authenticateCustomer(password)) throw new Error("DUPLICATE_PASSWORD");
  const { rows } = await pool().query(
    "INSERT INTO customers (name, password_hash) VALUES ($1, $2) RETURNING id, name",
    [name, hashPassword(password)]
  );
  return rows[0];
}

export async function listCustomers(): Promise<Customer[]> {
  await ready();
  const { rows } = await pool().query("SELECT id, name FROM customers ORDER BY id DESC");
  return rows;
}

export async function authenticateCustomer(password: string): Promise<Customer | null> {
  await ready();
  const { rows } = await pool().query("SELECT id, name, password_hash FROM customers");
  for (const r of rows) if (verifyPassword(password, r.password_hash)) return { id: r.id, name: r.name };
  return null;
}

export async function getCustomer(id: number): Promise<Customer | undefined> {
  await ready();
  const { rows } = await pool().query("SELECT id, name FROM customers WHERE id = $1", [id]);
  return rows[0];
}

export type RecordInput = {
  comment?: string;
  measured_on?: string;
  weight?: number | null;
  skeletal_muscle?: number | null;
  body_fat_pct?: number | null;
  inbody_score?: number | null;
};

export async function addRecord(customerId: number, image_path: string, input: RecordInput = {}): Promise<void> {
  await ready();
  const { comment = "", measured_on, weight, skeletal_muscle, body_fat_pct, inbody_score } = input;
  await pool().query(
    `INSERT INTO records (customer_id, image_path, comment, measured_on, weight, skeletal_muscle, body_fat_pct, inbody_score)
     VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6, $7, $8)`,
    [customerId, image_path, comment, measured_on ?? null, weight ?? null, skeletal_muscle ?? null, body_fat_pct ?? null, inbody_score ?? null]
  );
}

export type RecordWithReactions = Record & { reactions: Array<{ emoji: string; count: number }> };

export async function getRecordsByCustomer(customerId: number): Promise<RecordWithReactions[]> {
  await ready();
  const { rows } = await pool().query(
    "SELECT id, image_path, comment, measured_on, weight, skeletal_muscle, body_fat_pct, inbody_score, created_at FROM records WHERE customer_id = $1 ORDER BY measured_on DESC, id DESC",
    [customerId]
  );
  const withReacts = await Promise.all(rows.map(async (r: Record) => ({
    ...r,
    reactions: await getReactions(r.id),
  })));
  return withReacts;
}

export async function toggleReaction(customerId: number, recordId: number, emoji: string): Promise<void> {
  const { validateReaction } = await import("./reactions");
  const err = validateReaction(emoji);
  if (err) throw new Error(err);
  await ready();
  // B4: verify the record belongs to this customer first
  const owned = await pool().query(
    "SELECT 1 FROM records WHERE id = $1 AND customer_id = $2",
    [recordId, customerId]
  );
  if (owned.rowCount === 0) return; // non-owner: silently no-op
  const del = await pool().query(
    "DELETE FROM reactions WHERE record_id = $1 AND emoji = $2 RETURNING id",
    [recordId, emoji]
  );
  if (del.rowCount === 0) {
    await pool().query(
      "INSERT INTO reactions (record_id, emoji) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [recordId, emoji]
    );
  }
}

export async function getReactions(recordId: number): Promise<Array<{ emoji: string; count: number }>> {
  await ready();
  const { rows } = await pool().query(
    "SELECT emoji, COUNT(*)::int AS count FROM reactions WHERE record_id = $1 GROUP BY emoji",
    [recordId]
  );
  return rows;
}

// test helper (SPEC AC1)
export async function _passwordHashOf(id: number): Promise<string> {
  const { rows } = await pool().query("SELECT password_hash FROM customers WHERE id = $1", [id]);
  return rows[0].password_hash;
}
