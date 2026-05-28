// Lightweight client-side image optimization before upload.
// Resizes to a max edge and re-encodes as WebP (fallback JPEG) to keep storage light.
export async function compressImage(
  file: File,
  opts: { maxEdge?: number; quality?: number; mime?: "image/webp" | "image/jpeg" } = {}
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const { maxEdge = 1600, quality = 0.82, mime = "image/webp" } = opts;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, mime, quality));
    if (!blob) return file;
    const ext = mime === "image/webp" ? "webp" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
    return new File([blob], name, { type: mime });
  } catch {
    return file;
  }
}
