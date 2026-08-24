import { useState, useEffect } from 'react';
import { 
  Activity, 
  BarChart3, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  ChevronRight, 
  MapPin, 
  Filter, 
  Search,
  Droplet,
  Compass,
  ShieldAlert,
  Zap,
  Sparkles,
  Layers,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import waterBg from '../water-bg.jpg';
import linesVideo from '../lines-video.mp4';
import { ForecastHorizon, WaterStressPrediction, DemandForecastResult, AnomalyDetectionResult, WaterCrisisSimulationResult } from '../types';
import { predictWaterStress } from '../services/waterStressEngine';
import { forecastWaterDemand, fetchWaterDemandForecast, fetchWaterStreamflowForecast, forecastWaterStreamflowSync } from '../services/demandForecastEngine';
import { detectTelemetryAnomalies } from '../services/anomalyDetectionEngine';
import { runWaterCrisisSimulation } from '../services/simulationEngine';

interface ReservoirStation {
  id: string;
  source?: string;
  sourceStationId?: string;
  name: string;
  location: string;
  region?: string;
  wqi: number;
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  isDemonstration?: boolean;
  demonstrationLabel?: string;
  ph: number;
  turbidity: number;
  tds: number;
  chloramines: number;
  sulfate: number;
  conductivity: number;
  storageLevelPct: number;
  inflowMLD: number;
  streamflowCFS?: number;
  demandMLD: number;
  rainfallDeficitPct: number;
  lastUpdated: string;
  lastObserved?: string | null;
  freshnessStatus?: string;
  freshnessLabel?: string;
  sourceUrl?: string;
}

const DEMO_STATIONS_FALLBACK: ReservoirStation[] = [
  {
    id: 'st-1',
    source: 'DEMO',
    sourceStationId: 'BLR-YEL-01',
    name: 'Yelahanka Lake Basin',
    location: 'North Watershed, Bangalore',
    region: 'Cauvery River Basin Grid',
    wqi: 88,
    status: 'Excellent',
    isDemonstration: true,
    demonstrationLabel: 'Demonstration Data — Not Live Sensor Measurements',
    ph: 7.4,
    turbidity: 0.8,
    tds: 320,
    chloramines: 2.1,
    sulfate: 140,
    conductivity: 420,
    storageLevelPct: 78,
    inflowMLD: 240,
    demandMLD: 210,
    rainfallDeficitPct: 15,
    lastUpdated: '10 mins ago',
    freshnessStatus: 'RECENT',
    freshnessLabel: 'Demonstration Baseline Model'
  },
  {
    id: 'st-2',
    source: 'DEMO',
    sourceStationId: 'BLR-BEL-02',
    name: 'Bellandur Inflow Node',
    location: 'East Corridor, Bangalore',
    region: 'Dakshina Pinakini Basin',
    wqi: 54,
    status: 'Poor',
    isDemonstration: true,
    demonstrationLabel: 'Demonstration Data — Not Live Sensor Measurements',
    ph: 5.8,
    turbidity: 6.2,
    tds: 890,
    chloramines: 4.8,
    sulfate: 310,
    conductivity: 1120,
    storageLevelPct: 34,
    inflowMLD: 120,
    demandMLD: 290,
    rainfallDeficitPct: 45,
    lastUpdated: '2 mins ago',
    freshnessStatus: 'RECENT',
    freshnessLabel: 'Demonstration Baseline Model'
  },
  {
    id: 'st-3',
    source: 'DEMO',
    sourceStationId: 'BLR-HES-03',
    name: 'Hessarghatta Reservoir',
    location: 'North-West Reserve, Bangalore',
    region: 'Arkavathi River Basin',
    wqi: 92,
    status: 'Excellent',
    isDemonstration: true,
    demonstrationLabel: 'Demonstration Data — Not Live Sensor Measurements',
    ph: 7.2,
    turbidity: 0.4,
    tds: 210,
    chloramines: 1.8,
    sulfate: 95,
    conductivity: 310,
    storageLevelPct: 88,
    inflowMLD: 310,
    demandMLD: 220,
    rainfallDeficitPct: 8,
    lastUpdated: '15 mins ago',
    freshnessStatus: 'RECENT',
    freshnessLabel: 'Demonstration Baseline Model'
  }
];

const HISTORICAL_TRENDS = [
  { time: '00:00', wqi: 82, turbidity: 1.1 },
  { time: '04:00', wqi: 85, turbidity: 0.9 },
  { time: '08:00', wqi: 78, turbidity: 1.6 },
  { time: '12:00', wqi: 88, turbidity: 0.8 },
  { time: '16:00', wqi: 86, turbidity: 1.0 },
  { time: '20:00', wqi: 89, turbidity: 0.7 },
  { time: '24:00', wqi: 88, turbidity: 0.8 },
];

export default function Dashboard() {
  const [stations, setStations] = useState<ReservoirStation[]>(DEMO_STATIONS_FALLBACK);
  const [selectedStationId, setSelectedStationId] = useState<string>('st-1');
  const [horizon, setHorizon] = useState<ForecastHorizon>('30d');
  const [dataMeta, setDataMeta] = useState<{ source: string; freshnessLabel: string; fetchedAt: string } | null>(null);
  const [fetching, setFetching] = useState<boolean>(false);

  // Fetch real stations from backend /api/water/stations
  useEffect(() => {
    fetchBackendStations();
  }, []);

  const fetchBackendStations = async (forceRefresh: boolean = false) => {
    setFetching(true);
    try {
      const url = forceRefresh ? '/api/water/stations?refresh=true' : '/api/water/stations';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.stations && data.stations.length > 0) {
          const mapped: ReservoirStation[] = data.stations.map((s: any) => ({
            id: s.id,
            source: s.source,
            sourceStationId: s.sourceStationId,
            name: s.name,
            location: s.location,
            region: s.region || s.location,
            wqi: s.wqi,
            status: s.status,
            isDemonstration: Boolean(s.isDemonstration),
            demonstrationLabel: s.demonstrationLabel,
            ph: s.parameters?.ph ?? 7.4,
            turbidity: s.parameters?.turbidity ?? 1.1,
            tds: s.parameters?.solids ?? 350,
            chloramines: s.parameters?.chloramines ?? 2.1,
            sulfate: s.parameters?.sulfate ?? 120,
            conductivity: s.parameters?.conductivity ?? 450,
            storageLevelPct: s.parameters?.storageLevelPct ?? 75,
            inflowMLD: s.parameters?.inflowMLD ?? 200,
            demandMLD: s.parameters?.demandMLD ?? 180,
            rainfallDeficitPct: s.parameters?.rainfallDeficitPct ?? 15,
            lastUpdated: s.freshnessLabel || 'Live API Ingestion',
            lastObserved: s.lastObserved,
            freshnessStatus: s.freshnessStatus,
            freshnessLabel: s.freshnessLabel,
            sourceUrl: s.sourceUrl
          }));

          setStations(mapped);
          setDataMeta({
            source: data.source || 'USGS Water Data API',
            freshnessLabel: data.freshnessLabel || 'Live Ingestion',
            fetchedAt: data.fetchedAt || new Date().toISOString()
          });

          if (!mapped.some(st => st.id === selectedStationId)) {
            setSelectedStationId(mapped[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch /api/water/stations, using demonstration fallback:', err);
    } finally {
      setFetching(false);
    }
  };

  const selectedStation = stations.find(s => s.id === selectedStationId) || stations[0] || DEMO_STATIONS_FALLBACK[0];
  const [backendForecast, setBackendForecast] = useState<DemandForecastResult | null>(null);

  const CFS_TO_MLD = 2.4466;
  const baseStreamflowCFS = selectedStation.streamflowCFS ?? (selectedStation.inflowMLD / CFS_TO_MLD);

  // Fetch authoritative backend Random Forest streamflow forecast on station change
  useEffect(() => {
    let isMounted = true;
    fetchWaterStreamflowForecast(selectedStation.id, baseStreamflowCFS, selectedStation.demandMLD)
      .then(res => {
        if (isMounted) setBackendForecast(res);
      })
      .catch(err => {
        console.warn('Failed to fetch authoritative backend streamflow forecast:', err);
      });

    return () => { isMounted = false; };
  }, [selectedStation.id, selectedStation.inflowMLD, selectedStation.streamflowCFS, selectedStation.demandMLD]);

  // What-If Scenario Simulation state
  const [simStoragePct, setSimStoragePct] = useState<number>(selectedStation.storageLevelPct);
  const [simDemandSurgePct, setSimDemandSurgePct] = useState<number>(0);
  const [simRainfallDeficitPct, setSimRainfallDeficitPct] = useState<number>(selectedStation.rainfallDeficitPct);

  // Sync simulation controls when station changes
  useEffect(() => {
    setSimStoragePct(selectedStation.storageLevelPct);
    setSimDemandSurgePct(0);
    setSimRainfallDeficitPct(selectedStation.rainfallDeficitPct);
  }, [selectedStationId, selectedStation]);

  // Compute Hydrologic Streamflow Forecast (authoritative backend forecast with synchronous inflow/supply fallback)
  const demandForecast: DemandForecastResult = backendForecast || forecastWaterStreamflowSync(
    selectedStation.id,
    baseStreamflowCFS,
    selectedStation.demandMLD
  );

  // Compute Water Crisis What-If Simulation Result (consuming the SAME authoritative Random Forest forecast)
  const simResult: WaterCrisisSimulationResult = runWaterCrisisSimulation(
    {
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      location: selectedStation.location,
      storageLevelPct: selectedStation.storageLevelPct,
      inflowMLD: selectedStation.inflowMLD,
      demandMLD: selectedStation.demandMLD,
      rainfallDeficitPct: selectedStation.rainfallDeficitPct,
      wqi: selectedStation.wqi,
      ph: selectedStation.ph,
      turbidity: selectedStation.turbidity
    },
    {
      storageLevelPct: simStoragePct,
      demandSurgePct: simDemandSurgePct,
      rainfallDeficitPct: simRainfallDeficitPct
    },
    horizon,
    demandForecast
  );

  // Compute Water Telemetry Anomalies (telemetry -> anomaly engine -> water stress engine)
  const anomalyResult: AnomalyDetectionResult = detectTelemetryAnomalies({
    stationId: selectedStation.id,
    stationName: selectedStation.name,
    location: selectedStation.location,
    ph: selectedStation.ph,
    turbidity: selectedStation.turbidity,
    tds: selectedStation.tds,
    chloramines: selectedStation.chloramines,
    sulfate: selectedStation.sulfate,
    conductivity: selectedStation.conductivity,
    storageLevelPct: selectedStation.storageLevelPct,
    demandMLD: selectedStation.demandMLD
  });

  // Compute Water Stress Risk using explainable baseline hydrology model
  const stressPrediction: WaterStressPrediction = predictWaterStress(
    {
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      location: selectedStation.location,
      storageLevelPct: selectedStation.storageLevelPct,
      inflowMLD: selectedStation.inflowMLD,
      demandMLD: selectedStation.demandMLD,
      rainfallDeficitPct: selectedStation.rainfallDeficitPct,
      wqi: selectedStation.wqi,
      ph: selectedStation.ph,
      turbidity: selectedStation.turbidity
    },
    horizon,
    demandForecast
  );

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'excellent': return 'text-[#10B981] border-[#10B981]/30 bg-[#10B981]/15';
      case 'good': return 'text-[#168CFF] border-[#168CFF]/30 bg-[#168CFF]/15';
      case 'fair': return 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/15';
      case 'poor': case 'critical': return 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/15';
      default: return 'text-[#42D9FF] border-[#42D9FF]/30 bg-[#42D9FF]/15';
    }
  };

  const getGaugeStroke = (wqi: number) => {
    if (wqi >= 85) return '#10B981';
    if (wqi >= 70) return '#168CFF';
    if (wqi >= 50) return '#F59E0B';
    return '#EF4444';
  };

  // SVG Gauge parameters
  const strokeWidth = 14;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (selectedStation.wqi / 100) * circumference;

  return (
    <div className="bg-[#000000] text-[#EAF6FF] min-h-screen py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#168CFF]/30 selection:text-[#42D9FF] relative overflow-hidden">
      
      {/* EXACT UPLOADED WATER BACKGROUND IMAGE & LIVE MP4 VIDEO LOOP LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src={waterBg} 
          alt="Water Telemetry Environment" 
          className="w-full h-full object-cover object-center opacity-70 animate-slow-bg"
        />
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          controls={false}
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen pointer-events-none"
          src={linesVideo}
        />
        {/* Overlay to ensure legibility */}
        <div className="absolute inset-0 bg-[#000000]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#42D9FF]/15 to-transparent w-[50%] h-full animate-water-light pointer-events-none" />
      </div>

      {/* Floating Content Overlay */}
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Row */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#168CFF]/20 gap-6"
        >
          <div className="space-y-1">
            <h1 className="font-sans font-extrabold text-3xl sm:text-4xl text-white tracking-tight flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-[#42D9FF]" />
              <span>Reservoir Telemetry Hub</span>
            </h1>
            <p className="text-[#526A7E] text-sm">
              Real-time physical and chemical sensor monitoring streams across municipal water supply nodes.
            </p>
          </div>

          {/* Station Selector Dropdown */}
          <div className="flex items-center space-x-3 glass-floating-panel p-2 rounded-2xl shrink-0">
            <MapPin className="h-4.5 w-4.5 text-[#168CFF] ml-2" />
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-4 py-1"
            >
              {stations.map((st) => (
                <option key={st.id} value={st.id} className="bg-[#030A12] text-white">
                  {st.name} ({st.source === 'USGS' ? 'USGS Station ' + st.sourceStationId : st.location})
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Hero Telemetry Card Grid (Circular Gauge + Environmental Recharts) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Focal Point Circular WQI Gauge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 glass-floating-panel rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden"
          >
            
            <div className="w-full flex items-center justify-between border-b border-[#168CFF]/20 pb-4 mb-4">
              <div>
                <h3 className="font-sans font-extrabold text-base text-white">{selectedStation.name}</h3>
                <p className="text-[11px] text-[#526A7E]">{selectedStation.location}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(selectedStation.status)}`}>
                {selectedStation.status}
              </span>
            </div>

            {/* Circular Gauge Centerpiece */}
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="#08243A"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke={getGaugeStroke(selectedStation.wqi)}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-extrabold text-white tracking-tight">{selectedStation.wqi}</span>
                <span className="text-[10px] uppercase font-bold text-[#526A7E] tracking-widest mt-0.5">WQI Score</span>
                <span className="text-[10px] text-[#42D9FF] font-semibold mt-1">/ 100 Optimal</span>
              </div>
            </div>

            {/* Footer station metadata */}
            <div className="w-full pt-4 border-t border-[#168CFF]/20 flex items-center justify-between text-xs text-[#526A7E]">
              <span className="flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5 text-[#168CFF]" />
                <span>Updated: {selectedStation.lastUpdated}</span>
              </span>
              <span className="font-mono text-[#42D9FF] font-semibold">Sensor ID: {selectedStation.id.toUpperCase()}</span>
            </div>

          </motion.div>

          {/* Environmental Recharts Trends AreaChart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-7 glass-floating-panel rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#168CFF]/20">
              <div>
                <h3 className="font-sans font-bold text-base text-white flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-[#42D9FF]" />
                  <span>24-Hour WQI Telemetry Trend</span>
                </h3>
                <p className="text-xs text-[#526A7E]">Hourly sensor log readings from local watershed inflow.</p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-[#42D9FF] font-bold">
                <span className="h-2 w-2 rounded-full bg-[#168CFF]"></span>
                <span>WQI Stream</span>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={HISTORICAL_TRENDS}>
                  <defs>
                    <linearGradient id="wqiColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#168CFF" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#168CFF" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#168CFF/20" vertical={false} />
                  <XAxis dataKey="time" stroke="#526A7E" fontSize={11} tickLine={false} />
                  <YAxis domain={[40, 100]} stroke="#526A7E" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#030A12', 
                      borderColor: '#168CFF', 
                      borderRadius: '0.75rem', 
                      color: '#EAF6FF',
                      fontSize: '12px'
                    }} 
                  />
                  <Area type="monotone" dataKey="wqi" stroke="#42D9FF" strokeWidth={3} fillOpacity={1} fill="url(#wqiColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 text-[11px] text-[#526A7E] flex justify-between items-center border-t border-[#168CFF]/20">
              <span>Optimal range: 80 - 100 WQI</span>
              <span className="text-[#10B981] font-bold">Status: Stable Watershed</span>
            </div>
          </motion.div>

        </div>

        {/* WATER STRESS FORECAST PANEL (MONITOR -> PREDICT) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="glass-floating-panel rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl border border-[#168CFF]/30 relative overflow-hidden"
        >
          {/* Header Row: Title, Data Honesty Badge, and Forecast Horizon Selector */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#168CFF]/20 pb-5 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#168CFF]/20 border border-[#168CFF]/40 rounded-xl text-[#42D9FF]">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                      WATER STRESS FORECAST
                    </h2>
                    {/* DATA HONESTY BADGE */}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#08243A] text-[#42D9FF] border border-[#168CFF]/40">
                      {stressPrediction.modelLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#526A7E]">
                    Predictive water stress probability for <span className="text-[#42D9FF] font-semibold">{stressPrediction.stationName}</span> ({stressPrediction.location}).
                  </p>
                </div>
              </div>
            </div>

            {/* Forecast Horizon Selector (7 days, 14 days, 30 days) */}
            <div className="flex items-center space-x-1.5 bg-[#030A12] border border-[#08243A] p-1.5 rounded-2xl shrink-0">
              <span className="text-[10px] uppercase font-bold text-[#526A7E] px-2.5">Horizon:</span>
              {(['7d', '14d', '30d'] as ForecastHorizon[]).map((h) => {
                const label = h === '7d' ? '7 Days' : h === '14d' ? '14 Days' : 'Next 30 Days';
                const isActive = horizon === h;
                return (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#168CFF] text-white shadow-md'
                        : 'bg-transparent text-[#526A7E] hover:text-[#42D9FF]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Risk Output Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Score Display */}
            <div className="lg:col-span-5 flex flex-col items-center sm:items-start space-y-4 border-b lg:border-b-0 lg:border-r border-[#168CFF]/20 pb-6 lg:pb-0 lg:pr-6">
              <span className="text-xs uppercase font-mono font-bold tracking-widest text-[#526A7E]">
                Water Stress Risk ({stressPrediction.horizonDays}-Day Horizon)
              </span>

              <div className="flex items-baseline space-x-4">
                <span className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight">
                  {stressPrediction.riskProbability}%
                </span>
                
                {/* Risk Category Badge */}
                <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border shadow-lg ${
                  stressPrediction.riskCategory === 'CRITICAL'
                    ? 'bg-[#EF4444]/20 border-[#EF4444]/50 text-[#EF4444]'
                    : stressPrediction.riskCategory === 'HIGH'
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B]/50 text-[#F59E0B]'
                    : stressPrediction.riskCategory === 'MODERATE'
                    ? 'bg-[#168CFF]/20 border-[#168CFF]/50 text-[#42D9FF]'
                    : 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]'
                }`}>
                  {stressPrediction.riskCategory} RISK
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs text-[#526A7E]">
                <Clock className="h-3.5 w-3.5 text-[#168CFF]" />
                <span>Expected within: <strong className="text-white">{stressPrediction.horizonDays} days</strong></span>
              </div>

              {/* Compact "Why this risk?" Explainability Panel */}
              <div className="w-full pt-3 border-t border-[#168CFF]/20 space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-[#42D9FF] flex items-center space-x-1">
                  <Info className="h-3 w-3 text-[#42D9FF]" />
                  <span>WHY THIS RISK? — FEATURE CONTRIBUTION</span>
                </span>
                
                <div className="space-y-1.5 w-full">
                  {stressPrediction.explainableFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-[#030A12] border border-[#08243A] px-2.5 py-1.5 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {factor.direction === 'down' ? (
                          <span className="text-[#EF4444] font-bold text-sm">↓</span>
                        ) : (
                          <span className="text-[#F59E0B] font-bold text-sm">↑</span>
                        )}
                        <span className="text-white font-semibold">{factor.factorName}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] text-[#526A7E] font-bold">{factor.contributionPct}%</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          factor.impactLevel === 'High Impact' 
                            ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'
                            : factor.impactLevel === 'Medium Impact'
                            ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                            : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                        }`}>
                          {factor.impactLevel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Hydrology Telemetry Drivers & Factor Structure */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Supporting Telemetry Mini Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                
                {/* Reservoir Capacity */}
                <div className="p-3 bg-[#030A12] rounded-xl border border-[#08243A] space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#526A7E]">Reservoir Storage</span>
                    <span className="font-mono text-white font-bold">{selectedStation.storageLevelPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#08243A] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${selectedStation.storageLevelPct < 40 ? 'bg-[#EF4444]' : selectedStation.storageLevelPct < 70 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'}`}
                      style={{ width: `${selectedStation.storageLevelPct}%` }}
                    />
                  </div>
                </div>

                {/* Supply vs Demand */}
                <div className="p-3 bg-[#030A12] rounded-xl border border-[#08243A] space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#526A7E]">Inflow / Demand</span>
                    <span className="font-mono text-white font-bold">{selectedStation.inflowMLD} / {selectedStation.demandMLD} MLD</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#08243A] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${selectedStation.inflowMLD < selectedStation.demandMLD ? 'bg-[#EF4444]' : 'bg-[#10B981]'}`}
                      style={{ width: `${Math.min(100, (selectedStation.inflowMLD / selectedStation.demandMLD) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Monsoon Rainfall Deficit */}
                <div className="p-3 bg-[#030A12] rounded-xl border border-[#08243A] space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#526A7E]">Rainfall Deficit</span>
                    <span className="font-mono text-white font-bold">{selectedStation.rainfallDeficitPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#08243A] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${selectedStation.rainfallDeficitPct > 35 ? 'bg-[#EF4444]' : selectedStation.rainfallDeficitPct > 20 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'}`}
                      style={{ width: `${selectedStation.rainfallDeficitPct}%` }}
                    />
                  </div>
                </div>

              </div>

              {/* Prepared Factor Structure (Preview for EXPLAIN phase) */}
              <div className="space-y-2 pt-1 border-t border-[#168CFF]/15">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#526A7E] flex items-center space-x-1.5">
                  <Zap className="h-3.5 w-3.5 text-[#168CFF]" />
                  <span>Primary Contributing Risk Drivers</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {stressPrediction.contributingFactors.map((factor, i) => (
                    <div 
                      key={i} 
                      className="px-3 py-1 bg-[#030A12] border border-[#08243A] rounded-lg text-xs flex items-center space-x-2 text-[#EAF6FF]"
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        factor.impact === 'high' ? 'bg-[#EF4444]' : factor.impact === 'medium' ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                      }`} />
                      <span className="font-semibold">{factor.name}</span>
                      <span className="text-[10px] text-[#526A7E]">({factor.description})</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </motion.div>

        {/* WATER DEMAND FORECAST PANEL (INPUT TO PREDICTION ENGINE) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="glass-floating-panel rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl border border-[#168CFF]/30 relative overflow-hidden"
        >
          {/* Header Row: Title & Data Honesty Tag */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#168CFF]/20 pb-5 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#168CFF]/20 border border-[#168CFF]/40 rounded-xl text-[#42D9FF]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                      HYDROLOGIC STREAMFLOW FORECAST
                    </h2>
                    {/* GEOGRAPHIC SCOPE & DATA HONESTY BADGE */}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#08243A] text-[#42D9FF] border border-[#168CFF]/40">
                      {selectedStation.region || selectedStation.location}
                    </span>
                  </div>
                  <p className="text-xs text-[#526A7E]">
                    River discharge & streamflow supply trajectory feeding directly into the Water Stress Engine for <span className="text-[#42D9FF] font-semibold">{selectedStation.name}</span>.
                  </p>

                  {/* RANDOM FOREST MODEL TRANSPARENCY PANEL */}
                  <div className="mt-3 p-3 bg-[#030A12] border border-[#08243A] rounded-xl text-xs space-y-1 font-mono">
                    <div className="flex flex-wrap items-center justify-between text-[11px] gap-2">
                      <span className="text-white font-bold flex items-center space-x-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#168CFF]" />
                        <span>Predictive Model: <strong className="text-[#42D9FF]">Random Forest</strong> ({demandForecast.algorithm || 'RandomForestRegressor'})</span>
                      </span>
                      <span className="text-[#526A7E]">Model Type: <strong className="text-white">Multi-Step Regressor</strong></span>
                    </div>
                    <div className="text-[10px] text-[#526A7E] flex flex-wrap justify-between gap-2 pt-1 border-t border-[#08243A]">
                      <span>Target: Discharge / Streamflow (cfs / MLD)</span>
                      <span>Execution: Scikit-Learn (Python 3)</span>
                      <span>Output: 30-Day Recursive Forecast</span>
                    </div>
                  </div>

                  {demandForecast.confidenceNote && (
                    <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-center space-x-2 border ${
                      demandForecast.outOfDistribution 
                        ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]' 
                        : 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                    }`}>
                      <Info className="h-4 w-4 shrink-0" />
                      <span>{demandForecast.confidenceNote}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Trend Pill */}
            <div className="flex items-center space-x-2 bg-[#030A12] border border-[#08243A] px-4 py-2 rounded-2xl text-xs font-bold shrink-0">
              <span className="text-[#526A7E]">Streamflow Trend:</span>
              <span className={`flex items-center space-x-1 font-mono font-black ${
                demandForecast.trendDirection === 'increasing' ? 'text-[#10B981]' : demandForecast.trendDirection === 'decreasing' ? 'text-[#EF4444]' : 'text-[#42D9FF]'
              }`}>
                {demandForecast.trendDirection === 'increasing' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{demandForecast.trendPct > 0 ? `+${demandForecast.trendPct}%` : `${demandForecast.trendPct}%`} (30d)</span>
              </span>
            </div>

          </div>

          {/* 3 Metric Stat Cards: Current Streamflow, 7-Day Forecast, 30-Day Forecast */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Current Baseline Streamflow */}
            <div className="p-4 bg-[#030A12] rounded-xl border border-[#08243A] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#526A7E]">Current River Streamflow</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{demandForecast.currentStreamflowCFS ?? demandForecast.currentDemandMLD}</span>
                <span className="text-xs text-[#526A7E] font-semibold">cfs</span>
              </div>
              <span className="text-[10px] text-[#10B981] font-semibold block">USGS Gage Discharge (00060)</span>
            </div>

            {/* 7-Day Projected Streamflow */}
            <div className="p-4 bg-[#030A12] rounded-xl border border-[#168CFF]/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#42D9FF]">7-Day Projected Streamflow</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#42D9FF] font-mono">{demandForecast.forecast7dCFS ?? demandForecast.forecast7dMLD}</span>
                <span className="text-xs text-[#526A7E] font-semibold">cfs</span>
              </div>
              <span className="text-[10px] text-[#526A7E] font-semibold block">
                {Math.round((((demandForecast.forecast7dCFS ?? demandForecast.forecast7dMLD) - (demandForecast.currentStreamflowCFS ?? demandForecast.currentDemandMLD)) / (demandForecast.currentStreamflowCFS ?? demandForecast.currentDemandMLD)) * 1000) / 10 > 0 ? '+' : ''}
                {Math.round((((demandForecast.forecast7dCFS ?? demandForecast.forecast7dMLD) - (demandForecast.currentStreamflowCFS ?? demandForecast.currentDemandMLD)) / (demandForecast.currentStreamflowCFS ?? demandForecast.currentDemandMLD)) * 1000) / 10}% short-term shift
              </span>
            </div>

            {/* 30-Day Projected Streamflow */}
            <div className="p-4 bg-[#030A12] rounded-xl border border-[#168CFF]/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#168CFF]">30-Day Projected Streamflow</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{demandForecast.forecast30dCFS ?? demandForecast.forecast30dMLD}</span>
                <span className="text-xs text-[#526A7E] font-semibold">cfs</span>
              </div>
              <span className="text-[10px] text-[#F59E0B] font-semibold block">
                {demandForecast.trendPct > 0 ? `+${demandForecast.trendPct}%` : `${demandForecast.trendPct}%`} projected 30d flow change
              </span>
            </div>

          </div>

          {/* Compact Historical vs Forecast Recharts Time-Series Chart */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#EAF6FF]">Historical Streamflow vs. 30-Day Streamflow Forecast</span>
              <div className="flex items-center space-x-4 text-[11px]">
                <span className="flex items-center space-x-1.5 text-[#168CFF]">
                  <span className="w-3 h-0.5 bg-[#168CFF] inline-block" />
                  <span>Historical Discharge</span>
                </span>
                <span className="flex items-center space-x-1.5 text-[#42D9FF]">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-[#42D9FF] inline-block" />
                  <span>Forecasted Streamflow</span>
                </span>
              </div>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demandForecast.timeSeriesData}>
                  <defs>
                    <linearGradient id="histDemandColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#168CFF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#168CFF" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="foreDemandColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#42D9FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#42D9FF" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#168CFF/20" vertical={false} />
                  <XAxis dataKey="dateLabel" stroke="#526A7E" fontSize={10} tickLine={false} />
                  <YAxis domain={['dataMin - 10', 'dataMax + 15']} stroke="#526A7E" fontSize={10} tickLine={false} unit=" cfs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#030A12', 
                      borderColor: '#168CFF', 
                      borderRadius: '0.75rem', 
                      color: '#EAF6FF',
                      fontSize: '12px'
                    }} 
                    formatter={(value: any, name: any) => [
                      `${value} cfs`, 
                      name.includes('hist') || name.includes('Demand') ? 'Historical Streamflow' : 'Forecasted Streamflow'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="historicalDemand" 
                    stroke="#168CFF" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#histDemandColor)" 
                    connectNulls
                  />
                  <Area 
                    type="monotone" 
                    dataKey="forecastDemand" 
                    stroke="#42D9FF" 
                    strokeWidth={2.5} 
                    strokeDasharray="4 4"
                    fillOpacity={1} 
                    fill="url(#foreDemandColor)" 
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </motion.div>

        {/* WATER TELEMETRY ANOMALY DETECTION PANEL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="glass-floating-panel rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl border border-[#168CFF]/30 relative overflow-hidden"
        >
          {/* Header Row: Title & Data Honesty Tag */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#168CFF]/20 pb-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#168CFF]/20 border border-[#168CFF]/40 rounded-xl text-[#42D9FF]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                      TELEMETRY ANOMALY DETECTION
                    </h2>
                    {/* DATA HONESTY BADGE */}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#08243A] text-[#42D9FF] border border-[#168CFF]/40">
                      {anomalyResult.modelLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#526A7E]">
                    Statistical Z-score deviation analysis against historical expected baseline ranges for <span className="text-[#42D9FF] font-semibold">{selectedStation.name}</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Anomaly Status Badge */}
            <div className="shrink-0">
              {anomalyResult.hasAnomalies ? (
                <span className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center space-x-2 ${
                  anomalyResult.maxSeverity === 'CRITICAL' || anomalyResult.maxSeverity === 'HIGH'
                    ? 'bg-[#EF4444]/20 border-[#EF4444]/50 text-[#EF4444]'
                    : 'bg-[#F59E0B]/20 border-[#F59E0B]/50 text-[#F59E0B]'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                  <span>{anomalyResult.anomalyCount} ANOMALY DETECTED ({anomalyResult.maxSeverity})</span>
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>ALL PARAMETERS NORMAL</span>
                </span>
              )}
            </div>
          </div>

          {/* Anomaly Content Display */}
          {anomalyResult.hasAnomalies ? (
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526A7E]">
                Active Telemetry Variance Details (Statistical Z-Score &gt; 2.0)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anomalyResult.anomalies.map((anom) => (
                  <div key={anom.id} className="p-4 bg-[#030A12] border border-[#08243A] rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-sans font-bold text-sm text-white">{anom.parameterName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        anom.severity === 'CRITICAL' || anom.severity === 'HIGH' ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]' : 'bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B]'
                      }`}>
                        {anom.severity} SEVERITY
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-[#08243A]">
                      <div>
                        <span className="text-[10px] text-[#526A7E] block uppercase font-sans font-bold">Observed Value</span>
                        <span className="text-[#EF4444] font-bold">{anom.observedValue}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#526A7E] block uppercase font-sans font-bold">Expected Baseline</span>
                        <span className="text-[#10B981] font-bold">{anom.expectedRange}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#EAF6FF]/80 pt-1 leading-relaxed">
                      {anom.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#030A12] border border-[#08243A] rounded-xl flex items-center space-x-3 text-xs text-[#526A7E]">
              <CheckCircle className="h-5 w-5 text-[#10B981] shrink-0" />
              <span>All 8 monitored sensor streams (pH, Turbidity, TDS, Chloramines, Sulfate, Conductivity, Storage %, Demand) remain strictly within historical 3-sigma statistical baseline bounds.</span>
            </div>
          )}

        </motion.div>

        {/* WATER CRISIS WHAT-IF SIMULATOR PANEL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="glass-floating-panel rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl border border-[#168CFF]/30 relative overflow-hidden"
        >
          {/* Header Row: Title & Data Honesty Tag */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#168CFF]/20 pb-5 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#168CFF]/20 border border-[#168CFF]/40 rounded-xl text-[#42D9FF]">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                      WATER CRISIS WHAT-IF SIMULATOR
                    </h2>
                    {/* DATA HONESTY BADGE */}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#08243A] text-[#42D9FF] border border-[#168CFF]/40">
                      {simResult.modelLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#526A7E]">
                    Adjust environmental sliders below to test decision scenarios for <span className="text-[#42D9FF] font-semibold">{selectedStation.name}</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Presets Controls */}
            <div className="flex items-center space-x-1.5 bg-[#030A12] border border-[#08243A] p-1.5 rounded-2xl shrink-0 overflow-x-auto max-w-full">
              <span className="text-[10px] uppercase font-bold text-[#526A7E] px-2 shrink-0">Presets:</span>
              <button
                onClick={() => {
                  setSimStoragePct(selectedStation.storageLevelPct);
                  setSimDemandSurgePct(0);
                  setSimRainfallDeficitPct(selectedStation.rainfallDeficitPct);
                }}
                className="px-2.5 py-1 rounded-xl bg-[#08243A] hover:bg-[#168CFF] text-[#42D9FF] hover:text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Baseline
              </button>
              <button
                onClick={() => {
                  setSimStoragePct(Math.max(10, selectedStation.storageLevelPct - 35));
                  setSimDemandSurgePct(10);
                  setSimRainfallDeficitPct(Math.min(85, selectedStation.rainfallDeficitPct + 35));
                }}
                className="px-2.5 py-1 rounded-xl bg-[#08243A] hover:bg-[#F59E0B] text-[#F59E0B] hover:text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Drought (-35% Storage)
              </button>
              <button
                onClick={() => {
                  setSimStoragePct(selectedStation.storageLevelPct);
                  setSimDemandSurgePct(30);
                  setSimRainfallDeficitPct(selectedStation.rainfallDeficitPct);
                }}
                className="px-2.5 py-1 rounded-xl bg-[#08243A] hover:bg-[#168CFF] text-[#42D9FF] hover:text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Demand Surge (+30%)
              </button>
              <button
                onClick={() => {
                  setSimStoragePct(15);
                  setSimDemandSurgePct(40);
                  setSimRainfallDeficitPct(75);
                }}
                className="px-2.5 py-1 rounded-xl bg-[#08243A] hover:bg-[#EF4444] text-[#EF4444] hover:text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Worst-Case
              </button>
            </div>
          </div>

          {/* 2-Column Grid: Left Sliders, Right Real-Time Comparison Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Sliders Column */}
            <div className="lg:col-span-6 space-y-5 bg-[#030A12] border border-[#08243A] p-5 rounded-xl">
              
              {/* Slider 1: Reservoir Storage Capacity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#EAF6FF]">Simulated Reservoir Storage</span>
                  <span className={`font-mono font-bold ${simStoragePct < 40 ? 'text-[#EF4444]' : 'text-[#42D9FF]'}`}>
                    {simStoragePct}% (Baseline: {selectedStation.storageLevelPct}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  step="5"
                  value={simStoragePct}
                  onChange={(e) => setSimStoragePct(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#000000] border border-[#08243A] rounded-lg appearance-none cursor-pointer accent-[#168CFF]"
                />
                <div className="flex justify-between text-[10px] text-[#526A7E]">
                  <span>Depleted (5%)</span>
                  <span>Full Capacity (95%)</span>
                </div>
              </div>

              {/* Slider 2: Regional Demand Surge */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#EAF6FF]">Simulated Water Demand Surge</span>
                  <span className={`font-mono font-bold ${simDemandSurgePct > 20 ? 'text-[#EF4444]' : 'text-[#42D9FF]'}`}>
                    {simDemandSurgePct > 0 ? `+${simDemandSurgePct}%` : `${simDemandSurgePct}%`} ({Math.round(selectedStation.demandMLD * (1 + simDemandSurgePct / 100))} MLD)
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  step="5"
                  value={simDemandSurgePct}
                  onChange={(e) => setSimDemandSurgePct(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#000000] border border-[#08243A] rounded-lg appearance-none cursor-pointer accent-[#168CFF]"
                />
                <div className="flex justify-between text-[10px] text-[#526A7E]">
                  <span>Conservation (-30%)</span>
                  <span>Normal (0%)</span>
                  <span>Severe Surge (+50%)</span>
                </div>
              </div>

              {/* Slider 3: Monsoon Rainfall Deficit */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#EAF6FF]">Simulated Monsoon Rainfall Deficit</span>
                  <span className={`font-mono font-bold ${simRainfallDeficitPct > 35 ? 'text-[#EF4444]' : 'text-[#42D9FF]'}`}>
                    {simRainfallDeficitPct}% Deficit
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={simRainfallDeficitPct}
                  onChange={(e) => setSimRainfallDeficitPct(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#000000] border border-[#08243A] rounded-lg appearance-none cursor-pointer accent-[#168CFF]"
                />
                <div className="flex justify-between text-[10px] text-[#526A7E]">
                  <span>Normal Rainfall (0%)</span>
                  <span>Severe Drought (90%)</span>
                </div>
              </div>

            </div>

            {/* Right Comparison Card Column */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-4 bg-[#030A12] border border-[#08243A] p-5 rounded-xl">
              
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase font-bold text-[#526A7E] tracking-wider block">
                  Real-Time Baseline vs. Scenario Risk Comparison
                </span>

                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Baseline Card */}
                  <div className="p-3 bg-[#000000] rounded-xl border border-[#08243A] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#526A7E]">Baseline Risk</span>
                    <div className="text-2xl font-black text-white font-mono">
                      {simResult.baselinePrediction.riskProbability}%
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase inline-block ${
                      simResult.baselinePrediction.riskCategory === 'CRITICAL' ? 'bg-[#EF4444]/20 text-[#EF4444]' :
                      simResult.baselinePrediction.riskCategory === 'HIGH' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                      simResult.baselinePrediction.riskCategory === 'MODERATE' ? 'bg-[#168CFF]/20 text-[#42D9FF]' :
                      'bg-[#10B981]/20 text-[#10B981]'
                    }`}>
                      {simResult.baselinePrediction.riskCategory}
                    </span>
                  </div>

                  {/* Scenario Card */}
                  <div className={`p-3 rounded-xl border space-y-1 ${
                    simResult.scenarioPrediction.riskCategory === 'CRITICAL' ? 'bg-[#EF4444]/15 border-[#EF4444]/40' :
                    simResult.scenarioPrediction.riskCategory === 'HIGH' ? 'bg-[#F59E0B]/15 border-[#F59E0B]/40' :
                    'bg-[#168CFF]/15 border-[#168CFF]/40'
                  }`}>
                    <span className="text-[10px] uppercase font-bold text-[#42D9FF]">Scenario Risk</span>
                    <div className="text-2xl font-black text-white font-mono">
                      {simResult.scenarioPrediction.riskProbability}%
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase inline-block ${
                      simResult.scenarioPrediction.riskCategory === 'CRITICAL' ? 'bg-[#EF4444]/20 text-[#EF4444]' :
                      simResult.scenarioPrediction.riskCategory === 'HIGH' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                      'bg-[#10B981]/20 text-[#10B981]'
                    }`}>
                      {simResult.scenarioPrediction.riskCategory}
                    </span>
                  </div>

                </div>

                {/* Risk Delta Pill */}
                <div className="p-3 bg-[#000000] border border-[#08243A] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[#526A7E] font-semibold">Risk Shift:</span>
                  <span className={`font-mono font-black text-sm ${
                    simResult.riskDeltaPoints > 0 ? 'text-[#EF4444]' : simResult.riskDeltaPoints < 0 ? 'text-[#10B981]' : 'text-white'
                  }`}>
                    {simResult.riskDeltaPoints > 0 ? `+${simResult.riskDeltaPoints}` : simResult.riskDeltaPoints} percentage points
                  </span>
                </div>
              </div>

              {/* Dynamic Model Explanation Box */}
              <div className="p-3 bg-[#000000] border border-[#168CFF]/20 rounded-xl space-y-1 text-xs">
                <span className="text-[10px] font-mono font-bold text-[#42D9FF] uppercase tracking-wider block">Model Explanation</span>
                <p className="text-[#EAF6FF]/90 leading-relaxed text-[11px]">
                  {simResult.explanation}
                </p>
              </div>

            </div>

          </div>
        </motion.div>





      </div>
    </div>
  );
}
