import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import * as db from "./db";
import { ALLOWED_EMOJI, validateReaction } from "./reactions";

beforeEach(async () => {
  const pg = newDb().adapters.createPg();
  db.setPool(new pg.Pool());
});

describe("validateReaction", () => {
  it("accepts all allowed emoji", () => {
    for (const e of ALLOWED_EMOJI) expect(validateReaction(e)).toBeNull();
  });
  it("rejects emoji outside the allowlist", () => {
    expect(validateReaction("😈")).toMatch(/not allowed/i);
    expect(validateReaction("")).toMatch(/not allowed/i);
    expect(validateReaction("👍👍")).toMatch(/not allowed/i);
  });
});

describe("db.toggleReaction (B4 ownership)", () => {
  it("owner can toggle a reaction on and off", async () => {
    const c = await db.createCustomer("Alice", "pw");
    await db.addRecord(c.id, "x.png", {});
    const rec = (await db.getRecordsByCustomer(c.id))[0];

    await db.toggleReaction(c.id, rec.id, "👍");
    expect((await db.getReactions(rec.id)).find(r => r.emoji === "👍")?.count).toBe(1);

    await db.toggleReaction(c.id, rec.id, "👍"); // toggle off
    expect((await db.getReactions(rec.id)).find(r => r.emoji === "👍")).toBeUndefined();
  });

  it("non-owner cannot react (anti-IDOR)", async () => {
    const alice = await db.createCustomer("Alice", "pw-a");
    const bob   = await db.createCustomer("Bob",   "pw-b");
    await db.addRecord(alice.id, "x.png", {});
    const rec = (await db.getRecordsByCustomer(alice.id))[0];

    await db.toggleReaction(bob.id, rec.id, "❤️");   // should silently no-op
    expect(await db.getReactions(rec.id)).toEqual([]);
  });

  it("invalid emoji is rejected before DB write", async () => {
    const c = await db.createCustomer("Alice", "pw");
    await db.addRecord(c.id, "x.png", {});
    const rec = (await db.getRecordsByCustomer(c.id))[0];
    await expect(db.toggleReaction(c.id, rec.id, "😈")).rejects.toThrow(/not allowed/i);
  });

  it("getReactions returns correct counts for multiple emoji", async () => {
    const c = await db.createCustomer("Alice", "pw");
    await db.addRecord(c.id, "x.png", {});
    const rec = (await db.getRecordsByCustomer(c.id))[0];
    await db.toggleReaction(c.id, rec.id, "👍");
    await db.toggleReaction(c.id, rec.id, "🔥");
    const reacts = await db.getReactions(rec.id);
    expect(reacts.map(r => r.emoji).sort()).toEqual(["👍", "🔥"].sort());
    expect(reacts.every(r => r.count === 1)).toBe(true);
  });
});
