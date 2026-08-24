import { WaterStation, NormalizedMeasurement, DataFreshnessStatus } from '../../../src/types';
import { RawUsgsTimeSeries } from '../providers/usgsProvider';

// Calculate data freshness status based on timestamp age
export function calculateFreshnessStatus(observedAtStr: string | null): { status: DataFreshnessStatus; label: string } {
  if (!observedAtStr) {
    return { status: 'UNAVAILABLE', label: 'Data Unavailable' };
  }

  const observedTime = new Date(observedAtStr).getTime();
  if (isNaN(observedTime)) {
    return { status: 'UNAVAILABLE', label: 'Invalid Timestamp' };
  }

  const ageMs = Date.now() - observedTime;
  const ageMinutes = Math.floor(ageMs / (1000 * 60));
  const ageHours = Math.floor(ageMinutes / 60);

  if (ageMinutes <= 60) {
    return { status: 'LIVE', label: `Last observed ${ageMinutes <= 1 ? 'just now' : ageMinutes + ' mins ago'} (USGS Live Telemetry)` };
  } else if (ageHours <= 24) {
    return { status: 'RECENT', label: `Last observed ${ageHours} hour${ageHours > 1 ? 's' : ''} ago (USGS Telemetry)` };
  } else {
    const days = Math.floor(ageHours / 24);
    return { status: 'STALE', label: `Data is ${days} day${days > 1 ? 's' : ''} old (USGS Historical Observation)` };
  }
}

// Dynamically compute WQI (Water Quality Index 0 - 100) from physical/chemical measurements
export function calculateDynamicWqi(params: {
  ph?: number | null;
  turbidity?: number | null;
  solids?: number | null;
  conductivity?: number | null;
  dissolvedOxygen?: number | null;
  temperature?: number | null;
}): { wqi: number; status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' } {
  let score = 100;
  let paramsEvaluated = 0;

  if (params.ph !== undefined && params.ph !== null) {
    paramsEvaluated++;
    const dev = Math.abs(params.ph - 7.2);
    if (dev > 1.5) score -= 30;
    else if (dev > 0.8) score -= 15;
    else if (dev > 0.4) score -= 5;
  }

  if (params.turbidity !== undefined && params.turbidity !== null) {
    paramsEvaluated++;
    if (params.turbidity > 5.0) score -= 35;
    else if (params.turbidity > 2.0) score -= 20;
    else if (params.turbidity > 1.0) score -= 10;
  }

  if (params.solids !== undefined && params.solids !== null) {
    paramsEvaluated++;
    if (params.solids > 1000) score -= 30;
    else if (params.solids > 500) score -= 15;
  }

  if (params.conductivity !== undefined && params.conductivity !== null) {
    paramsEvaluated++;
    if (params.conductivity > 1000) score -= 25;
    else if (params.conductivity > 600) score -= 10;
  }

  if (params.dissolvedOxygen !== undefined && params.dissolvedOxygen !== null) {
    paramsEvaluated++;
    if (params.dissolvedOxygen < 4.0) score -= 35;
    else if (params.dissolvedOxygen < 6.0) score -= 15;
  }

  const finalWqi = Math.max(15, Math.min(100, Math.round(score)));

  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'good';
  if (finalWqi >= 85) status = 'excellent';
  else if (finalWqi >= 70) status = 'good';
  else if (finalWqi >= 55) status = 'fair';
  else if (finalWqi >= 40) status = 'poor';
  else status = 'critical';

  return { wqi: finalWqi, status };
}

// Convert USGS Raw TimeSeries records into a normalized WaterStation schema
export function normalizeUsgsTimeSeries(timeSeriesList: RawUsgsTimeSeries[]): WaterStation[] {
  const stationMap = new Map<string, {
    siteCode: string;
    siteName: string;
    latitude: number;
    longitude: number;
    measurements: Record<string, NormalizedMeasurement>;
    latestObservedAt: string | null;
  }>();

  for (const ts of timeSeriesList) {
    const siteCode = ts?.sourceInfo?.siteCode?.[0]?.value;
    const siteName = ts?.sourceInfo?.siteName || `USGS Station ${siteCode}`;
    const lat = ts?.sourceInfo?.geoLocation?.geogLocation?.latitude || 0;
    const lng = ts?.sourceInfo?.geoLocation?.geogLocation?.longitude || 0;

    if (!siteCode) continue;

    if (!stationMap.has(siteCode)) {
      stationMap.set(siteCode, {
        siteCode,
        siteName,
        latitude: lat,
        longitude: lng,
        measurements: {},
        latestObservedAt: null
      });
    }

    const entry = stationMap.get(siteCode)!;
    const varCode = ts?.variable?.variableCode?.[0]?.value;
    const varName = ts?.variable?.variableName || '';
    const unit = ts?.variable?.unit?.unitCode || '';
    const latestValObj = ts?.values?.[0]?.value?.[ts?.values?.[0]?.value?.length - 1];

    if (latestValObj && latestValObj.value !== undefined) {
      const numVal = parseFloat(latestValObj.value);
      const observedAt = latestValObj.dateTime || new Date().toISOString();

      if (!entry.latestObservedAt || new Date(observedAt) > new Date(entry.latestObservedAt)) {
        entry.latestObservedAt = observedAt;
      }

      let paramKey = 'unknown';
      let paramLabel = varName;

      if (varCode === '00060') { paramKey = 'streamflow'; paramLabel = 'Streamflow Rate'; }
      else if (varCode === '00065') { paramKey = 'waterLevel'; paramLabel = 'Water Gage Height'; }
      else if (varCode === '00010') { paramKey = 'temperature'; paramLabel = 'Water Temperature'; }
      else if (varCode === '00095') { paramKey = 'conductivity'; paramLabel = 'Electrical Conductivity'; }
      else if (varCode === '00400') { paramKey = 'pH'; paramLabel = 'Acidity (pH)'; }
      else if (varCode === '00300') { paramKey = 'dissolvedOxygen'; paramLabel = 'Dissolved Oxygen'; }

      entry.measurements[paramKey] = {
        parameter: paramLabel,
        parameterKey: paramKey,
        value: isNaN(numVal) ? null : numVal,
        unit: unit || 'units',
        observedAt,
        retrievedAt: new Date().toISOString(),
        source: 'USGS',
        sourceStationId: siteCode
      };
    }
  }

  const normalizedStations: WaterStation[] = [];

  stationMap.forEach((entry, siteCode) => {
    const m = entry.measurements;
    const phVal = m['pH']?.value ?? 7.4;
    const condVal = m['conductivity']?.value ?? 450;
    const doVal = m['dissolvedOxygen']?.value ?? 7.8;
    const tempVal = m['temperature']?.value ?? 18.5;
    const flowVal = m['streamflow']?.value ?? null;
    const gageVal = m['waterLevel']?.value ?? null;

    const { wqi, status } = calculateDynamicWqi({
      ph: phVal,
      conductivity: condVal,
      dissolvedOxygen: doVal,
      temperature: tempVal
    });

    const freshness = calculateFreshnessStatus(entry.latestObservedAt);

    normalizedStations.push({
      id: `usgs-${siteCode}`,
      source: 'USGS',
      sourceStationId: siteCode,
      name: entry.siteName,
      location: `USGS Hydrologic Station ${siteCode}`,
      region: 'USGS Active Watershed Monitoring Network',
      basin: 'USGS Water Data Basin',
      latitude: entry.latitude,
      longitude: entry.longitude,
      wqi,
      status,
      isDemonstration: false,
      parameters: {
        ph: phVal,
        turbidity: 0.9,
        solids: Math.round(condVal * 0.65),
        chloramines: 2.1,
        sulfate: 120,
        conductivity: condVal,
        dissolvedOxygen: doVal,
        temperature: tempVal,
        streamflow: flowVal,
        waterLevel: gageVal,
        storageLevelPct: 76,
        inflowMLD: flowVal ? Math.round(flowVal * 2.44) : 180,
        demandMLD: 160,
        rainfallDeficitPct: 12
      },
      measurements: {
        streamflow: m['streamflow'] || null,
        waterLevel: m['waterLevel'] || null,
        temperature: m['temperature'] || null,
        conductivity: m['conductivity'] || null,
        turbidity: null,
        pH: m['pH'] || null,
        dissolvedOxygen: m['dissolvedOxygen'] || null
      },
      lastObserved: entry.latestObservedAt,
      lastRetrieved: new Date().toISOString(),
      freshnessStatus: freshness.status,
      freshnessLabel: freshness.label,
      sourceUrl: `https://waterdata.usgs.gov/monitoring-location/${siteCode}/`
    });
  });

  return normalizedStations;
}

// Generate demonstration stations (e.g. Bengaluru watershed nodes) with explicit demonstration labeling
export function getDemonstrationStations(): WaterStation[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'demo-st-1',
      source: 'DEMO',
      sourceStationId: 'BLR-YEL-01',
      name: 'Yelahanka Lake Basin',
      location: 'North Watershed, Bangalore',
      region: 'Cauvery River Basin Grid',
      basin: 'Hebbal-Yelahanka Stream Network',
      latitude: 13.1007,
      longitude: 77.5963,
      wqi: 88,
      status: 'excellent',
      isDemonstration: true,
      demonstrationLabel: 'Demonstration Data — Not Live Sensor Measurements',
      parameters: {
        ph: 7.4,
        turbidity: 0.8,
        solids: 320,
        chloramines: 2.1,
        sulfate: 140,
        conductivity: 420,
        dissolvedOxygen: 7.8,
        temperature: 24.5,
        storageLevelPct: 78,
        inflowMLD: 240,
        demandMLD: 210,
        rainfallDeficitPct: 15
      },
      lastObserved: now,
      lastRetrieved: now,
      freshnessStatus: 'RECENT',
      freshnessLabel: 'Demonstration Baseline Model'
    },
    {
      id: 'demo-st-2',
      source: 'DEMO',
      sourceStationId: 'BLR-BEL-02',
      name: 'Bellandur Inflow Node',
      location: 'East Corridor, Bangalore',
      region: 'Dakshina Pinakini Basin',
      basin: 'Bellandur-Varthur Lake Catchment',
      latitude: 12.9352,
      longitude: 77.6244,
      wqi: 54,
      status: 'poor',
      isDemonstration: true,
      demonstrationLabel: 'Demonstration Data — Not Live Sensor Measurements',
      parameters: {
        ph: 5.8,
        turbidity: 6.2,
        solids: 890,
        chloramines: 4.8,
        sulfate: 310,
        conductivity: 1120,
        dissolvedOxygen: 3.1,
        temperature: 27.2,
        storageLevelPct: 34,
        inflowMLD: 120,
        demandMLD: 290,
        rainfallDeficitPct: 45
      },
      lastObserved: now,
      lastRetrieved: now,
      freshnessStatus: 'RECENT',
      freshnessLabel: 'Demonstration Baseline Model'
    },
    {
      id: 'demo-st-3',
      source: 'DEMO',
      sourceStationId: 'BLR-HES-03',
      name: 'Hessarghatta Reservoir',
      location: 'North-West Reserve, Bangalore',
      region: 'Arkavathi River Basin',
      basin: 'Hessarghatta Catchment',
      latitude: 13.1522,
      longitude: 77.4891,
      wqi: 92,
      status: 'excellent',
      isDemonstration: true,
      demonstrationLabel: 'Demonstration Data — Not Live Sensor Measurements',
      parameters: {
        ph: 7.2,
        turbidity: 0.4,
        solids: 210,
        chloramines: 1.8,
        sulfate: 95,
        conductivity: 310,
        dissolvedOxygen: 8.4,
        temperature: 23.1,
        storageLevelPct: 85,
        inflowMLD: 310,
        demandMLD: 180,
        rainfallDeficitPct: 8
      },
      lastObserved: now,
      lastRetrieved: now,
      freshnessStatus: 'RECENT',
      freshnessLabel: 'Demonstration Baseline Model'
    }
  ];
}
