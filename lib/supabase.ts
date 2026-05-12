import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://yubywrblmtexscjknbsy.supabase.co";

const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1Ynl3cmJsbXRleHNjamtuYnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjUxNjEsImV4cCI6MjA5NDEwMTE2MX0.xSGSwNJktLGzUfsKXv7rbfeLbKMJs_ekNbShd3nUf2M";

export const supabase = createClient(url, key);

export type DbCustomer = {
  id: string;
  user_id: string;
  last_name: string;
  first_name: string;
  company: string;
  department: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
};
