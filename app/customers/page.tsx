"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import CsvUploader from "@/components/CsvUploader";
import StartLocationInput from "@/components/StartLocationInput";
import RouteResults from "@/components/RouteResults";
import { usePlanner } from "@/lib/usePlanner";
import { useCustomers } from "@/lib/CustomerContext";
import { useAuth } from "@/lib/useAuth";
import { Customer, StartLocation } from "@/lib/types";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Mode = "list" | "start" | "planning" | "result";
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
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
];
function avatarColor(id: string) {
  const n = id.split("-").pop();
  return AVATAR_COLORS[(parseInt(n ?? "0") % AVATAR_COLORS.length)];
}

function CustomersInner() {
  const { customers, loading, saving, mergeFromCsv, deleteCustomer } = useCustomers();
  const { user, signOut } = useAuth();
  const { state, progress, result, error, plan, reset } = usePlanner();

  const [mode, setMode] = useState<Mode>("list");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [start, setStart] = useState<StartLocation | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [mergeResult, setMergeResult] = useState<{ added: number; skipped: number } | null>(null);

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
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function toggleRow(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(sorted.length > 0 && selected.size === sorted.length ? new Set() : new Set(sorted.map((c) => c.id)));
  }

  function exportCsv() {
    const rows = sorted.filter((c) => selected.size === 0 || selected.has(c.id));
    const header = ["氏名", "会社名", "部署", "役職", "メールアドレス", "電話番号", "住所"];
    const lines = [header.join(","), ...rows.map((c) =>
      [displayName(c), c.company, c.department, c.title, c.email, c.phone, c.address]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    )];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "customers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvLoaded(loaded: Customer[]) {
    const r = await mergeFromCsv(loaded);
    setMergeResult(r);
    setShowUpload(false);
  }

  function handleStartPlan() {
    if (!start) return;
    const targets = customers.filter((c) => selected.has(c.id));
    if (targets.length === 0) return;
    setMode("planning");
    plan(start, targets).then(() => setMode("result"));
  }

  function handleReset() {
    reset();
    setMode("list");
    setStart(null);
    setSelected(new Set());
  }

  const selectedCount = selected.size;
  const allChecked = sorted.length > 0 && selectedCount === sorted.length;
  const isPlanning = state === "geocoding" || state === "routing";

  const nav = (
    <nav className="flex gap-1">
      <span className="px-2 sm:px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium whitespace-nowrap">
        <span className="inline sm:hidden">顧客</span>
        <span className="hidden sm:inline">顧客一覧</span>
        {customers.length > 0 && (
          <span className="ml-1.5 bg-white/20 text-white/80 text-[10px] px-1.5 py-0.5 rounded-full">{customers.length}</span>
        )}
      </span>
      <Link href="/map" className="px-2 sm:px-3 py-1.5 rounded-md text-white/60 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors whitespace-nowrap">
        <span className="inline sm:hidden">マップ</span>
        <span className="hidden sm:inline">顧客マップ</span>
      </Link>
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-0">
        <div className="max-w-7xl mx-auto flex items-center h-14 gap-2 sm:gap-4">
          <Link href="/customers" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <span className="hidden sm:inline text-base font-semibold tracking-tight">Route Planner</span>
          </Link>

          <div className="w-px h-5 bg-white/20 mx-1" />
          {nav}

          <div className="ml-auto flex items-center gap-2 border-l border-white/10 pl-3">
            {(mode === "start" || mode === "result") && (
              <button onClick={handleReset} className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span className="hidden sm:inline">一覧に戻る</span>
              </button>
            )}
            <span className="text-xs text-white/40 hidden sm:block truncate max-w-[140px]">{user?.email}</span>
            <button onClick={signOut} className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1" title="ログアウト">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── LIST MODE ── */}
      {mode === "list" && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              読み込み中…
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="mb-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900">顧客一覧</h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {filtered.length} / {customers.length} 件
                      {selectedCount > 0 && <span className="ml-2 text-blue-600 font-medium">{selectedCount} 件選択中</span>}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 flex-wrap">
                    <button onClick={() => setShowUpload((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors shadow-sm font-medium whitespace-nowrap">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      CSV
                    </button>
                    <button onClick={exportCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors shadow-sm font-medium whitespace-nowrap">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      <span className="hidden sm:inline">エクスポート</span>
                    </button>
                    {customers.length > 0 && (
                      <button
                        onClick={() => setMode("start")}
                        disabled={selectedCount === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm font-medium whitespace-nowrap">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                        </svg>
                        <span className="hidden sm:inline">ルートを計画{selectedCount > 0 ? `（${selectedCount}件）` : ""}</span>
                        <span className="inline sm:hidden">計画{selectedCount > 0 ? `(${selectedCount})` : ""}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* CSV upload panel */}
                {showUpload && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    {saving && <p className="text-xs text-blue-600 mb-2">保存中…</p>}
                    {mergeResult && (
                      <p className="text-xs text-emerald-600 mb-2">{mergeResult.added} 件追加（{mergeResult.skipped} 件スキップ）</p>
                    )}
                    <CsvUploader onCustomersLoaded={handleCsvLoaded} />
                  </div>
                )}

                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input type="text" placeholder="氏名・会社・住所・メール・電話で検索" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>
              </div>

              {customers.length === 0 ? (
                <div className="max-w-sm mx-auto text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-slate-700 mb-1">顧客データがありません</h2>
                  <p className="text-sm text-slate-400 mb-4">CSVボタンからアップロードしてください</p>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-2 pb-4">
                    {sorted.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-sm">該当する顧客が見つかりません</div>
                    ) : sorted.map((customer) => (
                      <div key={customer.id}
                        className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-colors ${selected.has(customer.id) ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}
                        onClick={() => toggleRow(customer.id)}>
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={selected.has(customer.id)} onChange={() => toggleRow(customer.id)}
                            className="w-4 h-4 rounded accent-blue-600 mt-1 shrink-0" onClick={(e) => e.stopPropagation()} />
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(customer.id)}`}>{initials(customer)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 text-sm">{displayName(customer)}</div>
                            {customer.company && <div className="text-xs text-slate-500 mt-0.5 truncate">{customer.company}</div>}
                            {customer.address && <div className="text-xs text-slate-400 mt-1 truncate">{customer.address}</div>}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {customer.email && <a href={`mailto:${customer.email}`} className="text-blue-600 text-xs truncate max-w-[160px]" onClick={(e) => e.stopPropagation()}>{customer.email}</a>}
                              {customer.phone && <span className="text-xs text-slate-500">{customer.phone}</span>}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteCustomer(customer.id); }}
                            className="shrink-0 text-slate-300 hover:text-red-500 transition-colors" title="削除">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedCount > 0 && (
                      <button onClick={() => setSelected(new Set())} className="text-xs text-blue-500 hover:text-blue-700 transition-colors">選択を解除</button>
                    )}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="w-10 px-4 py-3.5">
                              <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 rounded accent-blue-600" />
                            </th>
                            {COLUMNS.map((col) => (
                              <th key={col.key} onClick={() => handleSort(col.key)}
                                className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 whitespace-nowrap select-none transition-colors">
                                <span className="flex items-center gap-1">
                                  {col.label}
                                  {sortKey === col.key ? (
                                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      {sortDir === "asc" ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />}
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
                            <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">該当する顧客が見つかりません</td></tr>
                          ) : sorted.map((customer) => (
                            <tr key={customer.id} onClick={() => toggleRow(customer.id)}
                              className={`cursor-pointer transition-colors ${selected.has(customer.id) ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-slate-50"}`}>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selected.has(customer.id)} onChange={() => toggleRow(customer.id)} className="w-4 h-4 rounded accent-blue-600" />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(customer.id)}`}>{initials(customer)}</div>
                                  <span className="font-medium text-slate-800">{displayName(customer)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">{customer.company || <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{customer.department || <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-3 max-w-[120px] truncate">
                                {customer.title ? <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{customer.title}</span> : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{customer.address || <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-3 max-w-[180px] truncate">
                                {customer.email ? <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline text-xs" onClick={(e) => e.stopPropagation()}>{customer.email}</a> : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{customer.phone || <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => deleteCustomer(customer.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="削除">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
                      <span>合計 <span className="font-medium text-slate-600">{customers.length}</span> 件</span>
                      {selectedCount > 0 && (
                        <button onClick={() => setSelected(new Set())} className="text-blue-500 hover:text-blue-700 transition-colors">選択を解除</button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      )}

      {/* ── START MODE: enter start location ── */}
      {mode === "start" && (
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
          <div className="mb-4 flex items-center gap-3">
            <button onClick={() => setMode("list")} className="text-slate-500 hover:text-slate-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <h2 className="text-base font-semibold text-slate-800">出発地を入力</h2>
              <p className="text-xs text-slate-400">{selectedCount} 件の顧客を訪問します</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-4">
            <StartLocationInput onLocationSet={setStart} loading={false} />
          </div>

          <button onClick={handleStartPlan} disabled={!start}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            最適ルートを計算する（{selectedCount} 件）
          </button>
        </main>
      )}

      {/* ── PLANNING MODE: progress ── */}
      {mode === "planning" && isPlanning && (
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-xs w-full">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
              <svg className="animate-spin w-20 h-20 text-blue-100" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75 text-blue-600" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <svg className="absolute w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            {state === "geocoding" ? (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">住所を地図上に配置中…</h2>
                <p className="text-sm text-slate-400 mb-4">{progress.done} / {progress.total} 件</p>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">最適ルートを計算中…</h2>
                <p className="text-sm text-slate-400">Google Maps で最短経路を算出しています</p>
              </>
            )}
          </div>
        </main>
      )}

      {/* ── ERROR ── */}
      {mode === "planning" && state === "error" && error && (
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">エラーが発生しました</h2>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <button onClick={() => setMode("start")} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium">
              戻る
            </button>
          </div>
        </main>
      )}

      {/* ── RESULT MODE ── */}
      {mode === "result" && result && start && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 lg:h-[calc(100vh-80px)] min-h-[520px]">
            <div className="overflow-y-auto bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <RouteResults result={result} start={start} onReset={handleReset} />
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm min-h-[300px] lg:min-h-0">
              <RouteMap result={result} start={start} />
            </div>
          </div>
        </main>
      )}
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
