import { Link } from 'react-router-dom';
import { useAuth } from '../firebase/AuthContext';
import { Droplet, Mail, Github, Heart, Globe, Shield } from 'lucide-react';

export default function Footer() {
  const { user, isAdmin } = useAuth();

  return (
    <footer className="bg-[#000000] border-t border-[#08243A] text-[#526A7E] py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Soft background blue glow accent */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#168CFF]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 relative z-10">
        {/* Branding Column */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo-mark.png" 
              alt="AquaVerse AI Logo" 
              className="h-8 w-8 object-contain filter drop-shadow-[0_0_8px_rgba(22,140,255,0.4)]"
            />
            <span className="font-sans font-extrabold text-lg text-white tracking-tight">
              AquaVerse <span className="text-[#168CFF] font-semibold">AI</span>
            </span>
          </div>
          <p className="text-xs text-[#526A7E] leading-relaxed font-medium">
            Advancing global water security through automated chemical safety evaluations, dynamic water tracking dashboards, and community safeguarding networks.
          </p>
          <div className="flex space-x-3 text-[#42D9FF]">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-[#06111C] border border-[#08243A] rounded-xl hover:bg-[#168CFF] hover:text-white transition-all duration-200">
              <Github className="h-4 w-4" />
            </a>
            <a href="mailto:support@aquaverse-ai.com" className="p-2 bg-[#06111C] border border-[#08243A] rounded-xl hover:bg-[#168CFF] hover:text-white transition-all duration-200">
              <Mail className="h-4 w-4" />
            </a>
            <a href="#" className="p-2 bg-[#06111C] border border-[#08243A] rounded-xl hover:bg-[#168CFF] hover:text-white transition-all duration-200">
              <Globe className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-extrabold text-xs tracking-wider uppercase mb-4">Navigation</h3>
          <ul className="space-y-2.5 text-xs font-medium">
            <li>
              <Link to="/" className="hover:text-[#42D9FF] transition-colors">Home Landing</Link>
            </li>
            {isAdmin && (
              <li>
                <Link to="/dashboard" className="hover:text-[#42D9FF] transition-colors">Interactive Dashboard</Link>
              </li>
            )}
            {user && (
              <li>
                <Link to="/predict" className="hover:text-[#42D9FF] transition-colors">Water Quality Analyzer</Link>
              </li>
            )}
            <li>
              <Link to="/about" className="hover:text-[#42D9FF] transition-colors">Water Parameters Standard</Link>
            </li>
            {user && (
              <li>
                <Link to="/contact" className="hover:text-[#42D9FF] transition-colors">Submit Report / Help</Link>
              </li>
            )}
          </ul>
        </div>

        {/* Legal & Standards */}
        <div>
          <h3 className="text-white font-extrabold text-xs tracking-wider uppercase mb-4">Guidelines & Safety</h3>
          <ul className="space-y-2.5 text-xs font-medium">
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#168CFF]"></span>
              <span>WHO Potability Guidelines</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#168CFF]"></span>
              <span>EPA National Water Standard</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#168CFF]"></span>
              <span>Real-time Telemetry Standards</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
              <span>Report Contamination Rules</span>
            </li>
          </ul>
        </div>

        {/* Quick Contact Info */}
        <div className="space-y-3">
          <h3 className="text-white font-extrabold text-xs tracking-wider uppercase">Contact Support</h3>
          <p className="text-xs text-[#526A7E] leading-relaxed">
            Have water contamination or safety alerts to report immediately? Use our secure portal or email us.
          </p>
          <div className="bg-[#06111C] border border-[#08243A] rounded-xl p-3.5 text-xs leading-relaxed">
            <p className="font-bold text-white">Emergency Municipal Contact:</p>
            <p className="text-[#42D9FF] font-bold mt-0.5">112 / Local Utility Dispatch</p>
            <p className="text-[11px] text-[#526A7E] mt-1">For non-emergency citizen reports submitted via portal, admins review within 12 hours.</p>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-[#08243A] flex flex-col md:flex-row items-center justify-between text-xs text-[#526A7E] relative z-10">
        <p>© 2026 AquaVerse AI. Created for pure community water monitoring. All rights reserved.</p>
        <div className="flex items-center space-x-1.5 mt-4 md:mt-0">
          <span>Developed with</span>
          <Heart className="h-3.5 w-3.5 text-[#EF4444] fill-[#EF4444]" />
          <span>&</span>
          <Shield className="h-3.5 w-3.5 text-[#168CFF]" />
          <span>Firebase Protection Security rules.</span>
        </div>
      </div>
    </footer>
  );
}
