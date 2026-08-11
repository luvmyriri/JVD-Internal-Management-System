import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LuMapPin, LuCompass, LuSearch, LuX, LuRefreshCw, LuRepeat } from 'react-icons/lu';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface RoutePinLocation {
  name: string;
  lat: number;
  lng: number;
}

interface TripLocationMapPickerProps {
  pickupLocation?: string;
  dropOffLocation?: string;
  initialPickupCoords?: [number, number];
  initialDropoffCoords?: [number, number];
  vehicleType?: 'Bus' | 'Coaster' | 'Van';
  fuelPricePerLiter?: number;
  readOnly?: boolean;
  onLocationSelect?: (
    pickup: string,
    dropoff: string,
    distanceKm: number,
    dieselLiters: number,
    dieselCost: number,
    pickupCoords?: [number, number],
    dropoffCoords?: [number, number]
  ) => void;
}

const PH_LOCATIONS_DATABASE: Array<{ display_name: string; lat: string; lon: string }> = [
  { display_name: 'Manila Hub (Pasay Bus Terminal, Metro Manila)', lat: '14.5378', lon: '120.9992' },
  { display_name: 'Cubao Bus Terminal (Quezon City, Metro Manila)', lat: '14.6195', lon: '121.0511' },
  { display_name: 'PITX Terminal (Parañaque Integrated Terminal Exchange)', lat: '14.5105', lon: '120.9904' },
  { display_name: 'NAIA Airport Terminal 3 (Pasay City)', lat: '14.5204', lon: '121.0153' },
  { display_name: 'Tagaytay City (Taal Lake Overview, Cavite)', lat: '14.1153', lon: '120.9621' },
  { display_name: 'Baguio City (Session Road / Burnham Park, Benguet)', lat: '16.4023', lon: '120.5960' },
  { display_name: 'Subic Bay Freeport Zone (Zambales)', lat: '14.8219', lon: '120.2831' },
  { display_name: 'Batangas Port Passenger Terminal (Batangas City)', lat: '13.7565', lon: '121.0583' },
  { display_name: 'Sagada Mountain Province (Echo Valley)', lat: '17.0811', lon: '120.9014' },
  { display_name: 'La Union (San Juan Surf Beach)', lat: '16.6644', lon: '120.3206' },
  { display_name: 'Clark Freeport Zone (Angeles, Pampanga)', lat: '15.1855', lon: '120.5408' },
  { display_name: 'Vigan Historic City (Calle Crisologo, Ilocos Sur)', lat: '17.5747', lon: '120.3869' },
  { display_name: 'Laoag City (Ilocos Norte)', lat: '18.1960', lon: '120.5927' },
  { display_name: 'Legazpi City (Mayon Volcano View, Albay)', lat: '13.1391', lon: '123.7438' },
  { display_name: 'Naga City (Camarines Sur)', lat: '13.6218', lon: '123.1948' },
  { display_name: 'Lucena City (Quezon Province)', lat: '13.9372', lon: '121.6169' },
  { display_name: 'Puerto Galera (Mindoro)', lat: '13.5008', lon: '120.9540' },
  { display_name: 'Calapan Port (Oriental Mindoro)', lat: '13.4243', lon: '121.1872' },
  { display_name: 'San Fernando (Pampanga)', lat: '15.0333', lon: '120.6833' },
  { display_name: 'Tarlac City (Tarlac)', lat: '15.4802', lon: '120.5979' },
  { display_name: 'Cabanatuan City (Nueva Ecija)', lat: '15.4863', lon: '120.9678' },
  { display_name: 'Olongapo City (Zambales)', lat: '14.8386', lon: '120.2842' },
  { display_name: 'Baler (Aurora Province)', lat: '15.7592', lon: '121.5615' },
  { display_name: 'Banaue Rice Terraces (Ifugao)', lat: '16.9133', lon: '121.0583' },
];

const PRESET_ROUTES: Array<{
  pickup: RoutePinLocation;
  destination: RoutePinLocation;
  distanceKm: number;
}> = [
  {
    pickup: { name: 'Manila Hub (Pasay Terminal)', lat: 14.5378, lng: 120.9992 },
    destination: { name: 'Tagaytay City (Taal View)', lat: 14.1153, lng: 120.9621 },
    distanceKm: 65,
  },
  {
    pickup: { name: 'Manila Hub (Pasay Terminal)', lat: 14.5378, lng: 120.9992 },
    destination: { name: 'Baguio City (Session Road)', lat: 16.4023, lng: 120.596 },
    distanceKm: 245,
  },
  {
    pickup: { name: 'Manila Hub (Pasay Terminal)', lat: 14.5378, lng: 120.9992 },
    destination: { name: 'Subic Bay Freeport Zone', lat: 14.8219, lng: 120.2831 },
    distanceKm: 135,
  },
  {
    pickup: { name: 'Manila Hub (Pasay Terminal)', lat: 14.5378, lng: 120.9992 },
    destination: { name: 'Batangas Port (Pier)', lat: 13.7565, lng: 121.0583 },
    distanceKm: 110,
  },
  {
    pickup: { name: 'Manila Hub (Pasay Terminal)', lat: 14.5378, lng: 120.9992 },
    destination: { name: 'Sagada Mountain Province', lat: 17.0811, lng: 120.9014 },
    distanceKm: 390,
  },
];

export default function TripLocationMapPicker({
  pickupLocation = '',
  dropOffLocation = '',
  initialPickupCoords,
  initialDropoffCoords,
  vehicleType = 'Bus',
  fuelPricePerLiter = 68.5,
  readOnly = false,
  onLocationSelect,
}: TripLocationMapPickerProps) {
  const [pickupName, setPickupName] = useState(pickupLocation);
  const [dropoffName, setDropoffName] = useState(dropOffLocation);
  const [pickupCoord, setPickupCoord] = useState<[number, number]>(
    initialPickupCoords || [14.5378, 120.9992]
  );
  const [dropoffCoord, setDropoffCoord] = useState<[number, number]>(
    initialDropoffCoords || [14.1153, 120.9621]
  );

  useEffect(() => {
    if (initialPickupCoords && (initialPickupCoords[0] !== pickupCoord[0] || initialPickupCoords[1] !== pickupCoord[1])) {
      setPickupCoord(initialPickupCoords);
      if (markersRef.current[0]) {
        markersRef.current[0].setLatLng(initialPickupCoords);
      }
    }
  }, [initialPickupCoords]);

  useEffect(() => {
    if (initialDropoffCoords && (initialDropoffCoords[0] !== dropoffCoord[0] || initialDropoffCoords[1] !== dropoffCoord[1])) {
      setDropoffCoord(initialDropoffCoords);
      if (markersRef.current[1]) {
        markersRef.current[1].setLatLng(initialDropoffCoords);
      }
    }
  }, [initialDropoffCoords]);

  const geocodeLocation = async (query: string): Promise<[number, number] | null> => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const match = PH_LOCATIONS_DATABASE.find((loc) =>
      loc.display_name.toLowerCase().includes(q) ||
      q.includes(loc.display_name.split(' ')[0].toLowerCase())
    );
    if (match) {
      return [parseFloat(match.lat), parseFloat(match.lon)];
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Philippines')}&limit=1`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch {
      // ignore network errors
    }
    return null;
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      let pCoord = pickupCoord;
      let dCoord = dropoffCoord;
      let pChanged = false;
      let dChanged = false;

      if (pickupLocation && pickupLocation.trim()) {
        const found = await geocodeLocation(pickupLocation);
        if (found && (Math.abs(found[0] - pickupCoord[0]) > 0.001 || Math.abs(found[1] - pickupCoord[1]) > 0.001)) {
          pCoord = found;
          pChanged = true;
        }
      }

      if (dropOffLocation && dropOffLocation.trim()) {
        const found = await geocodeLocation(dropOffLocation);
        if (found && (Math.abs(found[0] - dropoffCoord[0]) > 0.001 || Math.abs(found[1] - dropoffCoord[1]) > 0.001)) {
          dCoord = found;
          dChanged = true;
        }
      }

      if (pChanged || dChanged) {
        setPickupName(pickupLocation);
        setDropoffName(dropOffLocation);
        setPickupCoord(pCoord);
        setDropoffCoord(dCoord);

        if (markersRef.current[0] && pChanged) {
          markersRef.current[0].setLatLng(pCoord);
        }
        if (markersRef.current[1] && dChanged) {
          markersRef.current[1].setLatLng(dCoord);
        }

        fetchOSRMRoute(pCoord[0], pCoord[1], dCoord[0], dCoord[1], pickupLocation, dropOffLocation);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [pickupLocation, dropOffLocation]);
  
  // Base 1-way distance from OSRM
  const [oneWayKm, setOneWayKm] = useState<number>(65);

  // Trip Nature Multiplier (Round Trip = 2x, Multi-Stop = 2.5x, Full Itinerary = 3x)
  const [tripMode, setTripMode] = useState<'one_way' | 'round_trip' | 'multi_stop' | 'full_itinerary'>('round_trip');

  // Editable form numbers
  const [editableKm, setEditableKm] = useState<string>('130');
  const [editableLiters, setEditableLiters] = useState<string>('23.6');
  const [editableCost, setEditableCost] = useState<string>('1617');

  const [fuelPrice, setFuelPrice] = useState<number>(fuelPricePerLiter || 60);
  const [isRouting, setIsRouting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const multiplier = useMemo(() => {
    switch (tripMode) {
      case 'one_way': return 1.0;
      case 'multi_stop': return 2.5;
      case 'full_itinerary': return 3.0;
      case 'round_trip':
      default: return 2.0;
    }
  }, [tripMode]);

  // Recalculate values whenever oneWayKm, multiplier, or fuelPrice changes
  const applyAutoCalculations = (
    baseKm: number,
    currentMultiplier: number,
    pName = pickupName,
    dName = dropoffName,
    pCoord = pickupCoord,
    dCoord = dropoffCoord,
    currentFuelPrice = fuelPrice
  ) => {
    const totalKm = Math.round(baseKm * currentMultiplier);
    // Standard tourist bus diesel consumption: Kilometers / 2.5
    const liters = Math.round((totalKm / 2.5) * 10) / 10;
    const cost = Math.round(liters * currentFuelPrice);

    setEditableKm(String(totalKm));
    setEditableLiters(String(liters));
    setEditableCost(String(cost));

    if (onLocationSelect) {
      onLocationSelect(pName, dName, totalKm, liters, cost, pCoord, dCoord);
    }
  };

  // Fetch real-time road driving route from OSRM Routing API
  const fetchOSRMRoute = async (
    pLat: number,
    pLng: number,
    dLat: number,
    dLng: number,
    pName = pickupName,
    dName = dropoffName
  ) => {
    setIsRouting(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routeDistanceKm = Math.round((route.distance / 1000) * 10) / 10;
        setOneWayKm(routeDistanceKm);
        applyAutoCalculations(routeDistanceKm, multiplier, pName, dName, [pLat, pLng], [dLat, dLng]);

        if (mapInstanceRef.current && route.geometry?.coordinates) {
          if (routeLayerRef.current) {
            mapInstanceRef.current.removeLayer(routeLayerRef.current);
          }
          const latLngs: L.LatLngExpression[] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          const polyline = L.polyline(latLngs, { color: '#f97316', weight: 5, opacity: 0.8 });
          polyline.addTo(mapInstanceRef.current);
          routeLayerRef.current = polyline;
          mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [30, 30] });
        }
      }
    } catch (err) {
      console.warn('OSRM routing fetch warning:', err);
    } finally {
      setIsRouting(false);
    }
  };

  // Handle Mode Change
  const handleModeChange = (mode: 'one_way' | 'round_trip' | 'multi_stop' | 'full_itinerary') => {
    setTripMode(mode);
    let m = 2.0;
    if (mode === 'one_way') m = 1.0;
    else if (mode === 'multi_stop') m = 2.5;
    else if (mode === 'full_itinerary') m = 3.0;
    applyAutoCalculations(oneWayKm, m);
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: pickupCoord,
      zoom: 9,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;

    const markerA = L.marker(pickupCoord, { draggable: !readOnly, title: 'Pickup Point' }).addTo(map);
    const markerB = L.marker(dropoffCoord, { draggable: !readOnly, title: 'Destination' }).addTo(map);

    markerA.bindPopup(`<b>Pickup Point</b><br/>${pickupName}`).openPopup();
    markerB.bindPopup(`<b>Destination</b><br/>${dropoffName}`);

    if (!readOnly) {
      markerA.on('dragend', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        const newPickup: [number, number] = [pos.lat, pos.lng];
        setPickupCoord(newPickup);
        fetchOSRMRoute(pos.lat, pos.lng, dropoffCoord[0], dropoffCoord[1], pickupName, dropoffName);
      });

      markerB.on('dragend', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        const newDropoff: [number, number] = [pos.lat, pos.lng];
        setDropoffCoord(newDropoff);
        fetchOSRMRoute(pickupCoord[0], pickupCoord[1], pos.lat, pos.lng, pickupName, dropoffName);
      });
    }

    markersRef.current = [markerA, markerB];
    fetchOSRMRoute(pickupCoord[0], pickupCoord[1], dropoffCoord[0], dropoffCoord[1], pickupName, dropoffName);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleSelectPreset = (route: (typeof PRESET_ROUTES)[number]) => {
    setPickupName(route.pickup.name);
    setDropoffName(route.destination.name);
    const pCoords: [number, number] = [route.pickup.lat, route.pickup.lng];
    const dCoords: [number, number] = [route.destination.lat, route.destination.lng];
    setPickupCoord(pCoords);
    setDropoffCoord(dCoords);
    setOneWayKm(route.distanceKm);

    if (mapInstanceRef.current && markersRef.current.length === 2) {
      markersRef.current[0].setLatLng(pCoords);
      markersRef.current[1].setLatLng(dCoords);
      fetchOSRMRoute(pCoords[0], pCoords[1], dCoords[0], dCoords[1], route.pickup.name, route.destination.name);
    }
  };

  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    setIsSearching(true);

    try {
      const localMatches = PH_LOCATIONS_DATABASE.filter((loc) =>
        loc.display_name.toLowerCase().includes(query)
      );

      let externalResults: any[] = [];
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
        );
        const geoData = await geoRes.json();
        if (geoData.results && Array.isArray(geoData.results)) {
          externalResults = geoData.results.map((r: any) => ({
            display_name: `${r.name}, ${r.admin1 || r.country || 'Philippines'}`,
            lat: String(r.latitude),
            lon: String(r.longitude),
          }));
        }
      } catch (err) {
        console.warn('Open-Meteo fallback warning:', err);
      }

      const combined = [...localMatches, ...externalResults];
      setSearchResults(combined.length > 0 ? combined : PH_LOCATIONS_DATABASE.slice(0, 8));
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults(PH_LOCATIONS_DATABASE.slice(0, 8));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any, type: 'pickup' | 'dropoff') => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const shortName = result.display_name.split(',')[0];

    let newPickupCoord = pickupCoord;
    let newDropoffCoord = dropoffCoord;
    let newPickupName = pickupName;
    let newDropoffName = dropoffName;

    if (type === 'pickup') {
      newPickupCoord = [lat, lng];
      newPickupName = shortName;
      setPickupName(shortName);
      setPickupCoord([lat, lng]);
      if (markersRef.current[0]) markersRef.current[0].setLatLng([lat, lng]);
    } else {
      newDropoffCoord = [lat, lng];
      newDropoffName = shortName;
      setDropoffName(shortName);
      setDropoffCoord([lat, lng]);
      if (markersRef.current[1]) markersRef.current[1].setLatLng([lat, lng]);
    }

    fetchOSRMRoute(newPickupCoord[0], newPickupCoord[1], newDropoffCoord[0], newDropoffCoord[1], newPickupName, newDropoffName);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Sync edits to parent form
  const handleInputChange = (field: 'km' | 'liters' | 'cost' | 'price', val: string) => {
    const num = parseFloat(val) || 0;
    if (field === 'km') {
      setEditableKm(val);
      const calcLiters = Math.round((num / 2.5) * 10) / 10;
      const calcCost = Math.round(calcLiters * fuelPrice);
      setEditableLiters(String(calcLiters));
      setEditableCost(String(calcCost));
      if (onLocationSelect) onLocationSelect(pickupName, dropoffName, num, calcLiters, calcCost);
    } else if (field === 'liters') {
      setEditableLiters(val);
      const calcCost = Math.round(num * fuelPrice);
      setEditableCost(String(calcCost));
      if (onLocationSelect) onLocationSelect(pickupName, dropoffName, parseFloat(editableKm) || 0, num, calcCost);
    } else if (field === 'cost') {
      setEditableCost(val);
      if (onLocationSelect) onLocationSelect(pickupName, dropoffName, parseFloat(editableKm) || 0, parseFloat(editableLiters) || 0, num);
    } else if (field === 'price') {
      setFuelPrice(num);
      const currentLiters = parseFloat(editableLiters) || 0;
      const calcCost = Math.round(currentLiters * num);
      setEditableCost(String(calcCost));
      if (onLocationSelect) onLocationSelect(pickupName, dropoffName, parseFloat(editableKm) || 0, currentLiters, calcCost);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900 space-y-4">
      {/* Map Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
            <LuCompass className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white tracking-wider">
              {readOnly ? 'Route Map Preview' : 'Interactive Map Pinning & Diesel Fuel Calculator'}
            </h4>
            <p className="text-[10px] text-gray-500 font-medium">
              OpenStreetMap + OSRM Real-Time Highway Distance & Fuel Engine
            </p>
          </div>
        </div>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 flex items-center gap-1">
          {isRouting ? <LuRefreshCw className="h-3 w-3 animate-spin" /> : <LuMapPin className="h-3 w-3" />}
          {readOnly ? 'Sales Preview' : 'OSRM Live Routing'}
        </span>
      </div>

      {/* Trip Mode & Multi-Itinerary Multiplier Selector */}
      {!readOnly && (
        <div className="space-y-1.5 bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <LuRepeat className="w-3.5 h-3.5 text-orange-500" /> Travel Nature & Itinerary Calculation:
            </label>
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">
              1-Way Base: {oneWayKm} KM
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            {[
              { id: 'one_way', label: 'One-Way (1x)', mult: '1x Distance' },
              { id: 'round_trip', label: 'Round-Trip (2x)', mult: 'Back & Forth' },
              { id: 'multi_stop', label: '3-Stop Tour (2.5x)', mult: 'Multi-Destination' },
              { id: 'full_itinerary', label: 'Full Itinerary (3x)', mult: 'Tour Package' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleModeChange(mode.id as any)}
                className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer ${
                  tripMode === mode.id
                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-300'
                }`}
              >
                <span className="block text-[10px] font-black uppercase tracking-tight">{mode.label}</span>
                <span className={`block text-[9px] ${tripMode === mode.id ? 'text-orange-100' : 'text-gray-400'}`}>
                  {mode.mult}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preset Fast Route Chips */}
      {!readOnly && (
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Preset Expressway Routes</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ROUTES.map((route, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectPreset(route)}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/70 px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer"
              >
                <LuMapPin className="h-3 w-3 text-orange-500" />
                {route.destination.name.split(' ')[0]} ({route.distanceKm} km)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Real-Time Geocoding Search Bar */}
      {!readOnly && (
        <div className="relative z-30">
          <form onSubmit={handleSearchLocation} className="flex gap-2">
            <div className="relative flex-1">
              <LuSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length >= 2) {
                    const query = e.target.value.trim().toLowerCase();
                    const matches = PH_LOCATIONS_DATABASE.filter((loc) =>
                      loc.display_name.toLowerCase().includes(query)
                    );
                    setSearchResults(matches);
                  } else {
                    setSearchResults([]);
                  }
                }}
                placeholder="Search location in the Philippines (e.g. Baguio, Tagaytay, Batangas Port, Cubao)..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="rounded-2xl bg-orange-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-orange-700 disabled:opacity-50 cursor-pointer"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 dark:border-gray-700 mb-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Location Pin Target:</p>
                <button onClick={() => setSearchResults([])} className="text-[10px] text-gray-400 hover:text-gray-600">Close ✕</button>
              </div>
              {searchResults.map((item, index) => (
                <div key={index} className="flex items-center justify-between border-b border-gray-100 p-2.5 last:border-0 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-750 transition rounded-xl">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">{item.display_name}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectSearchResult(item, 'pickup')}
                      className="rounded-lg bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-[10px] font-black text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 cursor-pointer"
                    >
                      Set Pickup
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSearchResult(item, 'dropoff')}
                      className="rounded-lg bg-orange-100 dark:bg-orange-950/60 px-2.5 py-1 text-[10px] font-black text-orange-800 dark:text-orange-300 hover:bg-orange-200 cursor-pointer"
                    >
                      Set Destination
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaflet OpenStreetMap Canvas */}
      <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 z-0">
        <div ref={mapContainerRef} className="h-full w-full z-0" />
      </div>

      {/* Fully Editable Inputs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <label className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">
            Road Distance (KM)
          </label>
          <input
            type="number"
            value={editableKm}
            onChange={(e) => handleInputChange('km', e.target.value)}
            disabled={readOnly}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <label className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">
            Diesel Liters (KM ÷ 2.5)
          </label>
          <input
            type="number"
            step="0.1"
            value={editableLiters}
            onChange={(e) => handleInputChange('liters', e.target.value)}
            disabled={readOnly}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-black text-amber-600 dark:text-amber-400 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <label className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">
            Diesel Price (₱/L)
          </label>
          <input
            type="number"
            step="0.5"
            value={fuelPrice}
            onChange={(e) => handleInputChange('price', e.target.value)}
            disabled={readOnly}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-black text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40">
          <label className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block mb-1">
            Est. Diesel Cost (₱)
          </label>
          <input
            type="number"
            value={editableCost}
            onChange={(e) => handleInputChange('cost', e.target.value)}
            disabled={readOnly}
            className="w-full bg-white dark:bg-gray-900 border border-orange-300 dark:border-orange-800 rounded-xl px-3 py-1.5 text-xs font-black text-orange-700 dark:text-orange-300 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>
    </div>
  );
}
