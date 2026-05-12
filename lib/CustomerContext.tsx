"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase, DbCustomer } from "./supabase";
import { Customer } from "./types";

interface CustomerContextValue {
  customers: Customer[];
  loading: boolean;
  saving: boolean;
  mergeFromCsv: (incoming: Customer[]) => Promise<{ added: number; skipped: number }>;
  setCustomers: (customers: Customer[]) => void;
  deleteCustomer: (id: string) => Promise<void>;
  refreshCustomers: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextValue>({
  customers: [],
  loading: false,
  saving: false,
  mergeFromCsv: async () => ({ added: 0, skipped: 0 }),
  setCustomers: () => {},
  deleteCustomer: async () => {},
  refreshCustomers: async () => {},
});

function dbToCustomer(row: DbCustomer): Customer {
  return {
    id: row.id,
    lastName: row.last_name,
    firstName: row.first_name,
    company: row.company,
    department: row.department,
    title: row.title,
    email: row.email,
    phone: row.phone,
    address: row.address,
  };
}

function dedupeKey(c: Customer | DbCustomer): string {
  const name = "last_name" in c
    ? `${c.last_name} ${c.first_name}`
    : `${c.lastName} ${c.firstName}`;
  const company = c.company ?? "";
  return `${name.trim().toLowerCase()}||${company.trim().toLowerCase()}`;
}

export function CustomerProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: User | null;
}) {
  const [customers, setCustomersState] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshCustomers = useCallback(async () => {
    if (!user) { setCustomersState([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setCustomersState((data as DbCustomer[]).map(dbToCustomer));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCustomers();
  }, [refreshCustomers]);

  // Merge incoming CSV customers into Supabase, skipping exact duplicates.
  // Dedup key: normalised(full name) + normalised(company)
  async function mergeFromCsv(
    incoming: Customer[]
  ): Promise<{ added: number; skipped: number }> {
    if (!user) return { added: 0, skipped: 0 };
    setSaving(true);
    try {
      // Fetch current set of keys from DB
      const { data: existing } = await supabase
        .from("customers")
        .select("last_name, first_name, company");

      const existingKeys = new Set(
        (existing as Pick<DbCustomer, "last_name" | "first_name" | "company">[] ?? []).map(
          (r) => dedupeKey(r as DbCustomer)
        )
      );

      const toInsert = incoming.filter(
        (c) => !existingKeys.has(dedupeKey(c))
      );

      if (toInsert.length > 0) {
        const rows = toInsert.map((c) => ({
          user_id: user.id,
          last_name: c.lastName,
          first_name: c.firstName,
          company: c.company,
          department: c.department,
          title: c.title,
          email: c.email,
          phone: c.phone,
          address: c.address,
        }));

        const { error } = await supabase.from("customers").insert(rows);
        if (error) throw error;
      }

      await refreshCustomers();
      return { added: toInsert.length, skipped: incoming.length - toInsert.length };
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: string) {
    await supabase.from("customers").delete().eq("id", id);
    setCustomersState((prev) => prev.filter((c) => c.id !== id));
  }

  function setCustomers(cs: Customer[]) {
    setCustomersState(cs);
  }

  return (
    <CustomerContext.Provider
      value={{ customers, loading, saving, mergeFromCsv, setCustomers, deleteCustomer, refreshCustomers }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  return useContext(CustomerContext);
}
