"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useCustomers } from "@/lib/CustomerContext";
import { useAuth } from "@/lib/useAuth";

const CustomersMap = dynamic(() => import("@/components/CustomersMap"), { ssr: false });

function MapInner() {
  const { customers, loading } = useCustomers();
  const { user, signOut } = useAuth();

  return (
    <div className="h-screen flex flex-col bg-slate-50">
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

          <nav className="flex gap-1">
            <Link href="/" className="px-3 py-1.5 rounded-md text-white/60 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors">
              ルート計画
            </Link>
            <Link href="/customers" className="px-3 py-1.5 rounded-md text-white/60 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors">
              顧客一覧
              {customers.length > 0 && (
                <span className="ml-1.5 bg-white/20 text-white/80 text-[10px] px-1.5 py-0.5 rounded-full">{customers.length}</span>
              )}
            </Link>
            <span className="px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium">
              顧客マップ
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

      <main className="flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            顧客データを読み込み中…
          </div>
        ) : customers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm mb-4">顧客データがありません</p>
            <Link href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
              CSVをアップロードする
            </Link>
          </div>
        ) : (
          <div className="flex-1 relative">
            <CustomersMap customers={customers} />
          </div>
        )}
      </main>
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
