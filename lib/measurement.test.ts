import { describe, expect, it } from "vitest";
import { validateMeasurement, withDeltas } from "./measurement";

describe("validateMeasurement (B6 range checks)", () => {
  it("returns null for all-null input (metrics are optional)", () => {
    expect(validateMeasurement({})).toBeNull();
  });

  it("accepts values at valid boundaries", () => {
    expect(validateMeasurement({ weight: 20, skeletal_muscle: 5, body_fat_pct: 1, inbody_score: 0 })).toBeNull();
    expect(validateMeasurement({ weight: 300, skeletal_muscle: 80, body_fat_pct: 70, inbody_score: 100 })).toBeNull();
  });

  it("rejects weight out of range", () => {
    expect(validateMeasurement({ weight: 19 })).toMatch(/weight/i);
    expect(validateMeasurement({ weight: 301 })).toMatch(/weight/i);
  });

  it("rejects skeletal_muscle out of range", () => {
    expect(validateMeasurement({ skeletal_muscle: 4 })).toMatch(/muscle/i);
    expect(validateMeasurement({ skeletal_muscle: 81 })).toMatch(/muscle/i);
  });

  it("rejects body_fat_pct out of range", () => {
    expect(validateMeasurement({ body_fat_pct: 0 })).toMatch(/body.fat/i);
    expect(validateMeasurement({ body_fat_pct: 71 })).toMatch(/body.fat/i);
  });

  it("rejects inbody_score out of range", () => {
    expect(validateMeasurement({ inbody_score: -1 })).toMatch(/score/i);
    expect(validateMeasurement({ inbody_score: 101 })).toMatch(/score/i);
  });

  it("rejects measured_on in the future", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(validateMeasurement({ measured_on: tomorrow.toISOString().slice(0, 10) })).toMatch(/date/i);
  });

  it("accepts measured_on = today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(validateMeasurement({ measured_on: today })).toBeNull();
  });
});

describe("withDeltas", () => {
  const base = { id: 0, image_path: "", comment: "", created_at: "", measured_on: "2026-01-01" };

  it("first record has null deltas", () => {
    const [r] = withDeltas([{ ...base, id: 1, weight: 70, body_fat_pct: 20, skeletal_muscle: 30, inbody_score: 75 }]);
    expect(r.delta_weight).toBeNull();
    expect(r.delta_body_fat_pct).toBeNull();
  });

  it("second record carries correct deltas vs first", () => {
    const records = [
      { ...base, id: 2, measured_on: "2026-02-01", weight: 68, body_fat_pct: 18, skeletal_muscle: 31, inbody_score: 80 },
      { ...base, id: 1, measured_on: "2026-01-01", weight: 70, body_fat_pct: 20, skeletal_muscle: 30, inbody_score: 75 },
    ];
    // withDeltas input is newest-first (as returned by DB)
    const [newest, oldest] = withDeltas(records);
    expect(newest.delta_weight).toBeCloseTo(-2);
    expect(newest.delta_body_fat_pct).toBeCloseTo(-2);
    expect(newest.delta_skeletal_muscle).toBeCloseTo(1);
    expect(newest.delta_inbody_score).toBe(5);
    expect(oldest.delta_weight).toBeNull();
  });

  it("null metric in previous record yields null delta for that field", () => {
    const records = [
      { ...base, id: 2, measured_on: "2026-02-01", weight: 68, body_fat_pct: null, skeletal_muscle: null, inbody_score: null },
      { ...base, id: 1, measured_on: "2026-01-01", weight: null, body_fat_pct: null, skeletal_muscle: null, inbody_score: null },
    ];
    const [newest] = withDeltas(records);
    expect(newest.delta_weight).toBeNull();
    expect(newest.delta_body_fat_pct).toBeNull();
  });
});
