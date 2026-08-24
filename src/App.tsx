/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './firebase/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Admin from './pages/Admin';

// Protected User Route wrapper (requires any logged-in user: Citizen or Admin)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-[#000000] text-[#EAF6FF] min-h-screen flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#08243A] border-t-[#168CFF]"></div>
        <span className="text-xs text-[#526A7E] font-bold uppercase tracking-widest">Verifying User Session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Protected Admin Route wrapper (requires logged-in ADMIN: e.g. boomikaram35@gmail.com)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-[#000000] text-[#EAF6FF] min-h-screen flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#08243A] border-t-[#168CFF]"></div>
        <span className="text-xs text-[#526A7E] font-bold uppercase tracking-widest">Authorizing Supervisor Access...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/predict" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#000000] flex flex-col text-[#EAF6FF] font-sans selection:bg-[#168CFF]/30 selection:text-[#42D9FF]">
          
          {/* Main Sticky Header */}
          <Navbar />

          {/* Main Layout Area */}
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              
              {/* Detailed Telemetry Dashboard (Admin Only) */}
              <Route 
                path="/dashboard" 
                element={
                  <AdminRoute>
                    <Dashboard />
                  </AdminRoute>
                } 
              />

              <Route 
                path="/predict" 
                element={
                  <ProtectedRoute>
                    <Predict />
                  </ProtectedRoute>
                } 
              />
              <Route path="/about" element={<About />} />
              <Route 
                path="/contact" 
                element={
                  <ProtectedRoute>
                    <Contact />
                  </ProtectedRoute>
                } 
              />
              <Route path="/login" element={<Login />} />
              
              {/* Supervisor Admin hub route (Protected Admin Only) */}
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                } 
              />
              
              {/* Fallback routing redirects to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Main Informative footer */}
          <Footer />

        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
