export type UserRole = 'admin' | 'citizen';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  role: UserRole;
  createdAt: any; // Timestamp
  lastLogin?: any; // Timestamp
  phoneNumber?: string;
  location?: string;
}

export interface WaterPrediction {
  id?: string;
  userId: string;
  userEmail: string;
  timestamp: any; // Timestamp or ISO string
  inputs: {
    ph: number;
    hardness: number;
    solids: number;
    chloramines: number;
    sulfate: number;
    conductivity: number;
    organicCarbon: number;
    trihalomethanes: number;
    turbidity: number;
  };
  result: 'safe' | 'unsafe';
  confidence: number;
  advisoryText?: string;
  location?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

export interface ContactMessage {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  timestamp: any;
  status: 'Pending' | 'Under Investigation' | 'Resolved' | 'Rejected' | string;
}

export interface UploadedReport {
  id?: string;
  userId: string;
  userEmail: string;
  citizenName?: string;
  title: string;
  description: string;
  location: string;
  imageUrl?: string;
  fileUrl?: string;
  timestamp: any;
  status: 'Pending' | 'Under Investigation' | 'Resolved' | 'Rejected' | 'pending' | 'reviewed' | 'resolved' | string;
  latitude?: number;
  longitude?: number;
  ph?: number;
  confidence?: number;
  waterQuality?: 'safe' | 'unsafe';
}

export type DataFreshnessStatus = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';

export interface NormalizedMeasurement {
  parameter: string; // e.g. 'streamflow', 'waterLevel', 'temperature', 'ph', 'conductivity', 'turbidity', 'dissolvedOxygen'
  parameterKey: string;
  value: number | null;
  unit: string;
  observedAt: string | null;
  retrievedAt: string;
  source: 'USGS' | 'EPA_WQP' | 'DEMO';
  sourceStationId: string;
}

export interface WaterStation {
  id: string;
  source: 'USGS' | 'EPA_WQP' | 'DEMO';
  sourceStationId: string;
  name: string;
  location: string;
  region?: string;
  basin?: string;
  latitude?: number;
  longitude?: number;
  wqi: number; // Water Quality Index (0 - 100)
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'Excellent' | 'Good' | 'Fair' | 'Poor';
  isDemonstration: boolean;
  demonstrationLabel?: string;
  parameters: {
    ph: number;
    turbidity: number;
    solids: number;
    chloramines: number;
    sulfate: number;
    conductivity: number;
    dissolvedOxygen: number;
    temperature: number;
    streamflow?: number | null;
    waterLevel?: number | null;
    storageLevelPct?: number;
    inflowMLD?: number;
    demandMLD?: number;
    rainfallDeficitPct?: number;
  };
  measurements?: {
    streamflow?: NormalizedMeasurement | null;
    waterLevel?: NormalizedMeasurement | null;
    temperature?: NormalizedMeasurement | null;
    conductivity?: NormalizedMeasurement | null;
    turbidity?: NormalizedMeasurement | null;
    pH?: NormalizedMeasurement | null;
    dissolvedOxygen?: NormalizedMeasurement | null;
    storageLevelPct?: NormalizedMeasurement | null;
    demandMLD?: NormalizedMeasurement | null;
  };
  lastObserved: string | null;
  lastRetrieved: string;
  freshnessStatus: DataFreshnessStatus;
  freshnessLabel: string;
  sourceUrl?: string;
}

export type ForecastHorizon = '7d' | '14d' | '30d';

export type RiskCategory = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface ContributingFactor {
  name: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface ExplainableRiskFactor {
  factorName: string;
  direction: 'up' | 'down';
  impactLevel: 'High Impact' | 'Medium Impact' | 'Low Impact';
  contributionPct: number;
  description: string;
}

export interface WaterStressPrediction {
  stationId: string;
  stationName: string;
  location: string;
  horizon: ForecastHorizon;
  horizonDays: number;
  riskProbability: number; // 0 - 100 percentage
  riskCategory: RiskCategory;
  isSimulatedOrModelled: boolean;
  modelLabel: string; // e.g. "Modelled Estimate"
  evaluatedAt: string;
  contributingFactors: ContributingFactor[];
  explainableFactors: ExplainableRiskFactor[];
  metrics: {
    storageLevelPct: number;
    inflowMLD: number;
    demandMLD: number;
    rainfallDeficitPct: number;
    wqi: number;
  };
}

export interface DemandDataPoint {
  dateLabel: string;
  historicalDemand?: number; // MLD (defined for past dates)
  forecastDemand?: number;   // MLD (defined for forecast dates)
  isForecast: boolean;
}

export interface DemandForecastResult {
  stationId: string;
  currentDemandMLD: number;
  forecast7dMLD: number;
  forecast14dMLD?: number;
  forecast30dMLD: number;
  currentStreamflowCFS?: number;
  forecast7dCFS?: number;
  forecast14dCFS?: number;
  forecast30dCFS?: number;
  unit?: string;
  targetVariable?: string;
  forecastMethod?: string;
  trendPct: number; // e.g. +4.2% or -1.5%
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  modelLabel: string;
  algorithm?: string;
  modelName?: string;
  modelVersion?: string;
  isSimulatedOrModelled: boolean;
  outOfDistribution?: boolean;
  confidenceNote?: string;
  timeSeriesData: DemandDataPoint[];
}

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TelemetryAnomaly {
  id: string;
  parameterName: string;
  parameterKey: string;
  observedValue: number | string;
  expectedRange: string; // e.g. "0.4 – 2.1 NTU"
  zScore: number;
  severity: AnomalySeverity;
  explanation: string;
  detectedAt: string;
}

export interface AnomalyDetectionResult {
  stationId: string;
  stationName: string;
  hasAnomalies: boolean;
  anomalyCount: number;
  maxSeverity: 'NONE' | AnomalySeverity;
  modelLabel: string;
  isSimulatedOrModelled: boolean;
  anomalies: TelemetryAnomaly[];
  evaluatedAt: string;
}

export interface SimulationScenarioInputs {
  storageLevelPct: number;    // Simulated reservoir storage % (5 - 95)
  demandSurgePct: number;     // Simulated demand surge % (-30 to +50)
  rainfallDeficitPct: number; // Simulated rainfall deficit % (0 - 90)
}

export interface WaterCrisisSimulationResult {
  stationId: string;
  horizon: ForecastHorizon;
  baselinePrediction: WaterStressPrediction;
  scenarioPrediction: WaterStressPrediction;
  riskDeltaPoints: number; // e.g. +39 percentage points
  explanation: string;
  modelLabel: string;
  isSimulatedOrModelled: boolean;
}

export interface WaterAdvisoryResponse {
  success: boolean;
  result: 'safe' | 'unsafe';
  confidence: number;
  advisoryText: string;
  complianceChecks: Array<{
    parameter: string;
    value: string | number;
    status: 'pass' | 'fail';
    standard: string;
  }>;
  assessmentType: 'AI-assisted advisory' | 'Guideline-based assessment';
  generatedAt: string;
}




