"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Customer } from "@/lib/types";

export interface GeoCustomer extends Customer {
  lat: number;
  lng: number;
}

const BLUE   = { fill: "#2563EB", stroke: "#fff", scale: 9 };
const ORANGE = { fill: "#EA580C", stroke: "#fff", scale: 11 };

interface Props {
  customers: Customer[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

const CACHE_KEY    = "rp_geocache_v1";
const MAP_VIEW_KEY = "rp_mapview_v1";

interface CacheEntry { lat: number; lng: number; address: string }
type GeoCache = Record<string, CacheEntry>;

function loadCache(): GeoCache {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveCache(cache: GeoCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
  catch { /* storage full – ignore */ }
}

interface MapView { lat: number; lng: number; zoom: number }

function loadMapView(): MapView | null {
  try { return JSON.parse(localStorage.getItem(MAP_VIEW_KEY) ?? "null"); }
  catch { return null; }
}

function saveMapView(view: MapView) {
  try { localStorage.setItem(MAP_VIEW_KEY, JSON.stringify(view)); }
  catch { /* ignore */ }
}

export default function CustomersMap({ customers, selected, onToggle }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const myLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [geocoded, setGeocoded] = useState<GeoCustomer[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [geocoding, setGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const withAddress = customers.filter((c) => c.address.trim().length > 0);

  // Sync marker styles when selection changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const isSelected = selected.has(id);
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
    });
  }, [selected]);

  // Geocode all customers, using localStorage cache to avoid repeat API calls
  useEffect(() => {
    if (withAddress.length === 0) return;
    let cancelled = false;

    async function geocodeAll() {
      const cache = loadCache();

      // Serve cached entries immediately
      const fromCache: GeoCustomer[] = [];
      const toFetch: Customer[] = [];

      for (const c of withAddress) {
        const hit = cache[c.id];
        if (hit && hit.address === c.address) {
          fromCache.push({ ...c, lat: hit.lat, lng: hit.lng });
        } else {
          toFetch.push(c);
        }
      }

      setGeocoded(fromCache);
      if (toFetch.length === 0) { setGeocoding(false); return; }

      setGeocoding(true);
      setProgress({ done: fromCache.length, total: withAddress.length });

      const BATCH = 8;
      for (let i = 0; i < toFetch.length; i += BATCH) {
        if (cancelled) break;
        const batch = toFetch.slice(i, i + BATCH);
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

        // Persist new results to cache
        const updatedCache = loadCache();
        valid.forEach((gc) => { updatedCache[gc.id] = { lat: gc.lat, lng: gc.lng, address: gc.address }; });
        saveCache(updatedCache);

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
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    async function initMap() {
      const { Map, InfoWindow } = await importLibrary("maps");
      if (cancelled || !mapRef.current) return;

      const saved = loadMapView();

      // If no saved view, try to centre on the user's current position
      let initialCenter = { lat: 35.6895, lng: 139.6917 };
      if (!saved && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { initialCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude }; resolve(); },
            () => resolve(), // permission denied or timeout — fall back to Tokyo
            { timeout: 5000 }
          );
        });
      }
      if (cancelled || !mapRef.current) return;

      const map = new Map(mapRef.current, {
        zoom: saved?.zoom ?? 13,
        center: saved ? { lat: saved.lat, lng: saved.lng } : initialCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      // Persist view on every pan/zoom (debounced 500 ms)
      const persist = () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          const c = map.getCenter();
          const z = map.getZoom();
          if (c && z !== undefined) saveMapView({ lat: c.lat(), lng: c.lng(), zoom: z });
        }, 500);
      };
      map.addListener("center_changed", persist);
      map.addListener("zoom_changed", persist);

      mapInstanceRef.current = map;
      infoWindowRef.current = new InfoWindow();

      // Remove the close button and top padding that Google reserves for it
      if (!document.getElementById("rp-iw-style")) {
        const style = document.createElement("style");
        style.id = "rp-iw-style";
        style.textContent = `
          .gm-ui-hover-effect { display: none !important; }
          .gm-style-iw-chr { display: none !important; }
          .gm-style-iw-c { padding: 12px !important; }
          .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; }
        `;
        document.head.appendChild(style);
      }
    }

    initMap();
    return () => {
      cancelled = true;
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);

  // Watch user's current location and show a marker on the map
  useEffect(() => {
    if (!navigator.geolocation) return;

    async function placeMarker(lat: number, lng: number) {
      const map = mapInstanceRef.current;
      if (!map) return;
      const { Marker } = await importLibrary("marker");
      const pos = { lat, lng };
      if (myLocationMarkerRef.current) {
        myLocationMarkerRef.current.setPosition(pos);
      } else {
        myLocationMarkerRef.current = new Marker({
          position: pos,
          map,
          zIndex: 20,
          title: "現在地",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#EA580C",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
        });
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationError(null);
        placeMarker(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLocationError("位置情報へのアクセスが拒否されました。");
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      myLocationMarkerRef.current?.setMap(null);
      myLocationMarkerRef.current = null;
    };
  }, []);

  // Add/update markers when geocoded list grows
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || geocoded.length === 0) return;
    const mapSnapshot = map;

    async function addMarkers() {
      const { Marker } = await importLibrary("marker");
      const bounds = new google.maps.LatLngBounds();

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

        const infoContent = `
          <div style="font-family:sans-serif;min-width:180px">
            <div style="font-weight:600;font-size:14px;margin-bottom:4px">
              ${c.lastName} ${c.firstName}
            </div>
            ${c.company    ? `<div style="font-size:12px;color:#555;margin-bottom:2px">${c.company}</div>` : ""}
            ${c.department ? `<div style="font-size:12px;color:#888;margin-bottom:2px">${c.department}</div>` : ""}
            ${c.title      ? `<div style="font-size:12px;color:#888;margin-bottom:2px">${c.title}</div>` : ""}
            ${c.address    ? `<div style="font-size:12px;color:#666;margin-top:4px;border-top:1px solid #eee;padding-top:4px">${c.address}</div>` : ""}
            ${c.phone      ? `<div style="font-size:12px;color:#2563EB;margin-top:2px">${c.phone}</div>` : ""}
            ${c.email      ? `<div style="font-size:12px;color:#2563EB;margin-top:2px">${c.email}</div>` : ""}
          </div>`;

        marker.addListener("mouseover", () => {
          infoWindowRef.current?.setContent(infoContent);
          infoWindowRef.current?.open(mapSnapshot, marker);
        });
        marker.addListener("mouseout", () => {
          infoWindowRef.current?.close();
        });
        marker.addListener("click", () => {
          onToggle(c.id);
        });

        markersRef.current.set(c.id, marker);
      });

      // Only auto-fit on first ever load; afterwards respect the saved view
      if (!loadMapView()) mapSnapshot.fitBounds(bounds, 60);
    }

    addMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocoded]);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="relative w-full h-full">
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

      {/* Location permission error */}
      {locationError && (
        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur border border-amber-200 rounded-xl shadow-sm px-3 py-1.5 text-xs text-amber-700 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {locationError}
        </div>
      )}

      {/* Hint when nothing selected */}
      {!geocoding && geocoded.length > 0 && selected.size === 0 && (
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-sm px-3 py-1.5 text-xs text-slate-500">
          {geocoded.length} 件表示中
          {geocoded.length < withAddress.length && ` （${withAddress.length - geocoded.length} 件は住所不明）`}
          <span className="ml-2 text-slate-400">· マーカーをクリックして選択</span>
        </div>
      )}
    </div>
  );
}
