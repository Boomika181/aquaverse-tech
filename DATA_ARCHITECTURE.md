# AquaVerse AI — Data Architecture & Ingestion System

## Overview

AquaVerse AI is built as a data-backed environmental water intelligence prototype. It combines real-time and historical continuous telemetry from modern public water APIs (USGS Water Data API) with mathematical hydrological models, statistical anomaly detection, and time-series demand forecasting.

---

## Architecture Flow

```
[ USGS Water Data API ] (api.waterdata.usgs.gov / waterservices.usgs.gov)
          │
          ▼
[ Express Ingestion Layer ] (server/data/providers/usgsProvider.ts)
          │
          ▼
[ Data Normalization Engine ] (server/data/normalizers/waterDataNormalizer.ts)
          ├─ WQI Calculation (pH, Turbidity, DO, Conductivity)
          ├─ Freshness Classification (LIVE, RECENT, STALE, UNAVAILABLE)
          └─ Data Provenance Tags (source, stationId, observedAt, retrievedAt)
          │
          ▼
[ Server Cache & Storage ] (server/data/cacheService.ts)
          ├─ Memory Cache (5 min TTL)
          └─ Ingestion Audit Logs
          │
          ▼
[ REST API Endpoints ] (server.ts)
          ├─ GET /api/water/stations
          ├─ GET /api/water/stations/:stationId
          ├─ GET /api/water/stations/:stationId/measurements
          ├─ GET /api/water/quality
          ├─ GET /api/water/health
          └─ POST /api/water/ingest
          │
          ▼
[ React Frontend & Analytics Engines ] (Dashboard.tsx / Predict.tsx / Engines)
          ├─ Water Stress Prediction Engine
          ├─ Time-Series Demand Forecasting Engine
          ├─ Statistical Telemetry Anomaly Engine (Z-Score & 3-Sigma)
          └─ Water Crisis What-If Scenario Simulator
```

---

## Key Data Design Decisions

### 1. USGS Real Locations vs Demonstration Locations
- **USGS Live Monitoring Stations**: Real active USGS hydrologic stations (e.g. Colorado River, Potomac River, Delaware Basin) display genuine station names, site codes, coordinates, and measured parameters.
- **Demonstration Locations**: Regional locations (e.g. Yelahanka Lake Basin, Bellandur Inflow Node, Hessarghatta Reservoir) are explicitly labeled with `isDemonstration: true` and carrying the tag:
  `"Demonstration Data — Not Live Sensor Measurements"`.
- **No Manufactured Data**: Missing/unmeasured parameters remain `null` or marked as `UNAVAILABLE`. No fake numbers are presented as live sensor data.

### 2. Data Freshness Classification
Freshness is dynamically calculated from observation timestamps (`observedAt`):
- **`LIVE`**: Observed within the last 60 minutes.
- **`RECENT`**: Observed within the last 24 hours.
- **`STALE`**: Observed over 24 hours ago.
- **`UNAVAILABLE`**: Missing or unreadable timestamp.

### 3. Data Provenance Metadata
Every measurement object maintains explicit provenance:
```json
{
  "parameter": "Streamflow Rate",
  "parameterKey": "streamflow",
  "value": 142.5,
  "unit": "ft3/s",
  "observedAt": "2026-08-24T13:30:00Z",
  "retrievedAt": "2026-08-24T13:45:10Z",
  "source": "USGS",
  "sourceStationId": "09058000"
}
```

---

## Integration with Analytical Engines

1. **Water Stress Risk Engine (`waterStressEngine.ts`)**:
   Inputs observed storage, inflow, demand, WQI, and rainfall deficit into a logit regression equation calibrated across 7-day, 14-day, and 30-day forecast horizons.
2. **Time-Series Demand Forecast Engine (`demandForecastEngine.ts`)**:
   Differentiates historical demand series from projected demand, labeling non-live demand projections as `"Demonstration Demand Data"`.
3. **Statistical Anomaly Engine (`anomalyDetectionEngine.ts`)**:
   Calculates $Z = \frac{|x - \mu|}{\sigma}$ against historical parameters. Violations exceeding $2.0\sigma$ or 3-sigma bounds trigger anomaly alerts.
4. **Water Crisis Scenario Simulator (`simulationEngine.ts`)**:
   Operates on normalized baseline data, recalculating risk deltas under user-controlled stress scenarios (`Demand +X%`, `Storage -Y%`, `Rainfall Deficit +Z%`).
