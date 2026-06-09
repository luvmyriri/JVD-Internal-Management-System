import { useState, useMemo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  LuPlus,
  LuLoaderCircle,
  LuCheck,
  LuFileText
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { billingApi } from '../../api/billing';
import { useTheme } from '../../context/ThemeContext';
import SalesCheckout, { type CartItem } from './SalesCheckout';
import BusLayout from '../../components/ui/BusLayout';
import { fleetApi } from '../../api/fleet';
import client from '../../api/client';

export default function CustomTransactions() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Load buses list for selection
  const { data: busesRes } = useQuery({
    queryKey: ['buses-list'],
    queryFn: () => fleetApi.list({ per_page: 100 }),
  });
  const buses = busesRes?.data?.data ?? [];

  // Load active drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['active-drivers'],
    queryFn: async () => {
      const res = await client.get('/chat/users');
      const allUsers = res.data?.data ?? [];
      return allUsers.filter((u: any) => u.role === 'driver' && u.is_active);
    },
  });

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    category: 'Bus Rental',
    otherCategory: '',
    price: 0,
    quantity: 1,
    description: '',
  });

  // Category specific custom specifications states
  // 1. Bus Rental Custom Data
  const [busRental, setBusRental] = useState({
    vehicleType: 'Bus',
    route: '',
    days: 1,
    plateNumber: '',
    inclusions: { driver: true, fuel: true, toll: false, insurance: true } as Record<string, boolean>,
    travelDate: '',
    busId: null as number | null,
    driverId: null as number | null,
    driverName: '',
    selectedSeats: [] as string[]
  });

  // Load calendar for selected bus to check seat occupancy on travel date
  const { data: busCalendarRes } = useQuery({
    queryKey: ['bus-calendar', busRental.busId, busRental.travelDate ? busRental.travelDate.substring(0, 7) : ''],
    queryFn: async () => {
      if (!busRental.busId || !busRental.travelDate) return null;
      const date = new Date(busRental.travelDate);
      const res = await fleetApi.getCalendar(busRental.busId, { month: date.getMonth() + 1, year: date.getFullYear() });
      return res.data;
    },
    enabled: !!busRental.busId && !!busRental.travelDate,
  });

  const occupiedSeats = useMemo(() => {
    if (!busCalendarRes?.data || !busRental.travelDate) return [];
    const entries = busCalendarRes.data;
    const sameDayInvoices = entries.filter((e: any) => e.date === busRental.travelDate && e.type === 'invoice');
    const seats: string[] = [];
    sameDayInvoices.forEach((inv: any) => {
      if (Array.isArray(inv.seat_map)) {
        seats.push(...inv.seat_map);
      }
    });
    return seats;
  }, [busCalendarRes, busRental.travelDate]);

  // 2. Educational Tour Custom Data
  const [eduTour, setEduTour] = useState({
    schoolName: '',
    gradeLevel: '',
    expectedPax: 50,
    stops: '',
    inclusions: { meals: true, coordinator: true, insurance: true, tshirt: false } as Record<string, boolean>
  });

  // 3. Tour Package Custom Data
  const [tourPackage, setTourPackage] = useState({
    destination: '',
    travelDates: '',
    adults: 1,
    children: 0,
    accommodation: 'Hotel',
    itinerary: ''
  });

  // 4. Visa Processing Custom Data
  const [visaProcessing, setVisaProcessing] = useState({
    country: 'Japan',
    visaType: 'Tourist',
    applicants: '',
    requirements: { passport: true, photo: true, bankCert: false, itr: false, birthCert: false } as Record<string, boolean>
  });

  // 5. Joiners Custom Data
  const [joiners, setJoiners] = useState({
    tourCode: '',
    travelDate: '',
    paxCount: 1,
    pickupLocation: ''
  });

  // 6. Booking Custom Data
  const [booking, setBooking] = useState({
    bookingType: 'Flight',
    referenceCode: '',
    details: '',
    guests: ''
  });

  const resetSubStates = () => {
    setBusRental({
      vehicleType: 'Bus',
      route: '',
      days: 1,
      plateNumber: '',
      inclusions: { driver: true, fuel: true, toll: false, insurance: true },
      travelDate: '',
      busId: null,
      driverId: null,
      driverName: '',
      selectedSeats: []
    });
    setEduTour({
      schoolName: '',
      gradeLevel: '',
      expectedPax: 50,
      stops: '',
      inclusions: { meals: true, coordinator: true, insurance: true, tshirt: false }
    });
    setTourPackage({
      destination: '',
      travelDates: '',
      adults: 1,
      children: 0,
      accommodation: 'Hotel',
      itinerary: ''
    });
    setVisaProcessing({
      country: 'Japan',
      visaType: 'Tourist',
      applicants: '',
      requirements: { passport: true, photo: true, bankCert: false, itr: false, birthCert: false }
    });
    setJoiners({
      tourCode: '',
      travelDate: '',
      paxCount: 1,
      pickupLocation: ''
    });
    setBooking({
      bookingType: 'Flight',
      referenceCode: '',
      details: '',
      guests: ''
    });
  };

  const generateAutoDescription = (category: string) => {
    switch (category) {
      case 'Bus Rental': {
        const incs = [];
        if (busRental.inclusions.driver) incs.push('Driver Included');
        if (busRental.inclusions.fuel) incs.push('Fuel Included');
        if (busRental.inclusions.toll) incs.push('Toll Fees');
        if (busRental.inclusions.insurance) incs.push('Passenger Insurance');
        return `[Bus Rental Specifications]
Vehicle Type: ${busRental.vehicleType}
Route/Destination: ${busRental.route || 'Not Specified'}
Duration: ${busRental.days} Day(s)
Plate No. / Assigned Unit: ${busRental.plateNumber || 'To Be Determined'}
Included in Rate: ${incs.join(', ') || 'Base Rental Only'}`;
      }
      case 'Educational Tour': {
        const incs = [];
        if (eduTour.inclusions.meals) incs.push('Student Meals');
        if (eduTour.inclusions.coordinator) incs.push('Tour Coordinator');
        if (eduTour.inclusions.insurance) incs.push('Travel Insurance');
        if (eduTour.inclusions.tshirt) incs.push('Souvenir T-Shirt');
        return `[Educational Tour Specifications]
School/Institution: ${eduTour.schoolName || 'Not Specified'}
Grade/Year Level: ${eduTour.gradeLevel || 'Not Specified'}
Expected Count: ${eduTour.expectedPax} Pax
Itinerary Stops: ${eduTour.stops || 'Not Specified'}
Included Package Items: ${incs.join(', ') || 'Transport Only'}`;
      }
      case 'Tour Package': {
        return `[Tour Package Specifications]
Destination: ${tourPackage.destination || 'Not Specified'}
Travel Dates: ${tourPackage.travelDates || 'Not Specified'}
Accommodation Type: ${tourPackage.accommodation}
Guest Breakdown: ${tourPackage.adults} Adult(s), ${tourPackage.children} Child(ren)
Proposed Itinerary/Details: ${tourPackage.itinerary || 'Not Specified'}`;
      }
      case 'Visa Processing': {
        const reqs = [];
        if (visaProcessing.requirements.passport) reqs.push('Original Passport');
        if (visaProcessing.requirements.photo) reqs.push('Visa Photos');
        if (visaProcessing.requirements.bankCert) reqs.push('Bank Certificate');
        if (visaProcessing.requirements.itr) reqs.push('ITR (Income Tax Return)');
        if (visaProcessing.requirements.birthCert) reqs.push('Birth Certificate');
        return `[Visa Processing Specifications]
Visa Destination Country: ${visaProcessing.country}
Visa Type: ${visaProcessing.visaType}
Applicant Name(s): ${visaProcessing.applicants || 'Not Specified'}
Documents Submitted: ${reqs.join(', ') || 'Pending Submission'}`;
      }
      case 'Joiners': {
        return `[Joiner Tour Specifications]
Tour Destination/Code: ${joiners.tourCode || 'Not Specified'}
Travel Date: ${joiners.travelDate || 'Not Specified'}
Total Pax Count: ${joiners.paxCount} Pax
Pickup Point & Time: ${joiners.pickupLocation || 'Not Specified'}`;
      }
      case 'Booking': {
        return `[Booking Reservation Specifications]
Booking Category: ${booking.bookingType}
Confirmation Reference Code: ${booking.referenceCode || 'Not Specified'}
Passenger/Guest Names: ${booking.guests || 'Not Specified'}
Flight/Hotel/Itinerary Info: ${booking.details || 'Not Specified'}`;
      }
      default:
        return '';
    }
  };

  // Cart operations
  const addToCart = (
    service: any,
    quantity: number,
    busId?: number,
    selectedSeats?: string[],
    driverId?: number,
    driverName?: string,
    travelDate?: string,
    tourCode?: string,
    pickupLocation?: string,
    paxCount?: number
  ) => {
    setCart(prev => {
      const existing = prev.find(item => item.service.id === service.id);
      if (existing) {
        return prev.map(item =>
          item.service.id === service.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                busId,
                selectedSeats,
                driverId,
                driverName,
                travelDate,
                tourCode,
                pickupLocation,
                paxCount
              }
            : item
        );
      }
      return [
        ...prev,
        {
          service,
          quantity,
          busId,
          selectedSeats,
          driverId,
          driverName,
          travelDate,
          tourCode,
          pickupLocation,
          paxCount
        }
      ];
    });
  };

  const handleAddCustomTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name || customForm.price <= 0) {
      toast.error('Please enter a valid service name and price.');
      return;
    }

    try {
      setIsAddingCustom(true);
      
      // Auto-compile specifications text from category form data
      const autoDesc = generateAutoDescription(customForm.category);
      const finalDescription = autoDesc 
        ? `${autoDesc}${customForm.description ? `\n\n[Additional Remarks / Instructions]\n${customForm.description}` : ''}`
        : customForm.description;

      // Create service dynamically in the database
      const res = await billingApi.createService({
        name: customForm.name,
        category: customForm.category === 'Other' ? (customForm.otherCategory || 'Other') : customForm.category,
        price: customForm.price,
        description: finalDescription || 'Custom service arrangement',
        is_tour: false,
        has_booking_fields: false,
      });

      if (res?.data?.success || res?.data?.data) {
        const createdService = res.data.data;
        
        let busIdParam = undefined;
        let driverIdParam = undefined;
        let selectedSeatsParam = undefined;
        let driverNameParam = undefined;
        let travelDateParam = undefined;
        let tourCodeParam = undefined;
        let pickupLocationParam = undefined;
        let paxCountParam = undefined;

        if (customForm.category === 'Bus Rental') {
          busIdParam = busRental.busId || undefined;
          driverIdParam = busRental.driverId || undefined;
          selectedSeatsParam = busRental.selectedSeats.length > 0 ? busRental.selectedSeats : undefined;
          driverNameParam = busRental.driverName || undefined;
          travelDateParam = busRental.travelDate || undefined;
        } else if (customForm.category === 'Joiners') {
          travelDateParam = joiners.travelDate || undefined;
          tourCodeParam = joiners.tourCode || undefined;
          pickupLocationParam = joiners.pickupLocation || undefined;
          paxCountParam = joiners.paxCount || undefined;
        } else if (customForm.category === 'Tour Package') {
          travelDateParam = tourPackage.travelDates || undefined;
          tourCodeParam = tourPackage.destination || undefined;
          paxCountParam = (tourPackage.adults + tourPackage.children) || undefined;
        } else if (customForm.category === 'Educational Tour') {
          tourCodeParam = eduTour.schoolName || undefined;
          paxCountParam = eduTour.expectedPax || undefined;
        }

        // Add to order
        addToCart(
          createdService,
          1,
          busIdParam,
          selectedSeatsParam,
          driverIdParam,
          driverNameParam,
          travelDateParam,
          tourCodeParam,
          pickupLocationParam,
          paxCountParam
        );

        toast.success('Customized transaction registered & added to order!');
        
        // Reset forms
        setCustomForm({
          name: '',
          category: 'Bus Rental',
          otherCategory: '',
          price: 0,
          quantity: 1,
          description: '',
        });
        resetSubStates();

        // Invalidate queries so it shows in catalog if they look for it
        queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      } else {
        toast.error('Failed to register customized service');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error creating custom transaction service: ' + (err.message || 'unknown error'));
    } finally {
      setIsAddingCustom(false);
    }
  };

  const removeFromCart = (serviceId: number, _adults?: number, _childrenCount?: number, _vehicleType?: 'Bus' | 'Coaster', _busId?: number) => {
    setCart(prev => prev.filter(item => item.service.id !== serviceId));
  };

  const updateQuantity = (serviceId: number, newQty: number, _adults?: number, _childrenCount?: number, _vehicleType?: 'Bus' | 'Coaster', _busId?: number) => {
    if (newQty < 1) {
      removeFromCart(serviceId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.service.id === serviceId) {
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const renderCategoryFields = () => {
    switch (customForm.category) {
      case 'Bus Rental':
        return (
          <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Bus Rental Custom Specifications</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Vehicle Type</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={busRental.vehicleType}
                  onChange={(e) => setBusRental(prev => ({ ...prev, vehicleType: e.target.value }))}
                >
                  {['Bus', 'Coaster', 'Van', 'Sedan', 'SUV'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Number of Days</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={busRental.days}
                  onChange={(e) => setBusRental(prev => ({ ...prev, days: Math.max(1, Number(e.target.value)) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Travel Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
                  value={busRental.travelDate}
                  onChange={(e) => setBusRental(prev => ({ ...prev, travelDate: e.target.value, selectedSeats: [] }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assign Bus</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                  value={busRental.busId || ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    const selectedBusObj = buses.find((b: any) => b.id === id);
                    let driverIdVal = null;
                    let driverNameVal = '';
                    if (selectedBusObj && selectedBusObj.driver) {
                      driverIdVal = selectedBusObj.driver.id;
                      driverNameVal = `${selectedBusObj.driver.first_name} ${selectedBusObj.driver.last_name}`;
                    }
                    setBusRental(prev => ({
                      ...prev,
                      busId: id,
                      selectedSeats: [],
                      driverId: driverIdVal,
                      driverName: driverNameVal
                    }));
                  }}
                >
                  <option value="">Select a Bus...</option>
                  {buses.filter((b: any) => b.status?.toLowerCase() === 'available').map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.plate_number} - {b.model} ({b.seating_capacity} Seaters)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assign Driver</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                  value={busRental.driverId || ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    const d = drivers.find((x: any) => x.id === id);
                    const name = d ? `${d.first_name} ${d.last_name}` : '';
                    setBusRental(prev => ({ ...prev, driverId: id, driverName: name }));
                  }}
                >
                  <option value="">Select a Driver...</option>
                  {drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {/* Space holder */}
              </div>
            </div>

            {/* Seat Selector Layout */}
            {busRental.busId && busRental.travelDate && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Seats</label>
                <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <BusLayout
                    totalSeats={buses.find(b => b.id === busRental.busId)?.seating_capacity || 49}
                    hasRestroom={buses.find(b => b.id === busRental.busId)?.model?.toLowerCase().includes('vip') || false}
                    selectedSeats={busRental.selectedSeats}
                    occupiedSeats={occupiedSeats}
                    onSeatToggle={(seatNum) => {
                      setBusRental(prev => ({
                        ...prev,
                        selectedSeats: prev.selectedSeats.includes(seatNum)
                          ? prev.selectedSeats.filter(s => s !== seatNum)
                          : [...prev.selectedSeats, seatNum]
                      }));
                    }}
                  />
                </div>
                {busRental.selectedSeats.length > 0 && (
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest pl-1">
                    Selected: {busRental.selectedSeats.join(', ')} ({busRental.selectedSeats.length} seats selected)
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Route / Destination</label>
                <input
                  type="text"
                  placeholder="e.g. Caloocan to Baguio City"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={busRental.route}
                  onChange={(e) => setBusRental(prev => ({ ...prev, route: e.target.value }))}
                />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assigned Plate / Unit</label>
                <input
                  type="text"
                  placeholder="e.g. ABC 1234 (Optional)"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={busRental.plateNumber}
                  onChange={(e) => setBusRental(prev => ({ ...prev, plateNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Rental Inclusions</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(busRental.inclusions).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBusRental(prev => ({
                      ...prev,
                      inclusions: { ...prev.inclusions, [key]: !val }
                    }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      val
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-gray-205'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${val ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                      {val && <LuCheck className="w-3 h-3" />}
                    </div>
                    <span className="capitalize">{key === 'driver' ? 'Driver Included' : key === 'fuel' ? 'Fuel Included' : key === 'toll' ? 'Toll Fees' : 'Insurance'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'Educational Tour':
        return (
          <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Educational Tour Custom Specifications</p>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">School / Institution Name</label>
              <input
                type="text"
                placeholder="e.g. Camarin High School"
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                value={eduTour.schoolName}
                onChange={(e) => setEduTour(prev => ({ ...prev, schoolName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Grade / Year Level</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 10 & 11"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={eduTour.gradeLevel}
                  onChange={(e) => setEduTour(prev => ({ ...prev, gradeLevel: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Expected Headcount</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={eduTour.expectedPax}
                  onChange={(e) => setEduTour(prev => ({ ...prev, expectedPax: Math.max(1, Number(e.target.value)) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Itinerary Stops</label>
              <textarea
                placeholder="e.g. Science Centrum, Planetarium, Ocean Park..."
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[60px] dark:text-white"
                value={eduTour.stops}
                onChange={(e) => setEduTour(prev => ({ ...prev, stops: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Package Inclusions</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(eduTour.inclusions).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEduTour(prev => ({
                      ...prev,
                      inclusions: { ...prev.inclusions, [key]: !val }
                    }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      val
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-gray-205'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${val ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                      {val && <LuCheck className="w-3 h-3" />}
                    </div>
                    <span className="capitalize">{key === 'meals' ? 'Student Meals' : key === 'coordinator' ? 'Tour Coordinator' : key === 'insurance' ? 'Travel Insurance' : 'Souvenir T-Shirt'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'Tour Package':
        return (
          <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Tour Package Custom Specifications</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tour Destination</label>
                <input
                  type="text"
                  placeholder="e.g. Boracay 3D2N"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={tourPackage.destination}
                  onChange={(e) => setTourPackage(prev => ({ ...prev, destination: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Travel Dates</label>
                <input
                  type="text"
                  placeholder="e.g. June 15-18, 2026"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={tourPackage.travelDates}
                  onChange={(e) => setTourPackage(prev => ({ ...prev, travelDates: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Adults</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={tourPackage.adults}
                  onChange={(e) => setTourPackage(prev => ({ ...prev, adults: Math.max(1, Number(e.target.value)) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Children</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={tourPackage.children}
                  onChange={(e) => setTourPackage(prev => ({ ...prev, children: Math.max(0, Number(e.target.value)) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Accommodation</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={tourPackage.accommodation}
                  onChange={(e) => setTourPackage(prev => ({ ...prev, accommodation: e.target.value }))}
                >
                  {['Hotel', 'Resort', 'Transient', 'Hostel', 'None'].map(acc => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Itinerary / Specifics</label>
              <textarea
                placeholder="Include flight detail, preferred hotels, or tours list..."
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[80px] dark:text-white"
                value={tourPackage.itinerary}
                onChange={(e) => setTourPackage(prev => ({ ...prev, itinerary: e.target.value }))}
              />
            </div>
          </div>
        );

      case 'Visa Processing':
        return (
          <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Visa Processing Custom Specifications</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Destination Country</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={visaProcessing.country}
                  onChange={(e) => setVisaProcessing(prev => ({ ...prev, country: e.target.value }))}
                >
                  {['Japan', 'South Korea', 'USA', 'Canada', 'Schengen', 'Australia', 'United Kingdom', 'Others'].map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Visa Type</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={visaProcessing.visaType}
                  onChange={(e) => setVisaProcessing(prev => ({ ...prev, visaType: e.target.value }))}
                >
                  {['Tourist', 'Business', 'Student', 'Sponsorship / Family Visit'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Applicant Name(s)</label>
              <textarea
                placeholder="e.g. Juan dela Cruz, Maria dela Cruz (one name per line or separated by comma)"
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[60px] dark:text-white"
                value={visaProcessing.applicants}
                onChange={(e) => setVisaProcessing(prev => ({ ...prev, applicants: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Requirements Submitted</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(visaProcessing.requirements).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVisaProcessing(prev => ({
                      ...prev,
                      requirements: { ...prev.requirements, [key]: !val }
                    }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      val
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-gray-205'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${val ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                      {val && <LuCheck className="w-3 h-3" />}
                    </div>
                    <span className="capitalize">{key === 'passport' ? 'Original Passport' : key === 'photo' ? 'Photos' : key === 'bankCert' ? 'Bank Certificate' : key === 'itr' ? 'ITR' : 'Birth Certificate'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'Joiners':
        return (
          <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Joiner Tour Custom Specifications</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tour Destination / Code</label>
                <input
                  type="text"
                  placeholder="e.g. Sagada Weekend Joiners"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={joiners.tourCode}
                  onChange={(e) => setJoiners(prev => ({ ...prev, tourCode: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Travel Date</label>
                <input
                  type="text"
                  placeholder="e.g. June 19, 2026"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={joiners.travelDate}
                  onChange={(e) => setJoiners(prev => ({ ...prev, travelDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pax Count</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={joiners.paxCount}
                  onChange={(e) => setJoiners(prev => ({ ...prev, paxCount: Math.max(1, Number(e.target.value)) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pickup Location & Time</label>
                <input
                  type="text"
                  placeholder="e.g. MoA Globe, 10:00 PM"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={joiners.pickupLocation}
                  onChange={(e) => setJoiners(prev => ({ ...prev, pickupLocation: e.target.value }))}
                />
              </div>
            </div>
          </div>
        );

      case 'Booking':
        return (
          <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Booking Reservation Custom Specifications</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Booking Type</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={booking.bookingType}
                  onChange={(e) => setBooking(prev => ({ ...prev, bookingType: e.target.value }))}
                >
                  {['Flight', 'Hotel', 'Activities / Attractions', 'Ferry', 'Bus Ticket', 'Others'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Reference / Confirmation Code</label>
                <input
                  type="text"
                  placeholder="e.g. PNR A1B2C3"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={booking.referenceCode}
                  onChange={(e) => setBooking(prev => ({ ...prev, referenceCode: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Passenger / Guest Name(s)</label>
              <textarea
                placeholder="e.g. John Doe, Jane Doe"
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[60px] dark:text-white"
                value={booking.guests}
                onChange={(e) => setBooking(prev => ({ ...prev, guests: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Flight / Hotel / Reservation Details</label>
              <textarea
                placeholder="e.g. MNL-MPH PR2039 / Shangri-La Deluxe Room"
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[60px] dark:text-white"
                value={booking.details}
                onChange={(e) => setBooking(prev => ({ ...prev, details: e.target.value }))}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const autoDesc = generateAutoDescription(customForm.category);

  return (
    <div className={`gap-6 animate-in fade-in duration-700 flex flex-col lg:flex-row transition-colors lg:h-[calc(100vh-100px)] ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Left Side: Custom Booking Form */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm overflow-y-auto custom-scrollbar animate-in fade-in duration-300">
          <div className="max-w-xl mx-auto space-y-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                New Customized Transaction
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Record personalized itineraries, custom tour events, transport layouts, or dynamic services directly to checkout.
              </p>
            </div>

            <form onSubmit={handleAddCustomTransaction} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Service / Booking Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tailored Travel, Tours and Printing Bundle"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={customForm.name}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Category
                  </label>
                  <select
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                    value={customForm.category}
                    onChange={(e) => {
                      setCustomForm(prev => ({ ...prev, category: e.target.value, otherCategory: '' }));
                    }}
                  >
                    {['Bus Rental', 'Educational Tour', 'Tour Package', 'Visa Processing', 'Joiners', 'Booking', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Base Rate / Price (PHP)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="PHP Price"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                    value={customForm.price || ''}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {customForm.category === 'Other' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1">
                    Specify Service Type
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corporate Event, Charter Flight..."
                    className="w-full px-5 py-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/10 transition-all dark:text-white"
                    value={customForm.otherCategory}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, otherCategory: e.target.value }))}
                  />
                </div>
              )}

              {/* Customized category specifications fields */}
              {renderCategoryFields()}

              {/* Dynamic specifications compiled preview */}
              {autoDesc && (
                <div className="p-5 rounded-[2rem] bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 space-y-2 animate-in fade-in duration-300">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-450 uppercase tracking-widest pl-0.5 flex items-center gap-1.5">
                    <LuFileText className="w-3.5 h-3.5" /> Live Specifications Preview
                  </p>
                  <pre className="text-[11px] font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {autoDesc}
                  </pre>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Additional Notes & Special Instructions
                </label>
                <textarea
                  placeholder="Enter itinerary details, specific hotel preferences, timing, or any custom client remarks..."
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[100px] dark:text-white"
                  value={customForm.description}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                disabled={isAddingCustom}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                {isAddingCustom ? (
                  <>
                    <LuLoaderCircle className="w-4 h-4 animate-spin" />
                    Adding Item...
                  </>
                ) : (
                  <>
                    <LuPlus className="w-4 h-4" />
                    Add Item
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side: Checkout Panel */}
      <SalesCheckout
        cart={cart}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
        clearCart={() => setCart([])}
      />
    </div>
  );
}
