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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">訪問先を選択</h2>
          <p className="text-sm text-gray-500">{customers.length} 件の連絡先 · {selected.size} 件選択中</p>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          CSVを再読み込み
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="名前・会社名・住所で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={toggleAll}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {allSelected ? "全解除" : "全選択"}
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">該当する連絡先がありません</div>
        ) : (
          filtered.map((customer) => (
            <label
              key={customer.id}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0
                ${selected.has(customer.id) ? "bg-blue-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected.has(customer.id)}
                onChange={() => toggle(customer.id)}
                className="mt-0.5 w-4 h-4 accent-blue-600"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-gray-900 text-sm">
                    {customer.lastName} {customer.firstName}
                  </span>
                  {customer.company && (
                    <span className="text-xs text-gray-500 truncate">{customer.company}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{customer.address}</p>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
