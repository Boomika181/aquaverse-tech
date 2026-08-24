import { WaterStation } from '../../src/types';
import { fetchUsgsWaterData } from './providers/usgsProvider';
import { normalizeUsgsTimeSeries, getDemonstrationStations } from './normalizers/waterDataNormalizer';
import { serverCache } from './cacheService';

export async function getWaterStations(forceRefresh: boolean = false): Promise<{
  stations: WaterStation[];
  source: 'LIVE_USGS' | 'CACHED_USGS' | 'DEMO_FALLBACK';
  freshnessLabel: string;
  fetchedAt: string;
  totalUsgsStations: number;
  totalDemoStations: number;
}> {
  const cacheState = serverCache.getCachedStations();

  if (!forceRefresh && !cacheState.isStale && cacheState.stations.length > 0) {
    const usgsCount = cacheState.stations.filter(s => s.source === 'USGS').length;
    const demoCount = cacheState.stations.filter(s => s.isDemonstration).length;
    return {
      stations: cacheState.stations,
      source: 'CACHED_USGS',
      freshnessLabel: `Cached Data (Last fetched: ${cacheState.lastFetch})`,
      fetchedAt: cacheState.lastFetch || new Date().toISOString(),
      totalUsgsStations: usgsCount,
      totalDemoStations: demoCount
    };
  }

  // Fetch live active stations from USGS Water Data API
  const usgsRes = await fetchUsgsWaterData(['co', 'ca', 'ny', 'wa']);
  const demoStations = getDemonstrationStations();

  if (usgsRes.success && usgsRes.timeSeries.length > 0) {
    const normalizedUsgs = normalizeUsgsTimeSeries(usgsRes.timeSeries);
    const combinedStations = [...normalizedUsgs, ...demoStations];

    serverCache.setCachedStations(combinedStations);
    serverCache.logIngestion(
      'USGS Water Data API',
      normalizedUsgs.length,
      'SUCCESS',
      `Successfully ingested ${normalizedUsgs.length} active USGS monitoring stations and ${demoStations.length} demonstration nodes.`
    );

    return {
      stations: combinedStations,
      source: 'LIVE_USGS',
      freshnessLabel: `Live Ingestion from USGS Water Data API (${normalizedUsgs.length} USGS Stations)`,
      fetchedAt: usgsRes.fetchedAt,
      totalUsgsStations: normalizedUsgs.length,
      totalDemoStations: demoStations.length
    };
  } else {
    // If USGS API is unreachable or returned empty, return cached or fallback demonstration data
    if (cacheState.stations.length > 0) {
      serverCache.logIngestion(
        'USGS Water Data API',
        0,
        'WARNING',
        `USGS API fetch failed (${usgsRes.error}). Returning cached stations.`
      );
      return {
        stations: cacheState.stations,
        source: 'CACHED_USGS',
        freshnessLabel: `Showing cached telemetry (USGS API unreachable: ${usgsRes.error})`,
        fetchedAt: cacheState.lastFetch || new Date().toISOString(),
        totalUsgsStations: cacheState.stations.filter(s => s.source === 'USGS').length,
        totalDemoStations: demoStations.length
      };
    }

    serverCache.logIngestion(
      'USGS Water Data API',
      0,
      'WARNING',
      `USGS API fetch failed (${usgsRes.error}). Serving demonstration baseline nodes.`
    );

    serverCache.setCachedStations(demoStations);

    return {
      stations: demoStations,
      source: 'DEMO_FALLBACK',
      freshnessLabel: `Demonstration Data Baseline (USGS API unreachable)`,
      fetchedAt: new Date().toISOString(),
      totalUsgsStations: 0,
      totalDemoStations: demoStations.length
    };
  }
}

export async function getStationById(stationId: string): Promise<WaterStation | null> {
  const { stations } = await getWaterStations();
  return stations.find(s => s.id === stationId || s.sourceStationId === stationId) || null;
}
