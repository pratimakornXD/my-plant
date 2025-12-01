import { NextResponse } from "next/server";

export async function GET() {
  const directAlert = global.latestAlertData;

  return NextResponse.json({
    image: directAlert?.image || null,
    label: directAlert?.label || null,
    timestamp: directAlert?.timestamp || null,
  });
}