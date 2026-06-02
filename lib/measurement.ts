import type { Record } from "./db";

type MetricInput = {
  weight?: number | null;
  skeletal_muscle?: number | null;
  body_fat_pct?: number | null;
  inbody_score?: number | null;
  measured_on?: string | null;
};

export function validateMeasurement(input: MetricInput): string | null {
  const { weight, skeletal_muscle, body_fat_pct, inbody_score, measured_on } = input;
  if (weight != null && (weight < 20 || weight > 300)) return "Weight must be between 20 and 300 kg.";
  if (skeletal_muscle != null && (skeletal_muscle < 5 || skeletal_muscle > 80)) return "Skeletal muscle must be between 5 and 80 kg.";
  if (body_fat_pct != null && (body_fat_pct < 1 || body_fat_pct > 70)) return "Body fat % must be between 1 and 70.";
  if (inbody_score != null && (inbody_score < 0 || inbody_score > 100)) return "InBody score must be between 0 and 100.";
  if (measured_on) {
    const today = new Date().toISOString().slice(0, 10);
    if (measured_on > today) return "Measurement date cannot be in the future.";
  }
  return null;
}

type Deltas = {
  delta_weight: number | null;
  delta_skeletal_muscle: number | null;
  delta_body_fat_pct: number | null;
  delta_inbody_score: number | null;
};
export type RecordWithDelta = Record & Deltas;

// Input: records newest-first (as returned by DB). Output: same order with deltas vs prior record.
export function withDeltas<T extends Record>(records: T[]): (T & Deltas)[] {
  return records.map((r, i) => {
    const prev = records[i + 1] ?? null;
    const delta = <K extends keyof Record>(key: K): number | null => {
      const cur = r[key] as number | null | undefined;
      const old = prev ? (prev[key] as number | null | undefined) : null;
      return cur != null && old != null ? cur - old : null;
    };
    return {
      ...r,
      delta_weight: delta("weight"),
      delta_skeletal_muscle: delta("skeletal_muscle"),
      delta_body_fat_pct: delta("body_fat_pct"),
      delta_inbody_score: delta("inbody_score"),
    };
  });
}
