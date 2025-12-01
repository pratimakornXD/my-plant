import { NextResponse } from "next/server";

// --- CONFIGURATION ---
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;        
const HISTORY_ID = process.env.HISTORY_SHEET_ID;     
const WEATHER_KEY = process.env.WEATHERAPI_KEY; 
const SHEET_RANGE = "Sheet1!A1:Z";                   
const HISTORY_RANGE = "Sheet1!A1:C10";               
const LOCATION_QUERY = "13.7563,100.5018";

export async function GET() {
  try {
    const [sheetRes, historyRes, weatherRes] = await Promise.all([
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${GOOGLE_KEY}`,
        { next: { revalidate: 5 } }
      ),
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${HISTORY_ID}/values/${HISTORY_RANGE}?key=${GOOGLE_KEY}`,
        { next: { revalidate: 60 } } 
      ),
      fetch(
        `http://api.weatherapi.com/v1/current.json?key=${WEATHER_KEY}&q=${LOCATION_QUERY}&aqi=no`,
        { next: { revalidate: 300 } }
      ),
    ]);

    let latestData: Record<string, any> = {}; 
    let historyLog: any[] = []; 
    
    // --- MAIN SENSOR SHEET ---
    if (sheetRes.ok) {
      const sheetJson = await sheetRes.json();
      if (sheetJson.values && sheetJson.values.length >= 2) {
        const headers = sheetJson.values[0];
        const lastRow = sheetJson.values[sheetJson.values.length - 1];
        headers.forEach((header: string, index: number) => {
          const key = header.toLowerCase().replace(/\s+/g, "_");
          latestData[key] = lastRow[index] ?? null;
        });
      }
    }

    // --- HISTORY SHEET (With Status) ---
    if (historyRes.ok) {
        const histJson = await historyRes.json();
        if (histJson.values && histJson.values.length > 1) {
            const rows = histJson.values.slice(1);
            
            // FIX: Explicitly type 'row' as 'any' to satisfy TypeScript
            historyLog = rows.map((row: any) => ({
                date: row[0] || "Unknown",
                image: row[1] || null,
                status: row[2] || "No Data" 
            })).filter((item: any) => item.image); 
            
            if (historyLog.length > 0) {
                const latest = historyLog[historyLog.length - 1];
                latestData.daily_image_url = latest.image;
                latestData.daily_status = latest.status; 
            }
        }
    }

    // --- WEATHER ---
    let weatherData = null;
    if (weatherRes.ok) {
      const json = await weatherRes.json();
      weatherData = {
        main: { temp: json.current.temp_c, humidity: json.current.humidity },
        weather: [{ description: json.current.condition.text, icon: `https:${json.current.condition.icon}` }],
        wind: { speed: parseFloat((json.current.wind_kph * 0.27778).toFixed(1)) },
      };
    } 

    // --- ALERTS ---
    const directAlert = global.latestAlertData;
    let currentAlerts: string[] = [];

    if (latestData.alerts) {
        try { currentAlerts = Array.isArray(latestData.alerts) ? latestData.alerts : JSON.parse(latestData.alerts); } 
        catch { currentAlerts = [latestData.alerts]; }
    }

    if (latestData.fire == "1" || String(latestData.fire).toLowerCase() === "true") {
        currentAlerts.unshift("🔥 CRITICAL: FIRE DETECTED 🔥");
    }

    if (directAlert) {
        latestData.realtime_image_url = directAlert.image; 
        const confidencePct = (directAlert.confidence * 100).toFixed(0);
        const alertString = `${directAlert.label} (${confidencePct}%)`;
        if (!currentAlerts.includes(alertString)) currentAlerts.unshift(alertString);
        latestData.latest_detection_time = directAlert.timestamp;
    }

    latestData.alerts = currentAlerts;

    return NextResponse.json({
      sensor_data: latestData,
      history_log: historyLog,
      weather_data: weatherData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}