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

/**
 * Lit immédiatement le contenu du fichier en mémoire (ArrayBuffer) et renvoie
 * un nouveau File détaché du système de fichiers. Évite l'erreur Android
 * "The requested file could not be read" lorsque la référence File devient
 * invalide entre la sélection et le submit.
 *
 * Si c'est une image, on la compresse + convertit en WebP au passage afin
 * d'optimiser systématiquement toute image uploadée dans l'application.
 */
export async function materializeFile(file: File): Promise<File> {
  try {
    if (file.type.startsWith("image/")) {
      // compressImage lit déjà les octets via createImageBitmap → mémoire.
      const compressed = await compressImage(file);
      if (compressed !== file) return compressed;
    }
    const buf = await file.arrayBuffer();
    return new File([buf], file.name, { type: file.type || "application/octet-stream" });
  } catch {
    // En dernier recours, on retourne la référence d'origine.
    return file;
  }
}
