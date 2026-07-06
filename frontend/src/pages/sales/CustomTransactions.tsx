import { useState, useMemo, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  LuPlus,
  LuLoaderCircle,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { billingApi } from '../../api/billing';
import type { CustomTransactionDetailInput, ItineraryDayInput, PassengerInput } from '../../api/contracts';
import { useTheme } from '../../context/ThemeContext';
import SalesCheckout, { type CartItem } from './SalesCheckout';
import client from '../../api/client';
import { fleetApi } from '../../api/fleet';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import CategoryFormBusRental from './components/CategoryFormBusRental';
import CategoryFormEducationalTour from './components/CategoryFormEducationalTour';
import CategoryFormTourPackage from './components/CategoryFormTourPackage';
import CategoryFormVisaProcessing from './components/CategoryFormVisaProcessing';
import CategoryFormJoiners from './components/CategoryFormJoiners';
import CategoryFormBooking from './components/CategoryFormBooking';
import ItineraryBuilder from './components/ItineraryBuilder';
import PassengerRosterEditor from './components/PassengerRosterEditor';
import {
  INITIAL_BUS_RENTAL, INITIAL_EDU_TOUR, INITIAL_TOUR_PACKAGE,
  INITIAL_VISA_PROCESSING, INITIAL_JOINERS, INITIAL_BOOKING,
} from './components/customTransactionTypes';

const CATEGORIES = ['Bus Rental', 'Educational Tour', 'Tour Package', 'Visa Processing', 'Joiners', 'Booking', 'Other'];

// Categories that get the optional structured itinerary / passenger roster builders.
const ITINERARY_CATEGORIES = ['Tour Package', 'Educational Tour'];
const PASSENGER_CATEGORIES = ['Tour Package', 'Visa Processing', 'Joiners', 'Booking'];

export default function CustomTransactions() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const { data: busesRes } = useQuery({
    queryKey: ['buses-list'],
    queryFn: () => fleetApi.list({ per_page: 100 }),
  });
  const buses = busesRes?.data?.data ?? [];

  const { data: drivers = [] } = useQuery({
    queryKey: ['active-drivers'],
    queryFn: async () => {
      const res = await client.get('/chat/users');
      const allUsers = res.data?.data ?? [];
      return allUsers.filter((u: any) => u.role === 'driver' && u.is_active);
    },
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    category: 'Bus Rental',
    otherCategory: '',
    price: '',
    quantity: 1,
    description: '',
  });

  // Category-specific structured data — one state object keyed by category name.
  const [busRental, setBusRental] = useState(INITIAL_BUS_RENTAL);
  const [eduTour, setEduTour] = useState(INITIAL_EDU_TOUR);
  const [tourPackage, setTourPackage] = useState(INITIAL_TOUR_PACKAGE);
  const [visaProcessing, setVisaProcessing] = useState(INITIAL_VISA_PROCESSING);
  const [joiners, setJoiners] = useState(INITIAL_JOINERS);
  const [booking, setBooking] = useState(INITIAL_BOOKING);

  // Optional structured itinerary / passenger roster, shared across applicable categories.
  const [itineraryRows, setItineraryRows] = useState<ItineraryDayInput[]>([]);
  const [passengerRows, setPassengerRows] = useState<PassengerInput[]>([]);

  const activeBusId = useMemo(() => {
    if (customForm.category === 'Bus Rental') {
      return busRental.busId;
    } else if (customForm.category === 'Educational Tour') {
      return eduTour.busId ? Number(eduTour.busId) : null;
    }
    return null;
  }, [customForm.category, busRental.busId, eduTour.busId]);

  const activeTravelDate = useMemo(() => {
    if (customForm.category === 'Bus Rental') {
      return busRental.travelDate;
    } else if (customForm.category === 'Educational Tour') {
      return eduTour.serviceDate;
    }
    return '';
  }, [customForm.category, busRental.travelDate, eduTour.serviceDate]);

  // Load calendar for selected bus to check seat occupancy and conflicts on travel date
  const { data: busCalendarRes } = useQuery({
    queryKey: ['bus-calendar', activeBusId, activeTravelDate ? activeTravelDate.substring(0, 7) : ''],
    queryFn: async () => {
      if (!activeBusId || !activeTravelDate) return null;
      const date = new Date(activeTravelDate);
      const res = await fleetApi.getCalendar(activeBusId, { month: date.getMonth() + 1, year: date.getFullYear() });
      return res.data;
    },
    enabled: !!activeBusId && !!activeTravelDate,
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

  const isBusBookedOnDate = useMemo(() => {
    if (!busCalendarRes?.data || !activeTravelDate) return false;
    const entries = busCalendarRes.data;
    return entries.some((e: any) => e.date === activeTravelDate);
  }, [busCalendarRes, activeTravelDate]);

  // Autocalculate price based on category inputs
  useEffect(() => {
    let calculatedPrice = 0;
    switch (customForm.category) {
      case 'Bus Rental': {
        const baseRates: Record<string, number> = {
          'Bus': 10000,
          'Coaster': 8000,
          'Van': 5000,
          'Sedan': 3000,
          'SUV': 4500
        };
        const base = baseRates[busRental.vehicleType] || 5000;
        const days = Number(busRental.days) || 1;
        calculatedPrice = base * days;
        break;
      }
      case 'Educational Tour': {
        const pax = Number(eduTour.expectedPax) || 0;
        calculatedPrice = 800 * pax;
        break;
      }
      case 'Tour Package': {
        const adults = Number(tourPackage.adults) || 0;
        const children = Number(tourPackage.children) || 0;
        calculatedPrice = (1500 * adults) + (1000 * children);
        break;
      }
      case 'Visa Processing': {
        const count = visaProcessing.applicants.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).length || 1;
        calculatedPrice = 2500 * count;
        break;
      }
      case 'Joiners': {
        const pax = Number(joiners.paxCount) || 0;
        calculatedPrice = 2000 * pax;
        break;
      }
      case 'Booking': {
        const count = booking.guests.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).length || 1;
        calculatedPrice = 1500 * count;
        break;
      }
      default:
        return; // Don't overwrite manually typed price for 'Other' or unknown
    }

    if (calculatedPrice > 0) {
      setCustomForm(prev => ({
        ...prev,
        price: formatMoneyInput(calculatedPrice.toString())
      }));
    }
  }, [
    customForm.category,
    busRental.vehicleType,
    busRental.days,
    eduTour.expectedPax,
    tourPackage.adults,
    tourPackage.children,
    visaProcessing.applicants,
    joiners.paxCount,
    booking.guests
  ]);

  const resetSubStates = () => {
    setBusRental(INITIAL_BUS_RENTAL);
    setEduTour(INITIAL_EDU_TOUR);
    setTourPackage(INITIAL_TOUR_PACKAGE);
    setVisaProcessing(INITIAL_VISA_PROCESSING);
    setJoiners(INITIAL_JOINERS);
    setBooking(INITIAL_BOOKING);
    setItineraryRows([]);
    setPassengerRows([]);
  };

  /** Builds the structured custom_transaction_detail payload sent to the backend (Contract/Invoice). */
  const buildCustomTransactionDetail = (category: string): CustomTransactionDetailInput => {
    switch (category) {
      case 'Bus Rental':
        return {
          category,
          vehicle_type: busRental.vehicleType,
          route: busRental.route || undefined,
          rental_days: Number(busRental.days || 1),
          plate_number: busRental.plateNumber || undefined,
          inclusion_driver: busRental.inclusions.driver,
          inclusion_fuel: busRental.inclusions.fuel,
          inclusion_toll: busRental.inclusions.toll,
          inclusion_insurance: busRental.inclusions.insurance,
          additional_remarks: customForm.description || undefined,
        };
      case 'Educational Tour':
        return {
          category,
          school_name: eduTour.schoolName || undefined,
          grade_level: eduTour.gradeLevel || undefined,
          expected_pax: Number(eduTour.expectedPax || 0) || undefined,
          itinerary_stops: eduTour.stops || undefined,
          edu_inclusion_meals: eduTour.inclusions.meals,
          edu_inclusion_coordinator: eduTour.inclusions.coordinator,
          edu_inclusion_insurance: eduTour.inclusions.insurance,
          edu_inclusion_tshirt: eduTour.inclusions.tshirt,
          additional_remarks: customForm.description || undefined,
        };
      case 'Tour Package':
        return {
          category,
          destination: tourPackage.destination || undefined,
          accommodation_type: tourPackage.accommodation,
          additional_remarks: customForm.description || undefined,
        };
      case 'Visa Processing':
        return {
          category,
          visa_country: visaProcessing.country,
          visa_type: visaProcessing.visaType,
          visa_req_passport: visaProcessing.requirements.passport,
          visa_req_photo: visaProcessing.requirements.photo,
          visa_req_bank_cert: visaProcessing.requirements.bankCert,
          visa_req_itr: visaProcessing.requirements.itr,
          visa_req_birth_cert: visaProcessing.requirements.birthCert,
          additional_remarks: customForm.description || undefined,
        };
      case 'Joiners':
        return {
          category,
          joiner_tour_code: joiners.tourCode || undefined,
          additional_remarks: customForm.description || undefined,
        };
      case 'Booking':
        return {
          category,
          booking_type: booking.bookingType,
          booking_reference_code: booking.referenceCode || undefined,
          booking_details: booking.details || undefined,
          additional_remarks: customForm.description || undefined,
        };
      default:
        return {
          category,
          category_meta: { otherCategory: customForm.otherCategory },
          additional_remarks: customForm.description || undefined,
        };
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
    paxCount?: number,
    serviceDate?: string,
    destination?: string,
    customCategoryDetail?: CustomTransactionDetailInput,
    itinerary?: ItineraryDayInput[],
    passengers?: PassengerInput[]
  ) => {
    setCart(prev => [
      ...prev,
      {
        service,
        quantity,
        customPrice: service.price,
        busId,
        selectedSeats,
        driverId,
        driverName,
        travelDate,
        tourCode,
        pickupLocation,
        paxCount,
        serviceDate,
        destination,
        customCategoryDetail,
        itinerary,
        passengers,
      }
    ]);
  };

  const handleAddCustomTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrice = parseMoneyInput(customForm.price);
    if (!customForm.name || customForm.price === '' || Number(cleanPrice) <= 0) {
      toast.error('Please enter a valid service name and price.');
      return;
    }

    if (isBusBookedOnDate) {
      toast.error('The selected bus unit is already booked/reserved on the specified travel date.');
      return;
    }

    try {
      setIsAddingCustom(true);

      const category = customForm.category === 'Other' ? (customForm.otherCategory || 'Other') : customForm.category;
      const customCategoryDetail = buildCustomTransactionDetail(customForm.category);

      // Create service dynamically in the database (catalog/pricing role only — the structured
      // data above, not this description, is the source of truth for tour/contract details).
      const res = await billingApi.createService({
        name: customForm.name,
        category,
        price: Number(cleanPrice || 0),
        description: customForm.description || `Custom ${category} arrangement`,
        is_tour: false,
        has_booking_fields: false,
      });

      if (res?.data?.success || res?.data?.data) {
        const createdService = res.data.data;

        let busIdParam: number | undefined;
        let driverIdParam: number | undefined;
        let selectedSeatsParam: string[] | undefined;
        let driverNameParam: string | undefined;
        let travelDateParam: string | undefined;
        let tourCodeParam: string | undefined;
        let pickupLocationParam: string | undefined;
        let paxCountParam: number | undefined;
        let serviceDateParam: string | undefined;
        let destinationParam: string | undefined;

        if (customForm.category === 'Bus Rental') {
          busIdParam = busRental.busId || undefined;
          driverIdParam = busRental.driverId || undefined;
          selectedSeatsParam = busRental.selectedSeats.length > 0 ? busRental.selectedSeats : undefined;
          driverNameParam = busRental.driverName || undefined;
          travelDateParam = busRental.travelDate || undefined;
          serviceDateParam = busRental.serviceDate || undefined;
          tourCodeParam = busRental.route || undefined;
          destinationParam = busRental.dropoffLocation || undefined;
          pickupLocationParam = busRental.pickupLocation || undefined;
          paxCountParam = busRental.paxCount ? Number(busRental.paxCount) : undefined;
        } else if (customForm.category === 'Joiners') {
          travelDateParam = joiners.travelDate || undefined;
          tourCodeParam = joiners.tourCode || undefined;
          pickupLocationParam = joiners.pickupLocation || undefined;
          paxCountParam = joiners.paxCount ? Number(joiners.paxCount) : undefined;
          serviceDateParam = joiners.travelDate || undefined;
          destinationParam = joiners.dropoffLocation || joiners.tourCode || undefined;
        } else if (customForm.category === 'Tour Package') {
          travelDateParam = tourPackage.travelDates || undefined;
          tourCodeParam = tourPackage.destination || undefined;
          paxCountParam = (Number(tourPackage.adults || 0) + Number(tourPackage.children || 0)) || undefined;
          serviceDateParam = tourPackage.travelDates || undefined;
          destinationParam = tourPackage.destination || undefined;
        } else if (customForm.category === 'Educational Tour') {
          tourCodeParam = eduTour.schoolName || undefined;
          paxCountParam = eduTour.expectedPax ? Number(eduTour.expectedPax) : undefined;
          serviceDateParam = eduTour.serviceDate || undefined;
          destinationParam = eduTour.stops || undefined;
          busIdParam = eduTour.busId ? Number(eduTour.busId) : undefined;
        }

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
          paxCountParam,
          serviceDateParam,
          destinationParam,
          customCategoryDetail,
          itineraryRows.length > 0 ? itineraryRows : undefined,
          passengerRows.length > 0 ? passengerRows : undefined
        );

        toast.success('Customized transaction registered & added to order!');

        setCustomForm({
          name: '',
          category: 'Bus Rental',
          otherCategory: '',
          price: '',
          quantity: 1,
          description: '',
        });
        resetSubStates();

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
          <CategoryFormBusRental
            value={busRental}
            onChange={(patch) => setBusRental(prev => ({ ...prev, ...patch }))}
            buses={buses}
            drivers={drivers}
            occupiedSeats={occupiedSeats}
          />
        );
      case 'Educational Tour':
        return (
          <CategoryFormEducationalTour
            value={eduTour}
            onChange={(patch) => setEduTour(prev => ({ ...prev, ...patch }))}
            buses={buses}
          />
        );
      case 'Tour Package':
        return (
          <CategoryFormTourPackage
            value={tourPackage}
            onChange={(patch) => setTourPackage(prev => ({ ...prev, ...patch }))}
          />
        );
      case 'Visa Processing':
        return (
          <CategoryFormVisaProcessing
            value={visaProcessing}
            onChange={(patch) => setVisaProcessing(prev => ({ ...prev, ...patch }))}
          />
        );
      case 'Joiners':
        return (
          <CategoryFormJoiners
            value={joiners}
            onChange={(patch) => setJoiners(prev => ({ ...prev, ...patch }))}
          />
        );
      case 'Booking':
        return (
          <CategoryFormBooking
            value={booking}
            onChange={(patch) => setBooking(prev => ({ ...prev, ...patch }))}
          />
        );
      default:
        return null;
    }
  };

  const showItineraryBuilder = ITINERARY_CATEGORIES.includes(customForm.category);
  const showPassengerRoster = PASSENGER_CATEGORIES.includes(customForm.category);

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
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Base Rate / Price (PHP)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="PHP Price"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                    value={customForm.price}
                    onChange={(e) => {
                      const clean = parseMoneyInput(e.target.value);
                      if ((clean.split('.').length - 1) > 1) return;
                      const formatted = formatMoneyInput(e.target.value);
                      setCustomForm(prev => ({ ...prev, price: formatted }));
                    }}
                    onKeyDown={(e) => {
                      if (e.ctrlKey || e.metaKey) return;
                      if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
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

              {isBusBookedOnDate && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-2xl text-xs font-bold animate-pulse">
                  ⚠️ WARNING: The selected bus unit is already booked/reserved on the specified travel date ({activeTravelDate}). Please select another date or bus.
                </div>
              )}

              {showItineraryBuilder && (
                <ItineraryBuilder value={itineraryRows} onChange={setItineraryRows} />
              )}

              {showPassengerRoster && (
                <PassengerRosterEditor value={passengerRows} onChange={setPassengerRows} />
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
