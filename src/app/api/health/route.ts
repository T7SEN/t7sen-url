// src/app/api/health/route.ts
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Reading searchParams opts this route out of Next.js static generation.
  const clientPing = request.nextUrl.searchParams.get("t") || "automated-ping";

  return NextResponse.json(
    {
      status: "ok",
      serverTime: new Date().toISOString(),
      clientPing: clientPing,
    },
    { status: 200 },
  );
}
