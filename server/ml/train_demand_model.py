import os
import json
import urllib.request
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

def fetch_usgs_historical_streamflow_data():
    """
    Fetches 365+ daily continuous historical river discharge/streamflow observations from 
    USGS NWIS Site 09058000 (COLORADO RIVER NEAR KREMMLING, CO).
    Parameter 00060 = Discharge / Streamflow (cubic feet per second / cfs).
    """
    url = "https://waterservices.usgs.gov/nwis/dv/?format=json&sites=09058000&period=P365D&parameterCd=00060"
    req = urllib.request.Request(url, headers={'User-Agent': 'AquaVerse-AI/2.0'})
    
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        ts_list = data.get('value', {}).get('timeSeries', [])
        
        for ts in ts_list:
            site_name = ts['sourceInfo']['siteName']
            site_code = ts['sourceInfo']['siteCode'][0]['value']
            raw_vals = ts['values'][0]['value']
            
            if len(raw_vals) > 50:
                records = []
                for item in raw_vals:
                    val_str = item.get('value')
                    dt_str = item.get('dateTime')
                    if val_str is not None and dt_str is not None:
                        try:
                            val_num = float(val_str)
                            if val_num >= 0:
                                records.append({'dateTime': dt_str[:10], 'streamflow': val_num})
                        except ValueError:
                            pass
                
                df = pd.DataFrame(records)
                df['dateTime'] = pd.to_datetime(df['dateTime'])
                df = df.sort_values('dateTime').drop_duplicates('dateTime').reset_index(drop=True)
                return df, site_name, site_code

    raise RuntimeError("Failed to fetch historical streamflow observations from USGS API.")

def calculate_mape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)

def main():
    print("=" * 60)
    print("AQUAVERSE AI — RANDOM FOREST HYDROLOGIC STREAMFLOW TRAINING PIPELINE")
    print("=" * 60)
    
    # 1. Load Data
    print("[1/7] Fetching real historical daily streamflow observations from USGS Water Data API...")
    df, site_name, site_code = fetch_usgs_historical_streamflow_data()
    print(f"      Source: USGS Site {site_code} ({site_name})")
    print(f"      Parameter: Discharge / Streamflow (00060, cfs)")
    print(f"      Total Raw Daily Observations: {len(df)}")
    print(f"      Date Range: {df['dateTime'].min().strftime('%Y-%m-%d')} to {df['dateTime'].max().strftime('%Y-%m-%d')}")
    
    # 2. Feature Engineering
    print("[2/7] Engineering time-series lag, rolling, and temporal features...")
    df['day_of_week'] = df['dateTime'].dt.dayofweek
    df['month'] = df['dateTime'].dt.month
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # Lags
    df['streamflow_lag_1'] = df['streamflow'].shift(1)
    df['streamflow_lag_2'] = df['streamflow'].shift(2)
    df['streamflow_lag_7'] = df['streamflow'].shift(7)
    df['streamflow_lag_14'] = df['streamflow'].shift(14)
    
    # Rolling stats
    df['rolling_mean_7'] = df['streamflow'].shift(1).rolling(window=7).mean()
    df['rolling_std_7'] = df['streamflow'].shift(1).rolling(window=7).std().fillna(0)
    df['rolling_mean_14'] = df['streamflow'].shift(1).rolling(window=14).mean()
    
    # Drop initial NaN rows created by lag/rolling calculations
    clean_df = df.dropna().reset_index(drop=True)
    print(f"      Valid Analytical Observations (after 14-day lag warmup): {len(clean_df)}")
    
    # 3. Chronological Train / Validation / Test Split (70% / 15% / 15%)
    print("[3/7] Performing strict chronological Train / Validation / Test split...")
    n = len(clean_df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)
    
    train_df = clean_df.iloc[:train_end]
    val_df = clean_df.iloc[train_end:val_end]
    test_df = clean_df.iloc[val_end:].copy()
    
    print(f"      Train Set:      {len(train_df)} samples ({train_df['dateTime'].min().strftime('%Y-%m-%d')} to {train_df['dateTime'].max().strftime('%Y-%m-%d')})")
    print(f"      Validation Set: {len(val_df)} samples ({val_df['dateTime'].min().strftime('%Y-%m-%d')} to {val_df['dateTime'].max().strftime('%Y-%m-%d')})")
    print(f"      Test Set:       {len(test_df)} samples ({test_df['dateTime'].min().strftime('%Y-%m-%d')} to {test_df['dateTime'].max().strftime('%Y-%m-%d')})")
    
    feature_cols = [
        'day_of_week', 'month', 'is_weekend',
        'streamflow_lag_1', 'streamflow_lag_2', 'streamflow_lag_7', 'streamflow_lag_14',
        'rolling_mean_7', 'rolling_std_7', 'rolling_mean_14'
    ]
    
    X_train, y_train = train_df[feature_cols], train_df['streamflow']
    X_val, y_val = val_df[feature_cols], val_df['streamflow']
    X_test, y_test = test_df[feature_cols], test_df['streamflow']
    
    # 4. Train Baseline Model (7-Day Moving Average)
    print("[4/7] Evaluating Baseline Model (7-Day Moving Average) on Test Set...")
    baseline_preds = test_df['rolling_mean_7'].values
    base_mae = float(mean_absolute_error(y_test, baseline_preds))
    base_rmse = float(root_mean_squared_error(y_test, baseline_preds))
    base_mape = calculate_mape(y_test, baseline_preds)
    print(f"      Baseline — MAE: {base_mae:.2f} cfs | RMSE: {base_rmse:.2f} cfs | MAPE: {base_mape:.2f}%")
    
    # 5. Train Random Forest Regressor
    print("[5/7] Training RandomForestRegressor (n_estimators=100, max_depth=8)...")
    rf = RandomForestRegressor(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42
    )
    rf.fit(X_train, y_train)
    
    # Validate
    val_preds = rf.predict(X_val)
    val_mae = float(mean_absolute_error(y_val, val_preds))
    print(f"      Validation MAE: {val_mae:.2f} cfs")
    
    # Test Evaluation
    print("[6/7] Evaluating Final Random Forest Model on Untouched Test Set...")
    rf_preds = rf.predict(X_test)
    rf_mae = float(mean_absolute_error(y_test, rf_preds))
    rf_rmse = float(root_mean_squared_error(y_test, rf_preds))
    rf_mape = calculate_mape(y_test, rf_preds)
    
    mae_improvement_pct = float(((base_mae - rf_mae) / base_mae) * 100)
    print(f"      Random Forest — MAE: {rf_mae:.2f} cfs | RMSE: {rf_rmse:.2f} cfs | MAPE: {rf_mape:.2f}%")
    print(f"      MAE Improvement over Baseline: {mae_improvement_pct:+.2f}%")
    
    # Feature Importances
    importances = rf.feature_importances_
    feat_imp = sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)
    print("\n      Top Predictive Feature Importances:")
    for f_name, f_imp in feat_imp:
        print(f"        - {f_name:<18}: {f_imp * 100:5.2f}%")
        
    # Construct holdout test set evaluation predictions array
    test_df['predicted_streamflow'] = np.round(rf_preds, 1)
    test_df['baseline_streamflow'] = np.round(baseline_preds, 1)
    test_predictions = test_df.assign(
        date=lambda d: d['dateTime'].dt.strftime('%Y-%m-%d')
    )[['date', 'streamflow', 'predicted_streamflow', 'baseline_streamflow']].rename(columns={'streamflow': 'actual_streamflow'}).to_dict(orient='records')
    
    # 6. Export Model Metadata & Model Artifact
    print("\n[7/7] Exporting Trained Model Metadata & Artifacts to server/ml/...")
    
    metadata = {
        "modelName": "Random Forest Hydrologic Streamflow Forecaster",
        "modelVersion": "rf-streamflow-v1.0.0",
        "algorithm": "RandomForestRegressor",
        "trainedAt": pd.Timestamp.now().isoformat(),
        "dataSource": f"USGS NWIS Site {site_code} ({site_name})",
        "targetVariable": "Discharge / Streamflow (Parameter 00060)",
        "unit": "cubic feet per second (cfs)",
        "dataPeriod": {
            "startDate": df['dateTime'].min().strftime('%Y-%m-%d'),
            "endDate": df['dateTime'].max().strftime('%Y-%m-%d')
        },
        "testPeriod": {
            "startDate": test_df['dateTime'].min().strftime('%Y-%m-%d'),
            "endDate": test_df['dateTime'].max().strftime('%Y-%m-%d')
        },
        "totalObservations": len(clean_df),
        "split": {
            "trainSamples": len(train_df),
            "validationSamples": len(val_df),
            "testSamples": len(test_df)
        },
        "hyperparameters": {
            "n_estimators": 100,
            "max_depth": 8,
            "min_samples_split": 4,
            "min_samples_leaf": 2,
            "random_state": 42
        },
        "features": feature_cols,
        "featureImportances": [
            {"feature": f_name, "importancePct": round(float(f_imp) * 100, 2)}
            for f_name, f_imp in feat_imp
        ],
        "testEvaluation": {
            "baseline": {
                "name": "7-Day Moving Average Baseline",
                "mae": round(base_mae, 2),
                "rmse": round(base_rmse, 2),
                "mape": round(base_mape, 2)
            },
            "randomForest": {
                "name": "Random Forest Regressor",
                "mae": round(rf_mae, 2),
                "rmse": round(rf_rmse, 2),
                "mape": round(rf_mape, 2)
            },
            "improvementPct": round(mae_improvement_pct, 2)
        },
        "modelArtifactPath": "server/ml/streamflow_rf_model.joblib",
        "testPredictions": test_predictions,
        "recentObservations": clean_df.tail(30)[['dateTime', 'streamflow']].assign(
            date=lambda d: d['dateTime'].dt.strftime('%Y-%m-%d')
        )[['date', 'streamflow']].to_dict(orient='records')
    }
    
    os.makedirs('server/ml', exist_ok=True)
    
    # Save the actual trained sklearn RandomForestRegressor model estimator
    joblib_path = 'server/ml/streamflow_rf_model.joblib'
    joblib.dump(rf, joblib_path)
    print(f"      Saved: {joblib_path} (Trained Streamflow RandomForestRegressor Estimator)")

    # Also maintain demand_rf_model.joblib symlink/copy for backward compatibility
    joblib.dump(rf, 'server/ml/demand_rf_model.joblib')

    with open('server/ml/model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"      Saved: server/ml/model_metadata.json ({len(test_predictions)} holdout test prediction records)")
    print("=" * 60)
    print("MODEL TRAINING COMPLETE — REAL STREAMFLOW RANDOM FOREST DEPLOYED")
    print("=" * 60)

if __name__ == '__main__':
    main()
