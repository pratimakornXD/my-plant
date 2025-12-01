import { NextResponse } from "next/server";

// --- IN-MEMORY STORAGE ---
// This acts as a temporary "Live Database"
declare global {
  var latestAlertData: any;
}

if (!global.latestAlertData) {
  global.latestAlertData = null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate
    if (!body.image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Save to Global Memory
    global.latestAlertData = {
      label: body.label || "Unknown",
      confidence: body.confidence || 0,
      image: body.image, // Base64 string
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Alert Recv: ${body.label}`);

    return NextResponse.json({ success: true, message: "Frame received" });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}