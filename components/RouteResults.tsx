"use client";

import { RouteResult, StartLocation } from "@/lib/types";

interface Props {
  result: RouteResult;
  start: StartLocation;
  onReset: () => void;
}

export default function RouteResults({ result, start, onReset }: Props) {
  function openInGoogleMaps() {
    const origin = encodeURIComponent(start.address);
    const waypoints = result.stops.map((s) => encodeURIComponent(s.customer.address)).join("/");
    const url = `https://www.google.com/maps/dir/${origin}/${waypoints}/${origin}`;
    window.open(url, "_blank");
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-800">最適ルート</h2>
        <p className="text-xs text-slate-400 mt-0.5">Google Maps による経路最適化済み</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-600 rounded-xl p-3 text-center text-white">
          <div className="text-2xl font-bold">{result.stops.length}</div>
          <div className="text-xs opacity-80 mt-0.5">訪問先</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center text-white">
          <div className="text-base font-bold leading-tight mt-0.5">{result.totalDistance}</div>
          <div className="text-xs opacity-60 mt-0.5">総距離</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center text-white">
          <div className="text-base font-bold leading-tight mt-0.5">{result.totalDuration}</div>
          <div className="text-xs opacity-60 mt-0.5">所要時間</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={openInGoogleMaps}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          Google マップで開く
        </button>
        <button
          onClick={onReset}
          className="px-3 py-2.5 border border-slate-200 text-sm rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
        >
          やり直す
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">訪問順</p>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-5 bottom-5 w-px bg-slate-200" />

          <div className="space-y-1">
            {/* Start */}
            <div className="relative flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-sm text-white text-xs font-bold flex items-center justify-center shrink-0 z-10">
                S
              </div>
              <div className="flex-1 min-w-0 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <div className="text-xs font-semibold text-emerald-700">出発地</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">{start.address}</div>
              </div>
            </div>

            {result.stops.map((stop) => (
              <div key={stop.customer.id} className="relative flex items-start gap-3 py-1">
                <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-sm text-white text-xs font-bold flex items-center justify-center shrink-0 z-10 mt-1">
                  {stop.order}
                </div>
                <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-slate-800">
                      {stop.customer.lastName} {stop.customer.firstName}
                    </span>
                    {stop.customer.company && (
                      <span className="text-xs text-slate-400 truncate">{stop.customer.company}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">{stop.customer.address}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    <span className="text-xs text-blue-600 font-medium">
                      {stop.legDistance} · {stop.legDuration}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Return */}
            <div className="relative flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white shadow-sm text-white text-xs font-bold flex items-center justify-center shrink-0 z-10">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <div className="text-xs font-semibold text-slate-500">帰還</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{start.address}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
