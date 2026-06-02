import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validateUpload } from "./upload";

describe("validateUpload (#5)", () => {
  it("accepts a normal image", () => {
    expect(validateUpload({ name: "scan.png", size: 1024 })).toBeNull();
    expect(validateUpload({ name: "Photo.JPG", size: 1024 })).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateUpload({ name: "x.png", size: 0 })).toMatch(/choose/i);
  });

  it("rejects an oversized file", () => {
    expect(validateUpload({ name: "x.png", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/large/i);
  });

  it("rejects a non-image extension", () => {
    expect(validateUpload({ name: "evil.exe", size: 100 })).toMatch(/allowed/i);
    expect(validateUpload({ name: "noext", size: 100 })).toMatch(/allowed/i);
  });
});
