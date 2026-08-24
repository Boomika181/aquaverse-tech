import { TelemetryAnomaly, AnomalyDetectionResult, AnomalySeverity } from '../types';

export interface StationTelemetryInputs {
  stationId: string;
  stationName: string;
  location: string;
  ph: number;
  turbidity: number;
  tds: number;
  chloramines: number;
  sulfate: number;
  conductivity: number;
  storageLevelPct?: number;
  inflowMLD?: number;
  demandMLD?: number;
}

interface ParameterBaseline {
  key: string;
  name: string;
  unit: string;
  mean: number;
  stdDev: number;
  normalMin: number;
  normalMax: number;
}

// Statistical Historical Telemetry Baselines derived from watershed historical norms
const PARAMETER_BASELINES: ParameterBaseline[] = [
  { key: 'ph', name: 'Acidity (pH)', unit: 'pH', mean: 7.4, stdDev: 0.4, normalMin: 6.6, normalMax: 8.2 },
  { key: 'turbidity', name: 'Turbidity (Cloudiness)', unit: 'NTU', mean: 1.1, stdDev: 0.5, normalMin: 0.4, normalMax: 2.1 },
  { key: 'tds', name: 'Total Dissolved Solids (TDS)', unit: 'ppm', mean: 350, stdDev: 120, normalMin: 150, normalMax: 590 },
  { key: 'chloramines', name: 'Chloramine Residual', unit: 'ppm', mean: 2.2, stdDev: 0.8, normalMin: 0.6, normalMax: 3.8 },
  { key: 'sulfate', name: 'Sulfate Concentration', unit: 'mg/L', mean: 130, stdDev: 45, normalMin: 40, normalMax: 220 },
  { key: 'conductivity', name: 'Electrical Conductivity', unit: 'μS/cm', mean: 450, stdDev: 110, normalMin: 230, normalMax: 670 },
  { key: 'storageLevelPct', name: 'Reservoir Storage Level', unit: '%', mean: 75, stdDev: 15, normalMin: 45, normalMax: 98 },
  { key: 'demandMLD', name: 'Regional Consumption Demand', unit: 'MLD', mean: 210, stdDev: 25, normalMin: 160, normalMax: 260 },
];

const anomalyCache = new Map<string, { result: AnomalyDetectionResult; timestamp: number }>();
const CACHE_TTL_MS = 60000;

/**
 * Statistical Z-Score & 3-Sigma Expected Bounds Anomaly Detection Engine
 * 
 * Method:
 * Calculates Z-Score Z = |observed - mean| / stdDev for each parameter stream.
 * Values exceeding 2.0 standard deviations (or outside historical 3-sigma bounds)
 * are classified as anomalous with severity scaling:
 * - Z >= 3.2: CRITICAL Anomaly
 * - 2.7 <= Z < 3.2: HIGH Anomaly
 * - 2.3 <= Z < 2.7: MEDIUM Anomaly
 * - 2.0 <= Z < 2.3: LOW Anomaly
 */
export function detectTelemetryAnomalies(inputs: StationTelemetryInputs): AnomalyDetectionResult {
  const cacheKey = `${inputs.stationId}_${inputs.ph}_${inputs.turbidity}_${inputs.tds}_${inputs.chloramines}_${inputs.sulfate}_${inputs.conductivity}_${inputs.storageLevelPct}_${inputs.demandMLD}`;
  const cached = anomalyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const anomalies: TelemetryAnomaly[] = [];

  PARAMETER_BASELINES.forEach((param) => {
    const rawVal = (inputs as any)[param.key];
    if (rawVal === undefined || rawVal === null) return;

    const val = Number(rawVal);
    const zScore = Math.abs(val - param.mean) / param.stdDev;

    // Check if value violates expected 2-Sigma or historical boundary limits
    if (zScore >= 2.0 || val < param.normalMin || val > param.normalMax) {
      let severity: AnomalySeverity = 'LOW';
      if (zScore >= 3.2) severity = 'CRITICAL';
      else if (zScore >= 2.7) severity = 'HIGH';
      else if (zScore >= 2.3) severity = 'MEDIUM';

      const devDirection = val > param.normalMax ? 'exceeds' : 'drops below';
      const boundLimit = val > param.normalMax ? param.normalMax : param.normalMin;
      const explanation = `Observed ${param.name} of ${val} ${param.unit} ${devDirection} historical baseline (${param.normalMin}–${param.normalMax} ${param.unit}) with a Z-score of ${zScore.toFixed(1)}.`;

      anomalies.push({
        id: `anom_${param.key}_${Date.now()}`,
        parameterName: param.name,
        parameterKey: param.key,
        observedValue: `${val} ${param.unit}`,
        expectedRange: `${param.normalMin} – ${param.normalMax} ${param.unit}`,
        zScore: Math.round(zScore * 10) / 10,
        severity,
        explanation,
        detectedAt: new Date().toISOString()
      });
    }
  });

  let maxSeverity: 'NONE' | AnomalySeverity = 'NONE';
  if (anomalies.some(a => a.severity === 'CRITICAL')) maxSeverity = 'CRITICAL';
  else if (anomalies.some(a => a.severity === 'HIGH')) maxSeverity = 'HIGH';
  else if (anomalies.some(a => a.severity === 'MEDIUM')) maxSeverity = 'MEDIUM';
  else if (anomalies.length > 0) maxSeverity = 'LOW';

  const result: AnomalyDetectionResult = {
    stationId: inputs.stationId,
    stationName: inputs.stationName,
    hasAnomalies: anomalies.length > 0,
    anomalyCount: anomalies.length,
    maxSeverity,
    modelLabel: 'Modelled Anomaly Engine (Z-Score)',
    isSimulatedOrModelled: true,
    anomalies,
    evaluatedAt: new Date().toISOString()
  };

  anomalyCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}
