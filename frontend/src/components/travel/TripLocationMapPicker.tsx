import { useEffect, useRef, useState } from 'react';
import { LuFuel, LuLoaderCircle, LuMapPin, LuRoute, LuSearch } from 'react-icons/lu';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { charterApi, type LocationSuggestion, type RouteEstimate } from '../../api/charters';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface RoutePinLocation { name: string; lat: number; lng: number }

interface TripLocationMapPickerProps {
  pickupLocation?: string;
  dropOffLocation?: string;
  initialPickupCoords?: [number, number];
  initialDropoffCoords?: [number, number];
  vehicleType?: 'Bus' | 'Coaster' | 'Van';
  fuelPricePerLiter?: number;
  readOnly?: boolean;
  garageLocation?: string;
  includeGarageLeg?: boolean;
  onLocationSelect?: (
    pickup: string,
    dropoff: string,
    distanceKm: number,
    dieselLiters: number,
    dieselCost: number,
    pickupCoords?: [number, number],
    dropoffCoords?: [number, number],
    details?: RouteEstimate,
  ) => void;
}

type SearchFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
  disabled?: boolean;
};

function SearchField({ label, value, onChange, onSelect, disabled }: SearchFieldProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (disabled || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try { setSuggestions(await charterApi.searchLocations(value.trim())); }
      catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [disabled, value]);

  return (
    <label className="relative block text-xs font-bold text-slate-600">
      {label}
      <span className="relative mt-1 block">
        <LuSearch className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input disabled={disabled} value={value} onChange={event => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100" />
        {loading && <LuLoaderCircle className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-600" />}
      </span>
      {suggestions.length > 0 && (
        <span className="absolute z-[1001] mt-1 block max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {suggestions.map(suggestion => (
            <button key={`${suggestion.latitude}-${suggestion.longitude}`} type="button" onClick={() => { onSelect(suggestion); setSuggestions([]); }} className="flex w-full gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50">
              <LuMapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />{suggestion.label}
            </button>
          ))}
        </span>
      )}
    </label>
  );
}

export default function TripLocationMapPicker({
  pickupLocation = '', dropOffLocation = '', initialPickupCoords, initialDropoffCoords,
  fuelPricePerLiter = 60, readOnly = false, garageLocation = 'Q24R+FP Caloocan, Metro Manila',
  includeGarageLeg = false, onLocationSelect,
}: TripLocationMapPickerProps) {
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const locationCallback = useRef(onLocationSelect);
  const [pickup, setPickup] = useState(pickupLocation);
  const [dropoff, setDropoff] = useState(dropOffLocation);
  const [pickupCoords, setPickupCoords] = useState<LocationSuggestion | undefined>(initialPickupCoords ? { label: pickupLocation, latitude: initialPickupCoords[0], longitude: initialPickupCoords[1], provider: 'Saved' } : undefined);
  const [dropoffCoords, setDropoffCoords] = useState<LocationSuggestion | undefined>(initialDropoffCoords ? { label: dropOffLocation, latitude: initialDropoffCoords[0], longitude: initialDropoffCoords[1], provider: 'Saved' } : undefined);
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { locationCallback.current = onLocationSelect; }, [onLocationSelect]);
  useEffect(() => { setPickup(pickupLocation); }, [pickupLocation]);
  useEffect(() => { setDropoff(dropOffLocation); }, [dropOffLocation]);

  useEffect(() => {
    if (!mapNode.current || map.current) return;
    const instance = L.map(mapNode.current, { zoomControl: true }).setView([14.5995, 120.9842], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(instance);
    map.current = instance;
    routeLayer.current = L.layerGroup().addTo(instance);
    return () => { instance.remove(); map.current = null; routeLayer.current = null; };
  }, []);

  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) return;
    let active = true;
    setLoading(true); setError('');
    charterApi.estimateRoute({
      pickup_location: pickupCoords.label,
      destination: dropoffCoords.label,
      pickup_coordinates: { latitude: pickupCoords.latitude, longitude: pickupCoords.longitude },
      destination_coordinates: { latitude: dropoffCoords.latitude, longitude: dropoffCoords.longitude },
      garage_location: garageLocation,
      include_garage: includeGarageLeg,
    }).then(result => {
      if (!active) return;
      setEstimate(result);
      setPickup(result.pickup_location); setDropoff(result.destination);
      const liters = result.total_distance_km / 2.5;
      locationCallback.current?.(result.pickup_location, result.destination, result.total_distance_km, liters, liters * fuelPricePerLiter, [result.pickup_coordinates.latitude, result.pickup_coordinates.longitude], [result.destination_coordinates.latitude, result.destination_coordinates.longitude], result);
      const group = routeLayer.current;
      const mapInstance = map.current;
      if (group && mapInstance) {
        group.clearLayers();
        const latLngs = result.geometry.map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
        if (latLngs.length) L.polyline(latLngs, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(group);
        if (result.garage_coordinates) L.marker([result.garage_coordinates.latitude, result.garage_coordinates.longitude]).bindTooltip('JVD Garage').addTo(group);
        L.marker([result.pickup_coordinates.latitude, result.pickup_coordinates.longitude]).bindTooltip('Pickup').addTo(group);
        L.marker([result.destination_coordinates.latitude, result.destination_coordinates.longitude]).bindTooltip('Destination').addTo(group);
        if (latLngs.length) mapInstance.fitBounds(L.latLngBounds(latLngs), { padding: [28, 28] });
      }
    }).catch(errorResponse => {
      if (active) setError(errorResponse?.response?.data?.message ?? 'Route could not be calculated. Select both locations from the suggestions.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dropoffCoords, fuelPricePerLiter, garageLocation, includeGarageLeg, pickupCoords]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2">
        <SearchField label="Pickup" value={pickup} disabled={readOnly} onChange={value => { setPickup(value); setPickupCoords(undefined); }} onSelect={suggestion => { setPickup(suggestion.label); setPickupCoords(suggestion); }} />
        <SearchField label="Destination" value={dropoff} disabled={readOnly} onChange={value => { setDropoff(value); setDropoffCoords(undefined); }} onSelect={suggestion => { setDropoff(suggestion.label); setDropoffCoords(suggestion); }} />
      </div>
      {includeGarageLeg && <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800"><LuRoute className="h-4 w-4" /> Garage departure included: {garageLocation}</div>}
      <div ref={mapNode} className="h-72 w-full bg-slate-100" />
      <div className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs">
        {loading ? <span className="flex items-center gap-2 font-bold text-blue-700"><LuLoaderCircle className="animate-spin" /> Calculating road route…</span> : error ? <span className="font-semibold text-red-600">{error}</span> : estimate ? <>
          {includeGarageLeg && <span><strong>{estimate.garage_distance_km.toLocaleString()} km</strong> garage → pickup</span>}
          <span><strong>{estimate.route_distance_km.toLocaleString()} km</strong> pickup → destination</span>
          <span className="flex items-center gap-1 text-amber-700"><LuFuel /> <strong>{(estimate.total_distance_km / 2.5).toFixed(1)} L</strong> at 2.5 km/L</span>
        </> : <span className="text-slate-500">Search and select both exact addresses to calculate the road distance.</span>}
      </div>
    </div>
  );
}
