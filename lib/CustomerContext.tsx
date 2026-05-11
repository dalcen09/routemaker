"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Customer } from "@/lib/types";

interface CustomerContextValue {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
}

const CustomerContext = createContext<CustomerContextValue>({
  customers: [],
  setCustomers: () => {},
});

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  return (
    <CustomerContext.Provider value={{ customers, setCustomers }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  return useContext(CustomerContext);
}
