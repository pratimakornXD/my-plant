import { NextResponse } from "next/server";

// --- IN-MEMORY STORAGE (The "Direct" Link) ---
// This variable lives on the server as long as the server is running.
// We declare it in the global scope so it persists between requests.
declare global {
  var latestAlertData: any;
}

// Initialize if empty
if (!global.latestAlertData) {
  global.latestAlertData = null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the incoming Python data
    if (!body.image || !body.label) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Save directly to server memory (Bypassing Google Sheets)
    global.latestAlertData = {
      label: body.label,
      confidence: body.confidence,
      image: body.image, // Raw Base64 string
      timestamp: new Date().toISOString(),
    };

    console.log(`Alert Received: ${body.label}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process alert" }, { status: 500 });
  }
}