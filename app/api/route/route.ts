import { NextRequest, NextResponse } from "next/server";
import { Customer, RouteResult, StartLocation } from "@/lib/types";

interface RouteRequest {
  start: StartLocation;
  customers: Customer[];
}

// Japan bounding box — reject geocoding results wildly outside Japan
const JP = { latMin: 24, latMax: 46, lngMin: 122, lngMax: 147 };

function validCoord(lat: number | undefined, lng: number | undefined): boolean {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return false;
  return lat >= JP.latMin && lat <= JP.latMax && lng >= JP.lngMin && lng <= JP.lngMax;
}

async function callDirections(origin: string, destination: string, waypoints: string[], optimize: boolean, apiKey: string) {
  const wpParam = `${optimize ? "optimize:true|" : ""}${waypoints.join("|")}`;
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&waypoints=${encodeURIComponent(wpParam)}` +
    `&mode=driving` +
    `&language=ja` +
    `&region=JP` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  return res.json();
}

export async function POST(req: NextRequest) {
  const { start, customers }: RouteRequest = await req.json();

  if (!start || !customers?.length) {
    return NextResponse.json({ error: "start and customers required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  if (!validCoord(start.lat, start.lng)) {
    return NextResponse.json({ error: "出発地の座標が無効です。住所を確認してください。" }, { status: 422 });
  }

  const validCustomers = customers
    .slice(0, 25)
    .filter((c) => validCoord(c.lat, c.lng));

  if (validCustomers.length === 0) {
    return NextResponse.json({ error: "ルート計算できる住所が見つかりませんでした。" }, { status: 422 });
  }

  const origin = `${start.lat},${start.lng}`;
  const destination = origin; // Round trip
  const waypoints = validCustomers.map((c) => `${c.lat},${c.lng}`);

  // Try with optimization first, fall back to fixed order if ZERO_RESULTS
  let data = await callDirections(origin, destination, waypoints, true, apiKey);

  if (data.status === "ZERO_RESULTS" && validCustomers.length > 1) {
    data = await callDirections(origin, destination, waypoints, false, apiKey);
  }

  if (data.status !== "OK") {
    const hint =
      data.status === "ZERO_RESULTS"
        ? "出発地と顧客住所の間にルートが見つかりませんでした。住所が正しいか確認してください。"
        : `Directions API: ${data.status}`;
    return NextResponse.json({ error: hint, details: data.error_message }, { status: 422 });
  }

  const route = data.routes[0];
  const waypointOrder: number[] = route.waypoint_order;

  const orderedCustomers = waypointOrder.length > 0
    ? waypointOrder.map((i) => validCustomers[i])
    : validCustomers; // fixed-order fallback

  let totalDistance = 0;
  let totalDuration = 0;

  const stops = orderedCustomers.map((customer, idx) => {
    const leg = route.legs[idx];
    totalDistance += leg.distance.value;
    totalDuration += leg.duration.value;
    return {
      customer,
      order: idx + 1,
      legDistance: leg.distance.text,
      legDuration: leg.duration.text,
    };
  });

  // Collect per-leg polylines for forward legs only (exclude the return-to-origin leg)
  const legPolylines: string[] = (route.legs as { overview_polyline: { points: string } }[])
    .slice(0, orderedCustomers.length)
    .map((leg) => leg.overview_polyline.points);

  const result: RouteResult = {
    stops,
    totalDistance: formatDistance(totalDistance),
    totalDuration: formatDuration(totalDuration),
    polyline: route.overview_polyline.points,
    legPolylines,
    waypointOrder,
  };

  return NextResponse.json(result);
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}時間 ${m}分`;
  return `${m}分`;
}
