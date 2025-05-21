// src/lib/supabaseClient.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ffoiyyckemejdvqizxez.supabase.co"; // SİZİN SUPERBASE URL-İNİZ
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmb2l5eWNrZW1lamR2cWl6eGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTA3NjgsImV4cCI6MjA2Mjk2Njc2OH0.xJdAH2Ca18ZbvOCLPtFQCbgUfVi7W30TtiOWR1eq_J4"; // SİZİN ANON AÇARINIZ

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});