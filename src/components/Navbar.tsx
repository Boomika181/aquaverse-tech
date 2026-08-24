import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/AuthContext';
import { Droplet, Menu, X, LogOut, User, ShieldCheck, BarChart3, HelpCircle, FileText, Sparkles, LogIn, Compass, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { user, userProfile, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = isAdmin
    ? [
        { name: 'Home', path: '/', icon: Droplet },
        { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
        { name: 'Science & About', path: '/about', icon: HelpCircle },
        { name: 'Admin Hub', path: '/admin', icon: ShieldCheck, isAdminOnly: true },
      ]
    : user
    ? [
        { name: 'Home', path: '/', icon: Droplet },
        { name: 'Predict Water Safety', path: '/predict', icon: Sparkles },
        { name: 'How It Works', path: '/#how-it-works', icon: Compass },
        { name: 'Science & About', path: '/about', icon: HelpCircle },
        { name: 'Impact', path: '/#impact', icon: Activity },
        { name: 'Contact & Support', path: '/contact', icon: FileText },
      ]
    : [
        { name: 'Home', path: '/', icon: Droplet },
        { name: 'How It Works', path: '/#how-it-works', icon: Compass },
        { name: 'Science & About', path: '/about', icon: HelpCircle },
        { name: 'Impact', path: '/#impact', icon: Activity },
      ];

  const isActive = (path: string) => location.pathname === path;

  const handleAnchorClick = (path: string, e: React.MouseEvent) => {
    if (path.includes('#')) {
      const targetId = path.split('#')[1];
      if (location.pathname === '/') {
        e.preventDefault();
        const elem = document.getElementById(targetId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#03070B]/85 backdrop-blur-md border-b border-[#08243A]/80 text-[#EAF6FF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/logo-mark.png" 
              alt="AquaVerse AI Logo" 
              className="h-9 w-9 object-contain group-hover:scale-105 transition-transform duration-300 filter drop-shadow-[0_0_8px_rgba(22,140,255,0.4)]"
            />
            <div className="flex flex-col">
              <span className="font-sans font-extrabold text-lg tracking-tight text-white leading-tight">
                AquaVerse <span className="text-[#168CFF] font-semibold">AI</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#526A7E] font-semibold -mt-0.5">
                Environmental Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              const isSpecialAdmin = link.isAdminOnly;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={(e) => handleAnchorClick(link.path, e)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-[13.5px] font-bold transition-all duration-200 ${
                    isSpecialAdmin
                      ? active
                        ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/50 shadow-md'
                        : 'text-[#EF4444] hover:bg-[#EF4444]/15 bg-[#EF4444]/10 border border-[#EF4444]/30'
                      : active
                      ? 'bg-[#08243A] text-[#42D9FF] border-b-2 border-[#168CFF] shadow-xs'
                      : 'text-[#EAF6FF]/80 hover:bg-[#06111C] hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isSpecialAdmin ? 'text-[#EF4444]' : active ? 'text-[#42D9FF]' : 'text-[#526A7E]'}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-3 relative">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2.5 bg-[#06111C] border border-[#08243A] px-3.5 py-1.5 rounded-full hover:border-[#168CFF]/50 transition-all text-left focus:outline-none cursor-pointer"
                >
                  <div className="bg-[#168CFF]/15 h-7 w-7 rounded-full flex items-center justify-center border border-[#168CFF]/40">
                    <User className="h-4 w-4 text-[#42D9FF]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">
                      {userProfile?.displayName || user.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-[#42D9FF] capitalize font-semibold leading-none">
                      {userProfile?.role || 'Citizen Guardian'}
                    </p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-[#06111C] border border-[#08243A] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-2 border-b border-[#08243A] mb-1">
                        <p className="text-xs font-bold text-white">
                          {userProfile?.displayName || (isAdmin ? 'System Administrator' : 'Citizen Guardian')}
                        </p>
                        <p className="text-[10px] text-[#526A7E] truncate">{user.email}</p>
                      </div>

                      {isAdmin ? (
                        <>
                          <Link
                            to="/admin"
                            onClick={() => setIsProfileOpen(false)}
                            className="block px-4 py-2 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                          >
                            Admin Hub Panel
                          </Link>
                          <Link
                            to="/dashboard"
                            onClick={() => setIsProfileOpen(false)}
                            className="block px-4 py-2 text-xs font-semibold text-[#EAF6FF] hover:bg-[#08243A] hover:text-[#42D9FF] transition-colors"
                          >
                            Telemetry Dashboard
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/predict"
                            onClick={() => setIsProfileOpen(false)}
                            className="block px-4 py-2 text-xs font-semibold text-[#EAF6FF] hover:bg-[#08243A] hover:text-[#42D9FF] transition-colors"
                          >
                            Predict Water Safety
                          </Link>
                          <Link
                            to="/contact"
                            onClick={() => setIsProfileOpen(false)}
                            className="block px-4 py-2 text-xs font-semibold text-[#EAF6FF] hover:bg-[#08243A] hover:text-[#42D9FF] transition-colors"
                          >
                            Contact & Support
                          </Link>
                        </>
                      )}

                      <div className="border-t border-[#08243A] my-1.5" />
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left flex items-center space-x-2 px-4 py-2 text-xs font-bold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1.5 px-4.5 py-2 rounded-xl bg-[#08243A] hover:bg-[#168CFF] border border-[#168CFF]/40 text-white font-bold text-[13.5px] transition-all shadow-sm cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>Get Started</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-[#EAF6FF] hover:text-white hover:bg-[#06111C] focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (collapsible) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[#03070B] border-b border-[#08243A] px-4 pt-2 pb-4 space-y-1 shadow-2xl"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              const isSpecialAdmin = link.isAdminOnly;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={(e) => {
                    setIsOpen(false);
                    handleAnchorClick(link.path, e);
                  }}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isSpecialAdmin
                      ? active
                        ? 'bg-[#EF4444]/20 text-[#EF4444] border-l-4 border-[#EF4444]'
                        : 'text-[#EF4444] hover:bg-[#EF4444]/10 bg-[#EF4444]/5'
                      : active
                      ? 'bg-[#08243A] text-[#42D9FF] border-l-4 border-[#168CFF]'
                      : 'text-[#EAF6FF] hover:bg-[#06111C]'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isSpecialAdmin ? 'text-[#EF4444]' : active ? 'text-[#42D9FF]' : 'text-[#526A7E]'}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}

            <div className="pt-4 border-t border-[#08243A] mt-3">
              {user ? (
                <div className="flex flex-col space-y-2 bg-[#06111C] p-3.5 rounded-xl border border-[#08243A]">
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#08243A]">
                    <div className="bg-[#168CFF]/15 h-9 w-9 rounded-full flex items-center justify-center border border-[#168CFF]/40">
                      <User className="h-5 w-5 text-[#42D9FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {userProfile?.displayName || user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-[#42D9FF] capitalize font-medium">
                        {userProfile?.role || 'Citizen Guardian'}
                      </p>
                    </div>
                  </div>

                  {isAdmin ? (
                    <>
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center space-x-2 py-2 px-1 text-xs font-bold text-[#EF4444]"
                      >
                        <span>Admin Hub Panel</span>
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center space-x-2 py-2 px-1 text-xs font-semibold text-[#EAF6FF] hover:text-[#42D9FF]"
                      >
                        <span>Telemetry Dashboard</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/predict"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center space-x-2 py-2 px-1 text-xs font-semibold text-[#EAF6FF] hover:text-[#42D9FF]"
                      >
                        <span>Predict Water Safety</span>
                      </Link>
                      <Link
                        to="/contact"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center space-x-2 py-2 px-1 text-xs font-semibold text-[#EAF6FF] hover:text-[#42D9FF]"
                      >
                        <span>Contact & Support</span>
                      </Link>
                    </>
                  )}
                  <Link
                    to="/predict"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-2 py-2 px-1 text-xs font-semibold text-[#EAF6FF] hover:text-[#42D9FF]"
                  >
                    <span>Saved Prediction Logs</span>
                  </Link>

                  <div className="border-t border-[#08243A] my-1" />
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center space-x-2 py-2 px-1 text-xs font-bold text-[#EF4444] cursor-pointer text-left w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-xl bg-[#08243A] border border-[#168CFF]/40 text-white font-semibold text-sm text-center shadow-md"
                >
                  <LogIn className="h-4.5 w-4.5" />
                  <span>Get Started</span>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
