import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { appStorage } from '../src/mobile/utils/appStorage';

const supabaseUrl = 'https://qtouztmyuemwxxtmaqjm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0b3V6dG15dWVtd3h4dG1hcWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjM5ODEsImV4cCI6MjA5MDYzOTk4MX0.NYu6ic3r_jtJyGl_WqaufHvqOmaBLomilN1SzVdklwA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: appStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
