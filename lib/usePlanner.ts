"use client";

import { useState, useCallback } from "react";
import { Customer, RouteResult, StartLocation } from "./types";

type PlannerState = "idle" | "geocoding" | "routing" | "done" | "error";

export function usePlanner() {
  const [state, setState] = useState<PlannerState>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = useCallback(async (start: StartLocation, customers: Customer[]) => {
    setState("geocoding");
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: customers.length });

    // Geocode all customers that don't have coordinates yet
    const geocoded: Customer[] = [];
    for (const customer of customers) {
      if (customer.lat && customer.lng) {
        geocoded.push(customer);
      } else {
        try {
          const res = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: customer.address }),
          });
          const data = await res.json();
          if (res.ok && data.lat && data.lng) {
            geocoded.push({ ...customer, lat: data.lat, lng: data.lng, geocoded: true });
          } else {
            console.warn(`Skipping ${customer.lastName} ${customer.firstName}: ${data.error ?? "no coordinates"}`);
          }
        } catch {
          console.warn(`Geocode error for ${customer.address}`);
        }
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    if (geocoded.length === 0) {
      setState("error");
      setError("住所を地図上で特定できた連絡先がありませんでした。");
      return;
    }

    setState("routing");
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, customers: geocoded }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setError(`ルート計算エラー: ${data.error}${data.details ? " - " + data.details : ""}`);
        return;
      }

      setResult(data);
      setState("done");
    } catch {
      setState("error");
      setError("ルートの計算中にエラーが発生しました。");
    }
  }, []);

  function reset() {
    setState("idle");
    setResult(null);
    setError(null);
    setProgress({ done: 0, total: 0 });
  }

  return { state, progress, result, error, plan, reset };
}
