import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const SIGNED_URL_BATCH_SIZE = 100;

export async function createPropertyImageUrlMap(paths: string[], expiresInSeconds = 3600) {
  const supabase = await createSupabaseServerClient();
  const signedUrls = new Map<string, string>();

  for (let offset = 0; offset < paths.length; offset += SIGNED_URL_BATCH_SIZE) {
    const batch = paths.slice(offset, offset + SIGNED_URL_BATCH_SIZE);
    const { data, error } = await supabase.storage
      .from("property-images")
      .createSignedUrls(batch, expiresInSeconds);
    if (error) {
      console.error("[properties] No se pudieron preparar algunas fotografías", { code: error.name });
      continue;
    }
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
    }
  }

  return signedUrls;
}
