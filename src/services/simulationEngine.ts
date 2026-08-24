import { HydrologyInputs, predictWaterStress } from './waterStressEngine';
import { ForecastHorizon, SimulationScenarioInputs, WaterCrisisSimulationResult, DemandForecastResult } from '../types';

/**
 * Water Crisis What-If Scenario Simulation Engine
 * 
 * Re-runs the Water Stress Prediction Engine against modified environmental and resource parameters:
 * - Reservoir Storage Capacity %
 * - Regional Demand Surge %
 * - Monsoon Rainfall Deficit %
 * 
 * Consumes the authoritative Random Forest streamflow forecast object for consistent predictions across Dashboard and What-If views.
 */
export function runWaterCrisisSimulation(
  baseInputs: HydrologyInputs,
  scenario: SimulationScenarioInputs,
  horizon: ForecastHorizon = '30d',
  authoritativeForecast?: DemandForecastResult
): WaterCrisisSimulationResult {
  // Baseline prediction from real station telemetry using authoritative Random Forest forecast
  const baselinePrediction = predictWaterStress(baseInputs, horizon, authoritativeForecast);

  // Adjusted scenario inputs
  const simulatedDemandMLD = Math.max(20, Math.round(baseInputs.demandMLD * (1 + scenario.demandSurgePct / 100)));

  const simInputs: HydrologyInputs = {
    ...baseInputs,
    storageLevelPct: Math.max(5, Math.min(95, scenario.storageLevelPct)),
    demandMLD: simulatedDemandMLD,
    rainfallDeficitPct: Math.max(0, Math.min(90, scenario.rainfallDeficitPct))
  };

  // Scenario prediction from recalculated logit model using the SAME authoritative Random Forest forecast
  const scenarioPrediction = predictWaterStress(simInputs, horizon, authoritativeForecast);

  const riskDeltaPoints = scenarioPrediction.riskProbability - baselinePrediction.riskProbability;

  // Build model explanation from parameter shifts
  const drivers: string[] = [];
  if (scenario.storageLevelPct < baseInputs.storageLevelPct) {
    drivers.push(`reduced reservoir storage (${baseInputs.storageLevelPct}% → ${scenario.storageLevelPct}%) decreased supply buffers`);
  } else if (scenario.storageLevelPct > baseInputs.storageLevelPct) {
    drivers.push(`replenished reservoir storage (${baseInputs.storageLevelPct}% → ${scenario.storageLevelPct}%) increased reserve capacity`);
  }

  if (scenario.demandSurgePct > 0) {
    drivers.push(`increased regional demand (+${scenario.demandSurgePct}%, ${simulatedDemandMLD} MLD) expanded the supply deficit`);
  } else if (scenario.demandSurgePct < 0) {
    drivers.push(`demand conservation (${scenario.demandSurgePct}%, ${simulatedDemandMLD} MLD) reduced consumption stress`);
  }

  if (scenario.rainfallDeficitPct > baseInputs.rainfallDeficitPct) {
    drivers.push(`exacerbated rainfall deficit (${baseInputs.rainfallDeficitPct}% → ${scenario.rainfallDeficitPct}%) restricted monsoon replenishment`);
  }

  let explanation = '';
  if (riskDeltaPoints > 0) {
    explanation = `Water stress risk increased by +${riskDeltaPoints} percentage points (${baselinePrediction.riskCategory} → ${scenarioPrediction.riskCategory}) primarily because ${drivers.length > 0 ? drivers.join(' while ') : 'simulated stress conditions compounded supply risk'}.`;
  } else if (riskDeltaPoints < 0) {
    explanation = `Water stress risk decreased by ${riskDeltaPoints} percentage points (${baselinePrediction.riskCategory} → ${scenarioPrediction.riskCategory}) primarily because ${drivers.length > 0 ? drivers.join(' and ') : 'simulated interventions relieved supply stress'}.`;
  } else {
    explanation = `Water stress risk remains unchanged at ${baselinePrediction.riskProbability}% (${baselinePrediction.riskCategory}) as scenario parameters align with baseline conditions.`;
  }

  return {
    stationId: baseInputs.stationId,
    horizon,
    baselinePrediction,
    scenarioPrediction,
    riskDeltaPoints,
    explanation,
    modelLabel: 'Scenario Simulation',
    isSimulatedOrModelled: true
  };
}
