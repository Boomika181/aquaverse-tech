import { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  getAllUsers, 
  getAllPredictions, 
  getAllContactMessages, 
  getAllReports, 
  deleteContactMessage, 
  updateMessageStatus, 
  deletePrediction, 
  updateReportStatus, 
  deleteReport,
  updateUserProfile,
  deleteUserProfile,
  getAllActivityLogs
} from '../firebase/utils';
import { UserProfile, WaterPrediction, ContactMessage, UploadedReport, WaterStation } from '../types';
import AdminMap from '../components/AdminMap';
import AdminCharts from '../components/AdminCharts';
import { fetchAdminModelEvaluations, SystemModelsEvaluationResponse } from '../services/modelEvaluationEngine';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import waterBg from '../water-bg.jpg';
import linesVideo from '../lines-video.mp4';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  Inbox, 
  AlertTriangle, 
  Loader2, 
  Trash2, 
  CheckCircle, 
  RefreshCw, 
  Lock, 
  FileText, 
  Sparkles, 
  Eye, 
  ArrowRight,
  ShieldAlert,
  Calendar,
  Search,
  Download,
  BarChart2,
  Cpu,
  Layers,
  Database
} from 'lucide-react';

export default function Admin() {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Selected sub-tab: 'messages' | 'predictions' | 'reports' | 'users' | 'logs' | 'evaluation'
  const [activeTab, setActiveTab] = useState<'messages' | 'predictions' | 'reports' | 'users' | 'logs' | 'evaluation'>('messages');

  // Firestore & API records state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [predictionsList, setPredictionsList] = useState<WaterPrediction[]>([]);
  const [messagesList, setContactMessagesList] = useState<ContactMessage[]>([]);
  const [reportsList, setReportsList] = useState<UploadedReport[]>([]);
  const [waterStations, setWaterStations] = useState<WaterStation[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/water/stations')
        .then(res => res.json())
        .then(data => {
          if (data && data.stations) setWaterStations(data.stations);
        })
        .catch(err => console.warn('Failed to fetch stations for admin map:', err));
    }
  }, [isAdmin]);

  // Model evaluation state
  const [evalData, setEvalData] = useState<SystemModelsEvaluationResponse | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  // Page loading & action loading states
  const [syncing, setSyncing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Expandable items state
  const [selectedAdvisoryText, setSelectedAdvisoryText] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<UploadedReport | null>(null);

  // Load all admin collections
  const loadModelEvaluations = async () => {
    setEvalLoading(true);
    try {
      const token = user ? await user.getIdToken() : undefined;
      const res = await fetchAdminModelEvaluations(token);
      setEvalData(res);
    } catch (err) {
      console.error('Failed to load model evaluations:', err);
    } finally {
      setEvalLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'evaluation' && !evalData) {
      loadModelEvaluations();
    }
  }, [activeTab, isAdmin]);

  const syncCollections = async () => {
    if (!isAdmin) return;
    setSyncing(true);
    try {
      const results = await Promise.allSettled([
        getAllUsers(),
        getAllPredictions(),
        getAllContactMessages(),
        getAllReports(),
        getAllActivityLogs(40)
      ]);
      
      if (results[0].status === 'fulfilled' && results[0].value) setUsersList(results[0].value);
      if (results[1].status === 'fulfilled' && results[1].value) setPredictionsList(results[1].value);
      if (results[2].status === 'fulfilled' && results[2].value) setContactMessagesList(results[2].value);
      if (results[3].status === 'fulfilled' && results[3].value) setReportsList(results[3].value);
      if (results[4].status === 'fulfilled' && results[4].value) setActivityLogs(results[4].value);

      await loadModelEvaluations();
    } catch (err) {
      console.error('Failed to sync admin logs:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let unsubscribeReports: (() => void) | undefined;
    let unsubscribePredictions: (() => void) | undefined;
    let unsubscribeMessages: (() => void) | undefined;

    if (!authLoading) {
      if (!user || !isAdmin) {
        // Not authorized
      } else {
        syncCollections();

        try {
          const q = query(collection(db, 'uploadedReports'), orderBy('timestamp', 'desc'));
          unsubscribeReports = onSnapshot(q, (snapshot) => {
            const reports: UploadedReport[] = [];
            snapshot.forEach((doc) => {
              reports.push({ id: doc.id, ...doc.data() } as UploadedReport);
            });
            setReportsList(reports);
          }, (error) => {
            console.error("Error listening to real-time uploadedReports:", error);
          });
        } catch (err) {
          console.error("Failed to attach real-time onSnapshot for uploadedReports:", err);
        }

        try {
          const qPred = query(collection(db, 'predictions'), orderBy('timestamp', 'desc'));
          unsubscribePredictions = onSnapshot(qPred, (snapshot) => {
            const preds: WaterPrediction[] = [];
            snapshot.forEach((doc) => {
              preds.push({ id: doc.id, ...doc.data() } as WaterPrediction);
            });
            setPredictionsList(preds);
          }, (error) => {
            console.error("Error listening to real-time predictions:", error);
          });
        } catch (err) {
          console.error("Failed to attach real-time onSnapshot for predictions:", err);
        }

        try {
          const qMsg = query(collection(db, 'contactMessages'), orderBy('timestamp', 'desc'));
          unsubscribeMessages = onSnapshot(qMsg, (snapshot) => {
            const msgs: ContactMessage[] = [];
            snapshot.forEach((doc) => {
              msgs.push({ id: doc.id, ...doc.data() } as ContactMessage);
            });
            setContactMessagesList(msgs);
          }, (error) => {
            console.error("Error listening to real-time contactMessages:", error);
          });
        } catch (err) {
          console.error("Failed to attach real-time onSnapshot for contactMessages:", err);
        }
      }
    }

    return () => {
      if (unsubscribeReports) {
        unsubscribeReports();
      }
      if (unsubscribePredictions) {
        unsubscribePredictions();
      }
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [user, isAdmin, authLoading]);

  const handleUpdateMessageStatus = async (msgId: string, newStatus: string) => {
    setActionLoadingId(msgId);
    try {
      await updateMessageStatus(msgId, newStatus);
      setContactMessagesList(prev => prev.map(m => m.id === msgId ? { ...m, status: newStatus } : m));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Are you absolutely sure you want to delete this contact message?')) return;
    setActionLoadingId(msgId);
    try {
      await deleteContactMessage(msgId);
      setContactMessagesList(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePrediction = async (predId: string) => {
    if (!confirm('Are you sure you want to delete this prediction log?')) return;
    setActionLoadingId(predId);
    try {
      await deletePrediction(predId);
      setPredictionsList(prev => prev.filter(p => p.id !== predId));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateReportStatus = async (repId: string, nextStatus: string) => {
    setActionLoadingId(repId);
    try {
      await updateReportStatus(repId, nextStatus);
      setReportsList(prev => prev.map(r => r.id === repId ? { ...r, status: nextStatus } : r));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteReport = async (repId: string) => {
    if (!confirm('Are you sure you want to delete this community report?')) return;
    setActionLoadingId(repId);
    try {
      await deleteReport(repId);
      setReportsList(prev => prev.filter(r => r.id !== repId));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleUserRole = async (targetUid: string, currentRole: any) => {
    if (targetUid === user?.uid) {
      alert("You cannot revoke your own administrator access.");
      return;
    }
    const nextRole = currentRole === 'admin' ? 'citizen' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to ${nextRole.toUpperCase()}?`)) return;
    
    setActionLoadingId(targetUid);
    try {
      await updateUserProfile(targetUid, { role: nextRole });
      setUsersList(prev => prev.map(u => u.uid === targetUid ? { ...u, role: nextRole } : u));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (targetUid: string) => {
    if (targetUid === user?.uid) {
      alert("You cannot delete your own account from the panel.");
      return;
    }
    if (!confirm("Are you absolutely sure you want to delete this citizen profile? All access will be revoked.")) return;
    
    setActionLoadingId(targetUid);
    try {
      await deleteUserProfile(targetUid);
      setUsersList(prev => prev.filter(u => u.uid !== targetUid));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="bg-[#000000] text-[#EAF6FF] min-h-screen flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#168CFF]" />
        <span className="text-xs text-[#526A7E] font-bold uppercase tracking-widest">Syncing Command Center Credentials...</span>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="bg-[#000000] text-[#EAF6FF] min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-floating-panel rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="bg-[#EF4444]/10 p-3 rounded-full border border-[#EF4444]/20 w-fit mx-auto">
            <Lock className="h-8 w-8 text-[#EF4444]" />
          </div>
          <h2 className="font-sans font-extrabold text-xl text-white">Unauthorized Access</h2>
          <p className="text-xs text-[#526A7E] max-w-sm mx-auto leading-relaxed">
            Your current account credentials lack administrative permissions. Please log in with a supervisor or administrator profile to review operations logs.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 rounded-xl bg-[#168CFF] hover:bg-[#42D9FF] text-white hover:text-[#000000] font-extrabold text-xs shadow-md cursor-pointer transition-all"
          >
            Access Login Screen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#000000] text-[#EAF6FF] min-h-screen py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#168CFF]/30 selection:text-[#42D9FF] relative overflow-hidden">
      
      {/* EXACT UPLOADED WATER BACKGROUND IMAGE & LIVE MP4 VIDEO LOOP LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src={waterBg} 
          alt="Water Command Center Environment" 
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
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Hub Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#168CFF]/20 gap-6"
        >
          <div className="space-y-1">
            <h1 className="font-sans font-extrabold text-3xl sm:text-4xl text-white tracking-tight flex items-center space-x-3">
              <ShieldCheck className="h-8 w-8 text-[#42D9FF]" />
              <span>Water Intelligence Command Center</span>
            </h1>
            <p className="text-[#526A7E] text-sm">
              Review incoming community reports, registered citizen directories, contact messages, and chemical telemetry analytics.
            </p>
          </div>

          <button
            onClick={syncCollections}
            disabled={syncing}
            className="flex items-center space-x-1.5 px-4.5 py-2.5 rounded-xl glass-floating-panel text-xs font-bold text-[#42D9FF] border border-[#168CFF]/30 shrink-0 transition-all cursor-pointer shadow-md"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-[#168CFF]' : ''}`} />
            <span>Sync Database</span>
          </button>
        </motion.div>

        {/* Dynamic Metric cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="glass-floating-panel p-5 rounded-2xl flex items-center space-x-4 shadow-2xl"
          >
            <div className="p-3 rounded-xl bg-[#168CFF]/15 border border-[#168CFF]/30 text-[#42D9FF]">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-[#526A7E] font-bold uppercase tracking-widest">Contact Messages</p>
              <h3 className="text-2xl font-black text-white mt-0.5">{messagesList.length}</h3>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-floating-panel p-5 rounded-2xl flex items-center space-x-4 shadow-2xl"
          >
            <div className="p-3 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-[#526A7E] font-bold uppercase tracking-widest">Filed Alerts</p>
              <h3 className="text-2xl font-black text-white mt-0.5">{reportsList.length}</h3>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-floating-panel p-5 rounded-2xl flex items-center space-x-4 shadow-2xl"
          >
            <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-[#526A7E] font-bold uppercase tracking-widest">Total Predictions</p>
              <h3 className="text-2xl font-black text-white mt-0.5">{predictionsList.length}</h3>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-floating-panel p-5 rounded-2xl flex items-center space-x-4 shadow-2xl"
          >
            <div className="p-3 rounded-xl bg-[#42D9FF]/15 border border-[#42D9FF]/30 text-[#42D9FF]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-[#526A7E] font-bold uppercase tracking-widest">Citizens Directory</p>
              <h3 className="text-2xl font-black text-white mt-0.5">{usersList.length}</h3>
            </div>
          </motion.div>
        </div>

        {/* Interactive Incidents Map & Real-time Analytics Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AdminMap reports={reportsList} predictions={predictionsList} stations={waterStations} />
          </div>
          <div className="lg:col-span-1 flex">
            <div className="glass-floating-panel rounded-2xl p-5 space-y-4 flex flex-col justify-between w-full shadow-2xl">
              <div>
                <h3 className="text-sm font-bold font-sans text-white flex items-center space-x-2 pb-3 border-b border-[#168CFF]/20">
                  <Activity className="h-4 w-4 text-[#42D9FF] animate-pulse" />
                  <span>Real-Time Environmental Summary</span>
                </h3>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#526A7E]">Registered Citizens</span>
                    <span className="font-mono font-bold text-white bg-[#030A12] px-2 py-0.5 rounded border border-[#08243A]">{usersList.length}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[#168CFF]/20 pt-2.5">
                    <span className="text-[#526A7E]">Safeguard Reports</span>
                    <span className="font-mono font-bold text-[#42D9FF] bg-[#030A12] px-2 py-0.5 rounded border border-[#08243A]">{reportsList.length}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[#168CFF]/20 pt-2.5 pl-2">
                    <span className="text-[#526A7E] flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]"></span>
                      <span>Pending Reports</span>
                    </span>
                    <span className="font-mono font-bold text-[#F59E0B]">{reportsList.filter(r => r.status === 'Pending' || r.status === 'pending').length}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[#168CFF]/20 pt-2.5 pl-2">
                    <span className="text-[#526A7E] flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#168CFF]"></span>
                      <span>Under Investigation</span>
                    </span>
                    <span className="font-mono font-bold text-[#168CFF]">{reportsList.filter(r => r.status === 'Under Investigation' || r.status === 'reviewed').length}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[#168CFF]/20 pt-2.5 pl-2">
                    <span className="text-[#526A7E] flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]"></span>
                      <span>Resolved Reports</span>
                    </span>
                    <span className="font-mono font-bold text-[#10B981]">{reportsList.filter(r => r.status === 'Resolved' || r.status === 'resolved').length}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[#168CFF]/20 pt-2.5">
                    <span className="text-[#526A7E]">Unsafe Predictions</span>
                    <span className="font-mono font-bold text-[#EF4444] bg-[#030A12] px-2 py-0.5 rounded border border-[#08243A]">
                      {predictionsList.filter(p => p.result === 'unsafe').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#030A12]/80 p-3 rounded-xl border border-[#08243A] text-center">
                <p className="text-[10px] text-[#526A7E] leading-normal">
                  Average assessment confidence: <strong className="text-[#42D9FF]">{predictionsList.length > 0 ? Math.round(predictionsList.reduce((acc, p) => acc + p.confidence, 0) / predictionsList.length) : 0}%</strong> across telemetry logs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Analytics Charts */}
        <AdminCharts reports={reportsList} predictions={predictionsList} />

        {/* Tab Controls */}
        <div className="border-b border-[#168CFF]/20 flex overflow-x-auto gap-2 text-xs">
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'messages' ? 'border-[#168CFF] text-[#42D9FF] bg-[#030A12]/80' : 'border-transparent text-[#526A7E] hover:text-white'
            }`}
          >
            Contact Inquiries ({messagesList.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'reports' ? 'border-[#168CFF] text-[#42D9FF] bg-[#030A12]/80' : 'border-transparent text-[#526A7E] hover:text-white'
            }`}
          >
            Environmental Safeguards ({reportsList.length})
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-4 py-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'predictions' ? 'border-[#168CFF] text-[#42D9FF] bg-[#030A12]/80' : 'border-transparent text-[#526A7E] hover:text-white'
            }`}
          >
            Chemical Predictions Log ({predictionsList.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'users' ? 'border-[#168CFF] text-[#42D9FF] bg-[#030A12]/80' : 'border-transparent text-[#526A7E] hover:text-white'
            }`}
          >
            Citizen Access Manager ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'logs' ? 'border-[#168CFF] text-[#42D9FF] bg-[#030A12]/80' : 'border-transparent text-[#526A7E] hover:text-white'
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`px-4 py-3 font-bold border-b-2 whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'evaluation' ? 'border-[#10B981] text-[#10B981] bg-[#030A12]/80' : 'border-transparent text-[#526A7E] hover:text-white'
            }`}
          >
            <Cpu className="h-3.5 w-3.5 text-[#10B981]" />
            <span>Model Evaluation (Real ML Metrics)</span>
          </button>
        </div>

        {/* Expanded Advisory overlay modal */}
        {selectedAdvisoryText && (
          <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="glass-floating-panel rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#168CFF]/20 pb-3 text-[#42D9FF]">
                <span className="font-bold text-sm tracking-wide uppercase">Water Safety Advisory Detail</span>
                <button 
                  onClick={() => setSelectedAdvisoryText(null)}
                  className="p-1 rounded bg-[#030A12] hover:bg-[#08243A] text-[#526A7E] hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="text-xs sm:text-sm text-[#EAF6FF] space-y-3 whitespace-pre-line leading-relaxed">
                {selectedAdvisoryText}
              </div>
            </div>
          </div>
        )}

        {/* Expanded Report Details overlay modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="glass-floating-panel rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl my-8">
              <div className="flex items-center justify-between border-b border-[#168CFF]/20 pb-3 text-[#42D9FF]">
                <span className="font-extrabold text-sm tracking-wider uppercase flex items-center space-x-2">
                  <ShieldAlert className="h-5 w-5 text-[#168CFF]" />
                  <span>Report Incident Detail</span>
                </span>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-1 rounded bg-[#030A12] hover:bg-[#08243A] text-[#526A7E] hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-relaxed text-[#EAF6FF]">
                
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-[#526A7E] uppercase tracking-widest font-bold block mb-0.5">Report Title</span>
                    <h3 className="text-sm font-bold text-white">{selectedReport.title}</h3>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#526A7E] uppercase tracking-widest font-bold block mb-0.5">Reporter Name</span>
                    <p className="text-xs font-semibold text-[#EAF6FF]">
                      {selectedReport.citizenName || selectedReport.userEmail?.split('@')[0] || 'Citizen'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#526A7E] uppercase tracking-widest font-bold block mb-0.5">Email</span>
                    <p className="font-semibold text-[#EAF6FF]">{selectedReport.userEmail}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#526A7E] uppercase tracking-widest font-bold block mb-0.5">Location</span>
                    <p className="font-semibold text-[#EAF6FF]">{selectedReport.location}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#526A7E] uppercase tracking-widest font-bold block mb-0.5">Coordinates</span>
                    <p className="font-mono font-bold text-[#42D9FF]">
                      {selectedReport.latitude !== undefined ? selectedReport.latitude.toFixed(6) : 'N/A'}, {selectedReport.longitude !== undefined ? selectedReport.longitude.toFixed(6) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-[#526A7E] uppercase tracking-widest font-bold block mb-1">Description</span>
                    <p className="bg-[#030A12] border border-[#08243A] p-3 rounded-xl text-xs italic text-[#EAF6FF] leading-relaxed max-h-28 overflow-y-auto">
                      "{selectedReport.description}"
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#526A7E] uppercase tracking-widest font-bold block mb-1.5">Change Incident Status</span>
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedReport.status === 'resolved' ? 'Resolved' : selectedReport.status === 'reviewed' ? 'Under Investigation' : selectedReport.status === 'pending' ? 'Pending' : selectedReport.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          await handleUpdateReportStatus(selectedReport.id!, newStatus);
                          setSelectedReport(prev => prev ? { ...prev, status: newStatus } : null);
                        }}
                        disabled={actionLoadingId === selectedReport.id}
                        className="flex-1 bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#168CFF] cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Under Investigation">Under Investigation</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      <span className={`px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-bold border shrink-0 ${
                        selectedReport.status === 'Resolved' || selectedReport.status === 'resolved' ? 'border-[#10B981]/30 bg-[#10B981]/15 text-[#10B981]' :
                        selectedReport.status === 'Under Investigation' || selectedReport.status === 'reviewed' ? 'border-[#168CFF]/30 bg-[#168CFF]/15 text-[#42D9FF]' :
                        selectedReport.status === 'Rejected' ? 'border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]' :
                        'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]'
                      }`}>
                        {selectedReport.status}
                      </span>
                    </div>
                  </div>

                  {selectedReport.imageUrl && (
                    <div>
                      <span className="text-[10px] text-[#526A7E] uppercase tracking-widest font-bold block mb-1">Uploaded Evidence</span>
                      <div className="rounded-xl overflow-hidden h-36 bg-[#030A12] flex items-center justify-center border border-[#08243A]">
                        <img src={selectedReport.imageUrl} alt="Incident Evidence" className="h-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>

              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-[#168CFF]/20 text-[10px] text-[#526A7E] font-mono">
                <span>Incident ID: {selectedReport.id}</span>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteReport(selectedReport.id!);
                    setSelectedReport(null);
                  }}
                  disabled={actionLoadingId === selectedReport.id}
                  className="flex items-center space-x-1 py-1.5 px-3 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete Incident File</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab content boxes */}
        <div className="min-h-[300px]">
          {syncing ? (
            <div className="py-24 flex flex-col items-center justify-center text-[#526A7E] text-xs space-y-2.5">
              <Loader2 className="h-8 w-8 animate-spin text-[#168CFF]" />
              <span>Syncing municipal records...</span>
            </div>
          ) : (
            <>
              {/* Messages Inquiries Tab */}
              {activeTab === 'messages' && (
                <div className="space-y-4">
                  {messagesList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {messagesList.map(msg => {
                        const date = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
                        return (
                          <div key={msg.id} className="p-5 glass-floating-panel rounded-2xl flex flex-col justify-between space-y-4 shadow-2xl">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-sans font-bold text-white text-sm">{msg.subject}</h4>
                                  <p className="text-[10px] text-[#526A7E]">From {msg.name} ({msg.email})</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                  msg.status === 'Resolved' || msg.status === 'resolved' ? 'border-[#10B981]/30 bg-[#10B981]/15 text-[#10B981]' :
                                  msg.status === 'Under Investigation' ? 'border-[#168CFF]/30 bg-[#168CFF]/15 text-[#42D9FF]' :
                                  msg.status === 'Rejected' ? 'border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]' :
                                  'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]'
                                }`}>
                                  {msg.status || 'Pending'}
                                </span>
                              </div>
                              <p className="text-xs text-[#EAF6FF] leading-relaxed bg-[#030A12] p-3 rounded-xl border border-[#08243A]">
                                "{msg.message}"
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#168CFF]/20">
                              <span className="text-[#526A7E] flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </span>
                              
                              <div className="flex items-center space-x-2">
                                <select
                                  value={msg.status || 'Pending'}
                                  onChange={(e) => handleUpdateMessageStatus(msg.id!, e.target.value)}
                                  disabled={actionLoadingId === msg.id}
                                  className="bg-[#030A12] text-white border border-[#08243A] rounded px-2.5 py-1 text-[10px] font-bold focus:outline-none focus:border-[#168CFF] cursor-pointer"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Under Investigation">Under Investigation</option>
                                  <option value="Resolved">Resolved</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id!)}
                                  disabled={actionLoadingId === msg.id}
                                  className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded border border-[#08243A] cursor-pointer"
                                  title="Delete Message"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-[#526A7E] border border-dashed border-[#08243A] rounded-2xl glass-floating-panel">
                      No contact messages received yet.
                    </div>
                  )}
                </div>
              )}

              {/* Environmental Safeguards Reports Tab */}
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {reportsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {reportsList.map(rep => {
                        const date = rep.timestamp?.toDate ? rep.timestamp.toDate() : new Date(rep.timestamp);
                        return (
                          <div 
                            key={rep.id} 
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.tagName !== 'SELECT' && target.tagName !== 'OPTION' && !target.closest('button')) {
                                setSelectedReport(rep);
                              }
                            }}
                            className="p-5 glass-floating-panel rounded-2xl flex flex-col justify-between space-y-4 transition-all cursor-pointer group shadow-2xl"
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-sans font-bold text-white text-sm group-hover:text-[#42D9FF] transition-colors">{rep.title}</h4>
                                  <p className="text-[10px] text-[#526A7E]">Filed by: {rep.userEmail}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                  rep.status === 'Resolved' || rep.status === 'resolved' ? 'border-[#10B981]/30 bg-[#10B981]/15 text-[#10B981]' :
                                  rep.status === 'Under Investigation' || rep.status === 'reviewed' ? 'border-[#168CFF]/30 bg-[#168CFF]/15 text-[#42D9FF]' :
                                  rep.status === 'Rejected' ? 'border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]' :
                                  'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]'
                                }`}>
                                  {rep.status}
                                </span>
                              </div>
                              <p className="text-xs text-[#EAF6FF] leading-relaxed bg-[#030A12] p-3 rounded-xl border border-[#08243A] line-clamp-3">
                                "{rep.description}"
                              </p>
                              {rep.imageUrl && (
                                <div className="rounded-xl overflow-hidden h-32 bg-[#030A12] flex items-center justify-center border border-[#08243A]">
                                  <img src={rep.imageUrl} alt="Contamination Attachment" className="h-full object-contain" />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#168CFF]/20 gap-2">
                              <span className="text-[#526A7E] truncate max-w-[160px]" title={rep.location}>
                                Location: <strong className="text-[#EAF6FF]">{rep.location || 'Location Not Provided'}</strong> {rep.latitude && rep.longitude ? '' : <span className="text-[#F59E0B] text-[9px] font-mono">(No Map Pin)</span>}
                              </span>
                              
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedReport(rep)}
                                  className="px-2.5 py-1 bg-[#168CFF]/20 hover:bg-[#168CFF]/40 border border-[#168CFF]/30 text-[#42D9FF] rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                >
                                  Details
                                </button>
                                <select
                                  value={rep.status === 'resolved' ? 'Resolved' : rep.status === 'reviewed' ? 'Under Investigation' : rep.status === 'pending' ? 'Pending' : rep.status}
                                  onChange={(e) => handleUpdateReportStatus(rep.id!, e.target.value)}
                                  disabled={actionLoadingId === rep.id}
                                  className="bg-[#030A12] text-white border border-[#08243A] rounded px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-[#168CFF] cursor-pointer"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Under Investigation">Under Investigation</option>
                                  <option value="Resolved">Resolved</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReport(rep.id!)}
                                  disabled={actionLoadingId === rep.id}
                                  className="p-1 text-[#EF4444] hover:bg-[#EF4444]/10 rounded border border-[#08243A] cursor-pointer"
                                  title="Delete Report"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-[#526A7E] border border-dashed border-[#08243A] rounded-2xl glass-floating-panel">
                      No citizen safeguard reports filed yet.
                    </div>
                  )}
                </div>
              )}

              {/* Chemical Predictions Log Tab */}
              {activeTab === 'predictions' && (
                <div className="glass-floating-panel rounded-2xl overflow-hidden shadow-2xl">
                  {predictionsList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#EAF6FF]">
                        <thead className="bg-[#030A12] text-[#526A7E] uppercase text-[10px] tracking-wider border-b border-[#08243A]">
                          <tr>
                            <th className="py-3 px-4 font-bold">User / Email</th>
                            <th className="py-3 px-4 font-bold">pH</th>
                            <th className="py-3 px-4 font-bold">Solids</th>
                            <th className="py-3 px-4 font-bold">Turbidity</th>
                            <th className="py-3 px-4 font-bold">Outcome</th>
                            <th className="py-3 px-4 font-bold">Confidence</th>
                            <th className="py-3 px-4 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#08243A]">
                          {predictionsList.map((item) => (
                            <tr key={item.id} className="hover:bg-[#08243A]/40 transition-colors">
                              <td className="py-3 px-4 font-medium text-[#526A7E] truncate max-w-[150px]" title={item.userEmail}>
                                {item.userEmail}
                              </td>
                              <td className="py-3 px-4 font-bold text-white">{item.inputs.ph}</td>
                              <td className="py-3 px-4">{item.inputs.solids}</td>
                              <td className="py-3 px-4">{item.inputs.turbidity}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.result === 'safe' ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'}`}>
                                  <span>{item.result.toUpperCase()}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-[#42D9FF]">{item.confidence}%</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end space-x-1.5">
                                  {item.advisoryText && (
                                    <button
                                      onClick={() => setSelectedAdvisoryText(item.advisoryText || null)}
                                      className="p-1 text-[#42D9FF] hover:bg-[#168CFF]/20 rounded cursor-pointer"
                                      title="Read Advisory"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeletePrediction(item.id!)}
                                    disabled={actionLoadingId === item.id}
                                    className="p-1 text-[#EF4444] hover:bg-[#EF4444]/10 rounded cursor-pointer"
                                    title="Delete Log"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-[#526A7E]">
                      No prediction logs recorded yet in the database.
                    </div>
                  )}
                </div>
              )}

              {/* Citizen Access Manager Tab */}
              {activeTab === 'users' && (
                <div className="glass-floating-panel rounded-2xl overflow-hidden shadow-2xl">
                  {usersList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#EAF6FF]">
                        <thead className="bg-[#030A12] text-[#526A7E] uppercase text-[10px] tracking-wider border-b border-[#08243A]">
                          <tr>
                            <th className="py-3 px-4 font-bold">Name</th>
                            <th className="py-3 px-4 font-bold">Email Address</th>
                            <th className="py-3 px-4 font-bold">Role Status</th>
                            <th className="py-3 px-4 font-bold text-right">Access Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#08243A]">
                          {usersList.map((usr) => (
                            <tr key={usr.uid} className="hover:bg-[#08243A]/40 transition-colors">
                              <td className="py-3 px-4 font-bold text-white">{usr.displayName}</td>
                              <td className="py-3 px-4 font-medium text-[#526A7E]">{usr.email}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                  usr.role === 'admin' ? 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]' : 'border-[#168CFF]/30 bg-[#168CFF]/10 text-[#42D9FF]'
                                }`}>
                                  {usr.role}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleToggleUserRole(usr.uid, usr.role)}
                                    disabled={actionLoadingId === usr.uid}
                                    className="px-2.5 py-1 bg-[#030A12] hover:bg-[#08243A] text-[#42D9FF] rounded-lg text-[10px] font-bold border border-[#08243A] cursor-pointer"
                                  >
                                    Toggle Role
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(usr.uid)}
                                    disabled={actionLoadingId === usr.uid}
                                    className="p-1 text-[#EF4444] hover:bg-[#EF4444]/10 rounded cursor-pointer"
                                    title="Revoke Access"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-[#526A7E]">
                      No citizen profile files synchronized.
                    </div>
                  )}
                </div>
              )}

              {/* Audit Logs Tab */}
              {activeTab === 'logs' && (
                <div className="glass-floating-panel rounded-2xl p-5 space-y-4 shadow-2xl">
                  <div className="flex items-center space-x-2 border-b border-[#168CFF]/20 pb-2.5 text-[#42D9FF]">
                    <Activity className="h-4.5 w-4.5 text-[#168CFF]" />
                    <span className="text-xs font-bold uppercase tracking-wider">Historical Guard Audit Trail</span>
                  </div>

                  {activityLogs.length > 0 ? (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {activityLogs.map((log) => {
                        const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                        return (
                          <div key={log.id} className="p-3 bg-[#030A12] rounded-xl border border-[#08243A] text-xs flex items-center justify-between space-x-4">
                            <div className="space-y-0.5">
                              <p className="text-[#EAF6FF]"><span className="text-[#526A7E] font-semibold">[{log.userEmail}]</span> {log.action}</p>
                            </div>
                            <span className="text-[10px] text-[#526A7E] shrink-0 font-mono">
                              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-[#526A7E]">
                      No activity logs tracked.
                    </div>
                  )}
                </div>
              )}

              {/* Model Evaluation Tab (ADMIN ONLY - REAL ML METRICS) */}
              {activeTab === 'evaluation' && (
                <div className="space-y-6">
                  {evalLoading ? (
                    <div className="py-20 text-center text-xs text-[#526A7E] flex items-center justify-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
                      <span>Loading production ML model evaluation telemetry...</span>
                    </div>
                  ) : evalData ? (
                    <>
                      {/* Model Architecture Header Pill */}
                      <div className="glass-floating-panel rounded-2xl p-6 space-y-4 shadow-2xl border border-[#10B981]/30">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#168CFF]/20 pb-4 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Cpu className="h-6 w-6 text-[#10B981]" />
                              <h2 className="font-sans font-extrabold text-2xl text-white tracking-tight">
                                {evalData.demandForecast.model}
                              </h2>
                              <span className="bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                                Version: {evalData.demandForecast.version}
                              </span>
                            </div>
                            <p className="text-xs text-[#526A7E]">
                              Algorithm: <strong className="text-[#42D9FF]">{evalData.demandForecast.algorithm}</strong> | Trained: <span className="font-mono text-white">{new Date(evalData.demandForecast.trainedAt).toLocaleString()}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                            <span className="bg-[#030A12] border border-[#08243A] px-3 py-1 rounded-xl text-[#526A7E]">
                              Train Set: <strong className="text-white">{evalData.demandForecast.split.trainSamples} samples</strong>
                            </span>
                            <span className="bg-[#030A12] border border-[#08243A] px-3 py-1 rounded-xl text-[#526A7E]">
                              Val Set: <strong className="text-white">{evalData.demandForecast.split.validationSamples} samples</strong>
                            </span>
                            <span className="bg-[#10B981]/15 border border-[#10B981]/40 px-3 py-1 rounded-xl text-[#10B981] font-bold">
                              Untouched Test: <strong>{evalData.demandForecast.split.testSamples} samples</strong>
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
                          <div className="bg-[#030A12] p-3.5 rounded-xl border border-[#08243A]">
                            <span className="text-[10px] text-[#526A7E] uppercase font-bold block">DataSource Provenance</span>
                            <span className="font-mono text-white font-bold">{evalData.demandForecast.dataSource}</span>
                          </div>
                          <div className="bg-[#030A12] p-3.5 rounded-xl border border-[#08243A]">
                            <span className="text-[10px] text-[#526A7E] uppercase font-bold block">Training Period</span>
                            <span className="font-mono text-white">{evalData.demandForecast.trainingPeriod.startDate} to {evalData.demandForecast.trainingPeriod.endDate}</span>
                          </div>
                          <div className="bg-[#030A12] p-3.5 rounded-xl border border-[#08243A]">
                            <span className="text-[10px] text-[#526A7E] uppercase font-bold block">Untouched Holdout Test Period</span>
                            <span className="font-mono text-[#10B981] font-bold">{evalData.demandForecast.testPeriod.startDate} to {evalData.demandForecast.testPeriod.endDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metric Comparison Table */}
                      <div className="glass-floating-panel rounded-2xl p-6 space-y-4 shadow-2xl border border-[#168CFF]/30">
                        <div className="flex justify-between items-center border-b border-[#168CFF]/20 pb-3">
                          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
                            <BarChart2 className="h-4 w-4 text-[#42D9FF]" />
                            <span>Holdout Test Set Performance Comparison</span>
                          </h3>
                          <span className="text-xs font-mono font-bold text-[#10B981] bg-[#10B981]/20 border border-[#10B981]/40 px-3 py-1 rounded-full">
                            MAE Improvement: +{evalData.demandForecast.metrics.randomForest.mae > 0 ? Math.round(((evalData.demandForecast.metrics.baseline.mae - evalData.demandForecast.metrics.randomForest.mae) / evalData.demandForecast.metrics.baseline.mae) * 1000) / 10 : 0}%
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#030A12] text-[#526A7E] uppercase text-[10px] tracking-wider border-b border-[#08243A]">
                              <tr>
                                <th className="py-3 px-4 font-bold">Regression Metric</th>
                                <th className="py-3 px-4 font-bold text-right">7-Day Moving Avg Baseline</th>
                                <th className="py-3 px-4 font-bold text-right">Random Forest Regressor</th>
                                <th className="py-3 px-4 font-bold text-right">Absolute Improvement</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#08243A] font-mono">
                              <tr className="hover:bg-[#08243A]/40 transition-colors">
                                <td className="py-3.5 px-4 font-sans font-bold text-white">Mean Absolute Error (MAE)</td>
                                <td className="py-3.5 px-4 text-right text-[#526A7E]">{evalData.demandForecast.metrics.baseline.mae}</td>
                                <td className="py-3.5 px-4 text-right text-[#10B981] font-bold">{evalData.demandForecast.metrics.randomForest.mae}</td>
                                <td className="py-3.5 px-4 text-right text-[#10B981] font-bold">-{evalData.demandForecast.metrics.improvement.mae}</td>
                              </tr>
                              <tr className="hover:bg-[#08243A]/40 transition-colors">
                                <td className="py-3.5 px-4 font-sans font-bold text-white">Root Mean Squared Error (RMSE)</td>
                                <td className="py-3.5 px-4 text-right text-[#526A7E]">{evalData.demandForecast.metrics.baseline.rmse}</td>
                                <td className="py-3.5 px-4 text-right text-[#10B981] font-bold">{evalData.demandForecast.metrics.randomForest.rmse}</td>
                                <td className="py-3.5 px-4 text-right text-[#10B981] font-bold">-{evalData.demandForecast.metrics.improvement.rmse}</td>
                              </tr>
                              <tr className="hover:bg-[#08243A]/40 transition-colors">
                                <td className="py-3.5 px-4 font-sans font-bold text-white">Mean Absolute Percentage Error (MAPE)</td>
                                <td className="py-3.5 px-4 text-right text-[#526A7E]">{evalData.demandForecast.metrics.baseline.mape}%</td>
                                <td className="py-3.5 px-4 text-right text-[#10B981] font-bold">{evalData.demandForecast.metrics.randomForest.mape}%</td>
                                <td className="py-3.5 px-4 text-right text-[#10B981] font-bold">-{evalData.demandForecast.metrics.improvement.mape}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Actual vs Predicted Test Set Line Chart */}
                      {evalData.demandForecast.testPredictions && evalData.demandForecast.testPredictions.length > 0 && (
                        <div className="glass-floating-panel rounded-2xl p-6 space-y-4 shadow-2xl border border-[#168CFF]/30">
                          <div className="flex justify-between items-center border-b border-[#168CFF]/20 pb-3">
                            <div>
                              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                                Actual vs. Predicted Demand (Untouched Test Set)
                              </h3>
                              <p className="text-xs text-[#526A7E]">
                                Evaluated on {evalData.demandForecast.testPredictions.length} unseen holdout daily test observations ({evalData.demandForecast.testPeriod.startDate} to {evalData.demandForecast.testPeriod.endDate}).
                              </p>
                            </div>
                            <div className="flex items-center space-x-4 text-xs">
                              <span className="flex items-center space-x-1.5 text-white">
                                <span className="w-3 h-0.5 bg-white inline-block"></span>
                                <span>Actual Demand</span>
                              </span>
                              <span className="flex items-center space-x-1.5 text-[#10B981]">
                                <span className="w-3 h-0.5 bg-[#10B981] inline-block"></span>
                                <span>Random Forest</span>
                              </span>
                              <span className="flex items-center space-x-1.5 text-[#526A7E]">
                                <span className="w-3 h-0.5 border-t border-dashed border-[#526A7E] inline-block"></span>
                                <span>Moving Avg Baseline</span>
                              </span>
                            </div>
                          </div>

                          <div className="h-64 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={evalData.demandForecast.testPredictions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#08243A" vertical={false} />
                                <XAxis dataKey="date" stroke="#526A7E" tick={{ fill: '#526A7E', fontSize: 10 }} />
                                <YAxis stroke="#526A7E" tick={{ fill: '#526A7E', fontSize: 10 }} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#030A12', borderColor: '#168CFF', borderRadius: '12px', color: '#FFF', fontSize: '11px' }}
                                />
                                <Line type="monotone" dataKey="actual_demand" name="Actual Demand" stroke="#FFFFFF" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="predicted_demand" name="Random Forest" stroke="#10B981" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="baseline_demand" name="Moving Avg Baseline" stroke="#526A7E" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Feature Importance Breakdown */}
                      <div className="glass-floating-panel rounded-2xl p-6 space-y-4 shadow-2xl border border-[#168CFF]/30">
                        <div className="border-b border-[#168CFF]/20 pb-3">
                          <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                            Gini Feature Importance Breakdown
                          </h3>
                          <p className="text-xs text-[#526A7E]">
                            Contribution percentage of each engineered time-series feature towards Random Forest decision tree splits.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          {evalData.demandForecast.featureImportance.map((fi, idx) => (
                            <div key={idx} className="bg-[#030A12] p-3.5 rounded-xl border border-[#08243A] space-y-1.5 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-mono font-bold text-white">{fi.feature}</span>
                                <span className="font-mono font-bold text-[#42D9FF]">{fi.importancePct}%</span>
                              </div>
                              <div className="w-full h-2 bg-[#08243A] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#168CFF] to-[#42D9FF] rounded-full" style={{ width: `${Math.max(2, fi.importancePct)}%` }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ground Truth Disclosures for Other Models */}
                      <div className="space-y-4 pt-2">
                        <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
                          <ShieldAlert className="h-4 w-4 text-[#F59E0B]" />
                          <span>System Model Evaluation Disclosures</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {evalData.otherModels.map((m, idx) => (
                            <div key={idx} className="glass-floating-panel p-4 rounded-xl border border-[#08243A] space-y-2 text-xs">
                              <span className="font-bold text-white block">{m.modelName}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-block ${
                                m.status.includes('unavailable') ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40' : 'bg-[#168CFF]/20 text-[#42D9FF] border border-[#168CFF]/40'
                              }`}>
                                {m.status}
                              </span>
                              <p className="text-[11px] text-[#526A7E] leading-relaxed pt-1">
                                {m.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-16 text-center text-xs text-[#EF4444]">
                      Failed to load model evaluation data. Please ensure the backend dev server is running.
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>

      </div>
    </div>
  );
}
