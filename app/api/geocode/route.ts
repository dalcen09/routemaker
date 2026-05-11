import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { address } = await req.json();

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=ja&region=JP&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.[0]) {
    return NextResponse.json({ error: `Geocode failed: ${data.status}` }, { status: 422 });
  }

  const { lat, lng } = data.results[0].geometry.location;
  return NextResponse.json({ lat, lng });
}
