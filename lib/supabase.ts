import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
