import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";

// Ré-ancre les octets (évite "Failed to fetch" sur mobile quand le File devient invalide)
// et nettoie le nom de fichier (ASCII + tirets) pour éviter les soucis d'URL/headers.
function sanitizeName(name: string) {
  const ext = (name.match(/\.[^.]+$/)?.[0] || "").toLowerCase();
  const base = name.replace(/\.[^.]+$/, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) || "file";
  return base + ext;
}

export async function safeUpload(
  bucket: string,
  pathPrefix: string,
  file: File,
  opts: { compress?: boolean } = {}
): Promise<string> {
  let f = file;
  if (opts.compress !== false && file.type.startsWith("image/")) {
    try { f = await compressImage(file); } catch { /* ignore */ }
  }
  // Ré-ancre via ArrayBuffer pour éviter les File invalidés sur Android
  const buf = await f.arrayBuffer();
  const blob = new Blob([buf], { type: f.type || "application/octet-stream" });
  const safe = sanitizeName(f.name);
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
