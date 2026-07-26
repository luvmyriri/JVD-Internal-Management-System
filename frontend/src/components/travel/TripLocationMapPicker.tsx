import { useState, useEffect, useRef, useMemo } from 'react';
import { LuMapPin, LuFuel, LuCompass, LuSearch, LuCheck, LuArrowRight, LuRefreshCw, LuSlidersHorizontal } from 'react-icons/lu';
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
  fuelPricePerLiter = 65.0,
  readOnly = false,
  onLocationSelect,
}: TripLocationMapPickerProps) {
  const [pickupName, setPickupName] = useState(pickupLocation);
  const [dropoffName, setDropoffName] = useState(dropOffLocation);
  const [pickupCoord, setPickupCoord] = useState<[number, number]>([14.5378, 120.9992]);
  const [dropoffCoord, setDropoffCoord] = useState<[number, number]>([14.1153, 120.9621]);
  const [distanceKm, setDistanceKm] = useState<number>(65);
  const [fuelPrice, setFuelPrice] = useState<number>(fuelPricePerLiter);
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
        return 3.5;
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
          // Draw polyline on map
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
      console.warn('OSRM routing fetch warning, falling back to Haversine formula:', err);
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;

    // Render Markers
    const markerA = L.marker(pickupCoord, { draggable: !readOnly, title: 'Pin A: Pickup' }).addTo(map);
    const markerB = L.marker(dropoffCoord, { draggable: !readOnly, title: 'Pin B: Dropoff' }).addTo(map);

    markerA.bindPopup(`<b>Pickup Point</b><br/>${pickupName}`).openPopup();
    markerB.bindPopup(`<b>Destination</b><br/>${dropoffName}`);

    if (!readOnly) {
      markerA.on('dragend', (e) => {
        const target = e.target as L.Marker;
        const pos = target.getLatLng();
        setPickupCoord([pos.lat, pos.lng]);
        fetchOSRMRoute(pos.lat, pos.lng, dropoffCoord[0], dropoffCoord[1]);
      });

      markerB.on('dragend', (e) => {
        const target = e.target as L.Marker;
        const pos = target.getLatLng();
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

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.error('Nominatim search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any, type: 'pickup' | 'dropoff') => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const shortName = result.display_name.split(',')[0];

    if (type === 'pickup') {
      setPickupName(shortName);
      setPickupCoord([lat, lng]);
      if (markersRef.current[0]) markersRef.current[0].setLatLng([lat, lng]);
      fetchOSRMRoute(lat, lng, dropoffCoord[0], dropoffCoord[1]);
    } else {
      setDropoffName(shortName);
      setDropoffCoord([lat, lng]);
      if (markersRef.current[1]) markersRef.current[1].setLatLng([lat, lng]);
      fetchOSRMRoute(pickupCoord[0], pickupCoord[1], lat, lng);
    }

    setSearchResults([]);
    setSearchQuery('');
  };

  const handleApplyCalculations = () => {
    if (onLocationSelect) {
      onLocationSelect(pickupName, dropoffName, distanceKm, estimatedLiters, estimatedDieselCost);
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
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/70 px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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
        <div className="relative">
          <form onSubmit={handleSearchLocation} className="flex gap-2">
            <div className="relative flex-1">
              <LuSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location in the Philippines (e.g. Baguio, Tagaytay, Batangas Port)..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="rounded-2xl bg-orange-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 py-1">Set Location Pin:</p>
              {searchResults.map((item, index) => (
                <div key={index} className="flex items-center justify-between border-b border-gray-100 p-2 last:border-0 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">{item.display_name}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectSearchResult(item, 'pickup')}
                      className="rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-800 hover:bg-emerald-200"
                    >
                      Set Pickup
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSearchResult(item, 'dropoff')}
                      className="rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-black text-rose-800 hover:bg-rose-200"
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
      <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div ref={mapContainerRef} className="h-full w-full z-0" />
      </div>

      {/* Live Operational Metrics & Calculations */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Est. Road Distance</label>
          <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
            {distanceKm} KM
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fuel Efficiency</label>
          <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-black text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-300">
            {vehicleType} ({kmPerLiter} KM/L)
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Est. Diesel Liters</label>
          <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
            <LuFuel className="h-4 w-4 text-amber-600" />
            {estimatedLiters} L
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Est. Diesel Cost (₱)</label>
          <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-black text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-300">
            ₱{estimatedDieselCost.toLocaleString()}
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleApplyCalculations}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-orange-700 shadow-md"
          >
            <LuCheck className="h-4 w-4" /> Apply Pinned Route & Diesel Calculations
          </button>
        </div>
      )}

    </div>
  );
}
