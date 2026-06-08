import { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  LuPlus,
  LuLoaderCircle,
  LuCheck,
  LuFileText
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { billingApi } from '../../api/billing';
import { fleetApi } from '../../api/fleet';
import { useTheme } from '../../context/ThemeContext';
import SalesCheckout, { type CartItem } from './SalesCheckout';

export default function CustomTransactions() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const { data: busesRes } = useQuery({
    queryKey: ['fleet-buses'],
    queryFn: () => fleetApi.list({ per_page: 100 }),
  });
  const buses = busesRes?.data?.data || [];

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
    serviceDate: '',
    days: 1,
    busId: '',
    inclusions: { driver: true, fuel: true, toll: false, insurance: true } as Record<string, boolean>
  });

  // 2. Educational Tour Custom Data
  const [eduTour, setEduTour] = useState({
    schoolName: '',
    gradeLevel: '',
    expectedPax: 50,
    stops: '',
    serviceDate: '',
    busId: '',
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
      serviceDate: '',
      days: 1,
      busId: '',
      inclusions: { driver: true, fuel: true, toll: false, insurance: true }
    });
    setEduTour({
      schoolName: '',
      gradeLevel: '',
      expectedPax: 50,
      stops: '',
      serviceDate: '',
      busId: '',
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
Service Date: ${busRental.serviceDate || 'Not Specified'}
Duration: ${busRental.days} Day(s)
Assigned Bus ID: ${busRental.busId || 'To Be Determined'}
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
Service Date: ${eduTour.serviceDate || 'Not Specified'}
Expected Count: ${eduTour.expectedPax} Pax
Itinerary Stops: ${eduTour.stops || 'Not Specified'}
Assigned Bus ID: ${eduTour.busId || 'To Be Determined'}
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
  const addToCart = (service: any, quantity: number, extraData?: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.service.id === service.id);
      if (existing) {
        return prev.map(item =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + quantity, ...extraData }
            : item
        );
      }
      return [...prev, { service, quantity, ...extraData }];
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
        
        let extraData: any = {};
        if (customForm.category === 'Bus Rental') {
           extraData = { serviceDate: busRental.serviceDate, destination: busRental.route, busId: busRental.busId ? Number(busRental.busId) : undefined };
        } else if (customForm.category === 'Educational Tour') {
           extraData = { serviceDate: eduTour.serviceDate, destination: eduTour.stops, busId: eduTour.busId ? Number(eduTour.busId) : undefined };
        } else if (customForm.category === 'Tour Package') {
           extraData = { serviceDate: tourPackage.travelDates, destination: tourPackage.destination };
        } else if (customForm.category === 'Joiners') {
           extraData = { serviceDate: joiners.travelDate, destination: joiners.tourCode };
        }

        // Add to order
        addToCart(createdService, 1, extraData);

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

  const removeFromCart = (serviceId: number) => {
    setCart(prev => prev.filter(item => item.service.id !== serviceId));
  };

  const updateQuantity = (serviceId: number, newQty: number) => {
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Service Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={busRental.serviceDate}
                  onChange={(e) => setBusRental(prev => ({ ...prev, serviceDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assigned Bus Unit (Optional)</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={busRental.busId}
                  onChange={(e) => setBusRental(prev => ({ ...prev, busId: e.target.value }))}
                >
                  <option value="">-- Let Dispatch Assign Later --</option>
                  {buses.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number} - {b.plate_number} ({b.type})
                    </option>
                  ))}
                </select>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Service Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={eduTour.serviceDate}
                  onChange={(e) => setEduTour(prev => ({ ...prev, serviceDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assigned Bus Unit (Optional)</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={eduTour.busId}
                  onChange={(e) => setEduTour(prev => ({ ...prev, busId: e.target.value }))}
                >
                  <option value="">-- Let Dispatch Assign Later --</option>
                  {buses.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number} - {b.plate_number} ({b.type})
                    </option>
                  ))}
                </select>
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
