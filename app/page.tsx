"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import CsvUploader from "@/components/CsvUploader";
import CustomerSelector from "@/components/CustomerSelector";
import StartLocationInput from "@/components/StartLocationInput";
import RouteResults from "@/components/RouteResults";
import { usePlanner } from "@/lib/usePlanner";
import { useCustomers } from "@/lib/CustomerContext";
import { useAuth } from "@/lib/useAuth";
import { Customer, StartLocation } from "@/lib/types";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Step = "upload" | "select" | "plan" | "result";

const STEPS = [
  { key: "select", label: "訪問先選択" },
  { key: "plan",   label: "ルート計算" },
  { key: "result", label: "結果" },
] as const;

function RoutePlannerInner() {
  const [step, setStep] = useState<Step>("upload");
  const { customers, loading, saving, mergeFromCsv } = useCustomers();
  const { user, signOut } = useAuth();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeResult, setMergeResult] = useState<{ added: number; skipped: number } | null>(null);
  const [start, setStart] = useState<StartLocation | null>(null);
  const { state, progress, result, error, plan, reset } = usePlanner();

  // When arriving from the customers page with ?selected=id1,id2,...
  useEffect(() => {
    if (loading) return;
    const param = searchParams.get("selected");
    if (!param || customers.length === 0) return;
    const ids = new Set(param.split(",").filter(Boolean));
    const valid = new Set([...ids].filter((id) => customers.some((c) => c.id === id)));
    if (valid.size > 0) {
      setSelected(valid);
      setStep("select");
    }
  }, [loading, customers, searchParams]);

  async function handleCustomersLoaded(loaded: Customer[]) {
    const r = await mergeFromCsv(loaded);
    setMergeResult(r);
    setSelected(new Set(customers.map((c) => c.id)));
    setStep("select");
  }

  function handleStartPlan() {
    const selectedCustomers = customers.filter((c) => selected.has(c.id));
    if (!start || selectedCustomers.length === 0) return;
    plan(start, selectedCustomers).then(() => setStep("result"));
    setStep("plan");
  }

  function handleFullReset() {
    reset();
    setSelected(new Set());
    setStart(null);
    setMergeResult(null);
    setStep("upload");
  }

  const isPlanning = state === "geocoding" || state === "routing";
  const activeStepIndex = step === "select" ? 0 : step === "plan" ? 1 : step === "result" ? 2 : -1;

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

          <nav className="flex gap-1">
            <span className="px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium">
              ルート計画
            </span>
            <Link href="/customers" className="px-3 py-1.5 rounded-md text-white/60 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors">
              顧客一覧
              {customers.length > 0 && (
                <span className="ml-1.5 bg-white/20 text-white/80 text-[10px] px-1.5 py-0.5 rounded-full">{customers.length}</span>
              )}
            </Link>
            <Link href="/map" className="px-3 py-1.5 rounded-md text-white/60 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors">
              顧客マップ
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {step !== "upload" && (
              <button
                onClick={handleFullReset}
                className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                最初からやり直す
              </button>
            )}
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
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
        </div>
      </header>

      {/* Step progress bar */}
      {step !== "upload" && (
        <div className="bg-white border-b border-slate-200 px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-0 py-3">
            {STEPS.map((s, i) => {
              const done = i < activeStepIndex;
              const active = i === activeStepIndex;
              return (
                <div key={s.key} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                      ${done ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                      {done
                        ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${active ? "text-blue-600" : done ? "text-emerald-600" : "text-slate-400"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`mx-3 h-px w-12 transition-colors ${done ? "bg-emerald-300" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-200">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">訪問ルートを計画しましょう</h2>
              <p className="text-slate-500 text-sm">名刺登録アプリからエクスポートした CSV をアップロードしてください</p>
            </div>

            {/* Quick-start if already have customers */}
            {!loading && customers.length > 0 && (
              <div className="mb-5 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    保存済みの顧客データがあります
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{customers.length} 件 — CSV をアップロードせずにそのまま計画できます</p>
                </div>
                <button
                  onClick={() => {
                    setSelected(new Set(customers.map((c) => c.id)));
                    setStep("select");
                  }}
                  className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors shadow-sm"
                >
                  そのまま計画する
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                顧客データを読み込み中…
              </div>
            ) : (
              <>
                {saving && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Supabase に保存中…
                  </div>
                )}
                {mergeResult && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    {mergeResult.added} 件を追加しました（{mergeResult.skipped} 件は重複のためスキップ）
                  </div>
                )}
                <CsvUploader onCustomersLoaded={handleCustomersLoaded} />
              </>
            )}
          </div>
        )}

        {/* Step: Select + configure */}
        {step === "select" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <CustomerSelector
                customers={customers}
                selected={selected}
                onSelectionChange={setSelected}
                onReset={() => setStep("upload")}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <StartLocationInput onLocationSet={setStart} loading={false} />
            </div>

            <button
              onClick={handleStartPlan}
              disabled={!start || selected.size === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
              最適ルートを計算する（{selected.size} 件）
            </button>
          </div>
        )}

        {/* Step: Planning */}
        {step === "plan" && isPlanning && (
          <div className="max-w-sm mx-auto text-center py-20">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
              <svg className="animate-spin w-20 h-20 text-blue-100" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75 text-blue-600" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <svg className="absolute w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            {state === "geocoding" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">住所を地図上に配置中…</h2>
                <p className="text-sm text-slate-400 mb-5">{progress.done} / {progress.total} 件</p>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </>
            )}
            {state === "routing" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">最適ルートを計算中…</h2>
                <p className="text-sm text-slate-400">Google Maps で最短経路を算出しています</p>
              </>
            )}
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && result && start && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-148px)] min-h-[520px]">
            <div className="overflow-y-auto bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <RouteResults result={result} start={start} onReset={handleFullReset} />
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm min-h-[400px]">
              <RouteMap result={result} start={start} />
            </div>
          </div>
        )}

        {/* Error */}
        {step === "result" && state === "error" && error && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">エラーが発生しました</h2>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <button
              onClick={() => { reset(); setStep("select"); }}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              戻る
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AppShell>
      <Suspense>
        <RoutePlannerInner />
      </Suspense>
    </AppShell>
  );
}
