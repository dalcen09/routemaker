"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Customer } from "@/lib/types";

interface GeoCustomer extends Customer {
  lat: number;
  lng: number;
}

const BLUE   = { fill: "#2563EB", stroke: "#fff", scale: 9 };
const ORANGE = { fill: "#EA580C", stroke: "#fff", scale: 11 };

interface Props {
  customers: Customer[];
  onGenerateRoute: (ids: string[]) => void;
}

export default function CustomersMap({ customers, onGenerateRoute }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [geocoded, setGeocoded] = useState<GeoCustomer[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [geocoding, setGeocoding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const withAddress = customers.filter((c) => c.address.trim().length > 0);

  // Update marker icon when selection changes
  const setMarkerStyle = useCallback((id: string, isSelected: boolean) => {
    const marker = markersRef.current.get(id);
    if (!marker) return;
    const s = isSelected ? ORANGE : BLUE;
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: s.scale,
      fillColor: s.fill,
      fillOpacity: 1,
      strokeColor: s.stroke,
      strokeWeight: 2,
    });
    marker.setZIndex(isSelected ? 10 : 1);
  }, []);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setMarkerStyle(id, false);
      } else {
        next.add(id);
        setMarkerStyle(id, true);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected((prev) => {
      prev.forEach((id) => setMarkerStyle(id, false));
      return new Set();
    });
  }

  // Geocode all customers in batches of 8
  useEffect(() => {
    if (withAddress.length === 0) return;
    let cancelled = false;

    async function geocodeAll() {
      setGeocoding(true);
      setProgress({ done: 0, total: withAddress.length });
      setGeocoded([]);
      const BATCH = 8;

      for (let i = 0; i < withAddress.length; i += BATCH) {
        if (cancelled) break;
        const batch = withAddress.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(async (c) => {
            try {
              const res = await fetch("/api/geocode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: c.address }),
              });
              if (!res.ok) return null;
              const { lat, lng } = await res.json();
              if (!lat || !lng) return null;
              return { ...c, lat, lng } as GeoCustomer;
            } catch {
              return null;
            }
          })
        );

        if (cancelled) break;
        const valid = results.filter(Boolean) as GeoCustomer[];
        setGeocoded((prev) => [...prev, ...valid]);
        setProgress((p) => ({ ...p, done: Math.min(p.done + BATCH, withAddress.length) }));
      }

      if (!cancelled) setGeocoding(false);
    }

    geocodeAll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  // Init map once
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;

    setOptions({ key: apiKey, v: "weekly" });
    let cancelled = false;

    async function initMap() {
      const { Map, InfoWindow } = await importLibrary("maps");
      if (cancelled || !mapRef.current) return;

      const map = new Map(mapRef.current, {
        zoom: 10,
        center: { lat: 35.6895, lng: 139.6917 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      infoWindowRef.current = new InfoWindow();
    }

    initMap();
    return () => { cancelled = true; };
  }, []);

  // Add/update markers as geocoding progresses
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || geocoded.length === 0) return;
    const mapSnapshot = map;

    async function addMarkers() {
      const { Marker } = await importLibrary("marker");
      const bounds = new google.maps.LatLngBounds();

      // Clear existing markers
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current.clear();

      geocoded.forEach((c) => {
        const pos = { lat: c.lat, lng: c.lng };
        bounds.extend(pos);

        const isSelected = selected.has(c.id);
        const s = isSelected ? ORANGE : BLUE;

        const marker = new Marker({
          position: pos,
          map: mapSnapshot,
          title: `${c.lastName} ${c.firstName}`,
          zIndex: isSelected ? 10 : 1,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: s.scale,
            fillColor: s.fill,
            fillOpacity: 1,
            strokeColor: s.stroke,
            strokeWeight: 2,
          },
        });

        marker.addListener("click", () => {
          // Toggle selection
          toggleSelected(c.id);

          // Show info window
          infoWindowRef.current?.setContent(`
            <div style="font-family:sans-serif;padding:4px 2px;min-width:180px">
              <div style="font-weight:600;font-size:14px;margin-bottom:4px">
                ${c.lastName} ${c.firstName}
              </div>
              ${c.company ? `<div style="font-size:12px;color:#555;margin-bottom:2px">${c.company}</div>` : ""}
              ${c.department ? `<div style="font-size:12px;color:#888;margin-bottom:2px">${c.department}</div>` : ""}
              <div style="font-size:12px;color:#666;margin-top:4px;border-top:1px solid #eee;padding-top:4px">${c.address}</div>
              ${c.phone ? `<div style="font-size:12px;color:#2563EB;margin-top:2px">${c.phone}</div>` : ""}
            </div>`);
          infoWindowRef.current?.open(mapSnapshot, marker);
        });

        markersRef.current.set(c.id, marker);
      });

      mapSnapshot.fitBounds(bounds, 60);
    }

    addMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocoded]);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="relative w-full h-full" style={{ minHeight: "calc(100vh - 56px)" }}>
      <div ref={mapRef} className="absolute inset-0" />

      {/* Progress overlay */}
      {geocoding && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3 min-w-[220px]">
          <svg className="w-4 h-4 text-blue-600 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">住所を地図に配置中</span>
              <span className="text-xs text-slate-400">{progress.done}/{progress.total}</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Count badge */}
      {!geocoding && geocoded.length > 0 && selected.size === 0 && (
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-sm px-3 py-1.5 text-xs font-medium text-slate-700">
          {geocoded.length} 件を表示中
          {geocoded.length < withAddress.length && (
            <span className="text-slate-400 ml-1">（{withAddress.length - geocoded.length} 件は住所不明）</span>
          )}
          <span className="text-slate-400 ml-2">· マーカーをクリックして選択</span>
        </div>
      )}

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-sm font-semibold">{selected.size} 件選択中</span>
          </div>

          <div className="w-px h-5 bg-white/20" />

          <button
            onClick={clearSelection}
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            選択解除
          </button>

          <button
            onClick={() => onGenerateRoute([...selected])}
            className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            ルートを生成
          </button>
        </div>
      )}
    </div>
  );
}
