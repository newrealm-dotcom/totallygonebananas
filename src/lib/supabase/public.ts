import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

/**
 * Cookie-free anon client for public, cacheable reads (published recipes/posts).
 * Safe for generateStaticParams / ISR — does not call cookies().
 */
export function createPublicClient(): SupabaseClient {
  const { url, key } = getSupabaseEnv();
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
