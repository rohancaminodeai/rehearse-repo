import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import * as db from "./db";

// SDD: tests map 1:1 to SPEC.md Acceptance Criteria (AC1–AC5).
beforeEach(async () => {
  const pg = newDb().adapters.createPg();
  db.setPool(new pg.Pool());
});

describe("lib/db (SPEC AC)", () => {
  it("AC1: createCustomer hashes the password (never stored plaintext)", async () => {
    const c = await db.createCustomer("Alice", "secret-a");
    expect(c.name).toBe("Alice");
    const hash = await db._passwordHashOf(c.id);
    expect(hash).not.toBe("secret-a");
    expect(db.verifyPassword("secret-a", hash)).toBe(true);
  });

  it("AC2: authenticateCustomer accepts correct, rejects wrong password", async () => {
    await db.createCustomer("Alice", "secret-a");
    expect(await db.authenticateCustomer("secret-a")).toMatchObject({ name: "Alice" });
    expect(await db.authenticateCustomer("wrong")).toBeNull();
  });

  it("AC3: each customer authenticates to their own records only", async () => {
    const a = await db.createCustomer("Alice", "pw-a");
    const b = await db.createCustomer("Bob", "pw-b");
    await db.addRecord(a.id, "a1.png", { comment: "Alice note" });
    await db.addRecord(b.id, "b1.png", { comment: "Bob note" });

    const who = await db.authenticateCustomer("pw-a");
    expect(who!.id).toBe(a.id);
    const recs = await db.getRecordsByCustomer(who!.id);
    expect(recs.map((r) => r.comment)).toEqual(["Alice note"]);
  });

  it("AC4: addRecord + getRecordsByCustomer round-trips newest-first", async () => {
    const a = await db.createCustomer("Alice", "pw");
    await db.addRecord(a.id, "1.png", { comment: "first" });
    await db.addRecord(a.id, "2.png", { comment: "second" });
    const recs = await db.getRecordsByCustomer(a.id);
    expect(recs.map((r) => r.comment)).toEqual(["second", "first"]);
    expect(recs[0].image_path).toBe("2.png");
  });

  it("AC5: listCustomers returns id+name without the hash", async () => {
    const a = await db.createCustomer("Alice", "pw");
    const list = await db.listCustomers();
    expect(list.some((x) => x.id === a.id && x.name === "Alice")).toBe(true);
    expect(Object.keys(list[0])).toEqual(["id", "name"]);
  });
});

describe("lib/db (edge cases & resilience)", () => {
  it("#1 rejects a duplicate password (password = identity, no collision)", async () => {
    await db.createCustomer("Alice", "same-pw");
    await expect(db.createCustomer("Bob", "same-pw")).rejects.toThrow("DUPLICATE_PASSWORD");
    // the original owner still authenticates correctly
    expect(await db.authenticateCustomer("same-pw")).toMatchObject({ name: "Alice" });
  });

  it("#4 verifyPassword returns false on a malformed hash (never throws)", () => {
    expect(db.verifyPassword("x", "garbage-no-colon")).toBe(false);
    expect(db.verifyPassword("x", "")).toBe(false);
    expect(db.verifyPassword("x", "abc:")).toBe(false);
  });

  it("#2 recovers after a transient DB failure (ready promise not cached permanently)", async () => {
    let calls = 0;
    const stub = {
      query: async () => {
        calls++;
        if (calls === 1) throw new Error("db down");
        return { rows: [] };
      },
      on: () => {},
    };
    db.setPool(stub as never);
    await expect(db.listCustomers()).rejects.toThrow("db down");
    await expect(db.listCustomers()).resolves.toEqual([]); // retried, did not stay broken
  });
});
