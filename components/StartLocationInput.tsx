"use client";

import { useState } from "react";
import { StartLocation } from "@/lib/types";

interface Props {
  onLocationSet: (location: StartLocation) => void;
  loading: boolean;
}

export default function StartLocationInput({ onLocationSet, loading }: Props) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setError(null);
    setChecking(true);

    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(`住所を特定できませんでした: ${data.error}`);
        return;
      }

      onLocationSet({ address: address.trim(), lat: data.lat, lng: data.lng });
    } catch {
      setError("住所の検索中にエラーが発生しました。");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-slate-800">出発地を入力</h2>
      </div>
      <p className="text-xs text-slate-400 mb-3 ml-8">会社・自宅など、ルートの起点となる住所</p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="例: 東京都千代田区丸の内1丁目"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          disabled={loading || checking}
        />
        <button
          type="submit"
          disabled={!address.trim() || loading || checking}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
        >
          {checking ? "確認中…" : "住所を確認"}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
