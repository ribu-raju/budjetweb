import { NextResponse } from "next/server";

// Simple, unauthenticated liveness check for uptime monitors / Vercel.
// Deliberately returns nothing sensitive.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
