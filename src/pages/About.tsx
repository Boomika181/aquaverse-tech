import { useState } from 'react';
import { 
  HelpCircle, 
  Droplet, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  BookOpen, 
  ShieldCheck, 
  Globe 
} from 'lucide-react';
import { motion } from 'motion/react';
import waterBg from '../water-bg.jpg';
import linesVideo from '../lines-video.mp4';

interface ParameterDetail {
  id: string;
  name: string;
  symbol?: string;
  standard: string;
  whatIsIt: string;
  effects: string;
}

const PARAMETERS: ParameterDetail[] = [
  {
    id: 'ph',
    name: 'Potential of Hydrogen (pH)',
    symbol: 'pH',
    standard: '6.5 - 8.5 pH Units',
    whatIsIt: 'pH represents the level of acidity or alkalinity of an aqueous solution. It ranges from 0 (highly acidic) to 14 (highly alkaline), with 7.0 being neutral.',
    effects: 'Corrosive water (low pH) can leach copper and lead from pipes, leading to heavy metal poisoning. Highly alkaline water has a bitter soda taste and can form scale deposits in piping.'
  },
  {
    id: 'turbidity',
    name: 'Turbidity',
    symbol: 'NTU',
    standard: 'Less than 1.0 NTU (Target), Max 5.0 NTU',
    whatIsIt: 'Turbidity is a measure of water cloudiness or clarity caused by individual suspended particles like silt, clay, organic matter, and microscopic organisms.',
    effects: 'High turbidity provides visual shielding for dangerous pathogens, rendering disinfection (chlorine/UV) ineffective. It is associated with gastrointestinal illness due to microbial shielding.'
  },
  {
    id: 'solids',
    name: 'Total Dissolved Solids (TDS)',
    symbol: 'Solids',
    standard: 'Less than 500 ppm (Optimal), Max 1000 ppm',
    whatIsIt: 'TDS represents the cumulative content of all inorganic and organic substances dissolved in liquid. Primarily consists of calcium, magnesium, potassium, sodium, and carbon salts.',
    effects: 'Elevated TDS causes mineral taste, pipe encrustation, and dry skin. Extremely high levels (>1000 ppm) can cause gastrointestinal distress and indicates potential sewage or industrial contamination.'
  },
  {
    id: 'chloramines',
    name: 'Chloramines',
    symbol: 'NH2Cl',
    standard: 'Less than 4.0 ppm',
    whatIsIt: 'Chloramines are chemical disinfectants formed by adding ammonia to chlorine. Widely used by municipalities for secondary sanitization because they remain active longer in grid pipes.',
    effects: 'While safe within standard levels, excessive chloramines (>4 ppm) can cause skin, eye, and respiratory irritation, and alter the water taste and smell severely.'
  },
  {
    id: 'sulfate',
    name: 'Sulfate',
    symbol: 'SO4',
    standard: 'Less than 250 mg/L',
    whatIsIt: 'Sulfate is an oxidized sulfur compound occurring naturally in geological formations. Often enters groundwater aquifers as rainwater dissolves surrounding sedimentary rock.',
    effects: 'High sulfate concentrations (>250 mg/L) cause a bitter, medicinal taste, can clog boilers, and can have laxative/digestive effects on humans (specifically infants and travelers).'
  },
  {
    id: 'trihalomethanes',
    name: 'Trihalomethanes (THMs)',
    symbol: 'THMs',
    standard: 'Less than 80 ppb (parts per billion)',
    whatIsIt: 'THMs are toxic chemical byproducts formed when organic molecules in raw water react with chlorine disinfectants during treatment.',
    effects: 'Chronic consumption of high trihalomethanes is classified as a carcinogenic risk, associated with elevated long-term risks of bladder and colon cancer, and liver or kidney damage.'
  },
  {
    id: 'conductivity',
    name: 'Electrical Conductivity',
    symbol: 'EC',
    standard: 'Less than 1000 μS/cm',
    whatIsIt: 'Conductivity measures water ability to pass electrical currents. Since pure H2O is an insulator, conductivity is directly proportional to dissolved ion concentration.',
    effects: 'While not directly toxic, rapid fluctuations in groundwater conductivity indicate raw runoff intrusion, road-salt contamination, or sewage leakage.'
  },
  {
    id: 'organic-carbon',
    name: 'Total Organic Carbon (TOC)',
    symbol: 'TOC',
    standard: 'Less than 4.0 ppm',
    whatIsIt: 'TOC measures the total amount of carbon bound in organic compounds in a water sample. It is a key metric for organic health.',
    effects: 'High organic carbon provides nutrients for bacterial regrowth in water grids and promotes the formation of toxic disinfection byproducts (like THMs).'
  },
  {
    id: 'hardness',
    name: 'Total Hardness',
    symbol: 'CaCO3',
    standard: '75 - 150 mg/L (Moderate range)',
    whatIsIt: 'Hardness is primarily the concentration of multivalent calcium and magnesium cations dissolved in the water basin.',
    effects: 'Soft water (<60 mg/L) can be highly corrosive to piping. Hard water (>180 mg/L) prevents soap lather, clogs domestic boilers, and leaves white limescale stains.'
  }
];

export default function About() {
  const [expandedParam, setExpandedParam] = useState<string | null>('ph');

  const toggleExpand = (id: string) => {
    setExpandedParam(prev => prev === id ? null : id);
  };

  return (
    <div className="bg-[#000000] text-[#EAF6FF] min-h-screen py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#168CFF]/30 selection:text-[#42D9FF] relative overflow-hidden">
      
      {/* EXACT UPLOADED WATER BACKGROUND IMAGE & LIVE MP4 VIDEO LOOP LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src={waterBg} 
          alt="Water Science Environment" 
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
      <div className="max-w-4xl mx-auto space-y-10 relative z-10">
        
        {/* Header section */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3 pb-6 border-b border-[#168CFF]/20"
        >
          <div className="inline-flex items-center space-x-2.5 glass-floating-panel px-4 py-1.5 rounded-full text-xs font-bold text-[#42D9FF]">
            <img src="/logo-mark.png" alt="AquaVerse AI Logo" className="h-4.5 w-4.5 object-contain" />
            <span>Water Quality Standards Handbook</span>
          </div>
          <h1 className="font-sans font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            The Science of Clean Water
          </h1>
          <p className="text-[#526A7E] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
            AquaVerse AI benchmarks chemical and physical water properties against established guidelines published by the World Health Organization (WHO) and US Environmental Protection Agency (EPA).
          </p>
        </motion.div>

        {/* Mission Statement Row */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          className="glass-floating-panel rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center shadow-2xl"
        >
          <div className="md:col-span-2 space-y-3">
            <h3 className="font-sans font-bold text-lg text-white">Our Environmental Mission</h3>
            <p className="text-xs sm:text-sm text-[#526A7E] leading-relaxed">
              We believe clean water transparency is a fundamental civic right. Our project aims to close the information gap between municipal utilities and citizens by deploying open predictive models, dynamic regional telemetry gauges, and an immutable community water safeguard.
            </p>
          </div>
          <div className="bg-[#030A12]/80 p-4.5 rounded-xl border border-[#08243A] space-y-2 text-center md:text-left">
            <ShieldCheck className="h-6 w-6 text-[#42D9FF] mx-auto md:mx-0" />
            <h4 className="text-xs font-bold text-white uppercase">100% Open Access</h4>
            <p className="text-[11px] text-[#526A7E] leading-relaxed">
              No subscription or premium gating. Every prediction, report log, and standard guideline remains open for global citizen validation.
            </p>
          </div>
        </motion.div>

        {/* Standard reference table */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-[#42D9FF]" />
            <h3 className="font-sans font-bold text-xl text-white">Guidelines Benchmark Summary</h3>
          </div>
          
          <div className="glass-floating-panel rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#EAF6FF]">
                <thead className="bg-[#030A12] text-[#526A7E] uppercase text-[10px] tracking-wider border-b border-[#08243A]">
                  <tr>
                    <th className="py-3.5 px-5 font-bold">Water Metric</th>
                    <th className="py-3.5 px-5 font-bold">Ideal Target</th>
                    <th className="py-3.5 px-5 font-bold">Standard Limit</th>
                    <th className="py-3.5 px-5 font-bold">Authority Agency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#08243A]">
                  <tr className="hover:bg-[#08243A]/40 transition-colors">
                    <td className="py-3 px-5 font-bold text-white">Acidity (pH)</td>
                    <td className="py-3 px-5">7.2 - 7.6 pH</td>
                    <td className="py-3 px-5">6.5 - 8.5 pH</td>
                    <td className="py-3 px-5 text-[#526A7E]">EPA / WHO Secondary</td>
                  </tr>
                  <tr className="hover:bg-[#08243A]/40 transition-colors">
                    <td className="py-3 px-5 font-bold text-white">Turbidity (Cloudiness)</td>
                    <td className="py-3 px-5">{"< 1.0 NTU"}</td>
                    <td className="py-3 px-5">5.0 NTU</td>
                    <td className="py-3 px-5 text-[#526A7E]">WHO Aesthetic Standard</td>
                  </tr>
                  <tr className="hover:bg-[#08243A]/40 transition-colors">
                    <td className="py-3 px-5 font-bold text-white">Total Dissolved Solids</td>
                    <td className="py-3 px-5">{"< 300 ppm"}</td>
                    <td className="py-3 px-5">1000 ppm</td>
                    <td className="py-3 px-5 text-[#526A7E]">EPA Secondary Standard</td>
                  </tr>
                  <tr className="hover:bg-[#08243A]/40 transition-colors">
                    <td className="py-3 px-5 font-bold text-white">Chloramines</td>
                    <td className="py-3 px-5">1.5 - 3.0 ppm</td>
                    <td className="py-3 px-5">4.0 ppm</td>
                    <td className="py-3 px-5 text-[#526A7E]">EPA Primary MCLG</td>
                  </tr>
                  <tr className="hover:bg-[#08243A]/40 transition-colors">
                    <td className="py-3 px-5 font-bold text-white">Sulfate Minerals</td>
                    <td className="py-3 px-5">{"< 150 mg/L"}</td>
                    <td className="py-3 px-5">250 mg/L</td>
                    <td className="py-3 px-5 text-[#526A7E]">EPA Secondary Standard</td>
                  </tr>
                  <tr className="hover:bg-[#08243A]/40 transition-colors">
                    <td className="py-3 px-5 font-bold text-white">Trihalomethanes</td>
                    <td className="py-3 px-5">{"< 30 ppb"}</td>
                    <td className="py-3 px-5">80 ppb</td>
                    <td className="py-3 px-5 text-[#526A7E]">EPA Primary Carcinogenic</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Interactive parameters detail section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-[#42D9FF]" />
            <h3 className="font-sans font-bold text-xl text-white">Parameter Dictionary</h3>
          </div>

          <p className="text-xs text-[#526A7E]">
            Click on any parameter below to review its biological significance, standard thresholds, and long-term chemical impact.
          </p>

          <div className="space-y-3">
            {PARAMETERS.map((param) => {
              const isExpanded = expandedParam === param.id;
              return (
                <div 
                  key={param.id} 
                  className={`border rounded-2xl transition-all duration-300 ${isExpanded ? 'glass-floating-panel border-[#168CFF]/50 shadow-2xl' : 'glass-floating-panel hover:border-[#168CFF]/40'}`}
                >
                  <button
                    onClick={() => toggleExpand(param.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <span className="text-white font-sans font-bold text-sm sm:text-base flex items-center space-x-2">
                        <span>{param.name}</span>
                        {param.symbol && (
                          <span className="text-[10px] bg-[#030A12] px-2 py-0.5 rounded border border-[#08243A] text-[#42D9FF] font-mono font-bold">
                            {param.symbol}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-[#526A7E] block">Guideline limit: <strong className="text-[#EAF6FF]">{param.standard}</strong></span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-[#42D9FF]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#526A7E]" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-[#168CFF]/20 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm leading-relaxed">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-[#42D9FF] uppercase tracking-widest block">What is it?</span>
                        <p className="text-[#526A7E] text-xs leading-relaxed">{param.whatIsIt}</p>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-widest block">Safety & Health Impact</span>
                        <p className="text-[#526A7E] text-xs leading-relaxed">{param.effects}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
