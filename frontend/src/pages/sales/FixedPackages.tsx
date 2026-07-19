import { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuSearch,
  LuPlus,
  LuMinus,
  LuImage,
  LuBox,
  LuChevronLeft,
  LuChevronRight,
  LuX,
  LuCheck,
  LuPrinter
} from 'react-icons/lu';
import { Pencil, Trash2 } from 'lucide-react';
import { billingApi, type Service } from '../../api/billing';
import client from '../../api/client';
import { fleetApi } from '../../api/fleet';
import BusLayout from '../../components/ui/BusLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LoadingScreen, Dropdown, ConfirmDialog } from '../../components/ui';
import SalesCheckout, { type CartItem } from './SalesCheckout';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import { getBreakdownSum, type NewServiceForm } from './fixedPackagesUtils';
import QuotationRecipientModal from './QuotationRecipientModal';
import FixedPackageServiceFormModal from './FixedPackageServiceFormModal';

export default function FixedPackages() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Service Management State
  const [showAddService, setShowAddService] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<Service | null>(null);
  const [serviceImages, setServiceImages] = useState<string[]>([]);
  const [newService, setNewService] = useState<NewServiceForm>({
    name: '',
    category: 'Package',
    description: '',
    price: '',
    image_url: '',
    child_discount: '30',
    has_booking_fields: false,
    adult_price: '',
    child_price: '',
    is_tour: false,
    bus_price: '',
    coaster_price: '',
    tour_kms: '',
    tour_hours: '',
    cost_breakdown: '',
    inclusions: '',
    exclusions: '',
  });
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [cardImageIndices, setCardImageIndices] = useState<Record<number, number>>({});

  // Booking passenger states
  const [bookingAdults, setBookingAdults] = useState<number>(1);
  const [bookingChildren, setBookingChildren] = useState<number>(0);

  // Tour booking states
  const [bookingTourVehicle, setBookingTourVehicle] = useState<'Bus' | 'Coaster'>('Bus');
  const [bookingTourExtraDays, setBookingTourExtraDays] = useState<number>(0);
  const [bookingTourExtraHours, setBookingTourExtraHours] = useState<number>(0);

  // Bus rental/seat selection states
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingArrivalDate, setBookingArrivalDate] = useState<string>('');
  const [bookingDepartureDate, setBookingDepartureDate] = useState<string>('');
  const [bookingBusId, setBookingBusId] = useState<number | null>(null);
  const [bookingDriverId, setBookingDriverId] = useState<number | null>(null);
  const [bookingDriverName, setBookingDriverName] = useState<string>('');
  const [bookingSeats, setBookingSeats] = useState<string[]>([]);

  // Helper variables for selected service category
  const selectedServiceCategory = (selectedServiceForDetail?.category || '').trim().toLowerCase();
  const isBusRentalCategory = selectedServiceCategory === 'bus rental' || selectedServiceCategory === 'transport';

  // Joiner specifications states
  const [joinerTourCode, setJoinerTourCode] = useState<string>('');
  const [joinerPickup, setJoinerPickup] = useState<string>('');
  const [joinerDropoff, setJoinerDropoff] = useState<string>('');
  const [joinerPaxCount, setJoinerPaxCount] = useState<number | ''>(1);
  const [editingCartId, setEditingCartId] = useState<string | null>(null);

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setEditingCartId(null);
  };

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

  // Load calendar for selected bus to check seat occupancy on travel date
  const { data: busCalendarRes } = useQuery({
    queryKey: ['bus-calendar', bookingBusId, bookingDate ? bookingDate.substring(0, 7) : ''],
    queryFn: async () => {
      if (!bookingBusId || !bookingDate) return null;
      const date = new Date(bookingDate);
      const res = await fleetApi.getCalendar(bookingBusId, { month: date.getMonth() + 1, year: date.getFullYear() });
      return res.data;
    },
    enabled: !!bookingBusId && !!bookingDate,
  });

  const occupiedSeats = useMemo(() => {
    if (!busCalendarRes?.data || !bookingDate) return [];
    const entries = busCalendarRes.data;
    // Trip tickets or Invoices on this travel date make seats unavailable
    const sameDayInvoices = entries.filter((e: any) => e.date === bookingDate && e.type === 'invoice');
    const seats: string[] = [];
    sameDayInvoices.forEach((inv: any) => {
      if (Array.isArray(inv.seat_map)) {
        seats.push(...inv.seat_map);
      }
    });
    return seats;
  }, [busCalendarRes, bookingDate]);

  // Confirm dialog state
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error' }>({ open: false, title: '', message: '', variant: 'success' });

  // Load services
  const { data: servicesData, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['billing-services'],
    queryFn: async () => {
      const res = await billingApi.getServices();
      return Array.isArray(res?.data?.data) ? res.data.data : [];
    },
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  const services: Service[] = servicesData || [];

  // Card image slideshow controllers
  const handlePrevImage = (e: React.MouseEvent, serviceId: number, maxImages: number) => {
    e.stopPropagation();
    setCardImageIndices(prev => {
      const current = prev[serviceId] || 0;
      return {
        ...prev,
        [serviceId]: current === 0 ? maxImages - 1 : current - 1
      };
    });
  };

  const handleNextImage = (e: React.MouseEvent, serviceId: number, maxImages: number) => {
    e.stopPropagation();
    setCardImageIndices(prev => {
      const current = prev[serviceId] || 0;
      return {
        ...prev,
        [serviceId]: (current + 1) % maxImages
      };
    });
  };

  // Cart operations
  const addToCart = (
    service: Service,
    adults?: number,
    childrenCount?: number,
    customPrice?: number,
    vehicleType?: 'Bus' | 'Coaster',
    extraDays?: number,
    extraHours?: number,
    busId?: number,
    selectedSeats?: string[],
    driverId?: number,
    driverName?: string,
    travelDate?: string,
    tourCode?: string,
    pickupLocation?: string,
    paxCount?: number,
    arrivalDate?: string,
    departureDate?: string,
    destination?: string
  ) => {
    setCart(prev => {
      const cartId = `${service.id}-${Date.now()}-${Math.random()}`;
      return [...prev, {
        cartId,
        service,
        quantity: 1,
        adults,
        childrenCount,
        customPrice,
        vehicleType,
        extraDays,
        extraHours,
        busId,
        selectedSeats,
        driverId,
        driverName,
        travelDate,
        tourCode,
        pickupLocation,
        paxCount,
        arrivalDate,
        departureDate,
        destination
      }];
    });
  };

  const saveCartItemEdit = (
    cartId: string,
    adults?: number,
    childrenCount?: number,
    customPrice?: number,
    vehicleType?: 'Bus' | 'Coaster',
    extraDays?: number,
    extraHours?: number,
    busId?: number,
    selectedSeats?: string[],
    driverId?: number,
    driverName?: string,
    travelDate?: string,
    tourCode?: string,
    pickupLocation?: string,
    paxCount?: number,
    arrivalDate?: string,
    departureDate?: string,
    destination?: string
  ) => {
    setCart(prev => prev.map(item =>
      item.cartId === cartId
        ? {
          ...item,
          adults,
          childrenCount,
          customPrice,
          vehicleType,
          extraDays,
          extraHours,
          busId,
          selectedSeats,
          driverId,
          driverName,
          travelDate,
          tourCode,
          pickupLocation,
          paxCount,
          arrivalDate,
          departureDate,
          destination
        }
        : item
    ));
  };

  const removeFromCart = (serviceId: number, adults?: number, childrenCount?: number, vehicleType?: 'Bus' | 'Coaster', busId?: number, cartId?: string) => {
    setCart(prev => prev.filter(item => {
      if (cartId && item.cartId) {
        return item.cartId !== cartId;
      }
      return !(item.service.id === serviceId && item.adults === adults && item.childrenCount === childrenCount && item.vehicleType === vehicleType && item.busId === busId);
    }));
  };

  const updateQuantity = (serviceId: number, newQty: number, adults?: number, childrenCount?: number, vehicleType?: 'Bus' | 'Coaster', busId?: number, cartId?: string) => {
    if (newQty < 1) {
      removeFromCart(serviceId, adults, childrenCount, vehicleType, busId, cartId);
      return;
    }
    setCart(prev => {
      const targetItem = prev.find(item => cartId && item.cartId ? item.cartId === cartId : (item.service.id === serviceId && item.adults === adults && item.childrenCount === childrenCount && item.vehicleType === vehicleType && item.busId === busId));
      if (!targetItem) return prev;

      if (newQty > targetItem.quantity) {
        const copiesToAdd = newQty - targetItem.quantity;
        const newItems: CartItem[] = [];
        for (let i = 0; i < copiesToAdd; i++) {
          newItems.push({
            ...targetItem,
            cartId: `${targetItem.service.id}-${Date.now()}-${Math.random()}`,
            quantity: 1,
            busId: undefined,
            selectedSeats: undefined,
            driverId: undefined,
            driverName: undefined,
            pickupLocation: undefined,
          });
        }
        return [...prev, ...newItems];
      } else {
        return prev.filter(item => item.cartId !== cartId);
      }
    });
  };

  const onEditCartItem = (item: CartItem) => {
    setSelectedServiceForDetail(item.service);
    setBookingDate(item.travelDate || '');
    setBookingBusId(item.busId || null);
    setBookingSeats(item.selectedSeats || []);
    setBookingDriverId(item.driverId || null);
    setBookingDriverName(item.driverName || '');
    setJoinerTourCode(item.tourCode || '');
    setJoinerPickup(item.pickupLocation || '');
    setJoinerDropoff(item.destination || '');
    setJoinerPaxCount(item.paxCount || 1);
    setBookingArrivalDate(item.arrivalDate || '');
    setBookingDepartureDate(item.departureDate || '');
    setBookingAdults(item.adults || 1);
    setBookingChildren(item.childrenCount || 0);
    setBookingTourVehicle(item.vehicleType || 'Bus');
    setBookingTourExtraDays(item.extraDays || 0);
    setBookingTourExtraHours(item.extraHours || 0);
    setEditingCartId(item.cartId || null);
    setShowDetailModal(true);
  };

  const selectedDetailChildDiscount = selectedServiceForDetail?.child_discount !== undefined ? Number(selectedServiceForDetail.child_discount) : 30;
  const selectedDetailAdultPrice = selectedServiceForDetail
    ? (selectedServiceForDetail.adult_price !== undefined && selectedServiceForDetail.adult_price !== null && Number(selectedServiceForDetail.adult_price) > 0
      ? Number(selectedServiceForDetail.adult_price)
      : Number(selectedServiceForDetail.price))
    : 0;
  const selectedDetailChildPrice = selectedServiceForDetail
    ? (selectedServiceForDetail.child_price !== undefined && selectedServiceForDetail.child_price !== null && Number(selectedServiceForDetail.child_price) > 0
      ? Number(selectedServiceForDetail.child_price)
      : Number(selectedServiceForDetail.price) * (1 - (selectedDetailChildDiscount / 100)))
    : 0;

  const [showQuotationModal, setShowQuotationModal] = useState(false);

  // Open the recipient step; the modal persists the quotation (sequential number,
  // VAT breakdown) and then prints the finished business quotation.
  const handlePrintService = () => {
    if (!selectedServiceForDetail) return;
    setShowQuotationModal(true);
  };

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = (service.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (service.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchTerm, selectedCategory]);

  const handleDeleteService = (id: number) => {
    setConfirmDelete({ open: true, id });
  };

  const executeDeleteService = async () => {
    if (confirmDelete.id === null) return;
    try {
      await billingApi.deleteService(confirmDelete.id);
      queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      setShowDetailModal(false);
      setAlertDialog({ open: true, title: 'Deleted!', message: 'The service has been successfully deleted.', variant: 'success' });
    } catch (err) {
      setAlertDialog({ open: true, title: 'Error!', message: 'Failed to delete the service.', variant: 'error' });
    }
  };

  const handleOpenEditModal = (service: Service) => {
    setEditingServiceId(service.id);
    setNewService({
      name: service.name,
      category: service.category,
      description: service.description,
      price: service.price !== undefined && service.price !== null ? formatMoneyInput(String(service.price)) : '',
      image_url: '',
      child_discount: service.child_discount !== undefined ? String(service.child_discount) : '30',
      has_booking_fields: !!service.has_booking_fields,
      adult_price: service.adult_price !== undefined && service.adult_price !== null ? formatMoneyInput(String(service.adult_price)) : (service.price !== undefined && service.price !== null ? formatMoneyInput(String(service.price)) : ''),
      child_price: service.child_price !== undefined && service.child_price !== null ? formatMoneyInput(String(service.child_price)) : formatMoneyInput(String(Number(service.price ?? 0) * 0.7)),
      is_tour: !!service.is_tour,
      bus_price: service.bus_price !== undefined && service.bus_price !== null ? formatMoneyInput(String(service.bus_price)) : '',
      coaster_price: service.coaster_price !== undefined && service.coaster_price !== null ? formatMoneyInput(String(service.coaster_price)) : '',
      tour_kms: service.tour_kms !== undefined && service.tour_kms !== null ? String(service.tour_kms) : '',
      tour_hours: service.tour_hours !== undefined && service.tour_hours !== null ? String(service.tour_hours) : '',
      cost_breakdown: service.cost_breakdown || '',
      inclusions: service.inclusions || '',
      exclusions: service.exclusions || '',
    });
    const existingImages = service.images?.map(img =>
      img.startsWith('http') ? img : `/storage/${img}`
    ) || [];
    setServiceImages(existingImages);
    setIsEditingService(true);
    setShowAddService(true);
    setShowDetailModal(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`gap-6 animate-in fade-in duration-700 flex flex-col lg:flex-row transition-colors lg:h-[calc(100vh-100px)] ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Left Side: Product Grid */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm py-4 px-6 md:px-8 relative overflow-hidden shrink-0">
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-405 w-5 h-5" />
              <input
                type="text"
                placeholder="Search services or categories..."
                className="w-full pl-12 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm focus:ring-4 focus:ring-blue-600/5 transition-all font-medium dark:text-white outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Tabs & Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 flex-1 sm:flex-none">
              <div className="flex flex-wrap bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 items-center gap-1 flex-1 sm:flex-none">
                {['All', 'Documentation', 'Package', 'Transport', 'Joiners', 'Printing Services'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center ${selectedCategory === cat
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-lg shadow-white/5'
                      : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user?.role || '') && (
                <button
                  onClick={() => {
                    setEditingServiceId(null);
                    setIsEditingService(false);
                    setNewService({ name: '', category: 'Package', description: '', price: '', image_url: '', child_discount: '30', has_booking_fields: false, adult_price: '', child_price: '', is_tour: false, bus_price: '', coaster_price: '', tour_kms: '', tour_hours: '', cost_breakdown: '', inclusions: '', exclusions: '' });
                    setServiceImages([]);
                    setShowAddService(true);
                  }}
                  className="px-6 h-12 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shrink-0 flex-1 sm:flex-none"
                >
                  <LuPlus className="w-4 h-4" /> Add Service
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredServices.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <LuBox className="w-10 h-10 text-gray-400 dark:text-gray-550" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">No Products Found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 font-medium">
              We couldn't find any services matching your current filters. Adjust your search or add a new product to get started.
            </p>
            {['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user?.role || '') && (
              <button
                onClick={() => {
                  setEditingServiceId(null);
                  setIsEditingService(false);
                  setNewService({ name: '', category: 'Package', description: '', price: '', image_url: '', child_discount: '30', has_booking_fields: false, adult_price: '', child_price: '', is_tour: false, bus_price: '', coaster_price: '', tour_kms: '', tour_hours: '', cost_breakdown: '', inclusions: '', exclusions: '' });
                  setServiceImages([]);
                  setShowAddService(true);
                }}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <LuPlus className="w-5 h-5" /> Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto pr-2 flex flex-row md:grid md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 hide-scrollbar snap-x snap-mandatory md:auto-rows-max pb-4">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                onClick={() => {
                  setDetailImageIndex(0);
                  setSelectedServiceForDetail(service);
                  setBookingAdults(1);
                  setBookingChildren(0);
                  if (service.is_tour) {
                    setBookingTourVehicle('Bus');
                    setBookingTourExtraDays(0);
                    setBookingTourExtraHours(0);
                  }
                  setBookingDate('');
                  setBookingArrivalDate('');
                  setBookingDepartureDate('');
                  setBookingBusId(null);
                  setBookingSeats([]);
                  setBookingDriverId(null);
                  setBookingDriverName('');
                  setJoinerTourCode(service.name || '');
                  setJoinerPickup('');
                  setJoinerPaxCount(1);
                  setShowDetailModal(true);
                }}
                className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-800 transition-all group cursor-pointer overflow-hidden flex flex-col shrink-0 w-[85vw] md:w-auto snap-center relative"
              >
                {/* Card Image Header */}
                <div className="h-40 md:h-40 bg-gray-100 dark:bg-gray-800 relative overflow-hidden shrink-0">
                  {service.images && service.images.length > 0 ? (
                    <>
                      <img
                        src={service.images[cardImageIndices[service.id] || 0]?.startsWith('http')
                          ? service.images[cardImageIndices[service.id] || 0]
                          : `/storage/${service.images[cardImageIndices[service.id] || 0]}`}
                        className="w-full h-full object-cover transition-transform duration-500"
                        alt={service.name}
                      />

                      {service.images.length > 1 && (
                        <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-30">
                          <button
                            onClick={(e) => handlePrevImage(e, service.id, service.images?.length || 1)}
                            className="p-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full text-gray-900 dark:text-white hover:bg-white hover:scale-110 transition-all border border-gray-100 dark:border-gray-800 shadow-md"
                          >
                            <LuChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleNextImage(e, service.id, service.images?.length || 1)}
                            className="p-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full text-gray-900 dark:text-white hover:bg-white hover:scale-110 transition-all border border-gray-100 dark:border-gray-800 shadow-md"
                          >
                            <LuChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-650">
                      <LuImage className="w-12 h-12 opacity-20" />
                    </div>
                  )}

                  {/* View Overlay */}
                  <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <div className="bg-white dark:bg-gray-900/10 backdrop-blur-md border border-white/20 px-6 py-2.5 rounded-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-200">
                      <p className="text-[10px] font-black text-black uppercase tracking-[0.4em] drop-shadow-sm">View</p>
                    </div>
                  </div>
                </div>

                {/* Price & Action Dropdown */}
                <div className="absolute top-4 right-4 flex gap-2 z-20" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-white dark:bg-gray-800/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-sm">
                    <p className="text-xs font-black text-gray-900 dark:text-white tracking-tighter">
                      {(() => {
                        if (service.is_tour) {
                          const prices = [Number(service.coaster_price || 0), Number(service.bus_price || 0)].filter(p => p > 0);
                          if (prices.length > 1) {
                            const min = Math.min(...prices);
                            const max = Math.max(...prices);
                            return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
                          } else if (prices.length === 1) {
                            return `₱${prices[0].toLocaleString()}`;
                          }
                        }

                        if (service.has_booking_fields) {
                          const prices = [Number(service.child_price || 0), Number(service.adult_price || 0)].filter(p => p > 0);
                          if (prices.length > 1) {
                            const min = Math.min(...prices);
                            const max = Math.max(...prices);
                            return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
                          } else if (prices.length === 1) {
                            return `₱${prices[0].toLocaleString()}`;
                          }
                        }

                        return `₱${Number(service.price || 0).toLocaleString()}`;
                      })()}
                    </p>
                  </div>
                  {['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user?.role || '') && (
                    <Dropdown
                      items={[
                        {
                          label: 'Edit Service',
                          icon: <Pencil size={14} />,
                          onClick: () => handleOpenEditModal(service)
                        },
                        {
                          label: 'Delete',
                          icon: <Trash2 size={14} />,
                          onClick: () => handleDeleteService(service.id),
                          variant: 'danger'
                        },
                      ]}
                    />
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{service.category}</p>
                    {service.images && service.images.length > 1 && (
                      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        +{service.images.length - 1} Images
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase leading-tight group-hover:text-blue-600 transition-colors mb-2">{service.name}</h4>
                  <p className="text-[10px] text-gray-450 font-medium leading-relaxed line-clamp-2 mb-2">{service.description}</p>

                  {service.creator && (
                    <div className="flex items-center gap-1.5 mb-4 text-[9px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 px-2 py-1 rounded-lg w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Published by: {service.creator.first_name} {service.creator.last_name}</span>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const sc = (service.category || '').trim().toLowerCase();
                      if (service.has_booking_fields || service.is_tour || sc === 'bus rental' || ['package', 'joiners', 'transport', 'other'].includes(sc)) {
                        setSelectedServiceForDetail(service);
                        setDetailImageIndex(0);
                        setBookingAdults(1);
                        setBookingChildren(0);
                        if (service.is_tour) {
                          setBookingTourVehicle('Bus');
                          setBookingTourExtraDays(0);
                          setBookingTourExtraHours(0);
                        }
                        setBookingDate('');
                        setBookingArrivalDate('');
                        setBookingDepartureDate('');
                        setBookingBusId(null);
                        setBookingSeats([]);
                        setBookingDriverId(null);
                        setBookingDriverName('');
                        setJoinerTourCode(service.name || '');
                        setJoinerPickup('');
                        setJoinerDropoff('');
                        setJoinerPaxCount(1);
                        setShowDetailModal(true);
                      } else {
                        addToCart(service);
                      }
                    }}
                    className="mt-auto w-full py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <LuPlus className="w-3.5 h-3.5" /> Add to Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Side: Checkout Panel */}
      <SalesCheckout
        cart={cart}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
        clearCart={() => setCart([])}
        onEditCartItem={onEditCartItem}
      />

      {/* Add/Edit Service Modal */}
      <FixedPackageServiceFormModal
        isOpen={showAddService}
        isEditing={isEditingService}
        newService={newService}
        setNewService={setNewService}
        serviceImages={serviceImages}
        setServiceImages={setServiceImages}
        userRole={user?.role}
        onBackdropClose={() => setShowAddService(false)}
        onCloseIcon={() => { setShowAddService(false); setServiceImages([]); }}
        onCancel={() => { setShowAddService(false); setIsEditingService(false); setServiceImages([]); setNewService({ name: '', category: 'Package', description: '', price: '', image_url: '', child_discount: '30', has_booking_fields: false, adult_price: '', child_price: '', is_tour: false, bus_price: '', coaster_price: '', tour_kms: '', tour_hours: '', cost_breakdown: '', inclusions: '', exclusions: '' }); }}
        onSave={async () => {
          try {
            const payload = {
              ...newService,
              price: Number(parseMoneyInput(newService.price)) || 0,
              child_discount: Number(newService.child_discount) || 0,
              adult_price: newService.has_booking_fields ? (Number(parseMoneyInput(newService.adult_price)) || 0) : undefined,
              child_price: newService.has_booking_fields ? (Number(parseMoneyInput(newService.child_price)) || 0) : undefined,
              bus_price: newService.is_tour ? (Number(parseMoneyInput(newService.bus_price)) || 0) : undefined,
              coaster_price: newService.is_tour ? (Number(parseMoneyInput(newService.coaster_price)) || 0) : undefined,
              tour_kms: newService.is_tour ? (Number(newService.tour_kms) || 0) : undefined,
              tour_hours: newService.is_tour ? (Number(newService.tour_hours) || 0) : undefined,
              images: serviceImages
            };
            if (isEditingService && editingServiceId) {
              await billingApi.updateService(editingServiceId, payload);
            } else {
              await billingApi.createService(payload);
            }
            queryClient.invalidateQueries({ queryKey: ['billing-services'] });
            setIsEditingService(false);
            setEditingServiceId(null);
            setServiceImages([]);
            setNewService({ name: '', category: 'Package', description: '', price: '', image_url: '', child_discount: '30', has_booking_fields: false, adult_price: '', child_price: '', is_tour: false, bus_price: '', coaster_price: '', tour_kms: '', tour_hours: '', cost_breakdown: '', inclusions: '', exclusions: '' });
            setShowAddService(false);
          } catch (err) {
            alert('Failed to save service');
          }
        }}
      />

      {/* Service Detail Modal */}
      {showDetailModal && selectedServiceForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-xl duration-300" onClick={closeDetailModal}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[80vh]" onClick={(e) => e.stopPropagation()}>
            {/* Left Column: Image & Service Info */}
            <div className="w-full md:w-[380px] flex-shrink-0 bg-gray-50 dark:bg-gray-800/40 border-r border-gray-100 dark:border-gray-800 flex flex-col h-full custom-scrollbar">
              {/* Image Gallery */}
              <div className="h-64 bg-gray-100 dark:bg-gray-800 relative group flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
                {(selectedServiceForDetail.images && selectedServiceForDetail.images.length > 0) ? (
                  <>
                    <img
                      src={selectedServiceForDetail.images[detailImageIndex]?.startsWith('http')
                        ? selectedServiceForDetail.images[detailImageIndex]
                        : `/storage/${selectedServiceForDetail.images[detailImageIndex]}`}
                      className="w-full h-full object-contain p-4 mx-auto bg-gray-100 dark:bg-gray-800"
                      alt={selectedServiceForDetail.name}
                    />
                    {selectedServiceForDetail.images.length > 1 && (
                      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 z-10">
                        {selectedServiceForDetail.images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setDetailImageIndex(i)}
                            className={`w-2 h-2 rounded-full border border-white transition-all ${detailImageIndex === i ? 'bg-blue-600 w-5' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    )}
                    {selectedServiceForDetail.images.length > 1 && (
                      <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={() => setDetailImageIndex(prev => prev > 0 ? prev - 1 : (selectedServiceForDetail.images?.length || 1) - 1)} className="p-2 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-full text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"><LuChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setDetailImageIndex(prev => (prev + 1) % (selectedServiceForDetail.images?.length || 1))} className="p-2 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-full text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"><LuChevronRight className="w-4 h-4" /></button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-655 gap-3">
                    <LuImage className="w-12 h-12 opacity-10" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em]">No Preview Available</p>
                  </div>
                )}
              </div>

              {/* Service Info Content */}
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${selectedServiceForDetail.category === 'Documentation' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' :
                      selectedServiceForDetail.category === 'Package' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400'
                      }`}>
                      {selectedServiceForDetail.category}
                    </span>

                    {['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user?.role || '') && (
                      <Dropdown
                        items={[
                          {
                            label: 'Edit Service',
                            icon: <Pencil size={16} />,
                            onClick: () => handleOpenEditModal(selectedServiceForDetail)
                          },
                          {
                            label: 'Delete Service',
                            icon: <Trash2 size={16} />,
                            onClick: () => handleDeleteService(selectedServiceForDetail.id),
                            variant: 'danger'
                          },
                        ]}
                      />
                    )}
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mt-3 leading-tight uppercase tracking-tight">
                    {selectedServiceForDetail.name}
                  </h3>
                </div>

                <div>
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Service Description</p>
                  <p className="text-xs text-gray-600 dark:text-gray-350 font-medium leading-relaxed">
                    {selectedServiceForDetail.description}
                  </p>
                </div>

                {/* Inclusions & Exclusions */}
                {(selectedServiceForDetail.inclusions || selectedServiceForDetail.exclusions) && (
                  <div className="space-y-4">
                    {selectedServiceForDetail.inclusions && (
                      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-[1.2rem] border border-emerald-100/30 dark:border-emerald-900/20">
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Inclusions</p>
                        <ul className="text-xs text-emerald-800 dark:text-emerald-300 font-medium space-y-1.5 list-none">
                          {selectedServiceForDetail.inclusions.split('\n').map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                              <span>{item.trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedServiceForDetail.exclusions && (
                      <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 rounded-[1.2rem] border border-rose-100/30 dark:border-rose-900/20">
                        <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-2">Exclusions</p>
                        <ul className="text-xs text-rose-805 dark:text-rose-300 font-medium space-y-1.5 list-none">
                          {selectedServiceForDetail.exclusions.split('\n').map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-rose-600 dark:text-rose-400">✕</span>
                              <span>{item.trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Cost Breakdown — Visible to all Sales page viewers */}
                {['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary', 'reservation_officer', 'office_staff'].includes(user?.role || '') && selectedServiceForDetail.cost_breakdown && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-[1.5rem] border border-amber-100 dark:border-amber-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Cost Breakdown</p>
                      <span className="text-[8px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Internal Use Only</span>
                    </div>
                    <p className="text-xs text-amber-805 dark:text-amber-200 font-medium leading-relaxed whitespace-pre-wrap mb-3">
                      {selectedServiceForDetail.cost_breakdown}
                    </p>

                    {/* Tally Indicator in Detail Modal */}
                    {(() => {
                      const breakdownSum = getBreakdownSum(selectedServiceForDetail.cost_breakdown || '');
                      const servicePrice = Number(selectedServiceForDetail.price || 0);
                      const isTallyMatch = Math.abs(breakdownSum - servicePrice) < 0.01;
                      const diff = breakdownSum - servicePrice;

                      return (
                        <div className={`p-3 rounded-[1rem] border transition-all duration-300 ${isTallyMatch
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100/50 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'
                          }`}>
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <div className="flex items-center gap-1.5">
                              {isTallyMatch ? (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-extrabold">✓</span>
                              ) : (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 font-extrabold">!</span>
                              )}
                              <span>
                                {isTallyMatch ? 'Tallies' : 'Mismatch'}
                              </span>
                            </div>
                            <div className="text-right">
                              <div>Sum: <span className="font-extrabold">₱{breakdownSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                              {!isTallyMatch && (
                                <div className="text-[9px] opacity-85 mt-0.5">
                                  Diff: <span className="font-extrabold">{diff > 0 ? '+' : ''}₱{diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {selectedServiceForDetail.creator && (
                  <div>
                    <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Published By</p>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-[1.2rem] border border-gray-150 dark:border-gray-800">
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-[10px]">
                        {selectedServiceForDetail.creator.first_name[0]}{selectedServiceForDetail.creator.last_name[0]}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-gray-900 dark:text-white leading-none">
                          {selectedServiceForDetail.creator.first_name} {selectedServiceForDetail.creator.last_name}
                        </p>
                        <p className="text-[8px] text-gray-400 mt-1 font-bold">
                          {selectedServiceForDetail.creator.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Booking Workspace */}
            <div className="flex-1 p-8 md:p-10 flex flex-col h-full bg-white dark:bg-gray-900 relative">
              {/* Header */}
              <div className="flex justify-between items-start mb-6 gap-4 flex-shrink-0">
                <div>
                  <h4 className="text-lg font-black text-gray-950 dark:text-white uppercase tracking-tight">Booking Configuration</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Configure travel dates, vehicle selection, and seating layout.</p>
                </div>
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-500 hover:text-gray-800 dark:hover:text-white transition-all shadow-sm"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Container */}
              <div className="flex-1 overflow-y-auto space-y-6 mb-8 pr-2 custom-scrollbar">
                {/* Bus Rental & Seating Options (Conditional for Bus Rental or Tour with Bus) */}
                {((['package', 'joiners', 'joiner'].includes(selectedServiceCategory) || isBusRentalCategory) || selectedServiceForDetail.is_tour) && (
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Bus Rental & Seating Options</p>

                    {/* Travel Date & Arrival/Departure */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Travel Date</label>
                        <DatePicker
                          selected={bookingDate ? new Date(bookingDate + 'T12:00:00Z') : null}
                          onChange={(date: Date | null) => {
                            if (date) {
                              setBookingDate(date.toISOString().split('T')[0]);
                            } else {
                              setBookingDate('');
                            }
                            if (bookingBusId) {
                              const selectedBusObj = buses.find((b: any) => b.id === bookingBusId);
                              const isBusRental = isBusRentalCategory;
                              if (isBusRental && selectedBusObj) {
                                const capacity = selectedBusObj.seating_capacity || 49;
                                const allSeats = Array.from({ length: capacity }, (_, i) => String(i + 1));
                                setBookingSeats(allSeats);
                                setJoinerPaxCount(capacity);
                              } else {
                                setBookingSeats([]);
                                setJoinerPaxCount(1);
                              }
                            } else {
                              setBookingSeats([]);
                              setJoinerPaxCount(1);
                            }
                          }}
                          minDate={new Date()}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-805 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          wrapperClassName="w-full"
                          dateFormat="MMMM d, yyyy"
                          placeholderText="Select Travel Date"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Departure Time</label>
                          <DatePicker
                            selected={bookingDepartureDate ? new Date(bookingDepartureDate) : null}
                            onChange={(date: Date | null) => {
                              if (date && bookingDate) {
                                // Lock the date to the travel date, only keep the time
                                const [year, month, day] = bookingDate.split('-').map(Number);
                                const merged = new Date(year, month - 1, day, date.getHours(), date.getMinutes(), 0);
                                setBookingDepartureDate(merged.toISOString());
                                if (bookingArrivalDate && new Date(bookingArrivalDate) < merged) {
                                  setBookingArrivalDate('');
                                }
                              } else {
                                setBookingDepartureDate('');
                              }
                            }}
                            showTimeSelect
                            showTimeSelectOnly
                            timeFormat="h:mm aa"
                            timeIntervals={15}
                            dateFormat="h:mm aa"
                            className="w-full px-4 py-3 bg-white dark:bg-gray-805 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            wrapperClassName="w-full"
                            placeholderText="Select Departure Time"
                            disabled={!bookingDate}
                          />
                          {bookingDepartureDate && (
                            <p className="text-[9px] text-gray-400 font-bold pl-1">
                              Date: {bookingDate}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Arrival Date & Time</label>
                          <DatePicker
                            selected={bookingArrivalDate ? new Date(bookingArrivalDate) : null}
                            onChange={(date: Date | null) => setBookingArrivalDate(date ? date.toISOString() : '')}
                            showTimeSelect
                            timeFormat="h:mm aa"
                            timeIntervals={15}
                            dateFormat="MMM d, yyyy h:mm aa"
                            minDate={bookingDepartureDate ? new Date(bookingDepartureDate) : (bookingDate ? new Date(bookingDate + 'T00:00:00') : new Date())}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-805 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            wrapperClassName="w-full"
                            placeholderText={!bookingDate ? 'Select Travel Date first' : 'Select Arrival'}
                            disabled={!bookingDepartureDate}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Assign Bus */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assign Bus</label>
                      <select
                        className="w-full px-4 py-3 bg-white dark:bg-gray-805 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                        value={bookingBusId || ''}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          setBookingBusId(id);
                          
                          const selectedBusObj = buses.find((b: any) => b.id === id);
                          if (selectedBusObj) {
                            const isBusRental = isBusRentalCategory;
                            if (isBusRental) {
                              const capacity = selectedBusObj.seating_capacity || 49;
                              const allSeats = Array.from({ length: capacity }, (_, i) => String(i + 1));
                              setBookingSeats(allSeats);
                              setJoinerPaxCount(capacity);
                            } else {
                              setBookingSeats([]);
                              setJoinerPaxCount(1);
                            }

                            if (selectedBusObj.driver) {
                              setBookingDriverId(selectedBusObj.driver.id);
                              setBookingDriverName(`${selectedBusObj.driver.first_name} ${selectedBusObj.driver.last_name}`);
                            } else {
                              setBookingDriverId(null);
                              setBookingDriverName('');
                            }
                          } else {
                            setBookingSeats([]);
                            setJoinerPaxCount(1);
                            setBookingDriverId(null);
                            setBookingDriverName('');
                          }
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

                    {/* Assign Driver */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assign Driver</label>
                      <select
                        className="w-full px-4 py-3 bg-white dark:bg-gray-805 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                        value={bookingDriverId || ''}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          setBookingDriverId(id);
                          if (id) {
                            const d = drivers.find((x: any) => x.id === id);
                            setBookingDriverName(d ? `${d.first_name} ${d.last_name}` : '');
                          } else {
                            setBookingDriverName('');
                          }
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

                    {/* Seat Selector Layout */}
                    {bookingBusId && bookingDate && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Seats</label>
                          {(() => {
                            const totalSeats = buses.find(b => b.id === bookingBusId)?.seating_capacity || 49;
                            const allSeatNums = Array.from({ length: totalSeats }, (_, i) => String(i + 1));
                            const availableSeats = allSeatNums.filter(s => !occupiedSeats.includes(s));
                            const allSelected = availableSeats.length > 0 && availableSeats.every(s => bookingSeats.includes(s));
                            if (isBusRentalCategory) {
                              return (
                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900">
                                  Entire Bus Reserved
                                </span>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (allSelected) {
                                    setBookingSeats([]);
                                    setJoinerPaxCount(1);
                                  } else {
                                    setBookingSeats(availableSeats);
                                    setJoinerPaxCount(availableSeats.length || 1);
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${allSelected
                                  ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-800'
                                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-200 dark:border-blue-800'
                                  }`}
                              >
                                {allSelected ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    Deselect All
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    Select All
                                  </>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 w-full max-w-full overflow-x-auto">
                          <BusLayout
                            compact={true}
                            totalSeats={buses.find(b => b.id === bookingBusId)?.seating_capacity || 49}
                            hasRestroom={buses.find(b => b.id === bookingBusId)?.bus_category === 'VIP'}
                            selectedSeats={bookingSeats}
                            occupiedSeats={occupiedSeats}
                            onSeatToggle={(seatNum) => {
                              if (isBusRentalCategory) {
                                return;
                              }
                              setBookingSeats(prev => {
                                const next = prev.includes(seatNum)
                                  ? prev.filter(s => s !== seatNum)
                                  : [...prev, seatNum];
                                setJoinerPaxCount(next.length || 1);
                                return next;
                              });
                            }}
                          />
                        </div>
                        {bookingSeats.length > 0 && (
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest pl-1">
                            Selected: {bookingSeats.join(', ')} ({bookingSeats.length} seats selected)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Booking options */}
                {selectedServiceForDetail.has_booking_fields && (
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Booking Guest Configuration</p>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white leading-none uppercase">Adults</p>
                        <p className="text-[9px] text-gray-450 font-bold mt-1">₱{selectedDetailAdultPrice.toLocaleString()} / Pax</p>
                      </div>
                      <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-1 shadow-sm">
                        <button
                          onClick={() => setBookingAdults(prev => Math.max(1, prev - 1))}
                          className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                        >
                          <LuMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-black text-gray-900 dark:text-white">{bookingAdults}</span>
                        <button
                          onClick={() => {
                            const maxCap = (bookingBusId ? buses.find((b: any) => b.id === bookingBusId)?.seating_capacity : 49) || 49;
                            setBookingAdults(prev => Math.min(prev + 1, maxCap - bookingChildren));
                          }}
                          className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                        >
                          <LuPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white leading-none uppercase">Children</p>
                        <p className="text-[9px] text-gray-455 font-bold mt-1">₱{selectedDetailChildPrice.toLocaleString()} / Pax ({selectedDetailChildDiscount}% OFF)</p>
                      </div>
                      <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-1 shadow-sm">
                        <button
                          onClick={() => setBookingChildren(prev => Math.max(0, prev - 1))}
                          className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                        >
                          <LuMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-black text-gray-900 dark:text-white">{bookingChildren}</span>
                        <button
                          onClick={() => {
                            const maxCap = (bookingBusId ? buses.find((b: any) => b.id === bookingBusId)?.seating_capacity : 49) || 49;
                            setBookingChildren(prev => Math.min(prev + 1, maxCap - bookingAdults));
                          }}
                          className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                        >
                          <LuPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedServiceForDetail.is_tour && (
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tour Configuration</p>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white leading-none uppercase">Vehicle Type</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBookingTourVehicle('Bus')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${bookingTourVehicle === 'Bus' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700'}`}
                        >
                          Bus (₱{(selectedServiceForDetail.bus_price || 0).toLocaleString()})
                        </button>
                        <button
                          onClick={() => setBookingTourVehicle('Coaster')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${bookingTourVehicle === 'Coaster' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700'}`}
                        >
                          Coaster (₱{(selectedServiceForDetail.coaster_price || 0).toLocaleString()})
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white leading-none uppercase">Extra Days</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">
                          ₱{(bookingTourVehicle === 'Bus' ? 22010 : 16780).toLocaleString()} / Day
                        </p>
                      </div>
                      <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-1 shadow-sm">
                        <button onClick={() => setBookingTourExtraDays(prev => Math.max(0, prev - 1))} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-450">
                          <LuMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-black text-gray-900 dark:text-white">{bookingTourExtraDays}</span>
                        <button onClick={() => setBookingTourExtraDays(prev => prev + 1)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-450">
                          <LuPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white leading-none uppercase">Extra Hours</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">
                          ₱{(bookingTourVehicle === 'Bus' ? 1950 : 1680).toLocaleString()} / Hour
                        </p>
                      </div>
                      <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-1 shadow-sm">
                        <button onClick={() => setBookingTourExtraHours(prev => Math.max(0, prev - 1))} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-455">
                          <LuMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-black text-gray-900 dark:text-white">{bookingTourExtraHours}</span>
                        <button onClick={() => setBookingTourExtraHours(prev => prev + 1)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-455">
                          <LuPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Joiner Specifications Block */}
                {((['package', 'joiners', 'other'].includes(selectedServiceCategory) || isBusRentalCategory) || selectedServiceForDetail.is_tour) && (
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Joiner &amp; Travel Specifications</p>

                    {/* Travel Date (Hide here if Bus Rental block will show it) */}
                    {!((['package', 'joiners', 'joiner'].includes(selectedServiceCategory) || isBusRentalCategory) || selectedServiceForDetail.is_tour) && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Travel Date</label>
                          <DatePicker
                            selected={bookingDate ? new Date(bookingDate + 'T12:00:00Z') : null}
                            onChange={(date: Date | null) => {
                              if (date) {
                                setBookingDate(date.toISOString().split('T')[0]);
                              } else {
                                setBookingDate('');
                              }
                            }}
                            minDate={new Date()}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-805 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            wrapperClassName="w-full"
                            dateFormat="MMMM d, yyyy"
                            placeholderText="Select Travel Date"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Departure Time</label>
                            <DatePicker
                              selected={bookingDepartureDate ? new Date(bookingDepartureDate) : null}
                              onChange={(date: Date | null) => {
                                if (date && bookingDate) {
                                  // Lock the date to the travel date, only keep the time
                                  const [year, month, day] = bookingDate.split('-').map(Number);
                                  const merged = new Date(year, month - 1, day, date.getHours(), date.getMinutes(), 0);
                                  setBookingDepartureDate(merged.toISOString());
                                  if (bookingArrivalDate && new Date(bookingArrivalDate) < merged) {
                                    setBookingArrivalDate('');
                                  }
                                } else {
                                  setBookingDepartureDate('');
                                }
                              }}
                              showTimeSelect
                              showTimeSelectOnly
                              timeFormat="h:mm aa"
                              timeIntervals={15}
                              dateFormat="h:mm aa"
                              className="w-full px-4 py-3 bg-white dark:bg-gray-805 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                              wrapperClassName="w-full"
                              placeholderText="Select Departure Time"
                              disabled={!bookingDate}
                            />
                            {bookingDepartureDate && (
                              <p className="text-[9px] text-gray-400 font-bold pl-1">
                                Date: {bookingDate}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Arrival Date & Time</label>
                            <DatePicker
                              selected={bookingArrivalDate ? new Date(bookingArrivalDate) : null}
                              onChange={(date: Date | null) => setBookingArrivalDate(date ? date.toISOString() : '')}
                              showTimeSelect
                              timeFormat="h:mm aa"
                              timeIntervals={15}
                              dateFormat="MMM d, yyyy h:mm aa"
                              minDate={bookingDepartureDate ? new Date(bookingDepartureDate) : (bookingDate ? new Date(bookingDate + 'T00:00:00') : new Date())}
                              className="w-full px-4 py-3 bg-white dark:bg-gray-805 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                              wrapperClassName="w-full"
                              placeholderText={!bookingDate ? 'Select Travel Date first' : 'Select Arrival'}
                              disabled={!bookingDepartureDate}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tour Code / Destination */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tour Code / Destination</label>
                      <input
                        type="text"
                        placeholder="e.g. Boracay Weekend Joiner"
                        className="w-full px-4 py-3 bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
                        value={joinerTourCode}
                        onChange={(e) => setJoinerTourCode(e.target.value)}
                      />
                    </div>

                    {/* Pax Count & Pickup */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pax Count</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-855 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
                          value={joinerPaxCount}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val === '') {
                              setJoinerPaxCount('');
                            } else {
                              setJoinerPaxCount(Math.max(1, Number(val)));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.ctrlKey || e.metaKey) return;
                            if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pickup Location &amp; Time</label>
                        <input
                          type="text"
                          placeholder="e.g. MoA Globe, 10:00 PM"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
                          value={joinerPickup}
                          onChange={(e) => setJoinerPickup(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Drop Off Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Baguio City Center"
                        className="w-full px-4 py-3 bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
                        value={joinerDropoff}
                        onChange={(e) => setJoinerDropoff(e.target.value)}
                      />
                    </div>
                  </div>
                )}


                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-450 uppercase tracking-widest mb-2">Package Investment</p>
                  <h4 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                    {selectedServiceForDetail.is_tour ? (
                      <>₱{((bookingTourVehicle === 'Bus' ? (selectedServiceForDetail.bus_price || 0) : (selectedServiceForDetail.coaster_price || 0)) +
                        (bookingTourExtraDays * (bookingTourVehicle === 'Bus' ? 22010 : 16780)) +
                        (bookingTourExtraHours * (bookingTourVehicle === 'Bus' ? 1950 : 1680))).toLocaleString()}</>
                    ) : (
                      <>₱{((bookingAdults * selectedDetailAdultPrice) + (bookingChildren * selectedDetailChildPrice)).toLocaleString()}</>
                    )}
                  </h4>
                  {selectedServiceForDetail.has_booking_fields && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/80 text-[10px] text-gray-405 space-y-1">
                      <div className="flex justify-between">
                        <span>Adults: {bookingAdults} x ₱{selectedDetailAdultPrice.toLocaleString()}</span>
                        <span>₱{(bookingAdults * selectedDetailAdultPrice).toLocaleString()}</span>
                      </div>
                      {bookingChildren > 0 && (
                        <div className="flex justify-between">
                          <span>Children: {bookingChildren} x ₱{selectedDetailChildPrice.toLocaleString()}</span>
                          <span>₱{(bookingChildren * selectedDetailChildPrice).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedServiceForDetail.is_tour && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/80 text-[10px] text-gray-405 space-y-1">
                      <div className="flex justify-between">
                        <span>Vehicle: {bookingTourVehicle}</span>
                        <span>₱{(bookingTourVehicle === 'Bus' ? (selectedServiceForDetail.bus_price || 0) : (selectedServiceForDetail.coaster_price || 0)).toLocaleString()}</span>
                      </div>
                      {bookingTourExtraDays > 0 && (
                        <div className="flex justify-between">
                          <span>Extra Days: {bookingTourExtraDays} x ₱{(bookingTourVehicle === 'Bus' ? 22010 : 16780).toLocaleString()}</span>
                          <span>₱{(bookingTourExtraDays * (bookingTourVehicle === 'Bus' ? 22010 : 16780)).toLocaleString()}</span>
                        </div>
                      )}
                      {bookingTourExtraHours > 0 && (
                        <div className="flex justify-between">
                          <span>Extra Hours: {bookingTourExtraHours} x ₱{(bookingTourVehicle === 'Bus' ? 1950 : 1680).toLocaleString()}</span>
                          <span>₱{(bookingTourExtraHours * (bookingTourVehicle === 'Bus' ? 1950 : 1680)).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-455 mt-2">* VAT Inclusive Price</p>
                </div>
              </div>

              <div className="space-y-3 font-black">
                {(() => {
                  const isBusAssigned = ['package', 'joiners', 'joiner'].includes(selectedServiceCategory) || isBusRentalCategory || selectedServiceForDetail.is_tour;
                  const selectedBus = bookingBusId ? buses.find((b: any) => b.id === bookingBusId) : null;
                  const isVipBus = selectedBus?.model?.toLowerCase().includes('vip');
                  const isVipPackage = selectedServiceForDetail.name.toLowerCase().includes('vip');
                  const isStandardPackage = selectedServiceForDetail.name.toLowerCase().includes('standard') || selectedServiceForDetail.name.toLowerCase().includes('economy');
                  const totalPax = selectedServiceForDetail.has_booking_fields ? (bookingAdults + bookingChildren) : (joinerPaxCount === '' ? 1 : joinerPaxCount);

                  // VIP / Economy mismatch
                  const hasBusTypeMismatch = bookingBusId && (
                    (isVipPackage && !isVipBus) ||
                    (isStandardPackage && isVipBus)
                  );

                  // Pax count exceeds capacity — warning only, not blocking
                  const isPaxExceedingCapacity = selectedBus && totalPax > selectedBus.seating_capacity;

                  // Seat selection mismatch — warning only, not blocking (skip for whole-bus rentals)
                  const isSeatSelectionMismatch = isBusAssigned && !isBusRentalCategory && bookingBusId && bookingSeats.length > 0 && bookingSeats.length !== totalPax;

                  const isBusSelectionInvalid = isBusAssigned && (
                    !bookingDate ||
                    !bookingBusId ||
                    !bookingDriverId ||
                    bookingSeats.length === 0 ||
                    hasBusTypeMismatch
                  );

                  return (
                    <div className="space-y-3">
                      {/* Validation Warnings/Errors */}
                      {isBusAssigned && (
                        <div className="space-y-2">
                          {/* VIP / Economy Warning */}
                          {hasBusTypeMismatch && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                              <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-tight">
                                {isVipPackage && "This VIP package requires a VIP Bus, but a Standard/Economy Bus is selected."}
                                {isStandardPackage && "This Standard/Economy package requires a Standard/Economy Bus, but a VIP Bus is selected."}
                              </div>
                            </div>
                          )}

                          {/* Pax Exceeding Capacity — Warning only */}
                          {isPaxExceedingCapacity && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                              <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-tight">
                                Warning: Pax count ({totalPax}) exceeds the selected bus capacity ({selectedBus.seating_capacity} seats). You may proceed but please verify with dispatch.
                              </div>
                            </div>
                          )}

                          {/* Seat Selection Mismatch — Warning only */}
                          {isSeatSelectionMismatch && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                              <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-tight">
                                Note: {bookingSeats.length} seat{bookingSeats.length !== 1 ? 's' : ''} selected for {totalPax} Pax. Seats do not match Pax count exactly.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        disabled={!!isBusSelectionInvalid}
                        onClick={() => {
                          const isJoinerCategory = ['package', 'joiners', 'other'].includes(selectedServiceCategory) || isBusRentalCategory || selectedServiceForDetail.is_tour;
                          const travelDateParam = bookingDate || undefined;
                          const arrivalDateParam = bookingArrivalDate || undefined;
                          const departureDateParam = bookingDepartureDate || undefined;
                          const tourCodeParam = isJoinerCategory ? (joinerTourCode || undefined) : undefined;
                          const pickupLocationParam = isJoinerCategory ? (joinerPickup || undefined) : undefined;
                          const destinationParam = isJoinerCategory ? (joinerDropoff || undefined) : undefined;
                          const paxCountParam = isJoinerCategory ? (joinerPaxCount === '' ? 1 : Math.max(1, joinerPaxCount)) : undefined;

                          if (editingCartId) {
                            if (selectedServiceForDetail.is_tour) {
                              const basePrice = bookingTourVehicle === 'Bus' ? (selectedServiceForDetail.bus_price || 0) : (selectedServiceForDetail.coaster_price || 0);
                              const extraDaysPrice = bookingTourExtraDays * (bookingTourVehicle === 'Bus' ? 22010 : 16780);
                              const extraHoursPrice = bookingTourExtraHours * (bookingTourVehicle === 'Bus' ? 1950 : 1680);
                              const computedPrice = basePrice + extraDaysPrice + extraHoursPrice;
                              saveCartItemEdit(editingCartId, undefined, undefined, computedPrice, bookingTourVehicle, bookingTourExtraDays, bookingTourExtraHours, bookingBusId || undefined, bookingSeats.length > 0 ? bookingSeats : undefined, bookingDriverId || undefined, bookingDriverName || undefined, travelDateParam, tourCodeParam, pickupLocationParam, paxCountParam, arrivalDateParam, departureDateParam, destinationParam);
                            } else if (selectedServiceForDetail.has_booking_fields) {
                              const computedPrice = (bookingAdults * selectedDetailAdultPrice) + (bookingChildren * selectedDetailChildPrice);
                              saveCartItemEdit(editingCartId, bookingAdults, bookingChildren, computedPrice, undefined, undefined, undefined, bookingBusId || undefined, bookingSeats.length > 0 ? bookingSeats : undefined, bookingDriverId || undefined, bookingDriverName || undefined, travelDateParam, tourCodeParam, pickupLocationParam, paxCountParam, arrivalDateParam, departureDateParam, destinationParam);
                            } else {
                              saveCartItemEdit(editingCartId, undefined, undefined, undefined, undefined, undefined, undefined, bookingBusId || undefined, bookingSeats.length > 0 ? bookingSeats : undefined, bookingDriverId || undefined, bookingDriverName || undefined, travelDateParam, tourCodeParam, pickupLocationParam, paxCountParam, arrivalDateParam, departureDateParam, destinationParam);
                            }
                          } else {
                            if (selectedServiceForDetail.is_tour) {
                              const basePrice = bookingTourVehicle === 'Bus' ? (selectedServiceForDetail.bus_price || 0) : (selectedServiceForDetail.coaster_price || 0);
                              const extraDaysPrice = bookingTourExtraDays * (bookingTourVehicle === 'Bus' ? 22010 : 16780);
                              const extraHoursPrice = bookingTourExtraHours * (bookingTourVehicle === 'Bus' ? 1950 : 1680);
                              const computedPrice = basePrice + extraDaysPrice + extraHoursPrice;
                              addToCart(selectedServiceForDetail, undefined, undefined, computedPrice, bookingTourVehicle, bookingTourExtraDays, bookingTourExtraHours, bookingBusId || undefined, bookingSeats.length > 0 ? bookingSeats : undefined, bookingDriverId || undefined, bookingDriverName || undefined, travelDateParam, tourCodeParam, pickupLocationParam, paxCountParam, arrivalDateParam, departureDateParam, destinationParam);
                            } else if (selectedServiceForDetail.has_booking_fields) {
                              const computedPrice = (bookingAdults * selectedDetailAdultPrice) + (bookingChildren * selectedDetailChildPrice);
                              addToCart(selectedServiceForDetail, bookingAdults, bookingChildren, computedPrice, undefined, undefined, undefined, bookingBusId || undefined, bookingSeats.length > 0 ? bookingSeats : undefined, bookingDriverId || undefined, bookingDriverName || undefined, travelDateParam, tourCodeParam, pickupLocationParam, paxCountParam, arrivalDateParam, departureDateParam, destinationParam);
                            } else {
                              addToCart(selectedServiceForDetail, undefined, undefined, undefined, undefined, undefined, undefined, bookingBusId || undefined, bookingSeats.length > 0 ? bookingSeats : undefined, bookingDriverId || undefined, bookingDriverName || undefined, travelDateParam, tourCodeParam, pickupLocationParam, paxCountParam, arrivalDateParam, departureDateParam, destinationParam);
                            }
                          }
                          closeDetailModal();
                        }}
                        className={`w-full py-5 text-white rounded-2xl text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isBusSelectionInvalid
                          ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none text-gray-500'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                          }`}
                      >
                        {editingCartId ? <LuCheck className="w-5 h-5" /> : <LuPlus className="w-5 h-5" />}
                        {editingCartId ? 'Save Changes' : (isBusSelectionInvalid ? 'Select Date, Bus & Seats' : 'Add to Current Order')}
                      </button>
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={handlePrintService}
                  className="w-full py-5 bg-slate-800 dark:bg-gray-800 text-white rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-700 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <LuPrinter className="w-5 h-5" /> Prepare Quotation
                </button>
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="w-full py-5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-2xl text-[10px] uppercase tracking-widest hover:text-gray-900 dark:text-white dark:hover:text-white transition-all"
                >
                  Keep Browsing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuotationModal && selectedServiceForDetail && (
        <QuotationRecipientModal
          service={selectedServiceForDetail}
          agentName={user ? `${user.first_name} ${user.last_name}` : 'JVD Events Agent'}
          pricing={{
            service: selectedServiceForDetail,
            bookingTourVehicle,
            bookingTourExtraDays,
            bookingTourExtraHours,
            bookingAdults,
            bookingChildren,
            selectedDetailAdultPrice,
            selectedDetailChildPrice,
            selectedDetailChildDiscount,
          }}
          onClose={() => setShowQuotationModal(false)}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={executeDeleteService}
        title="Are you sure?"
        message="You won't be able to revert this service!"
        confirmText="Yes, delete it!"
        variant="warning"
      />

      {/* Alert Dialog */}
      <ConfirmDialog
        isOpen={alertDialog.open}
        onClose={() => setAlertDialog(prev => ({ ...prev, open: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
        alert
      />
    </div>
  );
}
