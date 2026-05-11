"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCustomers } from "@/lib/CustomerContext";
import { Customer } from "@/lib/types";

type SortKey = keyof Pick<Customer, "lastName" | "company" | "department" | "title" | "address">;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "lastName", label: "氏名" },
  { key: "company", label: "会社名" },
  { key: "department", label: "部署" },
  { key: "title", label: "役職" },
  { key: "address", label: "住所" },
];

function displayName(c: Customer) {
  return [c.lastName, c.firstName].filter(Boolean).join(" ");
}

export default function CustomersPage() {
  const { customers } = useCustomers();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        !q ||
        displayName(c).toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
    );
  }, [customers, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (sortKey === "lastName" ? displayName(a) : a[sortKey]) ?? "";
      const bv = (sortKey === "lastName" ? displayName(b) : b[sortKey]) ?? "";
      return sortDir === "asc" ? av.localeCompare(bv, "ja") : bv.localeCompare(av, "ja");
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === sorted.length && sorted.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((c) => c.id)));
    }
  }

  function exportCsv() {
    const rows = sorted.filter((c) => selected.size === 0 || selected.has(c.id));
    const header = ["氏名", "会社名", "部署", "役職", "メールアドレス", "電話番号", "住所"];
    const lines = [
      header.join(","),
      ...rows.map((c) =>
        [displayName(c), c.company, c.department, c.title, c.email, c.phone, c.address]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const allChecked = sorted.length > 0 && selected.size === sorted.length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Route Planner</h1>
            <p className="text-xs text-gray-500">最適訪問ルートを作成</p>
          </div>
          <nav className="ml-6 flex gap-4 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-800">
              ルート計画
            </Link>
            <span className="text-blue-600 font-medium border-b-2 border-blue-600 pb-0.5">
              顧客一覧
            </span>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {customers.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📇</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">顧客データがありません</h2>
            <p className="text-gray-500 mb-6">まず Eight の CSV をアップロードしてください</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium"
            >
              CSV をアップロードする
            </Link>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex-1 min-w-52">
                <input
                  type="text"
                  placeholder="氏名・会社・住所・メール・電話で検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-sm text-gray-500">
                {filtered.length} / {customers.length} 件
                {selected.size > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">{selected.size} 件選択中</span>
                )}
              </div>
              <button
                onClick={exportCsv}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-1.5"
              >
                ⬇ CSV エクスポート{selected.size > 0 ? ` (${selected.size} 件)` : ""}
              </button>
              <Link
                href="/"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ルートを計画する
              </Link>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={toggleAll}
                          className="w-4 h-4 accent-blue-600"
                        />
                      </th>
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap select-none"
                          onClick={() => handleSort(col.key)}
                        >
                          {col.label}
                          <SortIcon col={col.key} />
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                        メール
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                        電話番号
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                          該当する顧客が見つかりません
                        </td>
                      </tr>
                    ) : (
                      sorted.map((customer) => (
                        <tr
                          key={customer.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            selected.has(customer.id) ? "bg-blue-50" : ""
                          }`}
                          onClick={() => toggleRow(customer.id)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(customer.id)}
                              onChange={() => toggleRow(customer.id)}
                              className="w-4 h-4 accent-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{displayName(customer)}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">
                            {customer.company}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">
                            {customer.department}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                            {customer.title}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                            {customer.address}
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">
                            {customer.email ? (
                              <a
                                href={`mailto:${customer.email}`}
                                className="text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {customer.email}
                              </a>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {customer.phone || <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex justify-between">
                <span>合計 {customers.length} 件の顧客</span>
                {selected.size > 0 && (
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    選択を解除
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
