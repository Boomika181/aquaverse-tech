import React, { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { savePrediction, getUserPredictions, deletePrediction } from '../firebase/utils';
import { WaterPrediction } from '../types';
import { motion } from 'motion/react';
import waterBg from '../water-bg.jpg';
import linesVideo from '../lines-video.mp4';

type PredictionInputs = {
  ph: number;
  hardness: number;
  solids: number;
  chloramines: number;
  sulfate: number;
  conductivity: number;
  organic_carbon: number;
  trihalomethanes: number;
  turbidity: number;
};

import { 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Download, 
  Save, 
  MapPin, 
  History, 
  Trash2, 
  Eye, 
  RotateCcw,
  ShieldCheck,
  Zap,
  Info,
  Calendar,
  Filter,
  FileText
} from 'lucide-react';

const PRESETS = {
  potable: {
    ph: 7.2,
    hardness: 140,
    solids: 320,
    chloramines: 2.1,
    sulfate: 120,
    conductivity: 410,
    organic_carbon: 2.5,
    trihalomethanes: 45,
    turbidity: 0.8,
  },
  wild: {
    ph: 6.8,
    hardness: 85,
    solids: 180,
    chloramines: 0.2,
    sulfate: 65,
    conductivity: 280,
    organic_carbon: 4.8,
    trihalomethanes: 12,
    turbidity: 2.4,
  },
  contaminated: {
    ph: 5.4,
    hardness: 280,
    solids: 1120,
    chloramines: 5.8,
    sulfate: 380,
    conductivity: 1240,
    organic_carbon: 8.5,
    trihalomethanes: 110,
    turbidity: 6.5,
  }
};

export default function Predict() {
  const { user } = useAuth();

  // Prediction inputs
  const [inputs, setInputs] = useState<PredictionInputs>({
    ph: 7.2,
    hardness: 140,
    solids: 320,
    chloramines: 2.1,
    sulfate: 120,
    conductivity: 410,
    organic_carbon: 2.5,
    trihalomethanes: 45,
    turbidity: 0.8,
  });

  const [locationName, setLocationName] = useState<string>('Yelahanka Water Grid, Bangalore');

  // Analysis result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'safe' | 'unsafe' | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [advisoryText, setAdvisoryText] = useState<string | null>(null);
  const [complianceChecks, setComplianceChecks] = useState<any[]>([]);
  const [assessmentType, setAssessmentType] = useState<'AI-assisted advisory' | 'Guideline-based assessment'>('Guideline-based assessment');

  // History logs state
  const [history, setHistory] = useState<WaterPrediction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'safe' | 'unsafe'>('all');

  // Geolocation
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const logs = await getUserPredictions(user.uid);
      setHistory(logs);
    } catch (err) {
      console.error('Error fetching prediction history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePresetSelect = (presetKey: keyof typeof PRESETS) => {
    setInputs(PRESETS[presetKey]);
    setResult(null);
    setAdvisoryText(null);
  };

  const handleInputChange = (field: keyof PredictionInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationName(`GPS Node (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`);
          setGeoLoading(false);
        },
        () => setGeoLoading(false),
        { timeout: 5000 }
      );
    } else {
      setGeoLoading(false);
    }
  };

  // Execute Chemical Safety Evaluation
  const handleAnalyze = async () => {
    setLoading(true);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/predict-advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs, location: locationName })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.result);
        setConfidence(data.confidence);
        setAdvisoryText(data.advisoryText);
        setComplianceChecks(data.complianceChecks || []);
        setAssessmentType(data.assessmentType || 'Guideline-based assessment');
      } else {
        throw new Error('API server returned non-ok status');
      }
    } catch (err) {
      console.warn('API fetch failed, generating guideline-based assessment:', err);
      setAssessmentType('Guideline-based assessment');
      // Fallback rule evaluation
      const isPhSafe = inputs.ph >= 6.5 && inputs.ph <= 8.5;
      const isTurbSafe = inputs.turbidity <= 5.0;
      const isSolidsSafe = inputs.solids <= 1000;
      const isChlorSafe = inputs.chloramines <= 4.0;
      const isSulfateSafe = inputs.sulfate <= 250;
      const isThmSafe = inputs.trihalomethanes <= 80;

      const safeCount = [isPhSafe, isTurbSafe, isSolidsSafe, isChlorSafe, isSulfateSafe, isThmSafe].filter(Boolean).length;
      const calcResult = safeCount >= 5 ? 'safe' : 'unsafe';
      const calcConf = Math.round((safeCount / 6) * 100);

      setResult(calcResult);
      setConfidence(calcConf);
      setComplianceChecks([
        { parameter: 'Acidity (pH)', value: inputs.ph, status: isPhSafe ? 'pass' : 'fail', standard: '6.5 - 8.5 pH' },
        { parameter: 'Turbidity', value: `${inputs.turbidity} NTU`, status: isTurbSafe ? 'pass' : 'fail', standard: '< 5.0 NTU' },
        { parameter: 'TDS Solids', value: `${inputs.solids} ppm`, status: isSolidsSafe ? 'pass' : 'fail', standard: '< 1000 ppm' },
        { parameter: 'Chloramines', value: `${inputs.chloramines} ppm`, status: isChlorSafe ? 'pass' : 'fail', standard: '< 4.0 ppm' },
        { parameter: 'Sulfate', value: `${inputs.sulfate} mg/L`, status: isSulfateSafe ? 'pass' : 'fail', standard: '< 250 mg/L' },
        { parameter: 'Trihalomethanes', value: `${inputs.trihalomethanes} ppb`, status: isThmSafe ? 'pass' : 'fail', standard: '< 80 ppb' },
      ]);

      setAdvisoryText(`### Environmental Chemical Evaluation Summary\n\n- **Verdict**: Water sample evaluated as **${calcResult.toUpperCase()}**.\n- **Guideline Compliance**: ${calcConf}%\n\nBased on WHO/EPA secondary drinking water guidelines, ${safeCount} of 6 primary health parameters complied with maximum contaminant level standards.`);
    } finally {
      setLoading(false);
    }
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveToHistory = async () => {
    if (!user || !result || confidence === null || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await savePrediction({
        userId: user.uid,
        userEmail: user.email || 'citizen@aquaverse.com',
        inputs: {
          ph: inputs.ph,
          hardness: inputs.hardness,
          solids: inputs.solids,
          chloramines: inputs.chloramines,
          sulfate: inputs.sulfate,
          conductivity: inputs.conductivity,
          organicCarbon: inputs.organic_carbon,
          trihalomethanes: inputs.trihalomethanes,
          turbidity: inputs.turbidity
        },
        result,
        confidence,
        location: locationName,
        advisoryText: advisoryText || ''
      });
      setSaveSuccess(true);
      await loadHistory();
    } catch (err: any) {
      console.error('Error saving prediction to Firestore:', err);
      setSaveError("Unable to save prediction. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prediction log?')) return;
    try {
      await deletePrediction(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const downloadReportText = () => {
    if (!result || !advisoryText) return;
    const content = `AQUAVERSE AI - SCIENTIFIC WATER SAFETY ADVISORY\nDate: ${new Date().toLocaleString()}\nLocation: ${locationName}\nVerdict: ${result.toUpperCase()}\nConfidence: ${confidence}%\n\nPARAMETERS:\n${JSON.stringify(inputs, null, 2)}\n\nADVISORY REPORT:\n${advisoryText}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AquaVerse_Advisory_${Date.now()}.txt`;
    a.click();
  };

  const filteredHistory = history.filter(item => {
    if (outcomeFilter === 'safe') return item.result === 'safe';
    if (outcomeFilter === 'unsafe') return item.result === 'unsafe';
    return true;
  });

  return (
    <div className="bg-[#000000] text-[#EAF6FF] min-h-screen py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#168CFF]/30 selection:text-[#42D9FF] relative overflow-hidden">
      
      {/* EXACT UPLOADED WATER BACKGROUND IMAGE & LIVE MP4 VIDEO LOOP LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src={waterBg} 
          alt="Water Predictor Environment" 
          className="w-full h-full object-cover object-center opacity-70 animate-slow-bg"
        />
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          controls={false}
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen pointer-events-none"
          src={linesVideo}
        />
        <div className="absolute inset-0 bg-[#000000]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#42D9FF]/15 to-transparent w-[50%] h-full animate-water-light pointer-events-none" />
      </div>

      {/* Floating Content Overlay */}
      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        {/* Header section */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#168CFF]/20 gap-6"
        >
          <div className="space-y-1">
            <h1 className="font-sans font-extrabold text-3xl sm:text-4xl text-white tracking-tight flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-[#42D9FF]" />
              <span>Water Quality Analyzer</span>
            </h1>
            <p className="text-[#526A7E] text-sm">
              Input physical and chemical parameters to generate an automated water safety advisory.
            </p>
          </div>

          {/* Quick Presets Buttons */}
          <div className="flex items-center space-x-2 glass-floating-panel p-1.5 rounded-2xl shrink-0">
            <span className="text-[10px] uppercase font-bold text-[#526A7E] px-2">Presets:</span>
            <button
              onClick={() => handlePresetSelect('potable')}
              className="px-2.5 py-1 rounded-xl bg-[#08243A]/80 hover:bg-[#168CFF] text-[#42D9FF] hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              Potable Stream
            </button>
            <button
              onClick={() => handlePresetSelect('wild')}
              className="px-2.5 py-1 rounded-xl bg-[#08243A]/80 hover:bg-[#168CFF] text-[#42D9FF] hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              River Water
            </button>
            <button
              onClick={() => handlePresetSelect('contaminated')}
              className="px-2.5 py-1 rounded-xl bg-[#08243A]/80 hover:bg-[#EF4444] text-[#EF4444] hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              Contaminated
            </button>
          </div>
        </motion.div>

        {/* 2-Column Scientific Interface (Left: Inputs, Right: Safety Verdict) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Floating Dark Input Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 glass-floating-panel p-6 rounded-2xl space-y-6 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-[#168CFF]/20 pb-3">
              <h3 className="font-sans font-bold text-base text-white flex items-center space-x-2">
                <Zap className="h-4.5 w-4.5 text-[#168CFF]" />
                <span>Chemical Laboratory Inputs</span>
              </h3>
              <span className="text-[10px] text-[#526A7E] uppercase font-mono font-bold">9 Parameters</span>
            </div>

            {/* Location input */}
            <div className="space-y-1">
              <label className="text-xs text-[#526A7E] font-semibold flex justify-between items-center">
                <span>Sampling Location / Grid</span>
                <button
                  type="button"
                  onClick={handleGeolocate}
                  disabled={geoLoading}
                  className="text-[#42D9FF] hover:underline text-[10px] flex items-center space-x-1 cursor-pointer"
                >
                  {geoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                  <span>Auto GPS</span>
                </button>
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Yelahanka Water Grid, Bangalore"
                className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF]"
              />
            </div>

            {/* 9 Parameter Fields Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              
              <div className="space-y-1">
                <label className="text-[11px] text-[#526A7E] font-semibold block">pH Acidity</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.ph}
                  onChange={(e) => handleInputChange('ph', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#168CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#526A7E] font-semibold block">Hardness (mg/L)</label>
                <input
                  type="number"
                  value={inputs.hardness}
                  onChange={(e) => handleInputChange('hardness', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#168CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#526A7E] font-semibold block">TDS Solids (ppm)</label>
                <input
                  type="number"
                  value={inputs.solids}
                  onChange={(e) => handleInputChange('solids', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#168CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#526A7E] font-semibold block">Chloramines (ppm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.chloramines}
                  onChange={(e) => handleInputChange('chloramines', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#168CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#526A7E] font-semibold block">Sulfate (mg/L)</label>
                <input
                  type="number"
                  value={inputs.sulfate}
                  onChange={(e) => handleInputChange('sulfate', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#168CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#526A7E] font-semibold block">Conductivity (μS)</label>
                <input
                  type="number"
                  value={inputs.conductivity}
                  onChange={(e) => handleInputChange('conductivity', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#168CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#526A7E] font-semibold block">TOC Carbon (ppm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.organic_carbon}
                  onChange={(e) => handleInputChange('organic_carbon', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#168CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#526A7E] font-semibold block">THMs (ppb)</label>
                <input
                  type="number"
                  value={inputs.trihalomethanes}
                  onChange={(e) => handleInputChange('trihalomethanes', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#168CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#526A7E] font-semibold block">Turbidity (NTU)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.turbidity}
                  onChange={(e) => handleInputChange('turbidity', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#168CFF]"
                />
              </div>

            </div>

            {/* Run Analysis Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-[#168CFF] hover:bg-[#42D9FF] py-3.5 rounded-xl text-white hover:text-[#000000] font-extrabold text-sm shadow-lg cursor-pointer disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Evaluating Chemical Matrix...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Execute Potability Evaluation</span>
                </>
              )}
            </button>
          </motion.div>

          {/* Right Column: Safety Verdict & EPA Compliance Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-6 space-y-6"
          >
            
            {result ? (
              <div className="glass-floating-panel p-6 rounded-2xl space-y-6 shadow-2xl">
                
                {/* Verdict Headline Card */}
                <div className={`p-5 rounded-2xl border flex items-center justify-between ${
                  result === 'safe'
                    ? 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]'
                }`}>
                  <div className="flex items-center space-x-3">
                    {result === 'safe' ? (
                      <CheckCircle className="h-9 w-9 text-[#10B981]" />
                    ) : (
                      <AlertTriangle className="h-9 w-9 text-[#EF4444]" />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono uppercase font-bold tracking-widest block opacity-80">Evaluation Outcome</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#030A12] border border-[#168CFF]/40 text-[#42D9FF]">
                          {assessmentType}
                        </span>
                      </div>
                      <h3 className="font-sans font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                        {result === 'safe' ? 'POTABLE WATER (SAFE)' : 'UNSAFE FOR CONSUMPTION'}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-white font-mono">{confidence}%</span>
                    <span className="text-[10px] block text-[#526A7E] font-bold">Compliance Score</span>
                  </div>
                </div>

                {/* EPA Compliance Checklist */}
                {complianceChecks.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#526A7E]">Primary Guideline Compliance</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {complianceChecks.map((chk, i) => (
                        <div key={i} className="p-2.5 bg-[#030A12] rounded-xl border border-[#08243A] flex justify-between items-center">
                          <span className="text-[#EAF6FF] font-semibold">{chk.parameter}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${chk.status === 'pass' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/20 text-[#EF4444]'}`}>
                            {chk.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Advisory Report Text */}
                {advisoryText && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#42D9FF]">Water Safety Advisory & Action Plan</h4>
                    <div className="p-4 bg-[#030A12] border border-[#08243A] rounded-xl text-xs sm:text-sm text-[#EAF6FF] leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto">
                      {advisoryText}
                    </div>
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#168CFF]/20">
                  <button
                    onClick={downloadReportText}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-[#08243A]/80 hover:bg-[#168CFF] text-[#42D9FF] hover:text-white rounded-xl text-xs font-bold border border-[#168CFF]/30 transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Report (.txt)</span>
                  </button>

                  {user ? (
                    <div className="flex items-center space-x-2">
                      {saveError && (
                        <span className="text-[11px] text-[#EF4444] font-semibold">{saveError}</span>
                      )}
                      <button
                        onClick={handleSaveToHistory}
                        disabled={saving || saveSuccess}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-[#168CFF] hover:bg-[#42D9FF] text-white hover:text-[#000000] rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        {saveSuccess ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-[#10B981]" />
                            <span>Prediction saved to your history.</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>{saving ? 'Saving...' : 'Save Log to History'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#526A7E]">Sign in to save evaluations to your account history.</span>
                  )}
                </div>

              </div>
            ) : (
              <div className="h-96 glass-floating-panel border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 space-y-4 shadow-xl">
                <div className="p-4 bg-[#08243A]/80 rounded-full border border-[#168CFF]/30">
                  <Sparkles className="h-8 w-8 text-[#42D9FF] animate-pulse" />
                </div>
                <h3 className="font-sans font-bold text-lg text-white">Ready for Chemical Evaluation</h3>
                <p className="text-xs text-[#526A7E] max-w-sm leading-relaxed">
                  Select a preset profile or enter custom laboratory values on the left panel, then click "Execute Potability Evaluation".
                </p>
              </div>
            )}

          </motion.div>
        </div>

        {/* Saved Prediction History Logs Section */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-floating-panel p-6 rounded-2xl space-y-4 shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#168CFF]/20 pb-3 gap-4">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-[#42D9FF]" />
                <h3 className="font-sans font-bold text-base text-white">Your Saved Prediction History</h3>
              </div>

              {/* Filter controls */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-[#526A7E] font-bold">Filter Outcome:</span>
                <select
                  value={outcomeFilter}
                  onChange={(e: any) => setOutcomeFilter(e.target.value)}
                  className="bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-1 font-bold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Outcomes</option>
                  <option value="safe">Safe Only</option>
                  <option value="unsafe">Unsafe Only</option>
                </select>
              </div>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-xs text-[#526A7E] flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#168CFF]" />
                <span>Loading your prediction history...</span>
              </div>
            ) : filteredHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#EAF6FF]">
                  <thead className="bg-[#030A12] text-[#526A7E] uppercase text-[10px] tracking-wider border-b border-[#08243A]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Sampling Site</th>
                      <th className="py-3 px-4 font-bold">pH</th>
                      <th className="py-3 px-4 font-bold">Solids</th>
                      <th className="py-3 px-4 font-bold">Turbidity</th>
                      <th className="py-3 px-4 font-bold">Verdict</th>
                      <th className="py-3 px-4 font-bold">Confidence</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#08243A]">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-[#08243A]/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-white">{item.location || 'Yelahanka Grid'}</td>
                        <td className="py-3 px-4 font-mono">{item.inputs.ph}</td>
                        <td className="py-3 px-4 font-mono">{item.inputs.solids} ppm</td>
                        <td className="py-3 px-4 font-mono">{item.inputs.turbidity} NTU</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.result === 'safe' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/20 text-[#EF4444]'}`}>
                            {item.result.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">{item.confidence}%</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteLog(item.id!)}
                            className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Log"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#526A7E]">
                No prediction logs found matching current filters.
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
