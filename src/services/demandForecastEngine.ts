import { DemandForecastResult } from '../types';

const CFS_TO_MLD = 2.4466;
const demandCache = new Map<string, { forecast: DemandForecastResult; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute cache TTL

/**
 * Fetch Authoritative Random Forest Streamflow Forecast from Backend API (/api/streamflow-forecast)
 * 
 * @param stationId Unique monitoring station identifier
 * @param baseStreamflowCFS Streamflow / Discharge in CFS (converted from MLD via inflowMLD / 2.4466)
 * @param baseDemandMLD Regional municipal demand in MLD (optional, for baseline comparison)
 */
export async function fetchWaterStreamflowForecast(
  stationId: string,
  baseStreamflowCFS: number,
  baseDemandMLD?: number
): Promise<DemandForecastResult> {
  const cacheKey = `${stationId}_${baseStreamflowCFS.toFixed(2)}`;
  const cached = demandCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.forecast;
  }

  try {
    const res = await fetch('/api/streamflow-forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationId, baseStreamflowCFS, baseDemandMLD })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}: Failed to fetch streamflow forecast from backend.`);
    }

    const data: DemandForecastResult = await res.json();
    demandCache.set(cacheKey, { forecast: data, timestamp: Date.now() });
    return data;
  } catch (err: any) {
    console.error('Error fetching backend streamflow forecast:', err);
    throw err;
  }
}

/**
 * Backward compatibility alias for fetchWaterStreamflowForecast
 */
export async function fetchWaterDemandForecast(
  stationId: string,
  baseInflowMLD: number
): Promise<DemandForecastResult> {
  const baseStreamflowCFS = baseInflowMLD / CFS_TO_MLD;
  return fetchWaterStreamflowForecast(stationId, baseStreamflowCFS, baseInflowMLD);
}

/**
 * Synchronous cache lookup helper using streamflow in CFS for fallback rendering paths.
 */
export function forecastWaterStreamflowSync(
  stationId: string,
  baseStreamflowCFS: number,
  municipalDemandMLD?: number
): DemandForecastResult {
  const cacheKey = `${stationId}_${baseStreamflowCFS.toFixed(2)}`;
  const cached = demandCache.get(cacheKey);
  if (cached) {
    return cached.forecast;
  }

  const baseSupplyMLD = Math.round(baseStreamflowCFS * CFS_TO_MLD);
  const demandMLD = municipalDemandMLD || baseSupplyMLD;

  return {
    stationId,
    currentDemandMLD: demandMLD,
    forecast7dMLD: baseSupplyMLD,
    forecast14dMLD: baseSupplyMLD,
    forecast30dMLD: baseSupplyMLD,
    currentStreamflowCFS: Math.round(baseStreamflowCFS * 10) / 10,
    forecast7dCFS: Math.round(baseStreamflowCFS * 10) / 10,
    forecast14dCFS: Math.round(baseStreamflowCFS * 10) / 10,
    forecast30dCFS: Math.round(baseStreamflowCFS * 10) / 10,
    unit: 'cfs',
    targetVariable: 'Discharge / Streamflow (Parameter 00060)',
    trendPct: 0,
    trendDirection: 'stable',
    modelLabel: 'Loading Backend Random Forest Model...',
    isSimulatedOrModelled: true,
    timeSeriesData: [
      { dateLabel: 'Today', historicalDemand: baseSupplyMLD, forecastDemand: baseSupplyMLD, isForecast: false }
    ]
  };
}

/**
 * Synchronous cache lookup helper for synchronous rendering paths using inflow MLD.
 */
export function forecastWaterDemand(
  stationId: string,
  baseInflowMLD: number
): DemandForecastResult {
  const baseStreamflowCFS = baseInflowMLD / CFS_TO_MLD;
  return forecastWaterStreamflowSync(stationId, baseStreamflowCFS, baseInflowMLD);
}
