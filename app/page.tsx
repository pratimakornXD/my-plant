"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { 
  Thermometer, Droplets, Sun, CloudRain, Activity, Clock, AlertTriangle, WifiOff, RefreshCw, ChevronDown, Leaf, Sprout, Maximize2
} from "lucide-react";

// --- PLANT CONFIG ---
const PLANT_DB: Record<string, any> = {
  tomato: { name: "Tomato", image: "/tomato.png", color: "text-red-500", bg: "bg-red-500", specs: { temp: "20-27°C", air_humid: "60-80%", soil_humid: "60-70%", light: "40k-60k lx", water: "2-3cm/week" }},
  lettuce: { name: "Lettuce", image: "/lettuce.png", color: "text-green-500", bg: "bg-green-500", specs: { temp: "15-20°C", air_humid: "50-70%", soil_humid: "70-80%", light: "12k-20k lx", water: "Keep moist" }},
  basil: { name: "Basil", image: "/basil.png", color: "text-emerald-600", bg: "bg-emerald-600", specs: { temp: "21-29°C", air_humid: "40-60%", soil_humid: "40-60%", light: "30k-50k lx", water: "Moderate" }}
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- HELPER COMPONENTS ---
const MetricCard = ({ title, value, unit, icon: Icon, colorClass = "text-slate-900 dark:text-white" }: any) => (
  <div className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-lg hover:border-emerald-500/30 transition-all">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold tracking-tight ${colorClass}`}>{value ?? "—"}</span>
          <span className="text-sm text-slate-400 font-medium">{unit}</span>
        </div>
      </div>
      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
        <Icon size={22} strokeWidth={2} />
      </div>
    </div>
  </div>
);

// --- UNIVERSAL CAMERA FEED (HANDLES BASE64 AUTOMATICALLY) ---
const CameraFeed = ({ url, title, timestamp }: any) => {
  let displayUrl = "";
  
  if (url) {
    if (url.startsWith("http")) {
       // If it happens to be a URL, add cache buster
       displayUrl = `${url}?t=${new Date().getTime()}`;
    } else {
       // Assume Base64. Check if it has prefix, if not, add it.
       displayUrl = url.startsWith("data:") ? url : `data:image/jpeg;base64,${url}`;
    }
  }

  return (
    <div className="flex flex-col h-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium text-sm">
          {/* Green dot if image exists, Pulse Red if it's the live one */}
          <div className={`w-2 h-2 rounded-full ${url ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
          {title}
        </div>
        <span className="text-xs font-mono text-slate-400">{timestamp ? new Date(timestamp).toLocaleTimeString() : "--:--:--"}</span>
      </div>
      <div className="relative flex-1 min-h-[250px] bg-slate-100 dark:bg-slate-950 flex items-center justify-center group overflow-hidden">
        {displayUrl ? (
          <img src={displayUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-400"><WifiOff size={32} /><span className="text-sm">No Signal</span></div>
        )}
      </div>
    </div>
  );
};

const RecItem = ({ label, value, icon: Icon }: any) => (
  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
      <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md"><Icon size={14} /></div>
      <span className="text-xs font-medium">{label}</span>
    </div>
    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{value}</span>
  </div>
);

const getSeverityColor = (alert: string) => {
  const text = alert.toLowerCase();
  if (text.includes("spot") || text.includes("blight") || text.includes("mold")) return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
  return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
};

// --- MAIN DASHBOARD ---
export default function IoTDashboard() {
  const [selectedPlantKey, setSelectedPlantKey] = useState("tomato");
  
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 3000, 
    dedupingInterval: 1000,
  });

  const sensor = data?.sensor_data || {};
  const weather = data?.weather_data;
  const currentPlant = PLANT_DB[selectedPlantKey];
  const alerts = sensor.alerts || [];
  const isOnline = !error && data?.sensor_data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/30">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500 rounded-lg text-white shadow-lg shadow-emerald-500/30"><Activity size={20} /></div>
            <span className="font-bold text-lg tracking-tight">EcoSense<span className="text-emerald-500">.IoT</span></span>
          </div>
          <div className="flex items-center gap-4">
             <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isOnline ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" : "bg-red-50 text-red-700 border-red-200"}`}>
              <span className={`relative flex h-2 w-2`}>
                {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? "bg-emerald-500" : "bg-red-500"}`}></span>
              </span>
              {isOnline ? "System Online" : "Offline"}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Dashboard Overview</h1>
            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-sm"><Clock size={14} /> Last update: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : "Syncing..."}</p>
          </div>
          <div className="relative group min-w-[200px]">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Active Crop</label>
            <div className="relative">
              <select value={selectedPlantKey} onChange={(e) => setSelectedPlantKey(e.target.value)} className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium cursor-pointer shadow-sm hover:border-emerald-400 transition-colors">
                {Object.keys(PLANT_DB).map((key) => <option key={key} value={key}>{PLANT_DB[key].name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <MetricCard title="Temperature" value={sensor.temperature} unit="°C" icon={Thermometer} colorClass="text-orange-500" />
              <MetricCard title="Air Humidity" value={sensor.humidity_air} unit="%" icon={Droplets} colorClass="text-blue-500" />
              <MetricCard title="Soil Moisture" value={sensor.humidity_soil} unit="%" icon={CloudRain} colorClass="text-emerald-500" />
              <MetricCard title="Light Intensity" value={sensor.light_lux} unit="lx" icon={Sun} colorClass="text-yellow-500" />
              <MetricCard title="Water Level" value={sensor.water_level} unit="cm" icon={Activity} />
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-0 overflow-hidden shadow-sm flex flex-col sm:flex-row h-auto sm:h-64">
              <div className="w-full sm:w-[30%] bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center p-4">
                 <div className={`absolute w-32 h-32 rounded-full ${currentPlant.bg} opacity-20 blur-2xl`}></div>
                 <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 relative mb-3">
                      <img src={currentPlant.image} alt={currentPlant.name} className="w-full h-full object-contain drop-shadow-xl" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                      <div className="hidden w-full h-full flex items-center justify-center text-emerald-500"><Leaf size={64} /></div>
                    </div>
                    <h3 className={`text-lg font-bold ${currentPlant.color}`}>{currentPlant.name}</h3>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Target Specs</span>
                 </div>
              </div>
              <div className="w-full sm:w-[70%] p-6 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><Sprout size={18} className="text-emerald-500" /> Optimal Environment</h3>
                  <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md font-medium">Guide</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                  <RecItem icon={Thermometer} label="Temperature" value={currentPlant.specs.temp} />
                  <RecItem icon={Droplets} label="Air Humidity" value={currentPlant.specs.air_humid} />
                  <RecItem icon={CloudRain} label="Soil Moisture" value={currentPlant.specs.soil_humid} />
                  <RecItem icon={Sun} label="Light Intensity" value={currentPlant.specs.light} />
                  <RecItem icon={Activity} label="Water Level" value={currentPlant.specs.water} />
                </div>
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-amber-500" />
                <h3 className="font-semibold text-slate-800 dark:text-white">Disease & System Alerts</h3>
                <span className="ml-auto text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">{alerts.length} Active</span>
              </div>
              <div className="space-y-3">
                {alerts.length > 0 ? ( alerts.map((alert: string, i: number) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(alert)}`}>
                      <div className="mt-0.5"><AlertTriangle size={16} /></div>
                      <span className="text-sm font-medium capitalize">{alert}</span>
                    </div>
                ))) : (
                  <div className="text-center py-6 text-slate-400 text-sm">No diseases or issues detected.</div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            
            <div className="grid grid-cols-1 gap-4 h-[500px]">
               {/* 1. LIVE DETECTION IMAGE (FROM PYTHON - Base64) */}
               <CameraFeed 
                 title="Live Feed" 
                 url={sensor.realtime_image_url} 
                 timestamp={sensor.latest_detection_time || sensor.timestamp}
               />

               {/* 2. DAILY IMAGE (FROM GOOGLE SHEET - Base64 or URL) */}
               <CameraFeed 
                 title="Daily History" 
                 url={sensor.daily_image_url}
                 timestamp={sensor.timestamp}
               />
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg shadow-blue-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-300 opacity-20 rounded-full translate-y-1/3 -translate-x-1/3 blur-xl"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-blue-100 text-sm font-medium">Local Weather</h3>
                    <p className="text-2xl font-bold mt-1">{weather ? Math.round(weather.main.temp) : "--"}°C</p>
                  </div>
                  {weather?.weather[0]?.icon && (<img src={weather.weather[0].icon} alt="weather icon" className="w-16 h-16 -mt-2 filter drop-shadow-md" />)}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm text-blue-50"><span className="flex items-center gap-2"><Droplets size={14}/> Humidity</span><span>{weather?.main?.humidity ?? "--"}%</span></div>
                  <div className="flex justify-between items-center text-sm text-blue-50"><span className="flex items-center gap-2"><Activity size={14}/> Wind</span><span>{weather?.wind?.speed ?? "--"} m/s</span></div>
                  <div className="mt-4 pt-4 border-t border-white/20 text-xs text-blue-100 text-center capitalize">{weather?.weather[0]?.description ?? "Loading weather data..."}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}