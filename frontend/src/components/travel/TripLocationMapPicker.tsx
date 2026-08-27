import { useEffect, useRef, useState } from 'react';
import { LuArrowDown, LuArrowUp, LuFuel, LuLoaderCircle, LuMapPin, LuPlus, LuRoute, LuSearch, LuTrash2 } from 'react-icons/lu';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { charterApi, type CharterTripType, type LocationSuggestion, type RouteEstimate, type RouteWaypoint } from '../../api/charters';

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
  garageCoordinates?: [number, number];
  includeGarageLeg?: boolean;
  initialTripType?: CharterTripType;
  initialOutboundStops?: RouteWaypoint[];
  initialReturnStops?: RouteWaypoint[];
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
type EditableWaypoint = RouteWaypoint & { id: number; provider: string };
type PinTarget = { type: 'pickup' } | { type: 'dropoff' } | { type: 'outbound_stop'; id: number } | { type: 'return_stop'; id: number } | null;

const DEFAULT_GARAGE_COORDINATES: [number, number] = [14.756338137188132, 121.04179034232897];

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
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = await charterApi.searchLocations(value.trim(), controller.signal);
        if (active) { setSuggestions(results.filter(hasCoordinates)); setSearched(true); }
      } catch {
        if (active) { setSuggestions([]); setSearched(true); }
      } finally {
        if (active) setLoading(false);
      }
    }, 450);
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
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
  garageLocation = 'Unit 6 Aryanna Village Center, Barangay 175, Susano Road, Camarin, Caloocan, 1400 Metro Manila',
  garageCoordinates = DEFAULT_GARAGE_COORDINATES, includeGarageLeg = false,
  initialTripType = 'round_trip', initialOutboundStops = [], initialReturnStops = [],
  onIncludeGarageLegChange, onLocationSelect,
}: TripLocationMapPickerProps) {
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const baseTiles = useRef<L.TileLayer | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const locationCallback = useRef(onLocationSelect);
  const pinModeRef = useRef<PinTarget>(null);
  const readOnlyRef = useRef(readOnly);
  const waypointId = useRef(initialOutboundStops.length + initialReturnStops.length + 1);
  const [pickup, setPickup] = useState(pickupLocation);
  const [dropoff, setDropoff] = useState(dropOffLocation);
  const [pickupCoords, setPickupCoords] = useState<MappedLocation | undefined>(initialPickupCoords ? { label: pickupLocation, latitude: initialPickupCoords[0], longitude: initialPickupCoords[1], provider: 'Saved' } : undefined);
  const [dropoffCoords, setDropoffCoords] = useState<MappedLocation | undefined>(initialDropoffCoords ? { label: dropOffLocation, latitude: initialDropoffCoords[0], longitude: initialDropoffCoords[1], provider: 'Saved' } : undefined);
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [error, setError] = useState('');
  const [tripType, setTripType] = useState<CharterTripType>(initialTripType);
  const [outboundStops, setOutboundStops] = useState<EditableWaypoint[]>(() => initialOutboundStops.map((stop, index) => ({ ...stop, id: index + 1, provider: stop.provider ?? 'Saved itinerary' })));
  const [returnStops, setReturnStops] = useState<EditableWaypoint[]>(() => initialReturnStops.map((stop, index) => ({ ...stop, id: initialOutboundStops.length + index + 1, provider: stop.provider ?? 'Saved itinerary' })));
  const [customReturnRoute, setCustomReturnRoute] = useState(initialReturnStops.length > 0);
  const [pinMode, setPinMode] = useState<PinTarget>(null);

  useEffect(() => { locationCallback.current = onLocationSelect; }, [onLocationSelect]);
  useEffect(() => { pinModeRef.current = pinMode; }, [pinMode]);
  useEffect(() => { readOnlyRef.current = readOnly; }, [readOnly]);
  useEffect(() => { setPickup(pickupLocation); }, [pickupLocation]);
  useEffect(() => { setDropoff(dropOffLocation); }, [dropOffLocation]);

  useEffect(() => {
    if (!mapNode.current || map.current) return;
    const instance = L.map(mapNode.current, { zoomControl: true }).setView([14.5995, 120.9842], 9);
    baseTiles.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(instance);
    map.current = instance;
    routeLayer.current = L.layerGroup().addTo(instance);
    instance.on('click', async event => {
      const target = pinModeRef.current;
      if (!target || readOnlyRef.current) return;
      setError('');
      const latitude = Number(event.latlng.lat.toFixed(7));
      const longitude = Number(event.latlng.lng.toFixed(7));
      const initialLabel = `Pinned location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      const initialMapped: MappedLocation = { label: initialLabel, latitude, longitude, provider: 'Map pin' };

      if (target.type === 'pickup') { setPickup(initialMapped.label); setPickupCoords(initialMapped); }
      else if (target.type === 'dropoff') { setDropoff(initialMapped.label); setDropoffCoords(initialMapped); }
      else {
        const targetId = target.id;
        const update = (stops: EditableWaypoint[]) => stops.map(stop => stop.id === targetId ? { ...initialMapped, id: stop.id } : stop);
        if (target.type === 'outbound_stop') setOutboundStops(update);
        else setReturnStops(update);
      }
      setPinMode(null);

      try {
        setPinning(true);
        const result = await charterApi.reverseLocation(latitude, longitude);
        if (result && result.label) {
          const enriched: MappedLocation = { ...result, latitude, longitude };
          if (target.type === 'pickup') { setPickup(enriched.label); setPickupCoords(enriched); }
          else if (target.type === 'dropoff') { setDropoff(enriched.label); setDropoffCoords(enriched); }
          else {
            const targetId = target.id;
            const updateEnriched = (stops: EditableWaypoint[]) => stops.map(stop => stop.id === targetId ? { ...enriched, id: stop.id } : stop);
            if (target.type === 'outbound_stop') setOutboundStops(updateEnriched);
            else setReturnStops(updateEnriched);
          }
        }
      } catch {
        // Retain initial mapped pin
      } finally {
        setPinning(false);
      }
    });
    return () => { instance.remove(); map.current = null; baseTiles.current = null; routeLayer.current = null; };
  }, []);

  useEffect(() => {
    const node = mapNode.current;
    if (!node) return;

    let frame = 0;
    const refreshMapSize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => map.current?.invalidateSize({ pan: false }));
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refreshMapSize);

    observer?.observe(node);
    window.addEventListener('resize', refreshMapSize);
    refreshMapSize();

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', refreshMapSize);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.current?.invalidateSize({ pan: false });
      baseTiles.current?.redraw();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [includeGarageLeg, pinMode]);

  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) return;
    const selectedOutboundStops = outboundStops.filter(stop => stop.label.trim());
    const selectedReturnStops = tripType === 'round_trip' && customReturnRoute ? returnStops.filter(stop => stop.label.trim()) : [];
    if ([...selectedOutboundStops, ...selectedReturnStops].some(stop => stop.latitude == null || stop.longitude == null)) return;
    let active = true;
    setLoading(true); setError('');
    charterApi.estimateRoute({
      pickup_location: pickupCoords.label,
      destination: dropoffCoords.label,
      pickup_coordinates: { latitude: pickupCoords.latitude, longitude: pickupCoords.longitude },
      destination_coordinates: { latitude: dropoffCoords.latitude, longitude: dropoffCoords.longitude },
      garage_location: garageLocation,
      garage_coordinates: { latitude: garageCoordinates[0], longitude: garageCoordinates[1] },
      include_garage: includeGarageLeg,
      trip_type: tripType,
      outbound_stops: selectedOutboundStops.map(({ label, latitude, longitude }) => ({ label, latitude, longitude })),
      return_stops: selectedReturnStops.map(({ label, latitude, longitude }) => ({ label, latitude, longitude })),
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
        result.outbound_stops.forEach((stop, index) => L.circleMarker([stop.latitude, stop.longitude], { radius: 6, color: '#fff', fillColor: '#7c3aed', fillOpacity: 1, weight: 2 }).bindTooltip(`Outbound stop ${index + 1}: ${stop.label}`).addTo(group));
        if (customReturnRoute) result.return_stops.forEach((stop, index) => L.circleMarker([stop.latitude, stop.longitude], { radius: 6, color: '#fff', fillColor: '#ea580c', fillOpacity: 1, weight: 2 }).bindTooltip(`Return stop ${index + 1}: ${stop.label}`).addTo(group));
        L.circleMarker([result.destination_coordinates.latitude, result.destination_coordinates.longitude], { radius: 7, color: '#fff', fillColor: '#dc2626', fillOpacity: 1, weight: 3 }).bindTooltip('Destination').addTo(group);
        if (latLngs.length) mapInstance.fitBounds(L.latLngBounds(latLngs), { padding: [28, 28] });
      }
    }).catch(errorResponse => {
      if (active) setError(errorResponse?.response?.data?.message ?? 'No drivable route was found. Adjust a pin or select another address, then try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customReturnRoute, dropoffCoords, fuelPricePerLiter, garageCoordinates, garageLocation, includeGarageLeg, outboundStops, pickupCoords, returnStops, tripType, vehicleType]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div><p className="text-xs font-black text-slate-800">Journey type</p><p className="text-xs text-slate-500">Round trips include the passenger return and the bus trip home.</p></div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Journey type">
          <button type="button" aria-pressed={tripType === 'one_way'} onClick={() => setTripType('one_way')} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${tripType === 'one_way' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>One way</button>
          <button type="button" aria-pressed={tripType === 'round_trip'} onClick={() => setTripType('round_trip')} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${tripType === 'round_trip' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-blue-50'}`}>Round trip</button>
        </div>
      </div>
      <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2">
        <SearchField label="Pickup" value={pickup} disabled={readOnly} onChange={value => { setPickup(value); setPickupCoords(undefined); setEstimate(null); }} onSelect={suggestion => { setPickup(suggestion.label); setPickupCoords(hasCoordinates(suggestion) ? suggestion : undefined); }} />
        <SearchField label="Destination" value={dropoff} disabled={readOnly} onChange={value => { setDropoff(value); setDropoffCoords(undefined); setEstimate(null); }} onSelect={suggestion => { setDropoff(suggestion.label); setDropoffCoords(hasCoordinates(suggestion) ? suggestion : undefined); }} />
      </div>
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-slate-800">Itinerary stops</p><p className="text-xs text-slate-500">Stops are routed in the order shown.</p></div>{!readOnly && <button type="button" onClick={() => setOutboundStops(stops => [...stops, { id: waypointId.current++, label: '', provider: 'Pending selection' }])} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-blue-700 hover:bg-blue-50"><LuPlus className="h-4 w-4" />Add stop</button>}</div>
        {outboundStops.length > 0 && <div className="mt-3 space-y-3">{outboundStops.map((stop, index) => <div key={stop.id} className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <SearchField label={`Outbound stop ${index + 1}`} value={stop.label} disabled={readOnly} onChange={value => setOutboundStops(stops => stops.map(item => item.id === stop.id ? { ...item, label: value, latitude: undefined, longitude: undefined } : item))} onSelect={suggestion => setOutboundStops(stops => stops.map(item => item.id === stop.id ? { ...suggestion, id: item.id, provider: suggestion.provider } : item))} />
          {!readOnly && <div className="flex gap-1.5"><button type="button" disabled={index === 0} aria-label={`Move outbound stop ${index + 1} up`} onClick={() => setOutboundStops(stops => stops.map((item, itemIndex) => itemIndex === index - 1 ? stops[index] : itemIndex === index ? stops[index - 1] : item))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><LuArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === outboundStops.length - 1} aria-label={`Move outbound stop ${index + 1} down`} onClick={() => setOutboundStops(stops => stops.map((item, itemIndex) => itemIndex === index ? stops[index + 1] : itemIndex === index + 1 ? stops[index] : item))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><LuArrowDown className="h-4 w-4" /></button><button type="button" aria-label={`Pin outbound stop ${index + 1}`} aria-pressed={pinMode?.type === 'outbound_stop' && pinMode.id === stop.id} onClick={() => setPinMode(current => current?.type === 'outbound_stop' && current.id === stop.id ? null : { type: 'outbound_stop', id: stop.id })} className={`grid h-9 w-9 place-items-center rounded-lg border ${pinMode?.type === 'outbound_stop' && pinMode.id === stop.id ? 'border-violet-700 bg-violet-700 text-white' : 'border-slate-200 text-violet-700 hover:bg-violet-50'}`}><LuMapPin className="h-4 w-4" /></button><button type="button" aria-label={`Remove outbound stop ${index + 1}`} onClick={() => setOutboundStops(stops => stops.filter(item => item.id !== stop.id))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-red-600 hover:bg-red-50"><LuTrash2 className="h-4 w-4" /></button></div>}
        </div>)}</div>}
        {tripType === 'round_trip' && <div className="mt-3 border-t border-slate-100 pt-3"><label className="flex cursor-pointer items-start gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={customReturnRoute} disabled={readOnly} onChange={event => setCustomReturnRoute(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-600" /><span>Use different stops on the return route<span className="block font-medium text-slate-500">Otherwise, outbound stops are visited in reverse order.</span></span></label>
          {customReturnRoute && <div className="mt-3"><div className="flex justify-end">{!readOnly && <button type="button" onClick={() => setReturnStops(stops => [...stops, { id: waypointId.current++, label: '', provider: 'Pending selection' }])} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-bold text-orange-700 hover:bg-orange-100"><LuPlus className="h-4 w-4" />Add return stop</button>}</div><div className="mt-2 space-y-3">{returnStops.map((stop, index) => <div key={stop.id} className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <SearchField label={`Return stop ${index + 1}`} value={stop.label} disabled={readOnly} onChange={value => setReturnStops(stops => stops.map(item => item.id === stop.id ? { ...item, label: value, latitude: undefined, longitude: undefined } : item))} onSelect={suggestion => setReturnStops(stops => stops.map(item => item.id === stop.id ? { ...suggestion, id: item.id, provider: suggestion.provider } : item))} />
            {!readOnly && <div className="flex gap-1.5"><button type="button" disabled={index === 0} aria-label={`Move return stop ${index + 1} up`} onClick={() => setReturnStops(stops => stops.map((item, itemIndex) => itemIndex === index - 1 ? stops[index] : itemIndex === index ? stops[index - 1] : item))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><LuArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === returnStops.length - 1} aria-label={`Move return stop ${index + 1} down`} onClick={() => setReturnStops(stops => stops.map((item, itemIndex) => itemIndex === index ? stops[index + 1] : itemIndex === index + 1 ? stops[index] : item))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><LuArrowDown className="h-4 w-4" /></button><button type="button" aria-label={`Pin return stop ${index + 1}`} aria-pressed={pinMode?.type === 'return_stop' && pinMode.id === stop.id} onClick={() => setPinMode(current => current?.type === 'return_stop' && current.id === stop.id ? null : { type: 'return_stop', id: stop.id })} className={`grid h-9 w-9 place-items-center rounded-lg border ${pinMode?.type === 'return_stop' && pinMode.id === stop.id ? 'border-orange-700 bg-orange-700 text-white' : 'border-slate-200 text-orange-700 hover:bg-orange-50'}`}><LuMapPin className="h-4 w-4" /></button><button type="button" aria-label={`Remove return stop ${index + 1}`} onClick={() => setReturnStops(stops => stops.filter(item => item.id !== stop.id))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-red-600 hover:bg-red-50"><LuTrash2 className="h-4 w-4" /></button></div>}
          </div>)}</div></div>}
        </div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {onIncludeGarageLegChange && <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={includeGarageLeg} disabled={readOnly} onChange={event => onIncludeGarageLegChange(event.target.checked)} className="h-4 w-4 accent-blue-600" /><LuRoute className="h-4 w-4 text-amber-600" />Include bus travel from and back to garage</label>}
        {!readOnly && <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={pinMode?.type === 'pickup'} onClick={() => setPinMode(current => current?.type === 'pickup' ? null : { type: 'pickup' })} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${pinMode?.type === 'pickup' ? 'bg-blue-700 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-blue-50'}`}><LuMapPin className="h-4 w-4" />Pin pickup</button><button type="button" aria-pressed={pinMode?.type === 'dropoff'} onClick={() => setPinMode(current => current?.type === 'dropoff' ? null : { type: 'dropoff' })} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${pinMode?.type === 'dropoff' ? 'bg-red-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-red-50'}`}><LuMapPin className="h-4 w-4" />Pin destination</button></div>}
      </div>
      <div key="garage-notice" className={includeGarageLeg ? 'flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900' : 'hidden'} aria-hidden={!includeGarageLeg}>
        <LuRoute className="h-4 w-4 shrink-0" />{tripType === 'round_trip' ? 'Garage → pickup and pickup → garage are included: ' : 'Garage → pickup is included: '}{garageLocation}
      </div>
      <div key="pin-notice" className={pinMode ? 'border-b border-blue-200 bg-blue-700 px-4 py-2 text-center text-xs font-bold text-white' : 'hidden'} aria-live="polite">
        {pinMode ? `Click the map to place the ${pinMode.type === 'pickup' ? 'pickup' : pinMode.type === 'dropoff' ? 'destination' : pinMode.type === 'outbound_stop' ? 'outbound stop' : 'return stop'} pin. Zoom in for building-level precision.` : ''}
      </div>
      <div key="leaflet-map-shell" className={pinMode ? 'cursor-crosshair' : ''}>
        <div ref={mapNode} className="h-80 w-full bg-slate-100" />
      </div>
      <div aria-live="polite" className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs">
        {pinning ? <span className="flex items-center gap-2 font-bold text-blue-700"><LuLoaderCircle className="animate-spin" />Naming pinned location…</span> : loading ? <span className="flex items-center gap-2 font-bold text-blue-700"><LuLoaderCircle className="animate-spin" />Calculating road route…</span> : error ? <span role="alert" className="font-semibold text-red-600">{error}</span> : estimate ? <>
          {includeGarageLeg && <span><strong>{estimate.garage_distance_km.toLocaleString()} km</strong> garage travel</span>}
          <span><strong>{estimate.outbound_distance_km.toLocaleString()} km</strong> outbound</span>
          {estimate.trip_type === 'round_trip' && <span><strong>{estimate.return_distance_km.toLocaleString()} km</strong> passenger return</span>}
          <span className="flex items-center gap-1 text-amber-700"><LuFuel /> <strong>{(estimate.total_distance_km / 2.5).toFixed(1)} L</strong> at 2.5 km/L</span>
          <span className={estimate.toll_estimate.mode !== 'manual_reference' ? 'font-bold text-emerald-700' : 'text-slate-500'}>{estimate.toll_estimate.mode !== 'manual_reference' ? `₱${estimate.toll_estimate.total.toLocaleString()} automated tolls` : 'Class 2 toll matrix available below'}</span>
        </> : <span className="text-slate-500">Search and select both exact addresses, or place both pins, to calculate the road route.</span>}
      </div>
    </div>
  );
}
