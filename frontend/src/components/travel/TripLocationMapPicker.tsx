import { useEffect, useRef, useState } from 'react';
import { LuFuel, LuLoaderCircle, LuMapPin, LuRoute, LuSearch } from 'react-icons/lu';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { charterApi, type LocationSuggestion, type RouteEstimate } from '../../api/charters';

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
  onIncludeGarageLegChange?: (included: boolean) => void;
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

type MappedLocation = LocationSuggestion & { latitude: number; longitude: number };
type PinMode = 'pickup' | 'dropoff' | null;

const hasCoordinates = (suggestion: LocationSuggestion): suggestion is MappedLocation =>
  suggestion.latitude != null && suggestion.longitude != null;

function SearchField({ label, value, onChange, onSelect, disabled }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (disabled || !editing || value.trim().length < 3) {
      setSuggestions([]); setSearched(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = await charterApi.searchLocations(value.trim());
        if (active) { setSuggestions(results.filter(hasCoordinates)); setSearched(true); }
      } catch {
        if (active) { setSuggestions([]); setSearched(true); }
      } finally {
        if (active) setLoading(false);
      }
    }, 450);
    return () => { active = false; window.clearTimeout(timer); };
  }, [disabled, editing, value]);

  return (
    <label className="relative block text-xs font-bold text-slate-600">
      {label}
      <span className="relative mt-1 block">
        <LuSearch className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input disabled={disabled} value={value} onChange={event => { setEditing(true); onChange(event.target.value); }} placeholder={`Search exact ${label.toLowerCase()} address or landmark`} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100" />
        {loading && <LuLoaderCircle className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-600" />}
      </span>
      {(suggestions.length > 0 || (searched && !loading)) && (
        <span className="absolute z-[1001] mt-1 block max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {suggestions.length === 0 ? <span className="block px-3 py-3 text-xs font-medium text-slate-500">No exact address found. Try a landmark, street and city, or pin it directly on the map.</span> : suggestions.map(suggestion => (
            <button key={`${suggestion.latitude}-${suggestion.longitude}-${suggestion.label}`} type="button" onClick={() => { onSelect(suggestion); setEditing(false); setSuggestions([]); setSearched(false); }} className="flex w-full gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none">
              <LuMapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span className="min-w-0 break-words">{suggestion.label}<small className="block font-medium text-slate-400">{suggestion.provider}</small></span>
            </button>
          ))}
        </span>
      )}
    </label>
  );
}

export default function TripLocationMapPicker({
  pickupLocation = '', dropOffLocation = '', initialPickupCoords, initialDropoffCoords,
  vehicleType = 'Bus', fuelPricePerLiter = 60, readOnly = false,
  garageLocation = 'Q24R+FP Caloocan, Metro Manila', includeGarageLeg = false,
  onIncludeGarageLegChange, onLocationSelect,
}: TripLocationMapPickerProps) {
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const locationCallback = useRef(onLocationSelect);
  const pinModeRef = useRef<PinMode>(null);
  const readOnlyRef = useRef(readOnly);
  const [pickup, setPickup] = useState(pickupLocation);
  const [dropoff, setDropoff] = useState(dropOffLocation);
  const [pickupCoords, setPickupCoords] = useState<MappedLocation | undefined>(initialPickupCoords ? { label: pickupLocation, latitude: initialPickupCoords[0], longitude: initialPickupCoords[1], provider: 'Saved' } : undefined);
  const [dropoffCoords, setDropoffCoords] = useState<MappedLocation | undefined>(initialDropoffCoords ? { label: dropOffLocation, latitude: initialDropoffCoords[0], longitude: initialDropoffCoords[1], provider: 'Saved' } : undefined);
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [error, setError] = useState('');
  const [pinMode, setPinMode] = useState<PinMode>(null);

  useEffect(() => { locationCallback.current = onLocationSelect; }, [onLocationSelect]);
  useEffect(() => { pinModeRef.current = pinMode; }, [pinMode]);
  useEffect(() => { readOnlyRef.current = readOnly; }, [readOnly]);
  useEffect(() => { setPickup(pickupLocation); }, [pickupLocation]);
  useEffect(() => { setDropoff(dropOffLocation); }, [dropOffLocation]);

  useEffect(() => {
    if (!mapNode.current || map.current) return;
    const instance = L.map(mapNode.current, { zoomControl: true }).setView([14.5995, 120.9842], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(instance);
    map.current = instance;
    routeLayer.current = L.layerGroup().addTo(instance);
    instance.on('click', async event => {
      const target = pinModeRef.current;
      if (!target || readOnlyRef.current) return;
      setPinning(true); setError('');
      const latitude = Number(event.latlng.lat.toFixed(7));
      const longitude = Number(event.latlng.lng.toFixed(7));
      let mapped: MappedLocation;
      try {
        const result = await charterApi.reverseLocation(latitude, longitude);
        mapped = { ...result, latitude, longitude };
      } catch {
        mapped = { label: `Pinned location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`, latitude, longitude, provider: 'Map pin' };
      }
      if (target === 'pickup') { setPickup(mapped.label); setPickupCoords(mapped); }
      else { setDropoff(mapped.label); setDropoffCoords(mapped); }
      setPinning(false); setPinMode(null);
    });
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
      vehicle_class: vehicleType === 'Bus' ? 'bus' : vehicleType === 'Coaster' ? 'coaster' : 'van',
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
        if (result.garage_coordinates) L.circleMarker([result.garage_coordinates.latitude, result.garage_coordinates.longitude], { radius: 7, color: '#0f172a', fillColor: '#f59e0b', fillOpacity: 1, weight: 3 }).bindTooltip('JVD Garage').addTo(group);
        L.circleMarker([result.pickup_coordinates.latitude, result.pickup_coordinates.longitude], { radius: 7, color: '#fff', fillColor: '#2563eb', fillOpacity: 1, weight: 3 }).bindTooltip('Pickup').addTo(group);
        L.circleMarker([result.destination_coordinates.latitude, result.destination_coordinates.longitude], { radius: 7, color: '#fff', fillColor: '#dc2626', fillOpacity: 1, weight: 3 }).bindTooltip('Destination').addTo(group);
        if (latLngs.length) mapInstance.fitBounds(L.latLngBounds(latLngs), { padding: [28, 28] });
      }
    }).catch(errorResponse => {
      if (active) setError(errorResponse?.response?.data?.message ?? 'No drivable route was found. Adjust a pin or select another address, then try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dropoffCoords, fuelPricePerLiter, garageLocation, includeGarageLeg, pickupCoords, vehicleType]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2">
        <SearchField label="Pickup" value={pickup} disabled={readOnly} onChange={value => { setPickup(value); setPickupCoords(undefined); setEstimate(null); }} onSelect={suggestion => { setPickup(suggestion.label); setPickupCoords(hasCoordinates(suggestion) ? suggestion : undefined); }} />
        <SearchField label="Destination" value={dropoff} disabled={readOnly} onChange={value => { setDropoff(value); setDropoffCoords(undefined); setEstimate(null); }} onSelect={suggestion => { setDropoff(suggestion.label); setDropoffCoords(hasCoordinates(suggestion) ? suggestion : undefined); }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {onIncludeGarageLegChange && <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={includeGarageLeg} disabled={readOnly} onChange={event => onIncludeGarageLegChange(event.target.checked)} className="h-4 w-4 accent-blue-600" /><LuRoute className="h-4 w-4 text-amber-600" />Include garage → pickup distance</label>}
        {!readOnly && <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={pinMode === 'pickup'} onClick={() => setPinMode(current => current === 'pickup' ? null : 'pickup')} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${pinMode === 'pickup' ? 'bg-blue-700 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-blue-50'}`}><LuMapPin className="h-4 w-4" />Pin pickup</button><button type="button" aria-pressed={pinMode === 'dropoff'} onClick={() => setPinMode(current => current === 'dropoff' ? null : 'dropoff')} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${pinMode === 'dropoff' ? 'bg-red-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-red-50'}`}><LuMapPin className="h-4 w-4" />Pin destination</button></div>}
      </div>
      {includeGarageLeg && <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900"><LuRoute className="h-4 w-4" />Garage leg starts from the saved office pin: {garageLocation}</div>}
      {pinMode && <div className="border-b border-blue-200 bg-blue-700 px-4 py-2 text-center text-xs font-bold text-white">Click the map to place the {pinMode === 'pickup' ? 'pickup' : 'destination'} pin. Zoom in for building-level precision.</div>}
      <div ref={mapNode} className={`h-80 w-full bg-slate-100 ${pinMode ? 'cursor-crosshair' : ''}`} />
      <div aria-live="polite" className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs">
        {pinning ? <span className="flex items-center gap-2 font-bold text-blue-700"><LuLoaderCircle className="animate-spin" />Naming pinned location…</span> : loading ? <span className="flex items-center gap-2 font-bold text-blue-700"><LuLoaderCircle className="animate-spin" />Calculating road route…</span> : error ? <span role="alert" className="font-semibold text-red-600">{error}</span> : estimate ? <>
          {includeGarageLeg && <span><strong>{estimate.garage_distance_km.toLocaleString()} km</strong> garage → pickup</span>}
          <span><strong>{estimate.route_distance_km.toLocaleString()} km</strong> pickup → destination</span>
          <span className="flex items-center gap-1 text-amber-700"><LuFuel /> <strong>{(estimate.total_distance_km / 2.5).toFixed(1)} L</strong> at 2.5 km/L</span>
          <span className={estimate.toll_estimate.mode !== 'manual_reference' ? 'font-bold text-emerald-700' : 'text-slate-500'}>{estimate.toll_estimate.mode !== 'manual_reference' ? `₱${estimate.toll_estimate.total.toLocaleString()} automated tolls` : 'Class 2 toll matrix available below'}</span>
        </> : <span className="text-slate-500">Search and select both exact addresses, or place both pins, to calculate the road route.</span>}
      </div>
    </div>
  );
}
