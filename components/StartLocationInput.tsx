"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { StartLocation } from "@/lib/types";

interface Prediction {
  description: string;
  placeId: string;
}

interface Props {
  onLocationSet: (location: StartLocation) => void;
  loading: boolean;
}

export default function StartLocationInput({ onLocationSet, loading }: Props) {
  const [address, setAddress] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete suggestions, debounced 300 ms
  const fetchPredictions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setPredictions([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.predictions?.length) {
          setPredictions(data.predictions);
          setOpen(true);
          setActiveIndex(-1);
        } else {
          setPredictions([]);
          setOpen(false);
        }
      } catch {
        // ignore autocomplete errors silently
      }
    }, 300);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setAddress(val);
    setConfirmed(null);
    setError(null);
    fetchPredictions(val);
  }

  async function geocodeAddress(addr: string) {
    setError(null);
    setChecking(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`住所を特定できませんでした: ${data.error}`);
        return;
      }
      setConfirmed(addr);
      onLocationSet({ address: addr, lat: data.lat, lng: data.lng });
    } catch {
      setError("住所の検索中にエラーが発生しました。");
    } finally {
      setChecking(false);
    }
  }

  function selectPrediction(pred: Prediction) {
    setAddress(pred.description);
    setPredictions([]);
    setOpen(false);
    geocodeAddress(pred.description);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || predictions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (address.trim()) geocodeAddress(address.trim());
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        selectPrediction(predictions[activeIndex]);
      } else {
        setOpen(false);
        geocodeAddress(address.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    if (address.trim()) geocodeAddress(address.trim());
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

      <div ref={containerRef} className="relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="例: 東京都千代田区丸の内1丁目"
            value={address}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
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

        {/* Autocomplete dropdown */}
        {open && predictions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            {predictions.map((pred, idx) => (
              <li
                key={pred.placeId}
                onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${
                  idx === activeIndex ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="truncate">{pred.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {confirmed && !error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">出発地を確認しました：</span>
          <span className="text-emerald-600 truncate">{confirmed}</span>
        </div>
      )}
    </div>
  );
}
