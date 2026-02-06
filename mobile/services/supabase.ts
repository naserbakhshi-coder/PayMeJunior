/**
 * Supabase client for direct storage access
 */
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/constants/config";

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Get the public URL for a receipt image stored in Supabase
 */
export function getReceiptUrl(path: string): string {
  if (!path) return "";

  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export default supabase;
