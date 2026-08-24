# AquaVerse AI — Public Data Sources & Attribution

This document details the public data sources, API endpoints, parameters, units, update frequencies, and demonstration data disclosures for AquaVerse AI.

---

## 1. Primary Public Data Provider: USGS Water Data API

- **Official Organization**: United States Geological Survey (USGS) — National Water Information System (NWIS).
- **Purpose**: Continuous and discrete streamflow, gage height, water temperature, electrical conductivity, pH, and dissolved oxygen monitoring across active hydrologic stations.
- **API Endpoint**: `https://waterservices.usgs.gov/nwis/iv/` & `https://api.waterdata.usgs.gov/`
- **Format**: JSON
- **Authentication**: Public Open Data Access (No secret API key required).
- **Update Frequency**: 15-minute to 1-hour interval updates depending on station telemetry transmitter type.

### Parameters & Unit Mappings

| Parameter Code | Parameter Name | Metric Key | Unit | Typical Range |
| --- | --- | --- | --- | --- |
| `00060` | Discharge / Streamflow | `streamflow` | `ft³/s` (cfs) | 10 – 50,000+ cfs |
| `00065` | Gage Height / Water Level | `waterLevel` | `ft` | 0.5 – 35.0 ft |
| `00010` | Water Temperature | `temperature` | `°C` | 0.0 – 35.0 °C |
| `00095` | Specific Conductance | `conductivity` | `μS/cm @ 25°C` | 100 – 2,000 μS/cm |
| `00400` | Acidity / pH | `pH` | `pH Units` | 6.5 – 8.5 pH |
| `00300` | Dissolved Oxygen | `dissolvedOxygen` | `mg/L` | 3.0 – 12.0 mg/L |

### Data Attribution & Terms
- Data provided by the U.S. Geological Survey is in the public domain and available for unrestricted global use.
- Official Portal: [https://waterdata.usgs.gov/](https://waterdata.usgs.gov/)

---

## 2. Secondary Data Standards: WHO & US EPA Guidelines

- **Organization**: World Health Organization (WHO) & US Environmental Protection Agency (EPA).
- **Purpose**: Baseline drinking water contaminant limits and secondary aesthetic guidelines.
- **Standards Used**:
  - **pH**: 6.5 – 8.5 pH Units
  - **Turbidity**: Target < 1.0 NTU, Max 5.0 NTU
  - **Total Dissolved Solids (TDS)**: Optimal < 500 ppm, Max 1000 ppm
  - **Chloramines**: Max Residual Disinfectant Level (MRDL) 4.0 ppm
  - **Sulfate**: Secondary Maximum Contaminant Level (SMCL) 250 mg/L
  - **Trihalomethanes (THMs)**: Maximum Contaminant Level (MCL) 80 ppb

---

## 3. Demonstration Data Disclosure

- **Demonstration Locations**: Regional nodes (Yelahanka Lake Basin, Bellandur Inflow Node, Hessarghatta Reservoir) represent demonstration watershed nodes.
- **Labeling**: Explicitly tagged with `isDemonstration: true` and carrying the badge:
  `"Demonstration Data — Not Live Sensor Measurements"`.
- **Purpose**: Allows evaluating regional hydrology risk scenarios, what-if simulations, and citizen reporting flows when live local continuous telemetry is unavailable.
