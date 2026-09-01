import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getWaterStations, getStationById } from './server/data/dataService';
import { serverCache } from './server/data/cacheService';
import { getDemandModelMetadata, predictDemandWithRandomForest } from './server/ml/demandPredictor';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

// Serverless URL rewrite compatibility middleware
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/assets') && !req.url.includes('.')) {
    const originalUrl = req.url;
    req.url = '/api' + (originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl);
  }
  next();
});

// Initialize Gemini client (lazy initialization, graceful error handling)
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        aiClient = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize Gemini AI Client:', error);
      }
    }
  }
  return aiClient;
}

// Initialize Firebase Admin SDK safely (with projectId fallback to prevent hanging on cloud metadata service)
function getFirebaseAdminApp() {
  if (getApps().length === 0) {
    try {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'ancient-ascent-65jvd';
      initializeApp({ projectId });
    } catch (err) {
      console.warn('Firebase Admin SDK initialization note:', err);
    }
  }
  return getApps()[0] || null;
}

getFirebaseAdminApp();

// Authoritative Admin Authorization Security Middleware (Strict Firebase ID Token Verification)
const requireAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  // 1. Reject requests lacking a valid Bearer Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Firebase ID token required in Authorization header (Bearer <token>).' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  try {
    // 2. Verify Firebase ID Token authoritatively using Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = (decodedToken.email || '').toLowerCase();

    // 3. Verify user's administrative role in Firestore profile (users/{uid}.role === "admin")
    let role = 'citizen';
    try {
      const userDoc = await getFirestore().collection('users').doc(uid).get();
      if (userDoc.exists) {
        role = userDoc.data()?.role || 'citizen';
      }
    } catch (dbErr) {
      console.error('Firestore user role lookup failed:', dbErr);
    }

    // Backup email role bootstrap if Firestore document not yet populated
    if (email === 'boomikaram35@gmail.com') {
      role = 'admin';
    }

    // 4. Reject non-admin users with HTTP 403 Forbidden
    if (role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin role authorization required.' });
      return;
    }

    (req as any).user = { uid, email, role };
    next();
  } catch (tokenErr: any) {
    console.error('Firebase Admin ID Token verification failed:', tokenErr?.message || tokenErr);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase authentication token.' });
  }
};

// --- REAL WATER BACKEND DATA INGESTION ENDPOINTS ---

// GET /api/water/stations - Get all normalized water stations (USGS + Demonstration)
app.get('/api/water/stations', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const data = await getWaterStations(forceRefresh);
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching water stations:', error);
    res.status(500).json({ error: 'Failed to retrieve water stations', details: error?.message });
  }
});

// GET /api/water/stations/:stationId - Get specific station by ID
app.get('/api/water/stations/:stationId', async (req, res) => {
  try {
    const station = await getStationById(req.params.stationId);
    if (!station) {
      res.status(404).json({ error: 'Water station not found' });
      return;
    }
    res.json(station);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch station', details: error?.message });
  }
});

// GET /api/water/stations/:stationId/measurements - Get telemetry measurements with provenance
app.get('/api/water/stations/:stationId/measurements', async (req, res) => {
  try {
    const station = await getStationById(req.params.stationId);
    if (!station) {
      res.status(404).json({ error: 'Water station not found' });
      return;
    }
    res.json({
      stationId: station.id,
      name: station.name,
      source: station.source,
      sourceStationId: station.sourceStationId,
      measurements: station.measurements || {},
      parameters: station.parameters,
      lastObserved: station.lastObserved,
      lastRetrieved: station.lastRetrieved,
      freshnessStatus: station.freshnessStatus,
      freshnessLabel: station.freshnessLabel
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch measurements', details: error?.message });
  }
});

// GET /api/water/quality - System-wide water quality summary
app.get('/api/water/quality', async (req, res) => {
  try {
    const { stations, source, fetchedAt } = await getWaterStations();
    const total = stations.length;
    const avgWqi = total > 0 ? Math.round(stations.reduce((sum, s) => sum + s.wqi, 0) / total) : 80;

    res.json({
      totalStations: total,
      averageWqi: avgWqi,
      usgsStationCount: stations.filter(s => s.source === 'USGS').length,
      demoStationCount: stations.filter(s => s.isDemonstration).length,
      excellentCount: stations.filter(s => s.status.toLowerCase() === 'excellent').length,
      goodCount: stations.filter(s => s.status.toLowerCase() === 'good').length,
      fairCount: stations.filter(s => s.status.toLowerCase() === 'fair').length,
      poorCount: stations.filter(s => s.status.toLowerCase() === 'poor' || s.status.toLowerCase() === 'critical').length,
      source,
      fetchedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to aggregate water quality summary', details: error?.message });
  }
});

// GET /api/water/health - Data ingestion health status
app.get('/api/water/health', async (req, res) => {
  const cacheState = serverCache.getCachedStations();
  res.json({
    status: 'ONLINE',
    cacheState: {
      cachedStationsCount: cacheState.stations.length,
      isStale: cacheState.isStale,
      lastFetch: cacheState.lastFetch
    },
    ingestionLogs: serverCache.getIngestionLogs()
  });
});

// POST /api/water/ingest - Backend data ingestion refresh trigger (Admin Only)
app.post('/api/water/ingest', requireAdminAuth, async (req, res) => {
  try {
    const data = await getWaterStations(true);
    res.json({
      message: 'Data ingestion process completed successfully.',
      result: data
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Ingestion failed', details: error?.message });
  }
});

// API endpoint for predictions advisor
app.post('/api/predict-advisory', async (req, res) => {
  // Support req.body.inputs (from Predict.tsx), req.body.parameters, or flat body
  const params = req.body.inputs || req.body.parameters || req.body;

  if (!params) {
    res.status(400).json({ error: 'Missing water parameter inputs.' });
    return;
  }

  const ph = Number(params.ph ?? 7.2);
  const hardness = Number(params.hardness ?? 120);
  const solids = Number(params.solids ?? 350);
  const chloramines = Number(params.chloramines ?? 2.1);
  const sulfate = Number(params.sulfate ?? 120);
  const conductivity = Number(params.conductivity ?? 450);
  const organicCarbon = Number(params.organicCarbon ?? params.organic_carbon ?? 2.5);
  const trihalomethanes = Number(params.trihalomethanes ?? 45);
  const turbidity = Number(params.turbidity ?? 1.1);
  const location = req.body.location || params.location || 'Municipal Watershed Grid';

  // Perform deterministic WHO/EPA guideline analysis
  const isPhSafe = ph >= 6.5 && ph <= 8.5;
  const isTurbSafe = turbidity <= 5.0;
  const isSolidsSafe = solids <= 1000;
  const isChlorSafe = chloramines <= 4.0;
  const isSulfateSafe = sulfate <= 250;
  const isThmSafe = trihalomethanes <= 80;

  const complianceChecks = [
    { parameter: 'Acidity (pH)', value: ph, status: (isPhSafe ? 'pass' : 'fail') as 'pass' | 'fail', standard: '6.5 - 8.5 pH' },
    { parameter: 'Turbidity', value: `${turbidity} NTU`, status: (isTurbSafe ? 'pass' : 'fail') as 'pass' | 'fail', standard: '< 5.0 NTU' },
    { parameter: 'TDS Solids', value: `${solids} ppm`, status: (isSolidsSafe ? 'pass' : 'fail') as 'pass' | 'fail', standard: '< 1000 ppm' },
    { parameter: 'Chloramines', value: `${chloramines} ppm`, status: (isChlorSafe ? 'pass' : 'fail') as 'pass' | 'fail', standard: '< 4.0 ppm' },
    { parameter: 'Sulfate', value: `${sulfate} mg/L`, status: (isSulfateSafe ? 'pass' : 'fail') as 'pass' | 'fail', standard: '< 250 mg/L' },
    { parameter: 'Trihalomethanes', value: `${trihalomethanes} ppb`, status: (isThmSafe ? 'pass' : 'fail') as 'pass' | 'fail', standard: '< 80 ppb' },
  ];

  const safeCount = [isPhSafe, isTurbSafe, isSolidsSafe, isChlorSafe, isSulfateSafe, isThmSafe].filter(Boolean).length;
  const result: 'safe' | 'unsafe' = safeCount >= 5 ? 'safe' : 'unsafe';
  const confidence = Math.round((safeCount / 6) * 100);

  const issues: string[] = [];
  if (!isPhSafe) issues.push(`pH is ${ph}, which is outside the EPA/WHO recommended range of 6.5 - 8.5.`);
  if (!isTurbSafe) issues.push(`Turbidity is ${turbidity} NTU, exceeding the aesthetic target of 1 NTU and maximum limit of 5 NTU.`);
  if (!isChlorSafe) issues.push(`Chloramine level is ${chloramines} ppm, above the EPA MRDL of 4.0 ppm.`);
  if (!isSolidsSafe) issues.push(`Total Dissolved Solids (TDS) is ${solids} ppm, exceeding acceptable limit of 1000 ppm.`);
  if (!isSulfateSafe) issues.push(`Sulfate is ${sulfate} mg/L, exceeding recommended limit of 250 mg/L.`);
  if (!isThmSafe) issues.push(`Trihalomethanes are ${trihalomethanes} ppb, exceeding EPA MCL of 80 ppb.`);

  const isSafeText = result === 'safe' ? 'Potable (Safe for Consumption)' : 'Non-Potable (Treatment/Boiling Required)';

  const prompt = `
You are a Water Safety and Chemical Engineering AI advisor for AquaVerse.
A water sample from ${location} has been analyzed:
- pH: ${ph} (6.5 - 8.5 normal)
- Hardness: ${hardness} mg/L
- Total Dissolved Solids: ${solids} ppm (< 1000 acceptable)
- Chloramines: ${chloramines} ppm (< 4.0 ppm normal)
- Sulfate: ${sulfate} mg/L (< 250 mg/L normal)
- Conductivity: ${conductivity} μS/cm (< 1000 normal)
- Organic Carbon: ${organicCarbon} ppm (< 4.0 ppm typical)
- Trihalomethanes (THMs): ${trihalomethanes} ppb (< 80 ppb normal)
- Turbidity: ${turbidity} NTU (< 5.0 acceptable)

Deterministic Status: **${isSafeText}** (${confidence}% compliance).
Concerns: ${issues.length > 0 ? issues.map(i => '- ' + i).join('\n') : '- None (All parameters comply with WHO/EPA standards)'}

Please provide a structured, professional water quality advisory report (in Markdown format).
Include:
1. **Water Safety Verdict**
2. **Specific Parameter Concerns**
3. **Purification & Treatment Recommendations**
4. **General Health Advisory**
`;

  let advisoryText: string = '';
  let assessmentType: 'AI-assisted advisory' | 'Guideline-based assessment' = 'Guideline-based assessment';

  try {
    const ai = getAiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt
        });
        if (response.text) {
          advisoryText = response.text;
          assessmentType = 'AI-assisted advisory';
        }
      } catch (geminiError) {
        console.warn('Gemini AI primary call failed, trying fallback gemini-3.1-flash-lite...', geminiError);
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt
        });
        if (response.text) {
          advisoryText = response.text;
          assessmentType = 'AI-assisted advisory';
        }
      }
    }
  } catch (err) {
    console.warn('Gemini AI service unavailable, using guideline-based assessment:', err);
  }

  if (!advisoryText) {
    assessmentType = 'Guideline-based assessment';
    advisoryText = generateFallbackAdvisory({ ph, hardness, solids, chloramines, sulfate, conductivity, organicCarbon, trihalomethanes, turbidity }, issues, isSafeText);
  }

  res.json({
    success: true,
    result,
    confidence,
    advisoryText,
    complianceChecks,
    assessmentType,
    generatedAt: new Date().toISOString()
  });
});

// API endpoint for Water Stress Risk Prediction Engine
app.post('/api/water-stress', (req, res) => {
  const { stationId, stationName, location, storageLevelPct, inflowMLD, demandMLD, rainfallDeficitPct, wqi, horizon } = req.body;

  if (!stationId || storageLevelPct === undefined || inflowMLD === undefined || demandMLD === undefined) {
    res.status(400).json({ error: 'Missing required station hydrology parameters.' });
    return;
  }

  const selectedHorizon = (horizon === '7d' || horizon === '14d' || horizon === '30d') ? horizon : '30d';
  const horizonDays = selectedHorizon === '7d' ? 7 : selectedHorizon === '14d' ? 14 : 30;
  const horizonScaling = selectedHorizon === '7d' ? 0.82 : selectedHorizon === '14d' ? 0.91 : 1.0;

  const storageDepletion = Math.max(0, Math.min(1, (100 - Number(storageLevelPct)) / 100));
  const deficitRatio = Number(demandMLD) > 0 ? Math.max(0, Math.min(1, (Number(demandMLD) - Number(inflowMLD)) / Number(demandMLD))) : 0;
  const rainfallDeficit = Math.max(0, Math.min(1, Number(rainfallDeficitPct || 0) / 100));
  const qualityLoss = Math.max(0, Math.min(1, (80 - Number(wqi || 80)) / 100));

  const z = -1.8 + (2.6 * storageDepletion) + (2.3 * deficitRatio) + (1.5 * rainfallDeficit) + (0.9 * qualityLoss);
  const rawProb = 1 / (1 + Math.exp(-z * horizonScaling));
  const riskProbability = Math.round(Math.max(5, Math.min(98, rawProb * 100)));

  let riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (riskProbability >= 80) riskCategory = 'CRITICAL';
  else if (riskProbability >= 60) riskCategory = 'HIGH';
  else if (riskProbability >= 30) riskCategory = 'MODERATE';

  res.json({
    stationId,
    stationName: stationName || 'Reservoir Node',
    location: location || 'Bangalore',
    horizon: selectedHorizon,
    horizonDays,
    riskProbability,
    riskCategory,
    isSimulatedOrModelled: true,
    modelLabel: 'Modelled Estimate',
    evaluatedAt: new Date().toISOString()
  });
});

// API endpoint to retrieve trained Random Forest Streamflow Forecasting model metadata
app.get(['/api/models/streamflow', '/api/models/demand'], (req, res) => {
  try {
    const metadata = getDemandModelMetadata();
    res.json(metadata);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve streamflow model metadata', details: error?.message });
  }
});

// Admin-Protected API endpoint to retrieve full system model evaluation metrics & holdout test telemetry
app.get('/api/admin/models/evaluation', requireAdminAuth, (req, res) => {
  try {
    const metadata = getDemandModelMetadata();

    const demandEval = {
      model: metadata.modelName,
      version: metadata.modelVersion,
      algorithm: metadata.algorithm,
      trainedAt: metadata.trainedAt,
      dataSource: metadata.dataSource,
      trainingPeriod: metadata.dataPeriod,
      testPeriod: metadata.testPeriod || { startDate: '2026-07-01', endDate: '2026-08-22' },
      totalObservations: metadata.totalObservations,
      split: metadata.split,
      hyperparameters: metadata.hyperparameters,
      features: metadata.features,
      featureImportance: metadata.featureImportances,
      metrics: {
        baseline: metadata.testEvaluation.baseline,
        randomForest: metadata.testEvaluation.randomForest,
        improvement: {
          mae: roundNum(metadata.testEvaluation.baseline.mae - metadata.testEvaluation.randomForest.mae),
          rmse: roundNum(metadata.testEvaluation.baseline.rmse - metadata.testEvaluation.randomForest.rmse),
          mape: roundNum(metadata.testEvaluation.baseline.mape - metadata.testEvaluation.randomForest.mape)
        }
      },
      testPredictions: metadata.testPredictions || []
    };

    const otherModels = [
      {
        modelName: 'Water Quality Chemical Classifier',
        modelType: 'classification',
        status: 'Evaluation unavailable — no labelled ground truth.',
        explanation: 'Water quality chemical potability checks rely on deterministic WHO/EPA threshold rules. Supervised ground truth labels are uncollected.'
      },
      {
        modelName: 'Hydrological Anomaly Engine (Z-Score & 3-Sigma)',
        modelType: 'anomaly',
        status: 'Evaluation unavailable — no labelled ground truth.',
        explanation: 'Statistical telemetry anomaly detection uses baseline standard deviation bounds. Historical anomaly incident labels are uncollected.'
      },
      {
        modelName: 'Water Stress Risk Prediction Engine',
        modelType: 'logit',
        status: 'Evaluated Deterministic Logit Model',
        explanation: 'Hydrological logit risk model mapping storage depletion, deficit ratios, and rainfall deficit across 7d, 14d, and 30d forecast horizons.'
      }
    ];

    res.json({
      demandForecast: demandEval,
      otherModels,
      evaluatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve admin model evaluation telemetry', details: error?.message });
  }
});

function roundNum(val: number): number {
  return Math.round(val * 100) / 100;
}

// API endpoint for Hydrologic Streamflow Forecasting Engine (Powered by Random Forest Regressor)
app.post(['/api/streamflow-forecast', '/api/demand-forecast'], (req, res) => {
  const stationId = req.body.stationId;
  const CFS_TO_MLD = 2.4466;

  if (!stationId) {
    res.status(400).json({ error: 'Validation Error: stationId parameter is required.' });
    return;
  }

  let rawCFS = req.body.baseStreamflowCFS;
  if ((rawCFS === undefined || rawCFS === null) && req.body.baseInflowMLD !== undefined) {
    rawCFS = Number(req.body.baseInflowMLD) / CFS_TO_MLD;
  }

  const baseStreamflowCFS = Number(rawCFS);

  if (rawCFS === undefined || rawCFS === null || isNaN(baseStreamflowCFS) || baseStreamflowCFS <= 0) {
    res.status(400).json({ 
      error: 'Validation Error: baseStreamflowCFS (streamflow/discharge in CFS) is required and must be a positive number. Demand in MLD cannot be passed directly as streamflow.' 
    });
    return;
  }

  try {
    const result = predictDemandWithRandomForest(String(stationId), baseStreamflowCFS);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: 'Random Forest Inference Engine Unavailable', details: error?.message });
  }
});

// API endpoint for Water Telemetry Anomaly Detection Engine
app.post('/api/anomaly-detection', (req, res) => {
  const { stationId, ph, turbidity, tds, chloramines, sulfate, conductivity, storageLevelPct, demandMLD } = req.body;

  if (!stationId) {
    res.status(400).json({ error: 'Missing stationId.' });
    return;
  }

  const anomalies: any[] = [];
  const checks = [
    { key: 'ph', name: 'Acidity (pH)', val: Number(ph || 7.4), min: 6.6, max: 8.2, unit: 'pH', mean: 7.4, sd: 0.4 },
    { key: 'turbidity', name: 'Turbidity (Cloudiness)', val: Number(turbidity || 1.1), min: 0.4, max: 2.1, unit: 'NTU', mean: 1.1, sd: 0.5 },
    { key: 'tds', name: 'Total Dissolved Solids', val: Number(tds || 350), min: 150, max: 590, unit: 'ppm', mean: 350, sd: 120 },
  ];

  checks.forEach(chk => {
    const zScore = Math.abs(chk.val - chk.mean) / chk.sd;
    if (zScore >= 2.0 || chk.val < chk.min || chk.val > chk.max) {
      anomalies.push({
        parameterName: chk.name,
        observedValue: `${chk.val} ${chk.unit}`,
        expectedRange: `${chk.min} – ${chk.max} ${chk.unit}`,
        zScore: Math.round(zScore * 10) / 10,
        severity: zScore >= 3.2 ? 'CRITICAL' : zScore >= 2.7 ? 'HIGH' : 'MEDIUM',
        explanation: `Observed ${chk.name} of ${chk.val} ${chk.unit} deviates from historical baseline bounds (${chk.min}–${chk.max} ${chk.unit}).`
      });
    }
  });

  res.json({
    stationId,
    hasAnomalies: anomalies.length > 0,
    anomalyCount: anomalies.length,
    maxSeverity: anomalies.length > 0 ? anomalies[0].severity : 'NONE',
    modelLabel: 'Modelled Anomaly Engine (Z-Score)',
    anomalies
  });
});

// API endpoint for Water Crisis What-If Scenario Simulator
app.post('/api/simulate-crisis', (req, res) => {
  const { stationId, baseStoragePct, baseDemandMLD, baseRainfallDeficitPct, simStoragePct, simDemandSurgePct, simRainfallDeficitPct, horizon } = req.body;

  if (!stationId) {
    res.status(400).json({ error: 'Missing stationId.' });
    return;
  }

  const selectedHorizon = horizon || '30d';
  const baselineStorage = Number(baseStoragePct || 78);
  const scenarioStorage = Number(simStoragePct !== undefined ? simStoragePct : baselineStorage);

  const baselineDemand = Number(baseDemandMLD || 210);
  const surgePct = Number(simDemandSurgePct || 0);
  const scenarioDemand = Math.round(baselineDemand * (1 + surgePct / 100));

  const baselineRainfall = Number(baseRainfallDeficitPct || 15);
  const scenarioRainfall = Number(simRainfallDeficitPct !== undefined ? simRainfallDeficitPct : baselineRainfall);

  // Baseline logit calculation
  const baseDepletion = Math.max(0, Math.min(1, (100 - baselineStorage) / 100));
  const baseDeficit = Math.max(0, Math.min(1, (baselineDemand - 240) / baselineDemand));
  const baseRain = Math.max(0, Math.min(1, baselineRainfall / 100));
  const baseZ = -1.8 + (2.6 * baseDepletion) + (2.3 * baseDeficit) + (1.5 * baseRain);
  const baseProb = Math.round(Math.max(5, Math.min(98, (1 / (1 + Math.exp(-baseZ))) * 100)));

  // Scenario logit calculation
  const simDepletion = Math.max(0, Math.min(1, (100 - scenarioStorage) / 100));
  const simDeficit = Math.max(0, Math.min(1, (scenarioDemand - 240) / scenarioDemand));
  const simRain = Math.max(0, Math.min(1, scenarioRainfall / 100));
  const simZ = -1.8 + (2.6 * simDepletion) + (2.3 * simDeficit) + (1.5 * simRain);
  const scenarioProb = Math.round(Math.max(5, Math.min(98, (1 / (1 + Math.exp(-simZ))) * 100)));

  const delta = scenarioProb - baseProb;

  res.json({
    stationId,
    horizon: selectedHorizon,
    baselineRisk: baseProb,
    scenarioRisk: scenarioProb,
    riskDeltaPoints: delta,
    modelLabel: 'Scenario Simulation',
    isSimulatedOrModelled: true,
    explanation: `Water stress risk changed by ${delta > 0 ? '+' : ''}${delta} percentage points (${baseProb}% → ${scenarioProb}%) under simulated stress conditions.`
  });
});





function generateFallbackAdvisory(params: any, issues: string[], verdict: string): string {
  let content = `### AquaVerse AI Local Advisory Report

**Water Potability Status**: **${verdict}**

#### **Water Safety Verdict**
Based on our rule-based telemetry metrics, this water sample has been analyzed. The primary concerns identified are related to basic chemical thresholds set by the World Health Organization (WHO) and EPA.

`;

  if (issues.length > 0) {
    content += `#### **Specific Parameter Concerns**
The following irregularities were detected in your water analysis:
${issues.map(i => `* **${i.split(',')[0]}**: ${i.substring(i.indexOf(',') + 2)}`).join('\n')}

`;
  } else {
    content += `#### **Parameter Analysis**
All core measured values, including pH (**${params.ph}**), Turbidity (**${params.turbidity} NTU**), and Chloramines (**${params.chloramines} ppm**), comply with drinking water guidelines. No significant irregularities were detected.

`;
  }

  content += `#### **Purification & Treatment Recommendations**
* **For pH Imbalance**: If pH is too low (acidic), consider neutralizer filters. If high, a reverse osmosis system can assist.
* **For High Solids / TDS / Sulfate**: Reverse Osmosis (RO) filtration is highly effective in reducing mineral solids and chemical compounds.
* **For Turbidity / Particles**: Activated carbon block filters and sediment pre-filters are recommended to clarify cloudy water.
* **Standard Safety Measures**: Even for compliant samples, routine boiling or using an NSF-certified pitcher filter ensures protection against biological pathogens that aren't measured in this chemical analysis.

#### **General Health Advisory**
${issues.length > 0 
  ? `⚠️ **Warning**: Consumption of this water without filtration or boiling is **not recommended** due to the listed contaminants. It may be used for gardening or general washing, but avoid using it for food preparation or infant formula.` 
  : `✅ **Safe**: This water appears chemically stable and is suitable for standard household activities. Keep monitoring the source seasonally for agricultural or geological changes.`}
`;

  return content;
}

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start standalone server if not running in a serverless environment (Vercel)
if (!process.env.VERCEL) {
  startServer();
}

export default app;



