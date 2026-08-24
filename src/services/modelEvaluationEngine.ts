export interface RegressionMetric {
  name: string;
  mae: number;
  rmse: number;
  mape: number;
}

export interface MetricImprovement {
  mae: number;
  rmse: number;
  mape: number;
}

export interface FeatureImportanceItem {
  feature: string;
  importancePct: number;
}

export interface TestPredictionPoint {
  date: string;
  actual_demand: number;
  predicted_demand: number;
  baseline_demand: number;
}

export interface DemandModelEvaluationData {
  model: string;
  version: string;
  algorithm: string;
  trainedAt: string;
  dataSource: string;
  trainingPeriod: { startDate: string; endDate: string };
  testPeriod: { startDate: string; endDate: string };
  totalObservations: number;
  split: { trainSamples: number; validationSamples: number; testSamples: number };
  hyperparameters: Record<string, any>;
  features: string[];
  featureImportance: FeatureImportanceItem[];
  metrics: {
    baseline: RegressionMetric;
    randomForest: RegressionMetric;
    improvement: MetricImprovement;
  };
  testPredictions: TestPredictionPoint[];
}

export interface OtherModelStatus {
  modelName: string;
  modelType: 'classification' | 'anomaly' | 'logit';
  status: 'Evaluation unavailable — no labelled ground truth.' | 'Evaluated Deterministic Logit Model';
  explanation: string;
}

export interface SystemModelsEvaluationResponse {
  demandForecast: DemandModelEvaluationData;
  otherModels: OtherModelStatus[];
  evaluatedAt: string;
}

export async function fetchAdminModelEvaluations(idToken?: string): Promise<SystemModelsEvaluationResponse> {
  const headers: Record<string, string> = {};
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch('/api/admin/models/evaluation', { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch model evaluations (HTTP ${response.status})`);
  }
  return response.json();
}
