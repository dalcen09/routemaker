import { NextRequest, NextResponse } from "next/server";
import { Customer, RouteResult, StartLocation } from "@/lib/types";

interface RouteRequest {
  start: StartLocation;
  customers: Customer[];
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

  const origin = `${start.lat},${start.lng}`;
  const destination = origin; // Round trip back to start

  // Build waypoints from geocoded customers (max 25 for Directions API)
  const waypoints = customers
    .slice(0, 25)
    .map((c) => `${c.lat},${c.lng}`)
    .join("|");

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&waypoints=optimize:true|${encodeURIComponent(waypoints)}` +
    `&language=ja` +
    `&region=JP` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    return NextResponse.json({ error: `Directions API: ${data.status}`, details: data.error_message }, { status: 422 });
  }

  const route = data.routes[0];
  const waypointOrder: number[] = route.waypoint_order;

  // Build ordered stops
  const orderedCustomers = waypointOrder.map((i) => customers[i]);

  let totalDistance = 0;
  let totalDuration = 0;

  const stops = orderedCustomers.map((customer, idx) => {
    const leg = route.legs[idx]; // leg 0 = start→first stop, etc.
    totalDistance += leg.distance.value;
    totalDuration += leg.duration.value;
    return {
      customer,
      order: idx + 1,
      legDistance: leg.distance.text,
      legDuration: leg.duration.text,
    };
  });

  const result: RouteResult = {
    stops,
    totalDistance: formatDistance(totalDistance),
    totalDuration: formatDuration(totalDuration),
    polyline: route.overview_polyline.points,
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
