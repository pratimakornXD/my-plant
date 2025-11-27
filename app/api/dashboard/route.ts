import { NextResponse } from "next/server";

// --- CONFIGURATION ---
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const WEATHER_KEY = process.env.WEATHERAPI_KEY; 
const SHEET_RANGE = "Sheet1!A1:Z";
const LOCATION_QUERY = "13.7563,100.5018";

export async function GET() {
  try {
    // 1. Fetch External APIs (Sheet + Weather)
    const [sheetRes, weatherRes] = await Promise.all([
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${GOOGLE_KEY}`,
        { next: { revalidate: 10 } }
      ),
      fetch(
        `http://api.weatherapi.com/v1/current.json?key=${WEATHER_KEY}&q=${LOCATION_QUERY}&aqi=no`,
        { next: { revalidate: 300 } }
      ),
    ]);

    // 2. Process Google Sheet Data (Sensors & Daily Image)
    let latestData: Record<string, any> = {}; 
    
    if (sheetRes.ok) {
      const sheetJson = await sheetRes.json();
      if (sheetJson.values && sheetJson.values.length >= 2) {
        const headers = sheetJson.values[0];
        const rows = sheetJson.values.slice(1); 
        const lastRow = rows[rows.length - 1];
        
        headers.forEach((header: string, index: number) => {
          const key = header.toLowerCase().replace(/\s+/g, "_");
          latestData[key] = lastRow[index] ?? null;
        });

        // --- UPDATED SMART SEARCH ---
        // Find Daily Image (History) in Sheet
        // NOW ACCEPTS BASE64 (Checks if length > 100 instead of just http)
        if (!latestData.daily_image_url) {
             const imageColIndex = headers.findIndex((h: string) => /image|url|picture|photo|daily/i.test(h));
             if (imageColIndex !== -1) {
                 for (let i = rows.length - 1; i >= 0; i--) {
                     const val = rows[i][imageColIndex];
                     // Check for URL (http) OR Base64 (Length > 100)
                     if (val && (val.startsWith("http") || val.length > 100)) {
                         latestData.daily_image_url = val;
                         break;
                     }
                 }
             }
        }
      }
    }

    // 3. Process Weather
    let weatherData = null;
    if (weatherRes.ok) {
      const json = await weatherRes.json();
      weatherData = {
        main: { temp: json.current.temp_c, humidity: json.current.humidity },
        weather: [{ description: json.current.condition.text, icon: `https:${json.current.condition.icon}` }],
        wind: { speed: parseFloat((json.current.wind_kph * 0.27778).toFixed(1)) },
      };
    } 

    // 4. MERGE PYTHON POST DATA (Base64 Live Image)
    const directAlert = global.latestAlertData;
    
    // Parse existing alerts
    let currentAlerts: string[] = [];
    if (latestData.alerts) {
        try {
            currentAlerts = Array.isArray(latestData.alerts) 
                ? latestData.alerts 
                : JSON.parse(latestData.alerts);
        } catch {
            currentAlerts = [latestData.alerts];
        }
    }

    if (directAlert) {
        // Inject Base64 Image from Python
        latestData.realtime_image_url = directAlert.image; 

        // Format Label + Confidence
        const confidencePct = (directAlert.confidence * 100).toFixed(0);
        const alertString = `${directAlert.label} (${confidencePct}%)`;

        if (!currentAlerts.includes(alertString)) {
            currentAlerts.unshift(alertString);
        }
        latestData.latest_detection_time = directAlert.timestamp;
    }

    latestData.alerts = currentAlerts;

    return NextResponse.json({
      sensor_data: latestData,
      weather_data: weatherData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}