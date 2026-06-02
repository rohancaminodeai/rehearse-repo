// #5 server-side upload validation — `accept="image/*"` in the form is client-only
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

// Returns a user-facing error message, or null if the file is acceptable.
export function validateUpload(file: { name: string; size: number }): string | null {
  if (!file.size) return "Please choose an image.";
  if (file.size > MAX_UPLOAD_BYTES) return "Image is too large (max 5 MB).";
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  if (!ALLOWED_EXT.includes(ext)) return "Only PNG, JPG, GIF, or WebP images are allowed.";
  return null;
}
