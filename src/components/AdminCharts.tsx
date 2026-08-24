import { UploadedReport, WaterPrediction } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Activity } from 'lucide-react';

interface AdminChartsProps {
  reports: UploadedReport[];
  predictions: WaterPrediction[];
}

export default function AdminCharts({ reports, predictions }: AdminChartsProps) {
  // 1. Safe vs Unsafe Predictions Breakdown
  const safeCount = predictions.filter(p => p.result === 'safe').length;
  const unsafeCount = predictions.filter(p => p.result === 'unsafe').length;

  const potabilityData = [
    { name: 'Potable (Safe)', value: safeCount, color: '#10B981' },
    { name: 'Unsafe Sample', value: unsafeCount, color: '#EF4444' }
  ];

  // 2. Reports by Status Breakdown
  const pendingCount = reports.filter(r => r.status === 'Pending' || r.status === 'pending').length;
  const reviewedCount = reports.filter(r => r.status === 'Under Investigation' || r.status === 'reviewed').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved' || r.status === 'resolved').length;

  const statusData = [
    { name: 'Pending', count: pendingCount, fill: '#F59E0B' },
    { name: 'Investigating', count: reviewedCount, fill: '#168CFF' },
    { name: 'Resolved', count: resolvedCount, fill: '#10B981' }
  ];

  // 3. Top Locations Breakdown
  const locationMap: Record<string, number> = {};
  reports.forEach(r => {
    const loc = r.location || 'Yelahanka';
    locationMap[loc] = (locationMap[loc] || 0) + 1;
  });

  const locationData = Object.keys(locationMap).map(loc => ({
    name: loc.length > 12 ? `${loc.substring(0, 12)}...` : loc,
    reports: locationMap[loc]
  })).slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      {/* 1. Potability Pie Breakdown */}
      <div className="bg-[#06111C] border border-[#08243A] p-5 rounded-2xl space-y-4 shadow-2xl">
        <div className="flex items-center space-x-2 border-b border-[#08243A] pb-3">
          <PieIcon className="h-5 w-5 text-[#42D9FF]" />
          <h3 className="font-sans font-bold text-sm text-white">Chemical Verdict Ratio</h3>
        </div>

        <div className="h-56 w-full flex items-center justify-center">
          {predictions.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={potabilityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {potabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#06111C', 
                    borderColor: '#08243A', 
                    borderRadius: '0.5rem', 
                    color: '#EAF6FF',
                    fontSize: '12px' 
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <span className="text-xs text-[#526A7E]">No prediction logs available.</span>
          )}
        </div>

        <div className="flex justify-center space-x-4 text-xs font-semibold">
          <span className="text-[#10B981]">Safe: {safeCount}</span>
          <span className="text-[#EF4444]">Unsafe: {unsafeCount}</span>
        </div>
      </div>

      {/* 2. Safeguard Reports by Status */}
      <div className="bg-[#06111C] border border-[#08243A] p-5 rounded-2xl space-y-4 shadow-2xl">
        <div className="flex items-center space-x-2 border-b border-[#08243A] pb-3">
          <BarChart3 className="h-5 w-5 text-[#168CFF]" />
          <h3 className="font-sans font-bold text-sm text-white">Incident Reports by Status</h3>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#08243A" vertical={false} />
              <XAxis dataKey="name" stroke="#526A7E" fontSize={11} tickLine={false} />
              <YAxis stroke="#526A7E" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#06111C', 
                  borderColor: '#08243A', 
                  borderRadius: '0.5rem', 
                  color: '#EAF6FF',
                  fontSize: '12px' 
                }} 
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Top Reported Locations */}
      <div className="bg-[#06111C] border border-[#08243A] p-5 rounded-2xl space-y-4 shadow-2xl">
        <div className="flex items-center space-x-2 border-b border-[#08243A] pb-3">
          <Activity className="h-5 w-5 text-[#42D9FF]" />
          <h3 className="font-sans font-bold text-sm text-white">Most Affected Watersheds</h3>
        </div>

        <div className="h-56 w-full">
          {locationData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#08243A" horizontal={false} />
                <XAxis type="number" stroke="#526A7E" fontSize={11} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#526A7E" fontSize={10} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#06111C', 
                    borderColor: '#08243A', 
                    borderRadius: '0.5rem', 
                    color: '#EAF6FF',
                    fontSize: '12px' 
                  }} 
                />
                <Bar dataKey="reports" fill="#168CFF" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#526A7E]">
              No location alerts tracked.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
