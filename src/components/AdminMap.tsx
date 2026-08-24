import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { UploadedReport, WaterPrediction, WaterStation } from '../types';
import { MapPin, Layers, ShieldAlert, CheckCircle, Activity } from 'lucide-react';

interface AdminMapProps {
  reports: UploadedReport[];
  predictions: WaterPrediction[];
  stations?: WaterStation[];
}

export default function AdminMap({ reports, predictions, stations = [] }: AdminMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapType, setMapType] = useState<'markers' | 'heatmap'>('markers');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Bangalore area
      const map = L.map(mapContainerRef.current).setView([12.9716, 77.5946], 11);

      // CartoDB Dark All tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    if (mapType === 'markers') {
      // 1. Render Water Monitoring Stations on GIS Map (Cyan Markers)
      stations.forEach((st) => {
        if (st.latitude && st.longitude) {
          const stationColor = st.source === 'USGS' ? '#168CFF' : '#42D9FF';

          const stationIcon = L.divIcon({
            className: 'custom-station-marker',
            html: `<div style="background-color: ${stationColor}; width: 16px; height: 16px; border-radius: 4px; border: 2px solid #FFFFFF; box-shadow: 0 0 12px ${stationColor};"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const marker = L.marker([st.latitude, st.longitude], { icon: stationIcon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px; color: #EAF6FF; max-width: 220px;">
              <strong style="color: #42D9FF; font-size: 13px; display: block; margin-bottom: 2px;">${st.name}</strong>
              <span style="font-size: 10px; color: #526A7E;">Source: ${st.source} ${st.isDemonstration ? '(Demo Baseline)' : '(Live Observation)'}</span>
              <p style="font-size: 11px; margin-top: 4px; line-height: 1.3;">WQI Score: <strong style="color: #10B981;">${st.wqi}/100</strong></p>
              <p style="font-size: 11px; line-height: 1.3;">Inflow Streamflow: <strong>${st.parameters?.inflowMLD || 'N/A'} MLD</strong></p>
              <span style="display: inline-block; font-size: 9px; font-weight: bold; margin-top: 4px; text-transform: uppercase; color: #10B981;">Freshness: ${st.freshnessLabel || st.freshnessStatus}</span>
            </div>
          `);
        }
      });

      // 2. Render Citizen Incident Reports on GIS Map (Status-colored Pins)
      reports.forEach((rep) => {
        if (rep.latitude && rep.longitude) {
          let statusColor = '#F59E0B'; // Pending = Amber
          if (rep.status === 'Resolved' || rep.status === 'resolved') statusColor = '#10B981'; // Resolved = Green
          if (rep.status === 'Under Investigation' || rep.status === 'reviewed') statusColor = '#168CFF'; // Investigation = Electric Blue
          if (rep.status === 'Rejected') statusColor = '#EF4444'; // Red

          const customIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div style="background-color: ${statusColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #000000; box-shadow: 0 0 10px ${statusColor};"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          const marker = L.marker([rep.latitude, rep.longitude], { icon: customIcon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px; color: #EAF6FF; max-width: 200px;">
              <strong style="color: #42D9FF; font-size: 12px; display: block; margin-bottom: 2px;">${rep.title}</strong>
              <span style="font-size: 10px; color: #526A7E;">Filed by: ${rep.userEmail}</span>
              <p style="font-size: 11px; margin-top: 4px; line-height: 1.3;">"${rep.description.substring(0, 70)}..."</p>
              <span style="display: inline-block; font-size: 9px; font-weight: bold; margin-top: 4px; text-transform: uppercase; color: ${statusColor};">Status: ${rep.status}</span>
            </div>
          `);
        }
      });
    } else {
      // Risk Zones Circle Overlay Presentation
      reports.forEach((rep) => {
        if (rep.latitude && rep.longitude) {
          L.circle([rep.latitude, rep.longitude], {
            color: '#168CFF',
            fillColor: '#42D9FF',
            fillOpacity: 0.35,
            radius: 1200
          }).addTo(map);
        }
      });

      stations.forEach((st) => {
        if (st.latitude && st.longitude) {
          L.circle([st.latitude, st.longitude], {
            color: '#10B981',
            fillColor: '#10B981',
            fillOpacity: 0.25,
            radius: 1800
          }).addTo(map);
        }
      });
    }

  }, [reports, predictions, stations, mapType]);

  return (
    <div className="bg-[#06111C] border border-[#08243A] rounded-2xl p-5 space-y-4 shadow-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#08243A] pb-3">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-[#42D9FF]" />
          <h3 className="font-sans font-bold text-base text-white">Water Intelligence GIS Map</h3>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2 bg-[#03070B] border border-[#08243A] p-1 rounded-xl text-xs">
          <button
            onClick={() => setMapType('markers')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${mapType === 'markers' ? 'bg-[#08243A] text-[#42D9FF]' : 'text-[#526A7E]'}`}
          >
            Incident & Station Pins
          </button>
          <button
            onClick={() => setMapType('heatmap')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${mapType === 'heatmap' ? 'bg-[#08243A] text-[#42D9FF]' : 'text-[#526A7E]'}`}
          >
            Risk Zones
          </button>
        </div>
      </div>

      {/* Map Element */}
      <div className="relative rounded-xl overflow-hidden border border-[#08243A]">
        <div ref={mapContainerRef} className="h-80 sm:h-96 w-full z-10" />

        {/* Floating Legend */}
        <div className="absolute bottom-3 right-3 bg-[#06111C]/90 backdrop-blur-md border border-[#08243A] p-3 rounded-xl z-20 text-[10px] space-y-1.5 shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#42D9FF]"></span>
            <span className="text-white font-semibold">Water Monitoring Station</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]"></span>
            <span className="text-white font-semibold">Resolved Alert</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#168CFF]"></span>
            <span className="text-white font-semibold">Under Investigation</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]"></span>
            <span className="text-white font-semibold">Pending Community Alert</span>
          </div>
        </div>
      </div>
    </div>
  );
}
