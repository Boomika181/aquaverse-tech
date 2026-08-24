import { WaterStation } from '../../src/types';

interface IngestionLog {
  id: string;
  source: string;
  stationCount: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  fetchedAt: string;
  details: string;
}

class ServerCacheService {
  private stationsCache: WaterStation[] = [];
  private lastFetchTime: number = 0;
  private ingestionLogs: IngestionLog[] = [];
  private TTL_MS = 5 * 60 * 1000; // 5 minute TTL

  public getCachedStations(): { stations: WaterStation[]; isStale: boolean; lastFetch: string | null } {
    const isStale = Date.now() - this.lastFetchTime > this.TTL_MS || this.stationsCache.length === 0;
    return {
      stations: this.stationsCache,
      isStale,
      lastFetch: this.lastFetchTime > 0 ? new Date(this.lastFetchTime).toISOString() : null
    };
  }

  public setCachedStations(stations: WaterStation[]): void {
    this.stationsCache = stations;
    this.lastFetchTime = Date.now();
  }

  public logIngestion(source: string, stationCount: number, status: 'SUCCESS' | 'WARNING' | 'FAILED', details: string): void {
    const log: IngestionLog = {
      id: `ingest_${Date.now()}`,
      source,
      stationCount,
      status,
      fetchedAt: new Date().toISOString(),
      details
    };
    this.ingestionLogs.unshift(log);
    if (this.ingestionLogs.length > 50) {
      this.ingestionLogs = this.ingestionLogs.slice(0, 50);
    }
  }

  public getIngestionLogs(): IngestionLog[] {
    return this.ingestionLogs;
  }
}

export const serverCache = new ServerCacheService();
