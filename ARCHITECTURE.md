# AquaVerse AI — System Architecture & Data Flow

## System Architecture Diagram

```
                         AQUAVERSE AI
                              │
             ┌────────────────┴────────────────┐
             │                                 │
          CITIZEN                            ADMIN
             │                                 │
             └────────────────┬────────────────┘
                              │
                         BACKEND API
                              │
                     DATA / MODEL LAYER
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
     Water Quality     Demand Forecast     Anomaly Detection
    (WHO/EPA Rules &   (Random Forest ML   (Z-Score & 3-Sigma)
     Gemini AI Text)      Regressor)              │
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                      Water Stress Model
                   (Hydrological Logit)
                              │
                        What-If Engine
                   (Scenario Simulator)
                              │
                        Decision Support
```

---

## Data Pipeline Flow

```
   [ External Public Data APIs ] (USGS Water Data NWIS)
                │
                ▼
   [ Express Ingestion Service ] (server/data/providers/usgsProvider.ts)
                │
                ▼
   [ Normalization & Provenance ] (server/data/normalizers/waterDataNormalizer.ts)
                ├─ WQI Score Calculation (0 - 100)
                ├─ Freshness Classification (LIVE, RECENT, STALE, UNAVAILABLE)
                └─ Provenance Tags (source, sourceStationId, observedAt, retrievedAt)
                │
                ▼
   [ Firestore & In-Memory Cache ] (server/data/cacheService.ts)
                │
                ▼
   [ Machine Learning & Analytical Engines ]
                ├─ Random Forest Demand Forecaster (server/ml/train_demand_model.py)
                ├─ Water Stress Risk Prediction Engine (src/services/waterStressEngine.ts)
                └─ Telemetry Anomaly Detection Engine (src/services/anomalyDetectionEngine.ts)
                │
                ▼
   [ Admin & Citizen Web Application ] (React SPA / Express Backend)
```

---

## Telemetry & Metric Classification

AquaVerse AI strictly demarcates observation types across all user interfaces and APIs:

1. **`OBSERVED`**: Real continuous streamflow, gage height, temperature, conductivity, and pH measurements fetched directly from USGS monitoring stations with timestamp provenance.
2. **`FORECAST`**: Future 7-day, 14-day, and 30-day water demand projections produced by the trained scikit-learn `RandomForestRegressor` model.
3. **`DERIVED`**: Hydrological water stress risk probabilities computed using calibrated logit regression equations mapping storage depletion, demand-to-inflow ratios, and rainfall deficits.
4. **`SIMULATION`**: Hypothetical user-adjusted scenario parameters (`Demand Surge +X%`, `Reservoir Storage -Y%`, `Rainfall Deficit +Z%`) evaluated transiently in memory without altering database records.

---

## Role-Based Security Specification

- **Public Visitors**: Home, How It Works, Science & About, Get Started / Login.
- **Authenticated Citizens**: Home, Predict Water Safety, Contact & Support, Science & About.
- **Authenticated Administrators**: Access to Dashboard telemetry, GIS map, community reports manager, user directory, and internal **Model Evaluation Dashboard** (`GET /api/admin/models/evaluation`).
