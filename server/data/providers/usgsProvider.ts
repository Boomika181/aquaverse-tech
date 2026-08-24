import http from 'http';
import https from 'https';

export interface RawUsgsTimeSeries {
  sourceInfo: {
    siteName: string;
    siteCode: Array<{ value: string; network: string }>;
    geoLocation: {
      geogLocation: {
        latitude: number;
        longitude: number;
      };
    };
    siteProperty?: Array<{ name: string; value: string }>;
  };
  variable: {
    variableCode: Array<{ value: string }>;
    variableName: string;
    variableDescription: string;
    unit: { unitCode: string };
  };
  values: Array<{
    value: Array<{
      value: string;
      dateTime: string;
      qualifiers?: string[];
    }>;
  }>;
}

export interface UsgsFetchResult {
  success: boolean;
  timeSeries: RawUsgsTimeSeries[];
  fetchedAt: string;
  sourceUrl: string;
  error?: string;
}

// Fetch live active stations & continuous telemetry from USGS Water Data Service
export async function fetchUsgsWaterData(stateCds: string[] = ['co', 'ca']): Promise<UsgsFetchResult> {
  const states = stateCds.join(',');
  const params = '00060,00065'; // Streamflow (cfs), Gage height (ft)
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=${states}&parameterCd=${params}&siteStatus=active`;

  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'AquaVerse-AI/2.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            const timeSeries = parsed?.value?.timeSeries || [];
            resolve({
              success: true,
              timeSeries,
              fetchedAt: new Date().toISOString(),
              sourceUrl: url
            });
          } else {
            resolve({
              success: false,
              timeSeries: [],
              fetchedAt: new Date().toISOString(),
              sourceUrl: url,
              error: `USGS API HTTP ${res.statusCode}`
            });
          }
        } catch (e: any) {
          resolve({
            success: false,
            timeSeries: [],
            fetchedAt: new Date().toISOString(),
            sourceUrl: url,
            error: `JSON Parse Error: ${e?.message || String(e)}`
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        timeSeries: [],
        fetchedAt: new Date().toISOString(),
        sourceUrl: url,
        error: `Network Request Failed: ${err.message}`
      });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({
        success: false,
        timeSeries: [],
        fetchedAt: new Date().toISOString(),
        sourceUrl: url,
        error: `USGS API Timeout (8000ms)`
      });
    });
  });
}
