import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

import { appStorage } from "../src/mobile/utils/appStorage";

function readRequiredEnv(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to initialize Supabase.`);
  }
  return value;
}

const supabaseUrl = readRequiredEnv("EXPO_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = readRequiredEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: appStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
