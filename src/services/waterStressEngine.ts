import { ForecastHorizon, RiskCategory, WaterStressPrediction, ContributingFactor, DemandForecastResult } from '../types';
import { forecastWaterDemand } from './demandForecastEngine';
import { detectTelemetryAnomalies } from './anomalyDetectionEngine';

export interface HydrologyInputs {
  stationId: string;
  stationName: string;
  location: string;
  storageLevelPct: number; // Current reservoir volume capacity % (0 - 100)
  inflowMLD: number;       // Inflow rate (Million Liters / Day)
  demandMLD: number;       // Regional consumption demand rate (Million Liters / Day)
  rainfallDeficitPct: number; // Seasonal rainfall deficit vs historical baseline % (0 - 100)
  wqi: number;             // Water Quality Index (0 - 100)
  ph?: number;
  turbidity?: number;
}

// In-memory calculation cache to ensure high performance & zero re-render overhead
const predictionCache = new Map<string, { prediction: WaterStressPrediction; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute cache TTL

/**
 * Water Stress Risk Classification Thresholds:
 * - LOW: 0% - 29% (Water availability exceeds projected demand with comfortable storage)
 * - MODERATE: 30% - 59% (Seasonal deficit or declining storage level requiring monitoring)
 * - HIGH: 60% - 79% (Significant deficit between inflow and demand; reservoir depletion likely)
 * - CRITICAL: 80% - 100% (Imminent severe water supply crisis within forecast horizon)
 */
export function classifyRiskCategory(probability: number): RiskCategory {
  if (probability >= 80) return 'CRITICAL';
  if (probability >= 60) return 'HIGH';
  if (probability >= 30) return 'MODERATE';
  return 'LOW';
}

/**
 * Explainable Baseline Water Stress Prediction Model
 * Uses deterministic physical hydrology equations integrated with Demand Forecasting & Anomaly Detection:
 * 1. Storage Depletion Factor S = (100 - storageLevelPct) / 100
 * 2. Supply-Demand Deficit Ratio D = max(0, (projectedDemandMLD - inflowMLD) / projectedDemandMLD)
 * 3. Rainfall Anomaly Factor R = rainfallDeficitPct / 100
 * 4. Quality Usability Loss Q = max(0, (80 - wqi) / 100)
 * 5. Telemetry Anomaly Penalty A = anomalyCount * 0.12 (if active anomalies detected)
 * 
 * Applies logistic curve calibration across 7-day, 14-day, and 30-day forecast horizons.
 */
export function predictWaterStress(
  inputs: HydrologyInputs,
  horizon: ForecastHorizon = '30d',
  preFetchedForecast?: DemandForecastResult
): WaterStressPrediction {
  const cacheKey = `${inputs.stationId}_${horizon}_${inputs.storageLevelPct}_${inputs.inflowMLD}_${inputs.demandMLD}_${inputs.rainfallDeficitPct}_${inputs.wqi}`;
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.prediction;
  }

  const horizonDays = horizon === '7d' ? 7 : horizon === '14d' ? 14 : 30;
  const horizonScaling = horizon === '7d' ? 0.82 : horizon === '14d' ? 0.91 : 1.0;

  // Conversion factor: 1 cubic foot per second (CFS) = 2.446575 MLD (~2.4466 MLD)
  const CFS_TO_MLD = 2.4466;

  // Use authoritative backend Random Forest streamflow forecast (in CFS)
  const demandForecast = preFetchedForecast || forecastWaterDemand(inputs.stationId, inputs.inflowMLD);
  const forecastedStreamflowCFS = horizon === '7d' 
    ? (demandForecast.forecast7dCFS ?? 200) 
    : horizon === '14d' 
    ? (demandForecast.forecast14dCFS ?? Math.round(((demandForecast.forecast7dCFS ?? 200) + (demandForecast.forecast30dCFS ?? 220)) / 2))
    : (demandForecast.forecast30dCFS ?? 220);

  // Convert Streamflow CFS to MLD Supply
  const forecastedSupplyMLD = Math.round(forecastedStreamflowCFS * CFS_TO_MLD);
  const municipalDemandMLD = inputs.demandMLD;

  // Compute Telemetry Anomalies from Anomaly Detection Engine as input
  const anomalyResult = detectTelemetryAnomalies({
    stationId: inputs.stationId,
    stationName: inputs.stationName,
    location: inputs.location,
    ph: inputs.ph !== undefined ? inputs.ph : 7.4,
    turbidity: inputs.turbidity !== undefined ? inputs.turbidity : (inputs.wqi < 60 ? 6.2 : 0.8),
    tds: 350,
    chloramines: 2.2,
    sulfate: 130,
    conductivity: 450,
    storageLevelPct: inputs.storageLevelPct,
    demandMLD: inputs.demandMLD
  });

  const anomalyPenalty = anomalyResult.hasAnomalies ? (anomalyResult.anomalyCount * 0.12) : 0;

  // Normalized physical variables comparing Projected Streamflow Supply (MLD) vs Municipal Demand (MLD)
  const storageDepletion = Math.max(0, Math.min(1, (100 - inputs.storageLevelPct) / 100));
  const deficitRatio = municipalDemandMLD > forecastedSupplyMLD 
    ? Math.max(0, Math.min(1, (municipalDemandMLD - forecastedSupplyMLD) / municipalDemandMLD))
    : 0;
  const rainfallDeficit = Math.max(0, Math.min(1, inputs.rainfallDeficitPct / 100));
  const qualityUsabilityLoss = Math.max(0, Math.min(1, (80 - inputs.wqi) / 100));

  // Logit linear combination weights incorporating anomaly variance penalty
  const z = -1.8 
    + (2.6 * storageDepletion) 
    + (2.3 * deficitRatio) 
    + (1.5 * rainfallDeficit) 
    + (0.9 * qualityUsabilityLoss)
    + anomalyPenalty;

  // Calibrated logistic sigmoid function
  const rawProb = 1 / (1 + Math.exp(-z * horizonScaling));
  const riskProbability = Math.round(Math.max(5, Math.min(98, rawProb * 100)));
  const riskCategory = classifyRiskCategory(riskProbability);

  // Prepared contributing factor structures
  const contributingFactors: ContributingFactor[] = [];

  if (anomalyResult.hasAnomalies) {
    contributingFactors.push({
      name: 'Telemetry Stream Anomaly Detected',
      impact: anomalyResult.maxSeverity === 'CRITICAL' || anomalyResult.maxSeverity === 'HIGH' ? 'high' : 'medium',
      description: `${anomalyResult.anomalyCount} telemetry stream anomaly(ies) detected (Max Severity: ${anomalyResult.maxSeverity}).`
    });
  }

  if (storageDepletion > 0.4) {
    contributingFactors.push({
      name: 'Reservoir Capacity Decline',
      impact: storageDepletion > 0.6 ? 'high' : 'medium',
      description: `Reservoir storage is at ${inputs.storageLevelPct}%, below optimal reserve buffers.`
    });
  }

  if (municipalDemandMLD > forecastedSupplyMLD) {
    const deficitMLD = municipalDemandMLD - forecastedSupplyMLD;
    contributingFactors.push({
      name: 'Demand Exceeding Supply',
      impact: deficitRatio > 0.3 ? 'high' : 'medium',
      description: `Regional demand (${municipalDemandMLD} MLD) exceeds projected streamflow supply (${forecastedSupplyMLD} MLD / ${forecastedStreamflowCFS} CFS) by ${deficitMLD} MLD.`
    });
  } else {
    contributingFactors.push({
      name: 'Supply Satisfies Demand',
      impact: 'low',
      description: `Projected streamflow supply (${forecastedSupplyMLD} MLD / ${forecastedStreamflowCFS} CFS) satisfies regional demand (${municipalDemandMLD} MLD).`
    });
  }

  if (rainfallDeficit > 0.25) {
    contributingFactors.push({
      name: 'Seasonal Rainfall Deficit',
      impact: rainfallDeficit > 0.4 ? 'high' : 'low',
      description: `Monsoon replenishment is ${inputs.rainfallDeficitPct}% below seasonal average.`
    });
  }

  if (inputs.wqi < 70) {
    contributingFactors.push({
      name: 'Water Quality Usability Loss',
      impact: inputs.wqi < 55 ? 'high' : 'low',
      description: `Low WQI (${inputs.wqi}) restricts raw water treatment throughput.`
    });
  }

  // MATHEMATICAL LOGIT FEATURE CONTRIBUTION EXPLAINABILITY ENGINE
  const termStorage = 2.6 * storageDepletion;
  const termDeficit = 2.3 * deficitRatio;
  const termRainfall = 1.5 * rainfallDeficit;
  const termQuality = 0.9 * qualityUsabilityLoss;
  const termAnomaly = anomalyPenalty;

  const totalPositiveLogit = Math.max(0.1, termStorage + termDeficit + termRainfall + termQuality + termAnomaly);

  const rawExplainableFactors = [
    {
      factorName: 'Reservoir Storage',
      direction: 'down' as const,
      contribValue: termStorage,
      pct: Math.round((termStorage / totalPositiveLogit) * 100),
      description: `Storage capacity at ${inputs.storageLevelPct}%`
    },
    {
      factorName: 'Water Demand',
      direction: 'up' as const,
      contribValue: termDeficit,
      pct: Math.round((termDeficit / totalPositiveLogit) * 100),
      description: `Projected streamflow supply ${forecastedSupplyMLD} MLD vs Demand ${municipalDemandMLD} MLD`
    },
    {
      factorName: 'Monsoon Rainfall',
      direction: 'down' as const,
      contribValue: termRainfall,
      pct: Math.round((termRainfall / totalPositiveLogit) * 100),
      description: `Rainfall deficit at ${inputs.rainfallDeficitPct}%`
    },
    {
      factorName: 'Water Quality (WQI)',
      direction: 'down' as const,
      contribValue: termQuality,
      pct: Math.round((termQuality / totalPositiveLogit) * 100),
      description: `WQI score of ${inputs.wqi}/100`
    },
    {
      factorName: 'Telemetry Volatility',
      direction: 'up' as const,
      contribValue: termAnomaly,
      pct: Math.round((termAnomaly / totalPositiveLogit) * 100),
      description: `${anomalyResult.anomalyCount} telemetry stream anomaly(ies)`
    }
  ];

  const explainableFactors = rawExplainableFactors
    .filter(f => f.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4)
    .map(f => ({
      factorName: f.factorName,
      direction: f.direction,
      impactLevel: (f.pct >= 30 ? 'High Impact' : f.pct >= 15 ? 'Medium Impact' : 'Low Impact') as 'High Impact' | 'Medium Impact' | 'Low Impact',
      contributionPct: f.pct,
      description: f.description
    }));

  if (explainableFactors.length === 0) {
    explainableFactors.push({
      factorName: 'Reservoir Storage',
      direction: 'down',
      impactLevel: 'Low Impact',
      contributionPct: 100,
      description: `Storage levels optimal at ${inputs.storageLevelPct}%`
    });
  }

  const prediction: WaterStressPrediction = {
    stationId: inputs.stationId,
    stationName: inputs.stationName,
    location: inputs.location,
    horizon,
    horizonDays,
    riskProbability,
    riskCategory,
    isSimulatedOrModelled: true,
    modelLabel: 'Modelled Estimate',
    evaluatedAt: new Date().toISOString(),
    contributingFactors,
    explainableFactors,
    metrics: {
      storageLevelPct: inputs.storageLevelPct,
      inflowMLD: inputs.inflowMLD,
      demandMLD: inputs.demandMLD,
      rainfallDeficitPct: inputs.rainfallDeficitPct,
      wqi: inputs.wqi
    }
  };

  predictionCache.set(cacheKey, { prediction, timestamp: Date.now() });
  return prediction;
}
