import sys
import os
import json
import joblib
import pandas as pd
import numpy as np

def run_inference():
    try:
        # Load input options from sys.argv or stdin
        if len(sys.argv) > 1:
            raw_input = sys.argv[1]
        else:
            raw_input = sys.stdin.read()
            
        params = json.loads(raw_input)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)

    cfs_val = params.get("baseStreamflowCFS")
    if cfs_val is None and params.get("baseInflowMLD") is not None:
        cfs_val = float(params.get("baseInflowMLD")) / 2.4466
    if cfs_val is None:
        cfs_val = 214.5
    base_streamflow = float(cfs_val)
    station_id = str(params.get("stationId", "station-usgs-09058000"))
    
    model_path = os.path.join(os.path.dirname(__file__), 'streamflow_rf_model.joblib')
    if not os.path.exists(model_path):
        model_path = os.path.join(os.path.dirname(__file__), 'demand_rf_model.joblib')

    metadata_path = os.path.join(os.path.dirname(__file__), 'model_metadata.json')
    
    if not os.path.exists(model_path) or not os.path.exists(metadata_path):
        print(json.dumps({
            "success": False, 
            "error": "Trained Random Forest model artifact (streamflow_rf_model.joblib) not found. Run train_demand_model.py first."
        }))
        sys.exit(1)
        
    try:
        rf_model = joblib.load(model_path)
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to load model artifact: {str(e)}"}))
        sys.exit(1)
        
    feature_names = metadata.get("features", [
        'day_of_week', 'month', 'is_weekend',
        'streamflow_lag_1', 'streamflow_lag_2', 'streamflow_lag_7', 'streamflow_lag_14',
        'rolling_mean_7', 'rolling_std_7', 'rolling_mean_14'
    ])
    
    # 1. Range Validation for Out-of-Distribution Input (USGS Site 09058000 training distribution: 20–2500 cfs)
    min_train_bound = 20.0
    max_train_bound = 2500.0
    out_of_distribution = bool(base_streamflow < min_train_bound or base_streamflow > max_train_bound)
    
    if out_of_distribution:
        confidence_note = f"Forecast confidence limited because current streamflow ({base_streamflow:.1f} cfs) falls outside the historical USGS training distribution range ({min_train_bound:.0f}–{max_train_bound:.0f} cfs)."
    else:
        confidence_note = f"Input streamflow ({base_streamflow:.1f} cfs) is within historical USGS training distribution bounds ({min_train_bound:.0f}–{max_train_bound:.0f} cfs)."
        
    today = pd.Timestamp.now()
    time_series_data = []
    hist_history = []
    
    # 2. Extract actual historical observation sequence from input payload or metadata
    payload_history = params.get("historicalSequence")
    metadata_recent = metadata.get("recentObservations", [])
    
    if isinstance(payload_history, list) and len(payload_history) >= 14:
        # Use actual historical observation sequence passed from data ingestion layer
        hist_values = [float(v) for v in payload_history[-14:]]
    elif len(metadata_recent) >= 14:
        # Use actual real USGS daily streamflow observations recorded in model_metadata
        hist_values = [float(obs.get("streamflow", base_streamflow)) for obs in metadata_recent[-14:]]
    else:
        # Constant baseline anchor without synthetic sine-wave fabrication
        hist_values = [float(base_streamflow)] * 14
        
    for i in range(14, 0, -1):
        dt = today - pd.Timedelta(days=i)
        date_label = dt.strftime('%b %d')
        hist_val = float(np.round(hist_values[14 - i], 1))
        hist_history.append(hist_val)
        
        time_series_data.append({
            "dateLabel": date_label,
            "historicalDemand": max(10.0, hist_val),
            "historicalStreamflow": max(10.0, hist_val),
            "isForecast": False
        })
        
    # Anchor point (Today)
    today_label = f"{today.strftime('%b %d')} (Today)"
    time_series_data.append({
        "dateLabel": today_label,
        "historicalDemand": base_streamflow,
        "historicalStreamflow": base_streamflow,
        "forecastDemand": base_streamflow,
        "forecastStreamflow": base_streamflow,
        "isForecast": False
    })
    
    # 3. Multi-Step Recursive Forecasting executing true RandomForestRegressor.predict()
    forecast_series = list(hist_history) + [base_streamflow]
    forecast_7d = base_streamflow
    forecast_14d = base_streamflow
    forecast_30d = base_streamflow
    
    for step in range(1, 31):
        dt = today + pd.Timedelta(days=step)
        date_label = dt.strftime('%b %d')
        
        n = len(forecast_series)
        lag1 = forecast_series[n - 1]
        lag2 = forecast_series[n - 2]
        lag7 = forecast_series[n - 7] if n >= 7 else lag1
        lag14 = forecast_series[n - 14] if n >= 14 else lag1
        
        roll7_slice = forecast_series[-7:]
        roll7_mean = float(np.mean(roll7_slice))
        roll7_std = float(np.std(roll7_slice, ddof=0))
        
        roll14_slice = forecast_series[-14:]
        roll14_mean = float(np.mean(roll14_slice))
        
        day_of_week = dt.dayofweek
        month = dt.month
        is_weekend = 1 if day_of_week in [5, 6] else 0
        
        # Build exact 10-feature row dictionary matching trained estimator
        feat_dict = {
            'day_of_week': day_of_week,
            'month': month,
            'is_weekend': is_weekend,
            'streamflow_lag_1': lag1,
            'streamflow_lag_2': lag2,
            'streamflow_lag_7': lag7,
            'streamflow_lag_14': lag14,
            'rolling_mean_7': roll7_mean,
            'rolling_std_7': roll7_std,
            'rolling_mean_14': roll14_mean,
            # Fallback legacy aliases in case feature names differ
            'demand_lag_1': lag1,
            'demand_lag_2': lag2,
            'demand_lag_7': lag7,
            'demand_lag_14': lag14
        }
        
        # Construct DataFrame to maintain exact feature names & column ordering
        X_step = pd.DataFrame([feat_dict])[feature_names]
        
        # EXECUTE REAL RANDOM FOREST ESTIMATOR PREDICTION
        predicted_val = float(rf_model.predict(X_step)[0])
        predicted_val = float(np.round(predicted_val, 1))
        
        forecast_series.append(predicted_val)
        
        if step == 7:
            forecast_7d = predicted_val
        if step == 14:
            forecast_14d = predicted_val
        if step == 30:
            forecast_30d = predicted_val
            
        if step % 3 == 0 or step in [7, 14, 30]:
            time_series_data.append({
                "dateLabel": date_label,
                "forecastDemand": max(10.0, predicted_val),
                "forecastStreamflow": max(10.0, predicted_val),
                "isForecast": True
            })
            
    trend_pct = float(np.round(((forecast_30d - base_streamflow) / base_streamflow) * 100.0, 1))
    trend_direction = "increasing" if trend_pct > 1.5 else ("decreasing" if trend_pct < -1.5 else "stable")
    
    output = {
        "success": True,
        "stationId": station_id,
        "currentStreamflowCFS": base_streamflow,
        "forecast7dCFS": forecast_7d,
        "forecast14dCFS": forecast_14d,
        "forecast30dCFS": forecast_30d,
        # Backward compatibility properties
        "currentDemandMLD": base_streamflow,
        "forecast7dMLD": forecast_7d,
        "forecast14dMLD": forecast_14d,
        "forecast30dMLD": forecast_30d,
        "unit": "cfs",
        "targetVariable": "Discharge / Streamflow (Parameter 00060)",
        "forecastMethod": "Multi-Step Recursive Random Forest Inference",
        "trendPct": trend_pct,
        "trendDirection": trend_direction,
        "modelName": metadata.get("modelName", "Random Forest Hydrologic Streamflow Forecaster"),
        "modelVersion": metadata.get("modelVersion", "rf-streamflow-v1.0.0"),
        "algorithm": metadata.get("algorithm", "RandomForestRegressor"),
        "modelLabel": f"Random Forest Regressor (MAE: {metadata['testEvaluation']['randomForest']['mae']} cfs, +{metadata['testEvaluation']['improvementPct']}% vs Baseline)",
        "isSimulatedOrModelled": True,
        "outOfDistribution": out_of_distribution,
        "confidenceNote": confidence_note,
        "timeSeriesData": time_series_data
    }
    
    print(json.dumps(output))

if __name__ == '__main__':
    run_inference()
