"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Customer } from "@/lib/types";

interface GeoCustomer extends Customer {
  lat: number;
  lng: number;
}

interface Props {
  customers: Customer[];
}

export default function CustomersMap({ customers }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [geocoded, setGeocoded] = useState<GeoCustomer[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [geocoding, setGeocoding] = useState(false);

  const withAddress = customers.filter((c) => c.address.trim().length > 0);

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
        center: { lat: 35.6895, lng: 139.6917 }, // Tokyo default
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
      markersRef.current = [];

      geocoded.forEach((c) => {
        const pos = { lat: c.lat, lng: c.lng };
        bounds.extend(pos);

        const marker = new Marker({
          position: pos,
          map: mapSnapshot,
          title: `${c.lastName} ${c.firstName}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#2563EB",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        marker.addListener("click", () => {
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

        markersRef.current.push(marker);
      });

      mapSnapshot.fitBounds(bounds, 60);
    }

    addMarkers();
  }, [geocoded]);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

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
      {!geocoding && geocoded.length > 0 && (
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-sm px-3 py-1.5 text-xs font-medium text-slate-700">
          {geocoded.length} 件を表示中
          {geocoded.length < withAddress.length && (
            <span className="text-slate-400 ml-1">（{withAddress.length - geocoded.length} 件は住所不明）</span>
          )}
        </div>
      )}
    </div>
  );
}
