import { NextResponse } from "next/server";

// --- CONFIGURATION ---
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const WEATHER_KEY = process.env.WEATHERAPI_KEY; // New WeatherAPI Key
const SHEET_RANGE = "Sheet1!A1:Z";

// Location: Bangkok (Lat, Lon)
const LOCATION_QUERY = "13.7563,100.5018";

export async function GET() {
  try {
    // 1. Parallel Fetch: Google Sheets + WeatherAPI.com
    const [sheetRes, weatherRes] = await Promise.all([
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${GOOGLE_KEY}`,
        { next: { revalidate: 10 } }
      ),
      fetch(
        `http://api.weatherapi.com/v1/current.json?key=${WEATHER_KEY}&q=${LOCATION_QUERY}&aqi=no`,
        { next: { revalidate: 300 } } // Cache weather for 5 mins (WeatherAPI is fast/generous)
      ),
    ]);

    // 2. Handle Sheet Data (Standard parsing)
    let latestData: Record<string, any> = {};
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

    // 3. Handle WeatherAPI.com Data
    let weatherData = null;
    
    if (weatherRes.ok) {
      const json = await weatherRes.json();
      const current = json.current;

      // Adapter: Transform WeatherAPI structure to match our Frontend expectation
      weatherData = {
        main: {
          temp: current.temp_c,       // Celsius
          humidity: current.humidity, // %
        },
        weather: [
          {
            description: current.condition.text,
            // Ensure URL has protocol (WeatherAPI returns //cdn...)
            icon: `https:${current.condition.icon}`, 
          },
        ],
        wind: {
          // Convert kph to m/s (1 kph = 0.27778 m/s) to match frontend label
          speed: parseFloat((current.wind_kph * 0.27778).toFixed(1)), 
        },
      };
    } else {
      console.error("WeatherAPI Error:", await weatherRes.text());
    }

    // 4. Return Combined Data
    return NextResponse.json({
      sensor_data: latestData,
      weather_data: weatherData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("API Route Critical Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
