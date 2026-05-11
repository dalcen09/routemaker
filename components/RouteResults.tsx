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
    const waypoints = result.stops
      .map((s) => encodeURIComponent(s.customer.address))
      .join("/");
    const url = `https://www.google.com/maps/dir/${origin}/${waypoints}/${origin}`;
    window.open(url, "_blank");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{result.stops.length}</div>
          <div className="text-xs text-blue-600 mt-0.5">訪問先</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-emerald-700">{result.totalDistance}</div>
          <div className="text-xs text-emerald-600 mt-0.5">総距離</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-amber-700">{result.totalDuration}</div>
          <div className="text-xs text-amber-600 mt-0.5">所要時間</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={openInGoogleMaps}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center justify-center gap-2"
        >
          <span>🗺️</span> Google マップで開く
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2.5 border border-gray-300 text-sm rounded-xl hover:bg-gray-50 text-gray-700"
        >
          やり直す
        </button>
      </div>

      {/* Stop list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">訪問順</h3>
        <div className="space-y-2">
          {/* Start */}
          <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
              S
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">出発地</div>
              <div className="text-xs text-gray-500 truncate">{start.address}</div>
            </div>
          </div>

          {result.stops.map((stop) => (
            <div key={stop.customer.id} className="flex items-start gap-3 px-3 py-2 bg-white rounded-xl border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {stop.order}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-medium text-gray-900">
                    {stop.customer.lastName} {stop.customer.firstName}
                  </span>
                  {stop.customer.company && (
                    <span className="text-xs text-gray-500 truncate">{stop.customer.company}</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 truncate">{stop.customer.address}</div>
                <div className="text-xs text-blue-600 mt-0.5">
                  前の地点から {stop.legDistance} · {stop.legDuration}
                </div>
              </div>
            </div>
          ))}

          {/* Return */}
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-7 h-7 rounded-full bg-gray-400 text-white text-xs font-bold flex items-center justify-center shrink-0">
              G
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-700 truncate">帰還</div>
              <div className="text-xs text-gray-400 truncate">{start.address}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
