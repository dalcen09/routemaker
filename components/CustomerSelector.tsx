"use client";

import { useState, useMemo } from "react";
import { Customer } from "@/lib/types";

interface Props {
  customers: Customer[];
  selected: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onReset: () => void;
}

export default function CustomerSelector({ customers, selected, onSelectionChange, onReset }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.lastName.toLowerCase().includes(q) ||
        c.firstName.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [customers, search]);

  function toggleAll() {
    if (selected.size === customers.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(customers.map((c) => c.id)));
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  const allSelected = selected.size === customers.length && customers.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">訪問先を選択</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {customers.length} 件中{" "}
            <span className="text-blue-600 font-medium">{selected.size} 件</span> を選択中
          </p>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          CSV を再読み込み
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="名前・会社名・住所で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        <button
          onClick={toggleAll}
          className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors whitespace-nowrap"
        >
          {allSelected ? "全解除" : "全選択"}
        </button>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">該当する連絡先がありません</div>
        ) : (
          filtered.map((customer) => (
            <label
              key={customer.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                ${selected.has(customer.id) ? "bg-blue-50" : "hover:bg-slate-50"}`}
            >
              <input
                type="checkbox"
                checked={selected.has(customer.id)}
                onChange={() => toggle(customer.id)}
                className="w-4 h-4 rounded accent-blue-600 shrink-0"
              />
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                {(customer.lastName?.[0] || customer.firstName?.[0] || "?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-slate-800 text-sm">
                    {customer.lastName} {customer.firstName}
                  </span>
                  {customer.company && (
                    <span className="text-xs text-slate-400 truncate">{customer.company}</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{customer.address}</p>
              </div>
              {selected.has(customer.id) && (
                <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              )}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
