"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useCustomers } from "@/lib/CustomerContext";
import { useAuth } from "@/lib/useAuth";
import { Customer } from "@/lib/types";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import DeleteAccountModal from "@/components/DeleteAccountModal";

const CustomersMap = dynamic(() => import("@/components/CustomersMap"), { ssr: false });

function displayName(c: Customer) {
  return [c.lastName, c.firstName].filter(Boolean).join(" ");
}

function MapInner() {
  const { customers, loading } = useCustomers();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function removeSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleGenerateRoute() {
    router.push(`/customers?selected=${encodeURIComponent([...selected].join(","))}`);
  }

  const selectedCustomers = customers.filter((c) => selected.has(c.id));

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-0 shrink-0">
        <div className="max-w-7xl mx-auto w-full flex items-center h-14 gap-2 sm:gap-4">
          <Link href="/customers" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <span className="hidden sm:inline text-base font-semibold tracking-tight">Route Planner</span>
          </Link>

          <div className="w-px h-5 bg-white/20 mx-1" />

          <nav className="flex gap-1">
            <Link href="/customers" className="px-2 sm:px-3 py-1.5 rounded-md text-white/60 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors whitespace-nowrap">
              <span className="inline sm:hidden">顧客</span>
              <span className="hidden sm:inline">顧客一覧</span>
              {customers.length > 0 && (
                <span className="ml-1.5 bg-white/20 text-white/80 text-[10px] px-1.5 py-0.5 rounded-full">{customers.length}</span>
              )}
            </Link>
            <span className="px-2 sm:px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium whitespace-nowrap">
              <span className="inline sm:hidden">マップ</span>
              <span className="hidden sm:inline">顧客マップ</span>
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-2 border-l border-white/10 pl-3">
            <span className="text-xs text-white/40 hidden sm:block truncate max-w-[140px]">{user?.email}</span>
            <button onClick={() => setShowChangePassword(true)} className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1" title="パスワード変更">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </button>
            <button
              onClick={signOut}
              className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
              title="ログアウト"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <div className="flex-1 relative min-w-0">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              顧客データを読み込み中…
            </div>
          ) : customers.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <p className="text-slate-500 text-sm mb-4">顧客データがありません</p>
              <Link href="/customers" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                CSVをアップロードする
              </Link>
            </div>
          ) : (
            <CustomersMap
              customers={customers}
              selected={selected}
              onToggle={toggleSelected}
            />
          )}
        </div>

        {/* Selection sidebar — desktop only */}
        {selected.size > 0 && (
          <div className="hidden md:flex flex-col w-72 shrink-0 bg-white border-l border-slate-200 shadow-lg">
            {/* Sidebar header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-800">{selected.size} 件選択中</span>
              </div>
              <button
                onClick={clearSelection}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                全て解除
              </button>
            </div>

            {/* Customer list */}
            <div className="flex-1 overflow-y-auto py-2">
              {selectedCustomers.map((c) => (
                <div key={c.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 group">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{displayName(c)}</div>
                    {c.company && (
                      <div className="text-xs text-slate-400 truncate mt-0.5">{c.company}</div>
                    )}
                    {c.address && (
                      <div className="text-xs text-slate-400 truncate mt-0.5">{c.address}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeSelected(c.id)}
                    className="shrink-0 mt-0.5 w-5 h-5 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="選択を解除"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Generate route button */}
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={handleGenerateRoute}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
                ルートを生成
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {selected.size > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-50 flex flex-col max-h-[50vh]">
          {/* Sheet header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-800">{selected.size} 件選択中</span>
            </div>
            <button
              onClick={clearSelection}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              全て解除
            </button>
          </div>

          {/* Customer list */}
          <div className="flex-1 overflow-y-auto py-2">
            {selectedCustomers.map((c) => (
              <div key={c.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{displayName(c)}</div>
                  {c.company && (
                    <div className="text-xs text-slate-400 truncate mt-0.5">{c.company}</div>
                  )}
                  {c.address && (
                    <div className="text-xs text-slate-400 truncate mt-0.5">{c.address}</div>
                  )}
                </div>
                <button
                  onClick={() => removeSelected(c.id)}
                  className="shrink-0 mt-0.5 w-5 h-5 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                  title="選択を解除"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Generate route button */}
          <div className="p-4 border-t border-slate-100 shrink-0">
            <button
              onClick={handleGenerateRoute}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
              ルートを生成
            </button>
          </div>
        </div>
      )}

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />}
    </div>
  );
}

export default function MapPage() {
  return (
    <AppShell>
      <MapInner />
    </AppShell>
  );
}
