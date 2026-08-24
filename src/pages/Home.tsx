import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../firebase/AuthContext';
import { 
  Droplet, 
  Sparkles, 
  BarChart3, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  Activity,
  Zap,
  Waves,
  ChevronDown,
  Globe,
  Compass
} from 'lucide-react';
import { motion } from 'motion/react';

import waterBg from '../water-bg.jpg';
import heroVideo from '../hero-video.mp4';
import linesVideo from '../lines-video.mp4';

export default function Home() {
  const { user } = useAuth();
  
  // Sliders for interactive home page widget
  const [ph, setPh] = useState(7.2);
  const [turbidity, setTurbidity] = useState(1.5);
  const [solids, setSolids] = useState(450);

  // Evaluate simple potability status for landing widget
  const isSafe = ph >= 6.5 && ph <= 8.5 && turbidity <= 5 && solids <= 1000;
  const confidence = Math.round(92 - Math.abs(7.2 - ph) * 10 - (turbidity > 1 ? (turbidity - 1) * 8 : 0));
  const finalConfidence = Math.max(70, Math.min(99, confidence));

  const stats = [
    { label: 'Active Monitoring Nodes', value: 'USGS Stream Gages', icon: Activity, color: 'text-[#42D9FF]' },
    { label: 'Streamflow Forecast Model', value: 'MAE 54.4 cfs (+28.8% vs Baseline)', icon: Sparkles, color: 'text-[#168CFF]' },
    { label: 'Safety Guidelines', value: 'WHO & US EPA', icon: ShieldCheck, color: 'text-[#10B981]' },
    { label: 'Data Provenance', value: 'USGS Water API & Sample Data', icon: Users, color: 'text-[#42D9FF]' },
  ];

  const features = [
    {
      title: 'Water Potability Analyzer',
      description: 'Input nine specific water parameters (pH, Solids, Sulfate, etc.) to get an instant scientific safety verdict powered by calibrated environmental algorithms.',
      icon: Sparkles,
      link: user ? '/predict' : '/login'
    },
    {
      title: 'Predictive Water Intelligence',
      description: 'Forecast regional water stress risk, demand trends, and run interactive what-if decision simulations based on baseline hydrology.',
      icon: BarChart3,
      link: '#how-it-works'
    },
    {
      title: 'Community Reporting Portal',
      description: 'File chemical spill alerts, upload photographic evidence, and track safety investigations directly in your localized water basin.',
      icon: Users,
      link: user ? '/contact' : '/login'
    }
  ];

  return (
    <div className="bg-[#000000] text-[#EAF6FF] min-h-screen selection:bg-[#168CFF]/30 selection:text-[#42D9FF] relative overflow-hidden">
      
      {/* SECTIONS 1 & 2 CONTAINER: HERO ANIMATED VIDEO BACKGROUND */}
      <div className="relative overflow-hidden">
        
        {/* HERO VIDEO BACKGROUND LAYER (STRICTLY POWERED BY LINES-VIDEO.MP4) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img 
            src={waterBg} 
            alt="Water Environment Background" 
            className="w-full h-full object-cover object-center opacity-70"
          />
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            controls={false}
            poster={waterBg}
            className="absolute inset-0 w-full h-full object-cover opacity-85 mix-blend-screen pointer-events-none"
            src={linesVideo}
          />
          {/* Dark Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#000000]/60 via-[#000000]/30 to-[#000000]" />
        </div>

        {/* SECTION 1: HERO VIEWPORT CONTENT */}
        <section className="relative z-10 min-h-[92vh] flex flex-col justify-between items-center pt-12 pb-16">
          
          <div className="max-w-5xl mx-auto px-4 text-center space-y-6 my-auto pt-8">
            
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center space-x-2.5 bg-[#030A12]/80 border border-[#168CFF]/40 px-4 py-1.5 rounded-full text-xs font-bold text-[#42D9FF] backdrop-blur-md shadow-[0_0_20px_rgba(22,140,255,0.25)]"
            >
              <img src="/logo-mark.png" alt="AquaVerse AI Logo" className="h-4.5 w-4.5 object-contain" />
              <span className="tracking-wider uppercase text-[10px]">AI-POWERED WATER INTELLIGENCE</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-sans font-black text-[42px] sm:text-[58px] lg:text-[76px] tracking-tight leading-tight sm:leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]"
            >
              Monitor Water. Detect Risk. <br />
              <span className="bg-gradient-to-r from-white via-[#42D9FF] to-[#168CFF] bg-clip-text text-transparent">
                Act Early.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-[#C4DDF2] text-base sm:text-xl max-w-3xl mx-auto leading-relaxed font-medium drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
            >
              AquaVerse AI combines water-quality analysis, environmental telemetry, anomaly detection, and predictive risk modeling to help communities and authorities identify water threats before they escalate.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link
                to={user ? "/predict" : "/login"}
                className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-7 py-3.5 rounded-xl bg-[#168CFF] hover:bg-[#42D9FF] text-white hover:text-[#000000] font-extrabold text-sm transition-all shadow-[0_0_25px_rgba(22,140,255,0.4)] cursor-pointer"
              >
                <Sparkles className="h-4.5 w-4.5" />
                <span>Analyze Water Safety</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
              <a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-7 py-3.5 rounded-xl bg-[#030A12]/80 border border-[#08243A] hover:border-[#168CFF]/50 text-[#EAF6FF] transition-all font-bold text-sm backdrop-blur-md cursor-pointer"
              >
                <Compass className="h-4.5 w-4.5 text-[#42D9FF]" />
                <span>Explore How It Works</span>
              </a>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <div className="relative z-10 flex flex-col items-center space-y-1.5 text-xs text-[#526A7E] font-bold tracking-widest uppercase">
            <span>Scroll To Explore</span>
            <ChevronDown className="h-4 w-4 text-[#168CFF] animate-bounce" />
          </div>
        </section>

        {/* SECTION 2: CONTINUES THE UNCHANGED HERO ANIMATED VIDEO BACKGROUND */}
        <section className="relative z-10 py-24 border-t border-[#168CFF]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left 3D Globe Visual Representation (Realistic 3D Earth Map) */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="lg:col-span-6 flex flex-col items-center justify-center relative"
              >
                {/* Globe Canvas Container */}
                <div className="relative w-[320px] h-[320px] sm:w-[410px] sm:h-[410px] rounded-full bg-[#000000] p-1 shadow-[0_0_90px_rgba(22,140,255,0.45)] border border-[#168CFF]/50 flex items-center justify-center group overflow-visible">
                  
                  {/* Atmospheric Blue Glow Ring */}
                  <div className="absolute inset-0 rounded-full border border-[#42D9FF]/40 shadow-[inset_0_0_50px_rgba(66,217,255,0.35)] pointer-events-none z-20" />
                  
                  {/* Sphere Core */}
                  <div className="relative w-full h-full rounded-full bg-[radial-gradient(circle_at_35%_35%,#08243A_0%,#06111C_55%,#03070B_85%,#000000_100%)] overflow-hidden shadow-inner flex items-center justify-center">
                    
                    {/* SVG Real-World Orthographic Earth Projection Canvas */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
                      
                      {/* Outer Atmosphere Aura */}
                      <circle cx="200" cy="200" r="196" fill="none" stroke="#42D9FF" strokeWidth="0.75" strokeOpacity="0.4" />
                      
                      {/* Curving Latitude & Longitude Grid Lines */}
                      <g className="animate-spin-slow origin-center opacity-25">
                        <ellipse cx="200" cy="200" rx="190" ry="60" fill="none" stroke="#42D9FF" strokeWidth="0.75" strokeDasharray="4 4" />
                        <ellipse cx="200" cy="200" rx="190" ry="120" fill="none" stroke="#168CFF" strokeWidth="0.75" strokeDasharray="5 5" />
                        <ellipse cx="200" cy="200" rx="60" ry="190" fill="none" stroke="#42D9FF" strokeWidth="0.75" strokeDasharray="4 4" />
                        <ellipse cx="200" cy="200" rx="130" ry="190" fill="none" stroke="#168CFF" strokeWidth="0.75" strokeDasharray="5 5" />
                      </g>

                      {/* Real World Continent Outlines (3D Orthographic Projection centered on 16°N, 75°E) */}
                      <g stroke="#42D9FF" strokeWidth="1.25" strokeOpacity="0.85" fill="#06111C" fillOpacity="0.8">
                        {/* India Subcontinent */}
                        <path d="M 215 220 L 210 215 L 204 200 L 195 190 L 194 187 L 208 178 L 222 170 L 230 155 L 235 150 L 244 165 L 255 175 L 250 188 L 240 195 L 230 205 L 224 215 Z" />
                        {/* Africa Continent */}
                        <path d="M 125 155 C 135 145, 155 150, 165 170 C 172 190, 162 220, 148 245 C 138 258, 130 250, 126 230 C 112 215, 105 190, 108 175 Z" />
                        {/* Arabian Peninsula & Middle East */}
                        <path d="M 130 120 C 145 110, 170 120, 175 135 C 165 148, 148 150, 132 145 Z" />
                        {/* Europe & North Eurasia */}
                        <path d="M 130 100 C 150 90, 190 95, 230 105 C 270 115, 310 110, 330 130 C 310 150, 270 160, 240 150 C 210 140, 170 125, 130 100 Z" />
                        {/* South East Asia & Indonesian Archipelago */}
                        <path d="M 270 210 C 290 200, 310 210, 320 230 C 300 250, 280 240, 270 210 Z" />
                        {/* Australia */}
                        <path d="M 310 270 C 335 265, 350 280, 345 305 C 320 315, 300 300, 310 270 Z" />
                      </g>

                      {/* Illuminated City Lights Clusters */}
                      <g fill="#42D9FF" opacity="0.75">
                        <circle cx="207.7" cy="206.1" r="2.5" /> {/* Bengaluru */}
                        <circle cx="193.9" cy="187.6" r="2" />   {/* Mumbai */}
                        <circle cx="205.2" cy="159.2" r="2" />   {/* Delhi */}
                        <circle cx="223.5" cy="205.6" r="2" />   {/* Chennai */}
                        <circle cx="152.0" cy="138.0" r="1.8" /> /* Middle East */
                        <circle cx="284.1" cy="238.6" r="2" />   {/* Singapore */}
                      </g>

                      {/* Curved Telemetry Data Flow Arcs between Real Locations */}
                      <g stroke="#42D9FF" strokeWidth="1.25" strokeDasharray="4 4" className="animate-telemetry-dash">
                        <path d="M 207.7 206.1 Q 190 170 152 138" fill="none" opacity="0.75" />
                        <path d="M 207.7 206.1 Q 250 220 284.1 238.6" fill="none" opacity="0.75" stroke="#168CFF" />
                        <path d="M 207.7 206.1 Q 198 195 193.9 187.6" fill="none" opacity="0.9" />
                        <path d="M 193.9 187.6 Q 200 170 205.2 159.2" fill="none" opacity="0.7" stroke="#168CFF" />
                        <path d="M 207.7 206.1 Q 215 206 223.5 205.6" fill="none" opacity="0.8" />
                      </g>

                      {/* Glowing Monitoring Location Point Markers */}
                      <g>
                        <circle cx="207.7" cy="206.1" r="5" fill="#42D9FF" className="animate-node-pulse" />
                        <circle cx="193.9" cy="187.6" r="4" fill="#168CFF" className="animate-node-pulse [animation-delay:1s]" />
                        <circle cx="205.2" cy="159.2" r="4" fill="#42D9FF" className="animate-node-pulse [animation-delay:1.5s]" />
                        <circle cx="152.0" cy="138.0" r="3.5" fill="#168CFF" className="animate-node-pulse [animation-delay:2s]" />
                        <circle cx="284.1" cy="238.6" r="4" fill="#42D9FF" className="animate-node-pulse [animation-delay:2.5s]" />
                      </g>

                    </svg>

                    {/* Floating Real-World Location Markers & Translucent Labels */}
                    <div className="absolute inset-0 pointer-events-none">
                      
                      {/* Bengaluru / KARNATAKA, IN Label */}
                      <div className="absolute top-[51.5%] left-[52%] -translate-y-1/2 flex items-center space-x-1.5 bg-[#030A12]/90 border border-[#42D9FF]/50 px-2.5 py-1 rounded-lg text-[9px] font-bold text-white shadow-xl backdrop-blur-xs">
                        <span className="w-2 h-2 rounded-full bg-[#42D9FF] animate-ping" />
                        <div>
                          <p className="text-[#42D9FF] leading-none font-sans font-bold">Bengaluru</p>
                          <p className="text-[7.5px] text-[#526A7E] leading-none uppercase mt-0.5 font-mono">KARNATAKA, IN</p>
                        </div>
                      </div>

                      {/* Mumbai / INDIA Label */}
                      <div className="absolute top-[44%] left-[42%] -translate-y-1/2 flex items-center space-x-1 bg-[#030A12]/90 border border-[#168CFF]/50 px-2 py-1 rounded-lg text-[8.5px] font-bold text-white shadow-xl backdrop-blur-xs">
                        <div>
                          <p className="text-white leading-none font-sans font-bold">Mumbai</p>
                          <p className="text-[7px] text-[#526A7E] leading-none uppercase mt-0.5 font-mono">INDIA</p>
                        </div>
                      </div>

                      {/* Yelahanka / BASIN Label */}
                      <div className="absolute top-[62%] left-[46%] flex items-center space-x-1 bg-[#030A12]/90 border border-[#42D9FF]/40 px-2 py-0.5 rounded-lg text-[8.5px] font-bold text-white shadow-xl backdrop-blur-xs">
                        <div>
                          <p className="text-[#42D9FF] leading-none font-sans font-bold">Yelahanka</p>
                          <p className="text-[7px] text-[#526A7E] leading-none uppercase mt-0.5 font-mono">BASIN</p>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

                {/* Bottom Stat Pill (34 Regional Aquifers) */}
                <div className="mt-4 flex items-center space-x-3 bg-[#030A12]/90 border border-[#168CFF]/40 px-4.5 py-2 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md z-30">
                  <div className="p-1.5 bg-[#168CFF]/20 rounded-xl border border-[#168CFF]/40 text-[#42D9FF]">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-extrabold text-white font-mono leading-none">34</span>
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    </div>
                    <p className="text-[10px] text-[#526A7E] font-bold uppercase tracking-wider mt-0.5">
                      Regional Aquifers Monitored
                    </p>
                  </div>
                </div>

              </motion.div>

              {/* Right Concept Description Column */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="lg:col-span-6 space-y-6 text-left"
              >
                <div className="inline-flex items-center space-x-2 bg-[#030A12]/80 border border-[#168CFF]/30 px-3.5 py-1 rounded-full text-xs font-bold text-[#168CFF] backdrop-blur-md">
                  <Compass className="h-4 w-4 text-[#42D9FF]" />
                  <span>Environmental Science Engine</span>
                </div>

                <h2 className="font-sans font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                  An Immersive Digital Water Environment
                </h2>

                <p className="text-[#EAF6FF]/90 text-sm sm:text-base leading-relaxed font-normal bg-[#030A12]/60 p-4 rounded-2xl border border-[#168CFF]/20 backdrop-blur-md">
                  AquaVerse AI bridges municipal utilities and community guardians. By integrating mathematical physical telemetry with trained predictive models, we provide real-time potability assessments across urban and rural watersheds.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-[#030A12]/80 border border-[#168CFF]/30 rounded-2xl backdrop-blur-md">
                    <h4 className="text-xl font-extrabold text-white">9 Parameters</h4>
                    <p className="text-xs text-[#526A7E] mt-1">Evaluated against WHO & EPA primary guidelines.</p>
                  </div>
                  <div className="p-4 bg-[#030A12]/80 border border-[#168CFF]/30 rounded-2xl backdrop-blur-md">
                    <h4 className="text-xl font-extrabold text-[#42D9FF]">Real-Time</h4>
                    <p className="text-xs text-[#526A7E] mt-1">Sensor telemetry stream synchronization.</p>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

      </div>

      {/* SECTION: HOW IT WORKS (id="how-it-works") */}
      <section id="how-it-works" className="relative z-10 py-20 border-t border-[#168CFF]/20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3 max-w-3xl mx-auto mb-14"
        >
          <div className="inline-flex items-center space-x-2 bg-[#030A12]/80 border border-[#168CFF]/30 px-3.5 py-1 rounded-full text-xs font-bold text-[#42D9FF] backdrop-blur-md">
            <Compass className="h-4 w-4 text-[#42D9FF]" />
            <span>Predictive Intelligence Pipeline</span>
          </div>
          <h2 className="font-sans font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            How AquaVerse AI Works
          </h2>
          <p className="text-[#EAF6FF]/80 text-sm sm:text-base leading-relaxed">
            Our core intelligence flow evolves water management from passive measurement to proactive risk mitigation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Step 1: MONITOR */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-6 rounded-2xl glass-floating-panel space-y-4 relative border border-[#168CFF]/30"
          >
            <div className="flex justify-between items-center">
              <div className="p-3 rounded-xl bg-[#08243A] text-[#42D9FF] border border-[#168CFF]/40 font-mono font-black text-sm">
                01
              </div>
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-[#526A7E]">Stage 1</span>
            </div>
            <h3 className="font-sans font-extrabold text-xl text-white">MONITOR</h3>
            <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
              Collect and analyze real-time water-resource and chemical quality indicators across local watersheds.
            </p>
          </motion.div>

          {/* Step 2: PREDICT */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 rounded-2xl glass-floating-panel space-y-4 relative border border-[#168CFF]/30"
          >
            <div className="flex justify-between items-center">
              <div className="p-3 rounded-xl bg-[#08243A] text-[#42D9FF] border border-[#168CFF]/40 font-mono font-black text-sm">
                02
              </div>
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-[#526A7E]">Stage 2</span>
            </div>
            <h3 className="font-sans font-extrabold text-xl text-white">PREDICT</h3>
            <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
              Identify emerging water-stress risks and future supply deficits using calibrated predictive models.
            </p>
          </motion.div>

          {/* Step 3: EXPLAIN */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="p-6 rounded-2xl glass-floating-panel space-y-4 relative border border-[#168CFF]/30"
          >
            <div className="flex justify-between items-center">
              <div className="p-3 rounded-xl bg-[#08243A] text-[#42D9FF] border border-[#168CFF]/40 font-mono font-black text-sm">
                03
              </div>
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-[#526A7E]">Stage 3</span>
            </div>
            <h3 className="font-sans font-extrabold text-xl text-white">EXPLAIN</h3>
            <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
              Identify the specific environmental, storage, and consumption demand factors driving risk scores.
            </p>
          </motion.div>

          {/* Step 4: RESPOND */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-6 rounded-2xl glass-floating-panel space-y-4 relative border border-[#168CFF]/30"
          >
            <div className="flex justify-between items-center">
              <div className="p-3 rounded-xl bg-[#08243A] text-[#42D9FF] border border-[#168CFF]/40 font-mono font-black text-sm">
                04
              </div>
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-[#526A7E]">Stage 4</span>
            </div>
            <h3 className="font-sans font-extrabold text-xl text-white">RESPOND</h3>
            <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
              Support informed intervention, decision-support scenario simulations, and community safety action.
            </p>
          </motion.div>

        </div>
      </section>

      {/* SECTION: IMPACT (id="impact") */}
      <section id="impact" className="relative z-10 py-20 border-t border-[#168CFF]/20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3 max-w-3xl mx-auto mb-14"
        >
          <div className="inline-flex items-center space-x-2 bg-[#030A12]/80 border border-[#168CFF]/30 px-3.5 py-1 rounded-full text-xs font-bold text-[#10B981] backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-[#10B981]" />
            <span>Targeted Environmental Capabilities</span>
          </div>
          <h2 className="font-sans font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Real-World Impact Targets
          </h2>
          <p className="text-[#EAF6FF]/80 text-sm sm:text-base leading-relaxed">
            AquaVerse AI is engineered to address critical gaps in modern water security and watershed management.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Impact 1: EARLY DETECTION */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-6 rounded-2xl glass-floating-panel space-y-3 border border-[#08243A]"
          >
            <h4 className="font-sans font-bold text-base text-white flex items-center space-x-2">
              <Zap className="h-4 w-4 text-[#42D9FF]" />
              <span>EARLY DETECTION</span>
            </h4>
            <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
              Identify abnormal water conditions and telemetry variance before they become larger public issues.
            </p>
          </motion.div>

          {/* Impact 2: PREDICTIVE PLANNING */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 rounded-2xl glass-floating-panel space-y-3 border border-[#08243A]"
          >
            <h4 className="font-sans font-bold text-base text-white flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-[#168CFF]" />
              <span>PREDICTIVE PLANNING</span>
            </h4>
            <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
              Estimate potential water-stress risk and demand surges instead of only viewing static historical data.
            </p>
          </motion.div>

          {/* Impact 3: COMMUNITY AWARENESS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="p-6 rounded-2xl glass-floating-panel space-y-3 border border-[#08243A]"
          >
            <h4 className="font-sans font-bold text-base text-white flex items-center space-x-2">
              <Users className="h-4 w-4 text-[#10B981]" />
              <span>COMMUNITY AWARENESS</span>
            </h4>
            <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
              Allow citizens to understand potability criteria and report water-safety concerns directly to authorities.
            </p>
          </motion.div>

          {/* Impact 4: DECISION SUPPORT */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-6 rounded-2xl glass-floating-panel space-y-3 border border-[#08243A]"
          >
            <h4 className="font-sans font-bold text-base text-white flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-[#42D9FF]" />
              <span>DECISION SUPPORT</span>
            </h4>
            <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
              Provide authorized supervisors with actionable what-if scenario simulations to guide preventive interventions.
            </p>
          </motion.div>

        </div>
      </section>

      {/* SECTION 3: INTERACTIVE WATER QUALITY SIMULATOR (STATIC WATER IMAGE BACKGROUND) */}
      <div className="relative">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img 
            src={waterBg} 
            alt="Water Environment Background" 
            className="w-full h-full object-cover object-center opacity-75"
          />
          <div className="absolute inset-0 bg-[#000000]/40" />
        </div>

        <section className="relative z-10 py-20 border-t border-[#168CFF]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center space-y-3 mb-12"
            >
              <h2 className="font-sans font-extrabold text-3xl text-white tracking-tight">
                Interactive Water Quality Simulator
              </h2>
              <p className="text-xs sm:text-sm text-[#EAF6FF]/80">
                Adjust parameter sliders below to test local predictive criteria. Full evaluations use our 9-point parameter framework.
              </p>
            </motion.div>

            {/* Simulator Floating Dark Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="max-w-3xl mx-auto glass-floating-panel rounded-2xl p-6 sm:p-8 relative"
            >
              
              <div className="space-y-5">
                {/* pH Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#EAF6FF]">Acidity (pH Level)</span>
                    <span className={`font-mono font-bold ${ph < 6.5 || ph > 8.5 ? 'text-[#F59E0B]' : 'text-[#42D9FF]'}`}>{ph.toFixed(1)} pH</span>
                  </div>
                  <input 
                    type="range" 
                    min="4.0" 
                    max="11.0" 
                    step="0.1" 
                    value={ph} 
                    onChange={(e) => setPh(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#000000] border border-[#08243A] rounded-lg appearance-none cursor-pointer accent-[#168CFF]"
                  />
                  <div className="flex justify-between text-[10px] text-[#526A7E] font-medium">
                    <span>Acidic (4.0)</span>
                    <span>Neutral (7.0)</span>
                    <span>Alkaline (11.0)</span>
                  </div>
                </div>

                {/* Turbidity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#EAF6FF]">Turbidity (Cloudiness)</span>
                    <span className={`font-mono font-bold ${turbidity > 5 ? 'text-[#EF4444]' : 'text-[#42D9FF]'}`}>{turbidity.toFixed(1)} NTU</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="8.0" 
                    step="0.1" 
                    value={turbidity} 
                    onChange={(e) => setTurbidity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#000000] border border-[#08243A] rounded-lg appearance-none cursor-pointer accent-[#168CFF]"
                  />
                  <div className="flex justify-between text-[10px] text-[#526A7E] font-medium">
                    <span>Clear (0.1)</span>
                    <span>Turbid (8.0)</span>
                  </div>
                </div>

                {/* TDS Solids Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#EAF6FF]">Dissolved Solids (TDS)</span>
                    <span className={`font-mono font-bold ${solids > 1000 ? 'text-[#EF4444]' : 'text-[#42D9FF]'}`}>{solids} ppm</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="1500" 
                    step="20" 
                    value={solids} 
                    onChange={(e) => setSolids(parseInt(e.target.value))}
                    className="w-full h-2 bg-[#000000] border border-[#08243A] rounded-lg appearance-none cursor-pointer accent-[#168CFF]"
                  />
                  <div className="flex justify-between text-[10px] text-[#526A7E] font-medium">
                    <span>Clean (100)</span>
                    <span>Mineral Heavy (1500)</span>
                  </div>
                </div>

                {/* Verdict Panel */}
                <div className={`mt-6 p-4 rounded-xl border transition-all duration-300 ${
                  isSafe 
                    ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]' 
                    : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                }`}>
                  <div className="flex items-start space-x-3">
                    {isSafe ? (
                      <CheckCircle className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-[#EF4444] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-sans font-bold text-xs uppercase tracking-wider">
                        {isSafe ? 'POTABLE WATER VERDICT' : 'TREATMENT REQUIRED'}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed text-[#EAF6FF]">
                        {isSafe 
                          ? `Parameters comply with standard guidelines. Assessment confidence: ${finalConfidence}%.`
                          : `Parameter threshold exceeded! Filtration or boiling recommended before domestic consumption.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        </section>
      </div>

      {/* TARGET START: IMMEDIATELY AFTER INTERACTIVE WATER QUALITY SIMULATOR */}
      {/* POWERED BY THE NEW UPLOADED SMOOTH MOVING LINES ANIMATION VIDEO */}
      <div className="relative overflow-hidden">
        
        {/* NEW UPLOADED ANIMATION BACKGROUND LAYER (TARGET SECTION ONWARD) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="sticky top-0 w-full h-screen">
            <img 
              src={waterBg} 
              alt="Water Environment Background" 
              className="w-full h-full object-cover object-center opacity-70"
            />
            {/* NEW UPLOADED SMOOTH MOVING LINES VIDEO ANIMATION LAYER */}
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              controls={false}
              poster={waterBg}
              className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen pointer-events-none"
              src={linesVideo}
            />
            <div className="absolute inset-0 bg-[#000000]/40" />
          </div>
        </div>

        {/* REMAINING SECTIONS CONTENT FLOATING ABOVE NEW ANIMATION BACKGROUND */}
        <div className="relative z-10">

          {/* SECTION 4: STATS COUNTERS */}
          <section className="py-12 border-t border-[#168CFF]/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="flex flex-col items-center text-center p-5 glass-floating-panel rounded-2xl"
                    >
                      <div className="p-2.5 bg-[#08243A]/80 rounded-xl border border-[#168CFF]/30 mb-2.5">
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <span className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                        {stat.value}
                      </span>
                      <span className="text-xs font-semibold text-[#526A7E] mt-1">
                        {stat.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 5: FEATURES & TRUST CTA */}
          <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-3 max-w-3xl mx-auto mb-14"
            >
              <h2 className="font-sans font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                Water Intelligence Framework
              </h2>
              <p className="text-[#EAF6FF]/80 text-sm sm:text-base leading-relaxed">
                By combining mathematical chemical monitoring algorithms with open access tools, AquaVerse AI enables citizens and supervisors to safeguard water resources.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                    className="p-6 rounded-2xl glass-floating-panel flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-[#08243A]/80 w-fit border border-[#168CFF]/30">
                        <Icon className="h-6 w-6 text-[#42D9FF]" />
                      </div>
                      <h3 className="font-sans font-bold text-lg text-white">
                        {feat.title}
                      </h3>
                      <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
                        {feat.description}
                      </p>
                    </div>
                    {feat.link.startsWith('#') ? (
                      <a
                        href={feat.link}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(feat.link.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="mt-6 inline-flex items-center space-x-1.5 text-xs font-bold text-[#168CFF] hover:text-[#42D9FF] transition-colors w-fit cursor-pointer"
                      >
                        <span>Explore Feature</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Link
                        to={feat.link}
                        className="mt-6 inline-flex items-center space-x-1.5 text-xs font-bold text-[#168CFF] hover:text-[#42D9FF] transition-colors w-fit cursor-pointer"
                      >
                        <span>Explore Feature</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* CTA Floating Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mt-16 p-8 rounded-2xl glass-floating-panel text-center space-y-4"
            >
              <h3 className="font-sans font-extrabold text-2xl text-white">
                Ready to Protect Your Local Watershed?
              </h3>
              <p className="text-xs sm:text-sm text-[#526A7E] max-w-xl mx-auto">
                Register a free citizen account to save your historical water predictions, submit local stream safety reports, and collaborate with environmental guardians.
              </p>
              <div className="pt-2">
                {user ? (
                  <Link
                    to="/predict"
                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#168CFF] hover:bg-[#42D9FF] text-white hover:text-[#000000] font-extrabold text-xs transition-all shadow-md"
                  >
                    <span>Go to Predictor Hub</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#168CFF] hover:bg-[#42D9FF] text-white hover:text-[#000000] font-extrabold text-xs transition-all shadow-md"
                  >
                    <span>Register a Citizen Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </motion.div>
          </section>

        </div>
      </div>

    </div>
  );
}
