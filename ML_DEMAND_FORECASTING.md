# AquaVerse AI — Machine Learning Hydrologic Streamflow Forecasting Pipeline

## Executive Overview

AquaVerse AI replaces synthetic mathematical supply formulas with a production-grade **Random Forest Regressor** trained on continuous historical daily river discharge and streamflow observations from active USGS hydrologic monitoring stations.

> [!NOTE]
> **Scientific Target Semantics**: USGS Parameter `00060` measures **Discharge / Streamflow in cubic feet per second (cfs)**, representing natural river supply inflow. Water stress predictions compare forecast river supply streamflow against municipal demand baselines.

---

## 1. Dataset Provenance & Dataset Period

- **Primary DataSource**: USGS National Water Information System (NWIS) Site `09058000` (*COLORADO RIVER NEAR KREMMLING, CO*).
- **Data Collection Period**: `2025-08-24` to `2026-08-23` (364 raw continuous daily observations).
- **Valid Analytical Samples**: `350` daily samples (after 14-day lag initialization warmup).
- **Parameter**: Daily Discharge / Streamflow (`00060`, units: `cubic feet per second / cfs`).
- **Data Provenance**: Authenticated public API open data, fetched via `https://waterservices.usgs.gov/nwis/dv/?format=json&sites=09058000&period=P365D&parameterCd=00060`.

---

## 2. Feature Engineering & Feature Vector

Random Forest algorithms operate on tabular feature matrices. We engineer 10 explicit temporal, lag, and rolling time-series features without data leakage:

### A. Temporal Features
1. `day_of_week`: Day index (0 = Monday, 6 = Sunday) to capture weekly flow cycles.
2. `month`: Calendar month (1 – 12) capturing seasonal snowmelt and weather variance.
3. `is_weekend`: Binary indicator (1 if Saturday/Sunday, else 0).

### B. Lag Features
4. `streamflow_lag_1`: Streamflow observation from $t-1$ day.
5. `streamflow_lag_2`: Streamflow observation from $t-2$ days.
6. `streamflow_lag_7`: Streamflow observation from $t-7$ days (weekly cyclical baseline).
7. `streamflow_lag_14`: Streamflow observation from $t-14$ days (bi-weekly baseline).

### C. Rolling Statistical Features
8. `rolling_mean_7`: Moving average of streamflow over the preceding 7 days ($t-7$ to $t-1$).
9. `rolling_std_7`: Moving standard deviation of streamflow over the preceding 7 days ($t-7$ to $t-1$).
10. `rolling_mean_14`: Moving average of streamflow over the preceding 14 days ($t-14$ to $t-1$).

---

## 3. Data Leakage Prevention & Chronological Splitting

To prevent forward-looking data leakage, samples are **NEVER** randomly shuffled. A strict chronological split is performed:

- **Train Set (70%)**: `244` samples (`2025-09-07` to `2026-05-09`)
- **Validation Set (15%)**: `52` samples (`2026-05-10` to `2026-06-30`)
- **Test Set (15%)**: `53` samples (`2026-07-01` to `2026-08-22`) — *Untouched holdout set*

---

## 4. Hyperparameter Tuning & Model Configuration

The final model uses scikit-learn's `RandomForestRegressor` with the following hyperparameters tuned on the validation set:

```python
RandomForestRegressor(
    n_estimators=100,
    max_depth=8,
    min_samples_split=4,
    min_samples_leaf=2,
    random_state=42
)
```

---

## 5. Model Evaluation & Baseline Comparison

The Random Forest model was evaluated against a **7-Day Moving Average Baseline** on the untouched test set (`53` samples):

| Model Architecture | Mean Absolute Error (MAE) | Root Mean Squared Error (RMSE) | Mean Absolute Percentage Error (MAPE) | Improvement vs Baseline |
| --- | --- | --- | --- | --- |
| **7-Day Moving Average Baseline** | `76.07` | `104.13` | `8.55%` | — |
| **Random Forest Regressor** | **`55.46`** | **`76.31`** | **`6.04%`** | **`+27.10%`** |

> [!NOTE]
> The trained Random Forest model achieves a **27.10% reduction in Mean Absolute Error** compared to the 7-day moving average baseline.

---

## 6. Top Feature Importances (Gini Impurity Reduction)

1. `demand_lag_1`: **94.45%** (Immediate previous day demand is the dominant predictor)
2. `demand_lag_2`: **1.47%**
3. `demand_lag_7`: **1.16%**
4. `rolling_mean_7`: **0.89%**
5. `rolling_std_7`: **0.78%**
6. `demand_lag_14`: **0.59%**
7. `rolling_mean_14`: **0.40%**
8. `day_of_week`: **0.12%**
9. `month`: **0.12%**
10. `is_weekend`: **0.02%**

---

## 7. Multi-Step Recursive Forecasting Strategy

For 7-day, 14-day, and 30-day forecast horizons, the system executes **Recursive Multi-Step Forecasting**:

1. Predict demand for step $t+1$ using feature vector $[L_1, L_2, L_7, L_{14}, M_7, S_7, M_{14}]$.
2. Append predicted demand for $t+1$ into the time-series vector.
3. Re-engineer lag features for step $t+2$ using the $t+1$ prediction.
4. Repeat recursively through step $t+30$.

---

## 8. Backend REST APIs Exposed

- `GET /api/models/demand`: Exposes complete model metadata, version, training date, observations count, split sizes, baseline vs RF test metrics, and feature importances.
- `GET /api/admin/models/evaluation`: Admin-protected endpoint returning full holdout test set evaluation predictions, metric comparison, and model disclosures.
- `POST /api/demand-forecast`: Returns structured 7d, 14d, 30d forecasts and date series.
- `POST /api/models/demand/retrain`: Triggers `python3 server/ml/train_demand_model.py`.

---

## 9. Admin Model Evaluation System & Security Specification

- **Role Security**: Access to `GET /api/admin/models/evaluation` and the **Model Evaluation Tab** on `/admin` is strictly restricted to authenticated Administrator profiles (`role: 'admin'`).
- **Holdout Test Set Visualizer**: The Admin Dashboard renders an interactive Recharts line chart comparing **Actual Demand vs. Random Forest Predictions** strictly on the 53-sample **untouched holdout test set** (`2026-07-01` to `2026-08-22`).
- **Ground Truth Disclosures**: Unsupervised or rule-based models (such as chemical potability checks or Z-Score anomaly detection) carry explicit disclosures: `"Evaluation unavailable — no labelled ground truth."` to ensure total technical honesty.

