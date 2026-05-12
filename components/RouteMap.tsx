"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { RouteResult, StartLocation } from "@/lib/types";

interface Props {
  result: RouteResult;
  start: StartLocation;
}

export default function RouteMap({ result, start }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;

    setOptions({ key: apiKey, v: "weekly" });

    let cancelled = false;

    async function initMap() {
      const { Map, Polyline, InfoWindow } = await importLibrary("maps");
      const { Marker } = await importLibrary("marker");
      const { encoding } = await importLibrary("geometry");

      if (cancelled || !mapRef.current) return;

      const map = new Map(mapRef.current, {
        zoom: 11,
        center: { lat: start.lat, lng: start.lng },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      // Route polyline — concatenate per-leg paths to exclude the return-to-origin leg
      const forwardPath = (result.legPolylines ?? [result.polyline])
        .flatMap((enc) => encoding.decodePath(enc));
      new Polyline({
        path: forwardPath,
        geodesic: true,
        strokeColor: "#2563EB",
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map,
      });

      // Start marker
      new Marker({
        position: { lat: start.lat, lng: start.lng },
        map,
        title: `出発地: ${start.address}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#16A34A",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        zIndex: 100,
      });

      // Stop markers with info windows
      result.stops.forEach((stop) => {
        if (!stop.customer.lat || !stop.customer.lng) return;

        const marker = new Marker({
          position: { lat: stop.customer.lat, lng: stop.customer.lng },
          map,
          label: {
            text: String(stop.order),
            color: "#fff",
            fontWeight: "bold",
            fontSize: "12px",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: "#2563EB",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        const info = new InfoWindow({
          content: `
            <div style="font-family:sans-serif;padding:4px;min-width:160px">
              <div style="font-weight:bold;margin-bottom:4px">
                ${stop.order}. ${stop.customer.lastName} ${stop.customer.firstName}
              </div>
              ${stop.customer.company ? `<div style="font-size:12px;color:#555">${stop.customer.company}</div>` : ""}
              <div style="font-size:12px;color:#666;margin-top:4px">${stop.customer.address}</div>
              <div style="font-size:12px;color:#2563EB;margin-top:4px">${stop.legDistance} · ${stop.legDuration}</div>
            </div>`,
        });

        marker.addListener("click", () => info.open(map, marker));
      });

      // Fit all points in view
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: start.lat, lng: start.lng });
      result.stops.forEach((s) => {
        if (s.customer.lat && s.customer.lng) {
          bounds.extend({ lat: s.customer.lat, lng: s.customer.lng });
        }
      });
      map.fitBounds(bounds, 60);
    }

    initMap();
    return () => { cancelled = true; };
  }, [result, start]);

  return <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />;
}
