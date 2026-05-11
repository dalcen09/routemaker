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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setError(null);

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
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">出発地を入力</h2>
      <p className="text-sm text-gray-500 mb-3">会社・自宅など、ルートの起点となる住所</p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="例: 東京都千代田区丸の内1丁目"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!address.trim() || loading}
          className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          確認
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
