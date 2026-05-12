"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useCustomers } from "@/lib/CustomerContext";
import { useAuth } from "@/lib/useAuth";
import { Customer } from "@/lib/types";

type SortKey = keyof Pick<Customer, "lastName" | "company" | "department" | "title" | "address">;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "lastName",   label: "氏名" },
  { key: "company",    label: "会社名" },
  { key: "department", label: "部署" },
  { key: "title",      label: "役職" },
  { key: "address",    label: "住所" },
];

function displayName(c: Customer) {
  return [c.lastName, c.firstName].filter(Boolean).join(" ");
}

function initials(c: Customer) {
  return (c.lastName?.[0] || c.firstName?.[0] || "?").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

function avatarColor(id: string) {
  const n = id.split("-").pop();
  return AVATAR_COLORS[(parseInt(n ?? "0") % AVATAR_COLORS.length)];
}

function CustomersInner() {
  const { customers, loading, deleteCustomer } = useCustomers();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function handlePlanRoute() {
    const ids = selected.size > 0
      ? [...selected].join(",")
      : customers.map((c) => c.id).join(",");
    router.push(`/?selected=${encodeURIComponent(ids)}`);
  }

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

  const allChecked = sorted.length > 0 && selected.size === sorted.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-0">
        <div className="max-w-7xl mx-auto flex items-center h-14 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight">Route Planner</span>
          </div>

          <div className="w-px h-5 bg-white/20 mx-1" />

          <nav className="flex gap-1 text-sm">
            <Link href="/" className="px-3 py-1.5 rounded-md text-white/60 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors">
              ルート計画
            </Link>
            <span className="px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium">
              顧客一覧
              {customers.length > 0 && (
                <span className="ml-1.5 bg-white/20 text-white/80 text-[10px] px-1.5 py-0.5 rounded-full">{customers.length}</span>
              )}
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-2 border-l border-white/10 pl-3">
            <span className="text-xs text-white/40 hidden sm:block truncate max-w-[140px]">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
              title="ログアウト"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            顧客データを読み込み中…
          </div>
        ) : customers.length === 0 ? (
          <div className="max-w-sm mx-auto text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-1">顧客データがありません</h2>
            <p className="text-sm text-slate-400 mb-6">まず名刺登録アプリの CSV をアップロードしてください</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              ルート計画へ
            </Link>
          </div>
        ) : (
          <>
            {/* Page title + toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">顧客一覧</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filtered.length} / {customers.length} 件表示
                  {selected.size > 0 && <span className="ml-2 text-blue-600 font-medium">{selected.size} 件選択中</span>}
                </p>
              </div>

              <div className="flex-1 min-w-56 ml-auto">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="氏名・会社・住所・メール・電話で検索"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                  />
                </div>
              </div>

              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors shadow-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                CSV エクスポート{selected.size > 0 ? ` (${selected.size})` : ""}
              </button>

              <button
                onClick={handlePlanRoute}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
                ルートを計画する{selected.size > 0 ? `（${selected.size} 件）` : ""}
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="w-10 px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={toggleAll}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                      </th>
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 whitespace-nowrap select-none transition-colors"
                          onClick={() => handleSort(col.key)}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {sortKey === col.key ? (
                              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                {sortDir === "asc"
                                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                  : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />}
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                              </svg>
                            )}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">メール</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">電話番号</th>
                      <th className="w-10 px-4 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sorted.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">
                          該当する顧客が見つかりません
                        </td>
                      </tr>
                    ) : (
                      sorted.map((customer) => (
                        <tr
                          key={customer.id}
                          className={`cursor-pointer transition-colors ${
                            selected.has(customer.id)
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-slate-50"
                          }`}
                          onClick={() => toggleRow(customer.id)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(customer.id)}
                              onChange={() => toggleRow(customer.id)}
                              className="w-4 h-4 rounded accent-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(customer.id)}`}>
                                {initials(customer)}
                              </div>
                              <span className="font-medium text-slate-800">{displayName(customer)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">{customer.company || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{customer.department || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 max-w-[120px] truncate">
                            {customer.title ? (
                              <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{customer.title}</span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{customer.address || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 max-w-[180px] truncate">
                            {customer.email ? (
                              <a
                                href={`mailto:${customer.email}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {customer.email}
                              </a>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {customer.phone || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => deleteCustomer(customer.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                              title="削除"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
                <span>合計 <span className="font-medium text-slate-600">{customers.length}</span> 件の顧客</span>
                {selected.size > 0 && (
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-blue-500 hover:text-blue-700 transition-colors"
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

export default function CustomersPage() {
  return (
    <AppShell>
      <CustomersInner />
    </AppShell>
  );
}
