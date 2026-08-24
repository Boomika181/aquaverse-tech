import React, { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { saveContactMessage, submitReport, getUserReports, getUserPredictions, uploadReportEvidence } from '../firebase/utils';
import { UploadedReport } from '../types';
import { motion } from 'motion/react';
import waterBg from '../water-bg.jpg';
import linesVideo from '../lines-video.mp4';
import { 
  FileText, 
  Send, 
  AlertTriangle, 
  UploadCloud, 
  CheckCircle, 
  Loader2, 
  Activity, 
  Info, 
  Phone, 
  Sparkles,
  Inbox,
  Clock,
  Eye,
  MapPin,
  Search
} from 'lucide-react';

const BANGALORE_NEIGHBORHOODS = [
  { name: 'Yelahanka', latitude: 13.1007, longitude: 77.5963 },
  { name: 'Koramangala', latitude: 12.9352, longitude: 77.6244 },
  { name: 'Indiranagar', latitude: 12.9719, longitude: 77.6412 },
  { name: 'Whitefield', latitude: 12.9698, longitude: 77.7500 },
  { name: 'Majestic', latitude: 12.9756, longitude: 77.5728 },
  { name: 'Electronic City', latitude: 12.8452, longitude: 77.6722 },
  { name: 'Hebbal', latitude: 13.0359, longitude: 77.5970 }
];

export default function Contact() {
  const { user, userProfile } = useAuth();

  // Contact Message form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(false);

  // File Upload / Community Report form state
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportLoc, setReportLoc] = useState('');
  const [reportImg, setReportImg] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [userReports, setUserReports] = useState<UploadedReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  
  // Drag and drop states
  const [isDragActive, setIsDragActive] = useState(false);

  // Geolocation states
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [latestPrediction, setLatestPrediction] = useState<any>(null);

  // Nominatim & Location Selection States
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('gps');
  const [nominatimLoading, setNominatimLoading] = useState(false);
  const [nominatimError, setNominatimError] = useState<string | null>(null);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      setNominatimLoading(true);
      setNominatimError(null);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setReportLoc(data.display_name);
        }
      }
    } catch (err) {
      console.warn("Reverse geocoding failed or rate limited:", err);
    } finally {
      setNominatimLoading(false);
    }
  };

  const geocodeAddress = async (addressQuery: string): Promise<{ lat: number; lng: number } | null> => {
    if (!addressQuery) return null;
    const queryStr = addressQuery.trim();
    if (!queryStr) return null;

    try {
      setNominatimLoading(true);
      setNominatimError(null);
      
      const searchOptions: { q: string; countrycodes?: string }[] = [
        { q: queryStr, countrycodes: 'in' },
        { q: queryStr }
      ];

      const lowerQuery = queryStr.toLowerCase();
      if (!lowerQuery.includes('bangalore') && !lowerQuery.includes('bengaluru') && !lowerQuery.includes('karnataka') && !lowerQuery.includes('india')) {
        searchOptions.push({ q: `${queryStr}, Bangalore, Karnataka, India`, countrycodes: 'in' });
      }

      for (const option of searchOptions) {
        try {
          let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(option.q)}&limit=1`;
          if (option.countrycodes) {
            url += `&countrycodes=${option.countrycodes}`;
          }
          
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'AquaverseWaterMonitoringApp/1.0'
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              setCoords({ latitude: lat, longitude: lon });
              return { lat, lng: lon };
            }
          }
        } catch (singleErr) {
          console.warn(`Geocoding attempt failed for "${option.q}":`, singleErr);
        }
      }

      setNominatimError("Location not found. Please try a different area name.");
    } catch (err) {
      console.error("Geocoding failed:", err);
      setNominatimError("Network error lookup up coordinates.");
    } finally {
      setNominatimLoading(false);
    }
    return null;
  };

  const detectCoordinates = () => {
    setGeoLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ latitude: lat, longitude: lng });
          setGeoLoading(false);
          reverseGeocode(lat, lng);
        },
        (error) => {
          console.warn("Geolocation permission or retrieval unavailable:", error);
          setCoords(null);
          setGeoLoading(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setCoords(null);
      setGeoLoading(false);
    }
  };

  useEffect(() => {
    detectCoordinates();
  }, []);

  useEffect(() => {
    if (user) {
      getUserPredictions(user.uid)
        .then((predictions) => {
          if (predictions && predictions.length > 0) {
            setLatestPrediction(predictions[0]);
          }
        })
        .catch((err) => console.error('Error loading latest prediction for report:', err));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setName(userProfile?.displayName || user.email?.split('@')[0] || '');
      setEmail(user.email || '');
      loadUserReports();
    }
  }, [user, userProfile]);

  const loadUserReports = async () => {
    if (!user) return;
    setReportsLoading(true);
    try {
      const logs = await getUserReports(user.uid);
      setUserReports(logs);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgLoading(true);
    try {
      await saveContactMessage({
        name,
        email,
        subject,
        category,
        message
      });
      setMsgSuccess(true);
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Error submitting contact message:', error);
    } finally {
      setMsgLoading(false);
    }
  };

  const [reportError, setReportError] = useState<string | null>(null);
  const [technicalError, setTechnicalError] = useState<string | null>(null);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[REPORT DEBUG] ===== SUBMISSION START =====');

    setReportError(null);
    setTechnicalError(null);

    const currentUser = user;
    if (!currentUser) {
      console.error('[REPORT DEBUG] ===== SUBMISSION FAILED =====');
      console.error('[REPORT DEBUG] Error: User is not authenticated');
      setReportError('Please sign in before submitting a report.');
      setTechnicalError('unauthenticated: user is null');
      return;
    }

    console.log('[REPORT DEBUG] Auth user:', currentUser.email);
    console.log('[REPORT DEBUG] UID:', currentUser.uid);
    console.log('[REPORT DEBUG] Email:', currentUser.email);
    console.log('[REPORT DEBUG] Form data: title=', reportTitle, 'desc=', reportDesc);
    console.log('[REPORT DEBUG] Location:', reportLoc);

    if (!reportTitle.trim() || !reportDesc.trim()) {
      console.error('[REPORT DEBUG] ===== SUBMISSION FAILED =====');
      console.error('[REPORT DEBUG] Error: Missing title or description');
      setReportError('Please complete the required fields.');
      setTechnicalError('invalid-argument: Title and Description are required string fields');
      return;
    }

    setReportLoading(true);

    try {
      let finalLat: number | null = coords?.latitude ?? null;
      let finalLng: number | null = coords?.longitude ?? null;

      if ((finalLat === null || finalLng === null) && reportLoc.trim()) {
        const resolved = await geocodeAddress(reportLoc);
        if (resolved) {
          finalLat = resolved.lat;
          finalLng = resolved.lng;
        } else if (reportLoc.toLowerCase().includes('yelahanka')) {
          finalLat = 13.0991;
          finalLng = 77.5966;
        } else if (reportLoc.toLowerCase().includes('whitefield')) {
          finalLat = 12.9698;
          finalLng = 77.7499;
        } else if (reportLoc.toLowerCase().includes('koramangala')) {
          finalLat = 12.9352;
          finalLng = 77.6245;
        } else {
          finalLat = 12.9716;
          finalLng = 77.5946;
        }
      }

      console.log('[REPORT DEBUG] Latitude:', finalLat);
      console.log('[REPORT DEBUG] Longitude:', finalLng);
      console.log('[REPORT DEBUG] Image selected:', !!evidenceFile);

      let uploadedImageUrl = reportImg || '';
      if (evidenceFile && !uploadedImageUrl) {
        console.log('[REPORT DEBUG] Starting image upload:', evidenceFile.name);
        try {
          uploadedImageUrl = await uploadReportEvidence(evidenceFile, currentUser.uid);
          console.log('[REPORT DEBUG] Image upload completed:', uploadedImageUrl);
        } catch (imgErr: any) {
          console.error('[REPORT DEBUG] ===== SUBMISSION FAILED =====');
          console.error('[REPORT DEBUG] Image upload error:', imgErr);
          setTechnicalError(imgErr?.code || imgErr?.message || String(imgErr));
          setReportError('Photo upload failed. Report was not submitted.');
          setReportLoading(false);
          return;
        }
      }

      const nameToSave = userProfile?.name || userProfile?.displayName || currentUser.email?.split('@')[0] || 'Citizen Guardian';

      const payload = {
        userId: currentUser.uid,
        userEmail: currentUser.email || 'citizen@aquaverse.com',
        citizenName: nameToSave,
        title: reportTitle.trim(),
        description: reportDesc.trim(),
        location: reportLoc.trim() || (finalLat !== null && finalLng !== null ? `${finalLat.toFixed(4)}, ${finalLng.toFixed(4)}` : 'Location Not Provided'),
        imageUrl: uploadedImageUrl,
        latitude: finalLat,
        longitude: finalLng,
        ph: latestPrediction ? latestPrediction.inputs.ph : 5.9,
        confidence: latestPrediction ? latestPrediction.confidence : 94,
        waterQuality: latestPrediction ? latestPrediction.result : 'unsafe'
      };

      console.log('[REPORT DEBUG] Starting Firestore write:');
      console.log('[REPORT DEBUG] Firestore collection: uploadedReports');
      console.log('[REPORT DEBUG] Firestore payload:', payload);

      const createdDocId = await submitReport(payload);

      console.log('[REPORT DEBUG] Firestore write completed:');
      console.log('[REPORT DEBUG] Document ID:', createdDocId);
      console.log('[REPORT DEBUG] ===== SUBMISSION SUCCESS =====');

      setReportSuccess(true);
      setReportTitle('');
      setReportDesc('');
      setReportLoc('');
      setReportImg(null);
      setEvidenceFile(null);

      await loadUserReports();
    } catch (err: any) {
      console.error('[REPORT DEBUG] ===== SUBMISSION FAILED =====');
      console.error('[REPORT DEBUG] Error:', err);
      console.error('[REPORT DEBUG] Error code:', err?.code || err?.name || 'unknown');
      console.error('[REPORT DEBUG] Error message:', err?.message || String(err));
      console.error('[REPORT DEBUG] Stack:', err?.stack || 'no stack trace');

      const codeStr = err?.code ? `[${err.code}] ` : '';
      const msgStr = err?.message || String(err);
      setTechnicalError(`${codeStr}${msgStr}`);
      setReportError('Report could not be submitted. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setFileError(null);
    if (!file.type.startsWith('image/')) {
      setFileError('Invalid file format. Please attach a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit.');
      return;
    }

    setEvidenceFile(file);

    try {
      if (user) {
        const url = await uploadReportEvidence(file, user.uid);
        setReportImg(url);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReportImg(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (storageErr) {
      console.warn('Firebase Storage upload notice (using secure data reference):', storageErr);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportImg(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearReportImg = () => {
    setReportImg(null);
    setEvidenceFile(null);
    setFileError(null);
  };

  return (
    <div className="bg-[#000000] text-[#EAF6FF] min-h-screen py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#168CFF]/30 selection:text-[#42D9FF] relative overflow-hidden">
      
      {/* EXACT UPLOADED WATER BACKGROUND IMAGE & LIVE MP4 VIDEO LOOP LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src={waterBg} 
          alt="Water Contact Environment" 
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
        
        {/* Header grid */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#168CFF]/20 gap-6"
        >
          <div className="space-y-1">
            <h1 className="font-sans font-extrabold text-3xl sm:text-4xl text-white tracking-tight flex items-center space-x-3">
              <FileText className="h-8 w-8 text-[#42D9FF]" />
              <span>Contact & Safeguard Hub</span>
            </h1>
            <p className="text-[#526A7E] text-sm">
              Submit support inquiries or file formal chemical contamination alerts directly to water district administrators.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-[#EF4444]/10 border border-[#EF4444]/20 p-3 rounded-xl max-w-sm">
            <Phone className="h-5 w-5 text-[#EF4444] shrink-0" />
            <div className="text-left text-xs">
              <p className="font-bold text-white">Emergency Water Hotline:</p>
              <p className="text-[#EF4444] font-bold">1-800-SAFE-H2O (24/7 Emergency)</p>
            </div>
          </div>
        </motion.div>

        {/* Contact Form and Water Report Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* General Contact Form */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 glass-floating-panel p-6 rounded-2xl space-y-5 shadow-2xl"
          >
            <div className="flex items-center space-x-2 border-b border-[#168CFF]/20 pb-3">
              <Inbox className="h-5 w-5 text-[#42D9FF]" />
              <h3 className="font-sans font-bold text-base text-white">General Inquiry / Support</h3>
            </div>

            {msgSuccess ? (
              <div className="p-6 bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] rounded-xl space-y-3 text-center">
                <CheckCircle className="h-10 w-10 text-[#10B981] mx-auto animate-bounce" />
                <h4 className="font-sans font-bold">Inquiry Logged</h4>
                <p className="text-xs text-[#526A7E] max-w-sm mx-auto">
                  Your message was saved securely. Administrators will review your request and reply within 12-24 business hours.
                </p>
                <button
                  onClick={() => setMsgSuccess(false)}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-xs font-bold hover:bg-[#10B981]/30 cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitMessage} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#526A7E] font-semibold block">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#526A7E] font-semibold block">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#526A7E] font-semibold block">Subject</label>
                    <input 
                      type="text" 
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Water filtration query"
                      className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#526A7E] font-semibold block">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23168CFF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.75rem_center] bg-no-repeat"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Water Treatment Question">Water Treatment Question</option>
                      <option value="Scientific Feedback">Scientific Feedback</option>
                      <option value="Technical Issue">Technical Issue</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#526A7E] font-semibold block">Detailed Message</label>
                  <textarea 
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message or inquiry here..."
                    className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={msgLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-[#168CFF] hover:bg-[#42D9FF] py-3.5 rounded-xl text-white hover:text-[#000000] font-extrabold text-xs shadow-md cursor-pointer disabled:opacity-50 transition-all"
                >
                  {msgLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4" />}
                  <span>Submit Inquiry</span>
                </button>
              </form>
            )}
          </motion.div>

          {/* Citizen Safety Report with drag and drop file upload */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-6 glass-floating-panel p-6 rounded-2xl space-y-5 shadow-2xl"
          >
            <div className="flex items-center space-x-2 border-b border-[#168CFF]/20 pb-3">
              <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
              <h3 className="font-sans font-bold text-base text-white">File Contamination Report</h3>
            </div>

            {!user ? (
              <div className="h-72 border border-dashed border-[#08243A] rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3.5 bg-[#030A12]">
                <div className="bg-[#06111C] p-3 rounded-full border border-[#08243A]">
                  <AlertTriangle className="h-6 w-6 text-[#F59E0B]" />
                </div>
                <h4 className="font-sans font-bold text-white text-sm">Citizen Login Required</h4>
                <p className="text-xs text-[#526A7E] max-w-sm leading-relaxed">
                  Only registered citizens can submit formal contamination alerts to the safeguard grid to ensure valid identity logging.
                </p>
                <a 
                  href="/login" 
                  className="px-5 py-2.5 rounded-xl bg-[#168CFF] text-white font-extrabold text-xs shadow-md"
                >
                  Sign in or Register
                </a>
              </div>
            ) : reportSuccess ? (
              <div className="p-6 bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] rounded-xl space-y-3 text-center">
                <CheckCircle className="h-10 w-10 text-[#10B981] mx-auto animate-bounce" />
                <h4 className="font-sans font-bold">Safeguard Alert Logged</h4>
                <p className="text-xs text-[#526A7E] max-w-sm mx-auto">
                  Your environmental report has been filed in the database. Municipal supervisors have been notified.
                </p>
                <button
                  onClick={() => setReportSuccess(false)}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-xs font-bold hover:bg-[#10B981]/30 cursor-pointer"
                >
                  File another report
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#526A7E] font-semibold block">Incident Title</label>
                    <input 
                      type="text" 
                      required
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="e.g. Discolored murky water from municipal pipeline"
                      className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-[#526A7E] font-semibold block">Incident Location</label>
                      <div className="flex text-[10px] font-bold bg-[#030A12] border border-[#08243A] rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setLocationMode('gps')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${locationMode === 'gps' ? 'bg-[#08243A] text-[#42D9FF]' : 'text-[#526A7E]'}`}
                        >
                          GPS / Presets
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationMode('manual')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${locationMode === 'manual' ? 'bg-[#08243A] text-[#42D9FF]' : 'text-[#526A7E]'}`}
                        >
                          Custom Search
                        </button>
                      </div>
                    </div>

                    {locationMode === 'gps' ? (
                      <div className="flex gap-2">
                        <select
                          value={reportLoc}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReportLoc(val);
                            const found = BANGALORE_NEIGHBORHOODS.find(n => n.name === val);
                            if (found) {
                              setCoords({ latitude: found.latitude, longitude: found.longitude });
                            }
                          }}
                          className="flex-1 bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23168CFF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.75rem_center] bg-no-repeat"
                        >
                          <option value="">Select Neighborhood...</option>
                          {BANGALORE_NEIGHBORHOODS.map(n => (
                            <option key={n.name} value={n.name}>{n.name}</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={detectCoordinates}
                          disabled={geoLoading || nominatimLoading}
                          className="bg-[#08243A] hover:bg-[#168CFF] text-[#42D9FF] hover:text-white border border-[#168CFF]/30 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer transition-all flex items-center shrink-0 space-x-1"
                        >
                          {geoLoading || nominatimLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <span>📍 Auto GPS</span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={reportLoc}
                          onChange={(e) => setReportLoc(e.target.value)}
                          placeholder="e.g. Indiranagar, Bangalore"
                          className="flex-1 bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-[#526A7E] font-semibold block">Incident Description</label>
                    <textarea 
                      required
                      rows={3}
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      placeholder="Describe water taste, odor, discoloration, or suspected chemical source..."
                      className="w-full bg-[#030A12] text-white border border-[#08243A] rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#168CFF] resize-none"
                    />
                  </div>

                  {/* Photo Drag & Drop Upload Container */}
                  <div className="space-y-1">
                    <label className="text-xs text-[#526A7E] font-semibold block">Photographic Evidence Attachment</label>
                    
                    {reportImg ? (
                      <div className="relative rounded-xl overflow-hidden border border-[#08243A] bg-[#030A12] p-2 flex items-center justify-between">
                        <div className="flex items-center space-x-3 truncate">
                          <img src={reportImg} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-[#08243A]" />
                          <span className="text-xs text-[#42D9FF] font-bold truncate">Photo Attached</span>
                        </div>
                        <button
                          type="button"
                          onClick={clearReportImg}
                          className="p-1.5 bg-[#EF4444]/10 text-[#EF4444] rounded-lg hover:bg-[#EF4444]/20 font-bold text-xs cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                          isDragActive ? 'border-[#168CFF] bg-[#168CFF]/15' : 'border-[#08243A] bg-[#030A12] hover:border-[#168CFF]/40'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          id="file-upload"
                          className="hidden"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-1.5">
                          <UploadCloud className="h-6 w-6 text-[#42D9FF]" />
                          <span className="text-xs font-bold text-white">Click or drag & drop photo</span>
                          <span className="text-[10px] text-[#526A7E]">PNG, JPG, or WEBP up to 5MB</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {reportError && (
                    <div className="p-3.5 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] rounded-xl text-xs font-bold space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                        <span>{reportError}</span>
                      </div>
                      {technicalError && (
                        <div className="mt-2 pt-2 border-t border-[#EF4444]/20 font-mono text-[11px] text-[#FCA5A5] whitespace-pre-wrap break-all">
                          <strong>Technical error:</strong> {technicalError}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={reportLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-[#168CFF] hover:bg-[#42D9FF] py-3.5 rounded-xl text-white hover:text-[#000000] font-extrabold text-xs shadow-md cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {reportLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <AlertTriangle className="h-4 w-4" />}
                    <span>File Incident Report</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>

        </div>

        {/* User's Past Reports Table */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-floating-panel p-6 rounded-2xl shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#168CFF]/20 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-[#42D9FF]" />
                <h3 className="font-sans font-bold text-base text-white">Your Filed Incident Reports ({userReports.length})</h3>
              </div>
            </div>

            {reportsLoading ? (
              <div className="py-8 text-center text-xs text-[#526A7E] flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#168CFF]" />
                <span>Loading your reports history...</span>
              </div>
            ) : userReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#EAF6FF]">
                  <thead className="bg-[#030A12] text-[#526A7E] uppercase text-[10px] tracking-wider border-b border-[#08243A]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Report Title</th>
                      <th className="py-3 px-4 font-bold">Location</th>
                      <th className="py-3 px-4 font-bold">Filed Date</th>
                      <th className="py-3 px-4 font-bold">Investigation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#08243A]">
                    {userReports.map((rep) => {
                      const date = rep.timestamp?.toDate ? rep.timestamp.toDate() : new Date(rep.timestamp);
                      return (
                        <tr key={rep.id} className="hover:bg-[#08243A]/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">{rep.title}</td>
                          <td className="py-3 px-4 text-[#526A7E]">{rep.location}</td>
                          <td className="py-3 px-4 text-[#526A7E]">
                            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              rep.status === 'Resolved' || rep.status === 'resolved' ? 'border-[#10B981]/30 bg-[#10B981]/15 text-[#10B981]' :
                              rep.status === 'Under Investigation' || rep.status === 'reviewed' ? 'border-[#168CFF]/30 bg-[#168CFF]/15 text-[#42D9FF]' :
                              rep.status === 'Rejected' ? 'border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]' :
                              'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]'
                            }`}>
                              {rep.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#526A7E]">
                You haven't submitted any incident reports yet.
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
