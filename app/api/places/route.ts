import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodeURIComponent(q)}` +
    `&language=ja` +
    `&region=jp` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json({ error: data.status }, { status: 422 });
  }

  const predictions = (data.predictions ?? []).map((p: { description: string; place_id: string }) => ({
    description: p.description,
    placeId: p.place_id,
  }));

  return NextResponse.json({ predictions });
}
