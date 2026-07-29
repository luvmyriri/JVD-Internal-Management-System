import { useState, useEffect, useRef, useMemo } from 'react';
import { LuMapPin, LuCompass, LuSearch, LuX, LuRefreshCw } from 'react-icons/lu';
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
  vehicleType?: 'Bus' | 'Coaster' | 'Van';
  fuelPricePerLiter?: number;
  readOnly?: boolean;
  onLocationSelect?: (pickup: string, dropoff: string, distanceKm: number, dieselLiters: number, dieselCost: number) => void;
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
  { display_name: 'Cebu City (Central Visayas)', lat: '10.3157', lon: '123.8854' },
  { display_name: 'Davao City (Mindanao)', lat: '7.1907', lon: '125.4553' },
  { display_name: 'Iloilo City (Panay Island)', lat: '10.7202', lon: '122.5621' },
  { display_name: 'Bacolod City (Negros Occidental)', lat: '10.6765', lon: '122.9509' },
  { display_name: 'Boracay Island (Malay, Aklan)', lat: '11.9674', lon: '121.9248' },
  { display_name: 'Puerto Princesa City (Palawan)', lat: '9.7392', lon: '118.7353' },
  { display_name: 'Coron Busuanga (Palawan)', lat: '11.9986', lon: '120.2043' },
  { display_name: 'Siargao Island (General Luna, Surigao del Norte)', lat: '9.7867', lon: '126.1578' },
  { display_name: 'Panglao Island (Bohol)', lat: '9.5786', lon: '123.7745' },
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
  pickupLocation = 'Manila Hub (Pasay Terminal)',
  dropOffLocation = 'Tagaytay City',
  vehicleType = 'Bus',
  fuelPricePerLiter = 68.5,
  readOnly = false,
  onLocationSelect,
}: TripLocationMapPickerProps) {
  const [pickupName, setPickupName] = useState(pickupLocation);
  const [dropoffName, setDropoffName] = useState(dropOffLocation);
  const [pickupCoord, setPickupCoord] = useState<[number, number]>([14.5378, 120.9992]);
  const [dropoffCoord, setDropoffCoord] = useState<[number, number]>([14.1153, 120.9621]);
  const [distanceKm, setDistanceKm] = useState<number>(65);
  const [fuelPrice] = useState<number>(fuelPricePerLiter);
  const [isRouting, setIsRouting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Vehicle fuel efficiency (KM per Liter)
  const kmPerLiter = useMemo(() => {
    switch (vehicleType) {
      case 'Coaster':
        return 6.5;
      case 'Van':
        return 9.0;
      case 'Bus':
      default:
        return 5.5;
    }
  }, [vehicleType]);

  const estimatedLiters = useMemo(() => {
    return Math.round((distanceKm / kmPerLiter) * 10) / 10;
  }, [distanceKm, kmPerLiter]);

  const estimatedDieselCost = useMemo(() => {
    return Math.round(estimatedLiters * fuelPrice);
  }, [estimatedLiters, fuelPrice]);

  // Fetch real-time road driving route from OSRM Routing API
  const fetchOSRMRoute = async (pLat: number, pLng: number, dLat: number, dLng: number) => {
    setIsRouting(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routeDistanceKm = Math.round((route.distance / 1000) * 10) / 10;
        setDistanceKm(routeDistanceKm);

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
        setPickupCoord([pos.lat, pos.lng]);
        fetchOSRMRoute(pos.lat, pos.lng, dropoffCoord[0], dropoffCoord[1]);
      });

      markerB.on('dragend', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        setDropoffCoord([pos.lat, pos.lng]);
        fetchOSRMRoute(pickupCoord[0], pickupCoord[1], pos.lat, pos.lng);
      });
    }

    markersRef.current = [markerA, markerB];
    fetchOSRMRoute(pickupCoord[0], pickupCoord[1], dropoffCoord[0], dropoffCoord[1]);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleSelectPreset = (route: (typeof PRESET_ROUTES)[number]) => {
    setPickupName(route.pickup.name);
    setDropoffName(route.destination.name);
    setPickupCoord([route.pickup.lat, route.pickup.lng]);
    setDropoffCoord([route.destination.lat, route.destination.lng]);
    setDistanceKm(route.distanceKm);

    if (mapInstanceRef.current && markersRef.current.length === 2) {
      markersRef.current[0].setLatLng([route.pickup.lat, route.pickup.lng]);
      markersRef.current[1].setLatLng([route.destination.lat, route.destination.lng]);
      fetchOSRMRoute(route.pickup.lat, route.pickup.lng, route.destination.lat, route.destination.lng);
    }

    if (onLocationSelect) {
      const liters = Math.round((route.distanceKm / kmPerLiter) * 10) / 10;
      const cost = Math.round(liters * fuelPrice);
      onLocationSelect(route.pickup.name, route.destination.name, route.distanceKm, liters, cost);
    }
  };

  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    setIsSearching(true);

    try {
      // 1. Local database search
      const localMatches = PH_LOCATIONS_DATABASE.filter((loc) =>
        loc.display_name.toLowerCase().includes(query)
      );

      // 2. Open-Meteo Geocoding API fallback
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

    let newPickup = pickupName;
    let newDropoff = dropoffName;
    let newPickupCoord = pickupCoord;
    let newDropoffCoord = dropoffCoord;

    if (type === 'pickup') {
      newPickup = shortName;
      newPickupCoord = [lat, lng];
      setPickupName(shortName);
      setPickupCoord([lat, lng]);
      if (markersRef.current[0]) markersRef.current[0].setLatLng([lat, lng]);
    } else {
      newDropoff = shortName;
      newDropoffCoord = [lat, lng];
      setDropoffName(shortName);
      setDropoffCoord([lat, lng]);
      if (markersRef.current[1]) markersRef.current[1].setLatLng([lat, lng]);
    }

    fetchOSRMRoute(newPickupCoord[0], newPickupCoord[1], newDropoffCoord[0], newDropoffCoord[1]);

    if (onLocationSelect) {
      const liters = Math.round((distanceKm / kmPerLiter) * 10) / 10;
      const cost = Math.round(liters * fuelPrice);
      onLocationSelect(newPickup, newDropoff, distanceKm, liters, cost);
    }

    setSearchResults([]);
    setSearchQuery('');
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

      {/* Distance & Fuel Summary Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
        <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Est. Road Distance</span>
          <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">{distanceKm} KM</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Fuel Efficiency</span>
          <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">{vehicleType} ({kmPerLiter} KM/L)</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Est. Diesel Liters</span>
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5 block">{estimatedLiters} L</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40">
          <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block">Est. Diesel Cost (₱)</span>
          <span className="text-xs font-black text-orange-700 dark:text-orange-300 mt-0.5 block">₱{estimatedDieselCost.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
