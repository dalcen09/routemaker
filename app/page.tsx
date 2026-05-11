"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import CsvUploader from "@/components/CsvUploader";
import CustomerSelector from "@/components/CustomerSelector";
import StartLocationInput from "@/components/StartLocationInput";
import RouteResults from "@/components/RouteResults";
import { usePlanner } from "@/lib/usePlanner";
import { Customer, StartLocation } from "@/lib/types";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Step = "upload" | "select" | "plan" | "result";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [start, setStart] = useState<StartLocation | null>(null);
  const { state, progress, result, error, plan, reset } = usePlanner();

  function handleCustomersLoaded(loaded: Customer[]) {
    setCustomers(loaded);
    setSelected(new Set(loaded.map((c) => c.id)));
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
    setCustomers([]);
    setSelected(new Set());
    setStart(null);
    setStep("upload");
  }

  const isPlanning = state === "geocoding" || state === "routing";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">RouteMaker</h1>
            <p className="text-xs text-gray-500">Eight 名刺 CSV から最適訪問ルートを作成</p>
          </div>
          {step !== "upload" && (
            <button
              onClick={handleFullReset}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700 underline"
            >
              最初からやり直す
            </button>
          )}
        </div>
      </header>

      {/* Step indicator */}
      {step !== "upload" && (
        <div className="bg-white border-b border-gray-100 px-6 py-2">
          <div className="max-w-7xl mx-auto flex gap-6 text-sm">
            {(["select", "plan", "result"] as const).map((s, i) => {
              const labels = ["① 訪問先選択", "② ルート計算中", "③ 結果"];
              const active = step === s || (step === "result" && s !== "plan");
              return (
                <span key={s} className={active ? "text-blue-600 font-medium" : "text-gray-400"}>
                  {labels[i]}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">訪問ルートを計画しましょう</h2>
              <p className="text-gray-500">Eight からエクスポートした名刺 CSV をアップロードしてください</p>
            </div>
            <CsvUploader onCustomersLoaded={handleCustomersLoaded} />
          </div>
        )}

        {/* Step: Select + configure */}
        {step === "select" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <CustomerSelector
                customers={customers}
                selected={selected}
                onSelectionChange={setSelected}
                onReset={() => setStep("upload")}
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <StartLocationInput
                onLocationSet={setStart}
                loading={false}
              />
              {start && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                  ✓ 出発地を確認しました: {start.address}
                </div>
              )}
            </div>

            <button
              onClick={handleStartPlan}
              disabled={!start || selected.size === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl text-base transition-colors"
            >
              最適ルートを計算する（{selected.size} 件）
            </button>
          </div>
        )}

        {/* Step: Planning */}
        {step === "plan" && isPlanning && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-5xl mb-6">⚙️</div>
            {state === "geocoding" && (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">住所を地図上に配置中…</h2>
                <p className="text-gray-500 mb-4">
                  {progress.done} / {progress.total} 件
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </>
            )}
            {state === "routing" && (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">最適ルートを計算中…</h2>
                <p className="text-gray-500">Google Maps で最短経路を算出しています</p>
              </>
            )}
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && result && start && (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 h-[calc(100vh-180px)] min-h-[500px]">
            <div className="overflow-y-auto bg-white rounded-2xl border border-gray-200 p-5">
              <RouteResults result={result} start={start} onReset={handleFullReset} />
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 min-h-[400px]">
              <RouteMap result={result} start={start} />
            </div>
          </div>
        )}

        {/* Error */}
        {step === "result" && state === "error" && error && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-700 mb-2">エラーが発生しました</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => { reset(); setStep("select"); }}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700"
            >
              戻る
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
