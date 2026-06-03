import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuSearch,
  LuShoppingCart,
  LuUser,
  LuPlus,
  LuMinus,
  LuTrash2,
  LuCreditCard,
  LuPrinter,
  LuCheck,
  LuX,
  LuMapPin,
  LuPhone,
  LuMail,
  LuWallet,
  LuCamera,
  LuChevronLeft,
  LuChevronRight,
  LuImage,
  LuBox,
  LuLoaderCircle
} from 'react-icons/lu';
import { Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { billingApi } from '../../api/billing';
import type { Service } from '../../api/billing';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LoadingScreen, Dropdown, ConfirmDialog } from '../../components/ui';

interface CartItem {
  service: Service;
  quantity: number;
  adults?: number;
  childrenCount?: number;
  customPrice?: number;
  vehicleType?: 'Bus' | 'Coaster';
  extraDays?: number;
  extraHours?: number;
}

export default function POS() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const queryClient = useQueryClient();

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [amountReceived, setAmountReceived] = useState<number | string>('');
  const [receiptAmountReceived, setReceiptAmountReceived] = useState<number | string>('');
  const [receiptChange, setReceiptChange] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'full' | 'half' | 'downpayment'>('full');

  // Service Management State
  const [showAddService, setShowAddService] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<Service | null>(null);
  const [serviceImages, setServiceImages] = useState<string[]>([]);
  const [newService, setNewService] = useState({
    name: '',
    category: 'Package',
    description: '',
    price: 0,
    image_url: '',
    child_discount: 30,
    has_booking_fields: false,
    adult_price: 0,
    child_price: 0,
    is_tour: false,
    bus_price: 0,
    coaster_price: 0,
    tour_kms: 0,
    tour_hours: 0,
    cost_breakdown: '',
  });
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [cardImageIndices, setCardImageIndices] = useState<Record<number, number>>({});

  // Booking passenger states
  const [bookingAdults, setBookingAdults] = useState<number>(1);
  const [bookingChildren, setBookingChildren] = useState<number>(0);

  // Pathway State
  const [transactionPathway, setTransactionPathway] = useState<'catalog' | 'custom'>('catalog');
  const [customForm, setCustomForm] = useState({
    name: '',
    category: 'Bus Rental',
    otherCategory: '',
    price: 0,
    quantity: 1,
    description: '',
  });
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Tour booking states
  const [bookingTourVehicle, setBookingTourVehicle] = useState<'Bus' | 'Coaster'>('Bus');
  const [bookingTourExtraDays, setBookingTourExtraDays] = useState<number>(0);
  const [bookingTourExtraHours, setBookingTourExtraHours] = useState<number>(0);

  // Confirm dialog state
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error' }>({ open: false, title: '', message: '', variant: 'success' });

  // Constants
  const TAX_RATE = 0.12;

  // Load initial data
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
  const addToCart = (service: Service, adults?: number, childrenCount?: number, customPrice?: number, vehicleType?: 'Bus' | 'Coaster', extraDays?: number, extraHours?: number) => {
    setCart(prev => {
      const existing = prev.find(item =>
        item.service.id === service.id &&
        item.adults === adults &&
        item.childrenCount === childrenCount &&
        item.vehicleType === vehicleType
      );
      if (existing) {
        return prev.map(item =>
          (item.service.id === service.id && item.adults === adults && item.childrenCount === childrenCount && item.vehicleType === vehicleType)
            ? { ...item, quantity: item.quantity + 1, extraDays, extraHours, customPrice }
            : item
        );
      }
      return [...prev, { service, quantity: 1, adults, childrenCount, customPrice, vehicleType, extraDays, extraHours }];
    });
  };

  const handleAddCustomTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name || customForm.price <= 0 || customForm.quantity <= 0) {
      toast.error('Please enter a valid service name, price, and quantity.');
      return;
    }

    try {
      setIsAddingCustom(true);
      // Create service dynamically in the database
      const res = await billingApi.createService({
        name: customForm.name,
        category: customForm.category === 'Other' ? (customForm.otherCategory || 'Other') : customForm.category,
        price: customForm.price,
        description: customForm.description || 'Custom service arrangement',
        is_tour: false,
        has_booking_fields: false,
      });

      if (res?.data?.success || res?.data?.data) {
        // Handle nesting if nested or direct
        const createdService = res.data.data;
        
        // Add to order
        addToCart(createdService);
        
        // If quantity > 1, update the quantity in the cart
        if (customForm.quantity > 1) {
          setCart(prev => prev.map(item => 
            item.service.id === createdService.id 
              ? { ...item, quantity: customForm.quantity } 
              : item
          ));
        }

        toast.success('Customized transaction registered & added to order!');
        
        // Reset custom form
        setCustomForm({
          name: '',
          category: 'Bus Rental',
          otherCategory: '',
          price: 0,
          quantity: 1,
          description: '',
        });

        // Invalidate queries so it shows in catalog if they look for it
        queryClient.invalidateQueries({ queryKey: ['billing-services'] });

        // Switch pathway back to catalog
        setTransactionPathway('catalog');
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

  const removeFromCart = (serviceId: number, adults?: number, childrenCount?: number, vehicleType?: 'Bus' | 'Coaster') => {
    setCart(prev => prev.filter(item =>
      !(item.service.id === serviceId && item.adults === adults && item.childrenCount === childrenCount && item.vehicleType === vehicleType)
    ));
  };

  const updateQuantity = (serviceId: number, newQty: number, adults?: number, childrenCount?: number, vehicleType?: 'Bus' | 'Coaster') => {
    if (newQty < 1) {
      removeFromCart(serviceId, adults, childrenCount, vehicleType);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.service.id === serviceId && item.adults === adults && item.childrenCount === childrenCount && item.vehicleType === vehicleType) {
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + ((item.customPrice ?? item.service.price) * item.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
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
  const change = amountReceived !== '' && !isNaN(Number(amountReceived)) 
    ? (paymentType === 'full' ? Math.max(0, Number(amountReceived) - total) : 0) 
    : 0;
  const balance = (paymentType === 'downpayment' || paymentType === 'half') && amountReceived !== '' && !isNaN(Number(amountReceived))
    ? Math.max(0, total - Number(amountReceived))
    : 0;

  // Auto-update amountReceived when total changes if paymentType is 'half'
  useEffect(() => {
    if (paymentType === 'half') {
      setAmountReceived((total / 2).toFixed(2));
    }
  }, [total, paymentType]);

  const isContactValid = useMemo(() => {
    if (!customerContact) return true;
    const cleaned = customerContact.replace(/[\s\-\(\)]/g, '');
    return /^(09|\+639|639)\d{9}$/.test(cleaned);
  }, [customerContact]);

  const isEmailValid = useMemo(() => {
    if (!customerEmail) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
  }, [customerEmail]);

  const formatName = (val: string) => val.replace(/[^A-Za-z\s-']/g, '');

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = (service.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (service.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchTerm, selectedCategory]);

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!isContactValid || !isEmailValid) {
      alert('Please correct the validation errors in customer details.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await billingApi.createInvoice({
        customer_name: customerName || undefined,
        customer_address: customerAddress || undefined,
        customer_email: customerEmail || undefined,
        customer_contact: customerContact ? customerContact.replace(/[\s\-\(\)]/g, '') : undefined,
        payment_method: paymentMethod,
        payment_type: paymentType === 'half' ? 'downpayment' : paymentType,
        amount_received: paymentMethod === 'Cash' ? Number(amountReceived || 0) : undefined,
        change: paymentMethod === 'Cash' ? Number(change) : undefined,
        items: cart.map(item => ({
          service_id: item.service.id,
          quantity: item.quantity,
          unit_price: item.customPrice ?? item.service.price,
          adults: item.adults,
          children: item.childrenCount
        }))
      });

      setLastInvoice(response.data.data);
      setReceiptAmountReceived(amountReceived);
      setReceiptChange(change);
      setShowReceipt(true);

      if (response.data.data.payment_url) {
        window.open(response.data.data.payment_url, '_blank');
      }

      setCart([]);
      setCustomerName('');
      setCustomerAddress('');
      setCustomerEmail('');
      setCustomerContact('');
      setAmountReceived('');
      setPaymentMethod('Cash');
      setPaymentType('full');
    } catch (err) {
      alert('Checkout failed. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

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
      price: Number(service.price),
      image_url: '', // Placeholder to satisfy TS, actual images are handled separately
      child_discount: service.child_discount !== undefined ? Number(service.child_discount) : 30,
      has_booking_fields: !!service.has_booking_fields,
      adult_price: service.adult_price !== undefined && service.adult_price !== null ? Number(service.adult_price) : Number(service.price),
      child_price: service.child_price !== undefined && service.child_price !== null ? Number(service.child_price) : Number(service.price) * 0.7,
      is_tour: !!service.is_tour,
      bus_price: service.bus_price !== undefined && service.bus_price !== null ? Number(service.bus_price) : 0,
      coaster_price: service.coaster_price !== undefined && service.coaster_price !== null ? Number(service.coaster_price) : 0,
      tour_kms: service.tour_kms !== undefined && service.tour_kms !== null ? Number(service.tour_kms) : 0,
      tour_hours: service.tour_hours !== undefined && service.tour_hours !== null ? Number(service.tour_hours) : 0,
      cost_breakdown: service.cost_breakdown || '',
    });
    // For images, we need to handle existing ones. 
    // We'll map them to full URLs for preview but keep track that they are existing
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
      {/* Left Side: Product Grid / Pathway */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Pathway Switcher Pills */}
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-2 flex gap-2 shrink-0">
          <button
            onClick={() => setTransactionPathway('catalog')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              transactionPathway === 'catalog'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Add New Service (Fixed Packages)
          </button>
          <button
            onClick={() => setTransactionPathway('custom')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              transactionPathway === 'custom'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            New Transaction (Custom Booking)
          </button>
        </div>

        {transactionPathway === 'custom' ? (
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm overflow-y-auto animate-in fade-in duration-300">
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
                      onChange={(e) => setCustomForm(prev => ({ ...prev, category: e.target.value, otherCategory: '' }))}
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
                  <div className="space-y-2">
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

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="1"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                    value={customForm.quantity}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Description & Specifications
                  </label>
                  <textarea
                    placeholder="Enter itinerary details, printing dimensions, travel schedules, or transport conditions..."
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[120px] dark:text-white"
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
                      Creating and Adding Custom Service...
                    </>
                  ) : (
                    <>
                      <LuPlus className="w-4 h-4" />
                      Add to Checkout Cart
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm py-4 px-6 md:px-8 relative overflow-hidden shrink-0">
              {isPlaceholderData && (
                <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
                  <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search services or categories..."
                    className="w-full pl-12 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm focus:ring-4 focus:ring-blue-600/5 transition-all font-medium dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex overflow-x-auto hide-scrollbar w-full md:w-auto flex-nowrap bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 h-12 items-center">
                  {['All', 'Documentation', 'Package', 'Transport', 'Tours & Travels', 'Printing Services'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`shrink-0 whitespace-nowrap px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center ${selectedCategory === cat
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-600/10'
                          : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {['super_admin', 'admin', 'accounting', 'agent'].includes(user?.role || '') && (
                  <button
                    onClick={() => {
                      setEditingServiceId(null);
                      setIsEditingService(false);
                      setNewService({ name: '', category: 'Package', description: '', price: 0, image_url: '', child_discount: 30, has_booking_fields: false, adult_price: 0, child_price: 0, is_tour: false, bus_price: 0, coaster_price: 0, tour_kms: 0, tour_hours: 0, cost_breakdown: '' });
                      setServiceImages([]);
                      setShowAddService(true);
                    }}
                    className="px-6 h-12 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <LuPlus className="w-4 h-4" /> Add Service
                  </button>
                )}
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <LuBox className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">No Products Found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 font-medium">
                  We couldn't find any services matching your current filters. Adjust your search or add a new product to get started.
                </p>
                {['super_admin', 'admin', 'accounting', 'agent'].includes(user?.role || '') && (
                  <button
                    onClick={() => {
                      setEditingServiceId(null);
                      setIsEditingService(false);
                      setNewService({ name: '', category: 'Package', description: '', price: 0, image_url: '', child_discount: 30, has_booking_fields: false, adult_price: 0, child_price: 0, is_tour: false, bus_price: 0, coaster_price: 0, tour_kms: 0, tour_hours: 0, cost_breakdown: '' });
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
              <div className="flex-1 md:overflow-y-auto overflow-x-auto pr-2 flex flex-row md:flex-none md:grid md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 hide-scrollbar snap-x snap-mandatory md:auto-rows-max pb-4">
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
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 dark:text-gray-300">
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

                    {/* Price & Action Dropdown (outside overflow-hidden image container to prevent clipping) */}
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
                      {['super_admin', 'admin', 'accounting', 'agent'].includes(user?.role || '') && (
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
                      <p className="text-[10px] text-gray-400 font-medium leading-relaxed line-clamp-2 mb-2">{service.description}</p>

                      {service.creator && (
                        <div className="flex items-center gap-1.5 mb-4 text-[9px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 px-2 py-1 rounded-lg w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Published by: {service.creator.first_name} {service.creator.last_name}</span>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (service.has_booking_fields || service.is_tour) {
                            setSelectedServiceForDetail(service);
                            setDetailImageIndex(0);
                            setBookingAdults(1);
                            setBookingChildren(0);
                            if (service.is_tour) {
                              setBookingTourVehicle('Bus');
                              setBookingTourExtraDays(0);
                              setBookingTourExtraHours(0);
                            }
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
          </>
        )}
      </div>

      {/* Right Side: Sidebar */}
      <div className="w-full lg:w-[450px] bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl flex flex-col overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Current Order</h2>
            <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selected Services</p>
            {cart.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 dark:text-gray-200">
                <LuShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={`${item.service.id}-${item.adults ?? 0}-${item.childrenCount ?? 0}-${item.vehicleType ?? ''}`} className="group p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all hover:border-blue-200 dark:hover:border-blue-800">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-4">
                        <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-tight">{item.service.name}</p>
                        {item.adults !== undefined && !item.service.is_tour && (
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-tight">
                            Guests: {item.adults} Adults {item.childrenCount ? `, ${item.childrenCount} Children` : ''}
                          </p>
                        )}
                        {item.service.is_tour && (
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-tight">
                            Vehicle: {item.vehicleType} {item.extraDays ? `| +${item.extraDays} Days` : ''} {item.extraHours ? `| +${item.extraHours} Hrs` : ''}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 font-bold tracking-widest mt-0.5">₱{Number(item.customPrice ?? item.service.price).toLocaleString(undefined, { minimumFractionDigits: 2 })} / UNIT</p>
                      </div>
                      <button onClick={() => removeFromCart(item.service.id, item.adults, item.childrenCount, item.vehicleType)} className="text-gray-300 hover:text-rose-500 transition-colors">
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-1 shadow-sm">
                        <button onClick={() => updateQuantity(item.service.id, item.quantity - 1, item.adults, item.childrenCount, item.vehicleType)} className="p-1.5 hover:bg-gray-50 dark:bg-gray-800/60 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><LuMinus className="w-3 h-3" /></button>
                        <span className="w-10 text-center text-xs font-black text-gray-900 dark:text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.service.id, item.quantity + 1, item.adults, item.childrenCount, item.vehicleType)} className="p-1.5 hover:bg-gray-50 dark:bg-gray-800/60 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><LuPlus className="w-3 h-3" /></button>
                      </div>
                      <p className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tighter">₱{(Number(item.customPrice ?? item.service.price) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Customer Details</p>
            <div className="space-y-3">
              <div className="relative group">
                <LuUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Customer Name"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  value={customerName}
                  onChange={(e) => setCustomerName(formatName(e.target.value))}
                />
              </div>
              <div className="relative group">
                <LuPhone className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${customerContact && !isContactValid ? 'text-rose-500' : 'text-gray-300 group-focus-within:text-blue-600'}`} />
                <input
                  type="text"
                  placeholder="Contact Number"
                  className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white ${customerContact && !isContactValid
                      ? 'border-rose-300 dark:border-rose-900/50 focus:border-rose-500 focus:ring-rose-500/5'
                      : 'border-gray-100 dark:border-gray-700'
                    }`}
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                />
                {customerContact && !isContactValid && (
                  <div className="flex items-center gap-1.5 mt-2 p-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                    <LuLoaderCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold leading-tight">
                      Please enter a valid PH mobile number (e.g., 09171234567)
                    </p>
                  </div>
                )}
              </div>
              <div className="relative group">
                <LuMail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${customerEmail && !isEmailValid ? 'text-rose-500' : 'text-gray-300 group-focus-within:text-blue-600'}`} />
                <input
                  type="email"
                  placeholder="Email Address"
                  className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white ${customerEmail && !isEmailValid
                      ? 'border-rose-300 dark:border-rose-900/50 focus:border-rose-500 focus:ring-rose-500/5'
                      : 'border-gray-100 dark:border-gray-700'
                    }`}
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
                {customerEmail && !isEmailValid && (
                  <div className="flex items-center gap-1.5 mt-2 p-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                    <LuLoaderCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold leading-tight">
                      Please enter a valid email address format
                    </p>
                  </div>
                )}
              </div>
              <div className="relative group">
                <LuMapPin className="absolute left-4 top-4 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                <textarea
                  placeholder="Full Address"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[80px] dark:text-white"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Payment Method</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('Cash')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${paymentMethod === 'Cash'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400'
                  }`}
              >
                <LuWallet className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod('GCash')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${paymentMethod === 'GCash'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400'
                  }`}
              >
                <LuCreditCard className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">GCash</span>
              </button>
            </div>
            {paymentMethod === 'Cash' && (
              <>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mt-4">Payment Type</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('full');
                      setAmountReceived('');
                    }}
                    className={`py-3 px-1 rounded-2xl border transition-all text-[9px] font-black uppercase tracking-wider text-center ${paymentType === 'full'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400'
                      }`}
                  >
                    Full Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('half');
                      setAmountReceived((total / 2).toFixed(2));
                    }}
                    className={`py-3 px-1 rounded-2xl border transition-all text-[9px] font-black uppercase tracking-wider text-center ${paymentType === 'half'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400'
                      }`}
                  >
                    Half (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('downpayment');
                      setAmountReceived('');
                    }}
                    className={`py-3 px-1 rounded-2xl border transition-all text-[9px] font-black uppercase tracking-wider text-center ${paymentType === 'downpayment'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400'
                      }`}
                  >
                    Downpayment
                  </button>
                </div>
              </>
            )}
          </div>

          {paymentMethod === 'Cash' && cart.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                {paymentType === 'full' ? 'Amount Received' : paymentType === 'half' ? 'Half Payment Amount' : 'Downpayment Amount'}
              </p>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900 dark:text-white font-black text-sm">₱</span>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 rounded-2xl text-xl font-black focus:ring-4 focus:ring-blue-600/5 transition-all text-gray-900 dark:text-white placeholder:text-gray-200 dark:placeholder:text-gray-700"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center px-1">
                {paymentType === 'full' ? (
                  <>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Change</span>
                    <div className={`text-lg font-black tracking-tighter ${Number(amountReceived) - total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-700'}`}>
                      ₱{change.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Remaining Balance</span>
                    <div className={`text-lg font-black tracking-tighter ${balance > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Subtotal</span>
              <span className="text-gray-900 dark:text-white">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>VAT (12%)</span>
              <span className="text-gray-900 dark:text-white">₱{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-100 dark:border-gray-700">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Total</span>
              <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'Cash' && paymentType === 'full' && (Number(amountReceived) < total)) || (paymentMethod === 'Cash' && (paymentType === 'downpayment' || paymentType === 'half') && (Number(amountReceived) <= 0 || Number(amountReceived) >= total)) || !isContactValid || !isEmailValid}
            onClick={handleCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 dark:bg-gray-800 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 dark:text-gray-300 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transition-all flex justify-center items-center gap-3 active:scale-95"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>Complete Transaction <LuCheck className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>

      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <LuCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Payment Received</h3>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Transaction Successfully Processed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
                >
                  <LuPrinter className="w-4 h-4" /> Print Invoice
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-2xl transition-all text-gray-400 hover:text-gray-900 dark:text-white"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Content (Scrollable wrapper with dark/light background) */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-100 dark:bg-gray-950 flex justify-center items-start print-wrapper">
              {/* Premium Paper Receipt Sheet (Always Light Theme for a real receipt feel) */}
              <div
                className="w-full max-w-xl bg-white text-gray-900 border border-gray-200/80 shadow-2xl rounded-[2rem] p-10 relative overflow-hidden flex flex-col"
                id="printable-invoice"
                style={{
                  backgroundImage: 'radial-gradient(rgba(0,0,0,0.01) 1px, transparent 0)',
                  backgroundSize: '8px 8px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02), 0 0 40px rgba(0, 0, 0, 0.01) inset'
                }}
              >
                {/* Decorative cut marks at top/bottom */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 opacity-80" />

                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <div className="flex flex-col items-start">
                      <img src="/JVDlogo-removebg-preview.png" alt="JVD Logo" className="h-16 mb-2 object-contain" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-6 pl-1">Management System</p>

                      <div className="space-y-1 pl-1 text-left">
                        <p className="text-[11px] text-gray-800 font-bold max-w-[300px] leading-relaxed">UNIT 6 -Aryanna Village Center Brgy 175 Susano Road, Camarin, Caloocan City</p>
                        <div className="flex flex-col gap-0.5 mt-2">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="text-blue-600">PHONE:</span> 0976 471 1294
                          </p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="text-blue-600">TEL:</span> 02 8293 8068
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2">INVOICE</h2>
                    <p className="text-sm font-black text-blue-600">#{lastInvoice?.invoice_number}</p>
                    <p className="text-xs text-gray-400 mt-4 font-bold uppercase tracking-widest">
                      {new Date(lastInvoice?.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Bill To */}
                <div className="grid grid-cols-2 gap-8 mb-12 border-t border-b border-gray-100 py-8">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Billed To</p>
                    <p className="text-lg font-black text-gray-900">{lastInvoice?.customer_name || 'Walk-in Customer'}</p>
                    <div className="mt-2 space-y-1">
                      {lastInvoice?.customer_contact && (
                        <p className="text-xs text-gray-600 font-medium flex items-center gap-2">
                          <LuPhone className="w-3 h-3 text-blue-600" /> {lastInvoice.customer_contact}
                        </p>
                      )}
                      {lastInvoice?.customer_email && (
                        <p className="text-xs text-gray-600 font-medium flex items-center gap-2">
                          <LuMail className="w-3 h-3 text-blue-600" /> {lastInvoice.customer_email}
                        </p>
                      )}
                      {lastInvoice?.customer_address && (
                        <p className="text-xs text-gray-600 font-medium flex items-center gap-2">
                          <LuMapPin className="w-3 h-3 text-blue-600" /> {lastInvoice.customer_address}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-blue-600 mt-3 font-bold uppercase tracking-tight italic">Verified POS Transaction</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Payment Info</p>
                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{lastInvoice?.payment_method}</p>
                    <p className={`text-xs mt-1 font-bold uppercase ${lastInvoice?.status === 'partial' ? 'text-amber-500' : 'text-emerald-600'}`}>Status: {lastInvoice?.status}</p>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full mb-12">
                  <thead>
                    <tr className="border-b-2 border-gray-900">
                      <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Description</th>
                      <th className="text-center py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                      <th className="text-right py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Price</th>
                      <th className="text-right py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lastInvoice?.items?.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-100/50">
                        <td className="py-5 text-left">
                          <p className="font-black text-gray-900">{item.service?.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mb-1">{item.service?.category}</p>
                          {item.service?.description && (
                            <p className="text-[11px] text-gray-500 font-normal leading-relaxed max-w-[320px] whitespace-pre-wrap">{item.service.description}</p>
                          )}
                        </td>
                        <td className="py-5 text-center font-bold text-gray-700">{item.quantity}</td>
                        <td className="py-5 text-right font-bold text-gray-700">₱{Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-5 text-right font-black text-gray-900">₱{Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span className="text-gray-900">₱{Number(lastInvoice?.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <span>VAT (12%)</span>
                      <span className="text-gray-900">₱{Number(lastInvoice?.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t-2 border-gray-900 items-center">
                      <span className="text-sm font-black text-gray-900 uppercase tracking-tighter">Total Amount</span>
                      <span className="text-2xl font-black text-blue-600">₱{Number(lastInvoice?.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {lastInvoice?.payment_method === 'Cash' && (
                      <>
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                          <span>
                            {lastInvoice?.payment_type === 'downpayment'
                              ? (Math.abs(Number(lastInvoice?.amount_received) * 2 - Number(lastInvoice?.total_amount)) < 1
                                ? 'Half Payment Paid'
                                : 'Downpayment Paid')
                              : 'Amount Received'}
                          </span>
                          <span className="text-gray-900">₱{Number(receiptAmountReceived || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {lastInvoice?.payment_type === 'downpayment' ? (
                          <div className="flex justify-between pt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <span>Remaining Balance</span>
                            <span className="text-amber-500 font-black">₱{Number(lastInvoice?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between pt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <span>Change</span>
                            <span className="text-emerald-600 font-black">₱{receiptChange.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-16 pt-8 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Thank you for choosing JVD Events & Travels!</p>
                  <p className="text-[9px] text-gray-300 font-medium italic">This is an electronically generated invoice.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer (Not Printed) */}
            <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 flex gap-4 shrink-0 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-3 py-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-600 hover:text-blue-600 text-gray-900 dark:text-white rounded-[2rem] font-black text-xs uppercase transition-all shadow-sm active:scale-95"
              >
                <LuPrinter className="w-5 h-5" /> Print or Save as PDF
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 flex items-center justify-center gap-3 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-xs uppercase shadow-xl shadow-blue-600/20 transition-all active:scale-95"
              >
                Start New Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Register New Service</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Create a new item in the catalog</p>
              </div>
              <button onClick={() => { setShowAddService(false); setServiceImages([]); }} className="p-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
                <LuX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Image Upload Area */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Service Gallery (Multiple Images)</label>
                <div className="grid grid-cols-4 gap-4">
                  {serviceImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-gray-50 dark:bg-gray-800">
                      <img src={img} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setServiceImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <LuTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.multiple = true;
                      input.onchange = (e: any) => {
                        const files = Array.from(e.target.files);
                        files.forEach((file: any) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setServiceImages(prev => [...prev, reader.result as string]);
                          };
                          reader.readAsDataURL(file);
                        });
                      };
                      input.click();
                    }}
                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all bg-gray-50/50 dark:bg-gray-800/30"
                  >
                    <LuCamera className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase">Upload</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Service Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Boracay Luxury Package"
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                    value={newService.name}
                    onChange={e => setNewService({ ...newService, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none appearance-none"
                    value={newService.category}
                    onChange={e => setNewService({ ...newService, category: e.target.value })}
                  >
                    <option value="Package">Travel Package</option>
                    <option value="Tours & Travels">Tours & Travels</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Transport">Transportation</option>
                    <option value="Printing Services">Printing Services</option>
                    <option value="Other">Other Services</option>
                  </select>
                </div>
              </div>

              {newService.category === 'Tours & Travels' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Bus Price (₱)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={newService.bus_price}
                      onChange={e => setNewService({ ...newService, bus_price: Number(e.target.value), is_tour: true, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Coaster Price (₱)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={newService.coaster_price}
                      onChange={e => setNewService({ ...newService, coaster_price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Distance (KMS)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={newService.tour_kms}
                      onChange={e => setNewService({ ...newService, tour_kms: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Time (Hours)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={newService.tour_hours}
                      onChange={e => setNewService({ ...newService, tour_hours: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Base Price (₱)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black">₱</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 pl-10 pr-5 text-xl font-black dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={newService.price}
                      onChange={e => {
                        const newPrice = Number(e.target.value);
                        setNewService(prev => ({
                          ...prev,
                          price: newPrice,
                          adult_price: prev.has_booking_fields && (prev.adult_price === 0 || prev.adult_price === prev.price) ? newPrice : prev.adult_price,
                          child_price: prev.has_booking_fields && (prev.child_price === 0 || prev.child_price === prev.price * (1 - prev.child_discount / 100)) ? (newPrice * (1 - prev.child_discount / 100)) : prev.child_price
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Child Discount Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 30"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 pr-16 text-sm font-black dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={newService.child_discount}
                      onChange={e => {
                        const discount = Math.min(100, Math.max(0, Number(e.target.value)));
                        setNewService(prev => ({
                          ...prev,
                          child_discount: discount,
                          child_price: prev.has_booking_fields && (prev.child_price === 0 || prev.child_price === prev.price * (1 - prev.child_discount / 100)) ? (prev.price * (1 - discount / 100)) : prev.child_price
                        }));
                      }}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest">% OFF</span>
                  </div>
                </div>
              </div>

              {/* Toggle Booking Configuration */}
              <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all">
                <div className="space-y-1 flex-1 pr-4">
                  <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none">Adult & Child Guest Options</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">Enable passenger counters and set custom adult and child pricing rates for this service</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !newService.has_booking_fields;
                    setNewService({
                      ...newService,
                      has_booking_fields: nextVal,
                      adult_price: nextVal ? (newService.adult_price || newService.price) : 0,
                      child_price: nextVal ? (newService.child_price || (newService.price * (1 - newService.child_discount / 100))) : 0
                    });
                  }}
                  className={`w-14 h-8 rounded-full transition-all duration-300 p-1 flex items-center ${newService.has_booking_fields ? 'bg-blue-600 justify-end' : 'bg-gray-200 dark:bg-gray-700 justify-start'
                    }`}
                >
                  <span className="w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300"></span>
                </button>
              </div>

              {/* Dynamic Rates Configuration if Toggle is ON */}
              {newService.has_booking_fields && (
                <div className="p-6 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-6 animate-in slide-in-from-top-3 duration-300">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Guest Rates Setup</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center pl-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adult Price (₱)</label>
                        <button
                          type="button"
                          onClick={() => setNewService({ ...newService, adult_price: newService.price })}
                          className="text-[9px] font-black text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-tight"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black">₱</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 pl-10 pr-5 text-sm font-black dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                          value={newService.adult_price || ''}
                          onChange={e => setNewService({ ...newService, adult_price: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center pl-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Child Price (₱)</label>
                        <button
                          type="button"
                          onClick={() => setNewService({ ...newService, child_price: newService.price * (1 - newService.child_discount / 100) })}
                          className="text-[9px] font-black text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-tight"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black">₱</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 pl-10 pr-5 text-sm font-black dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                          value={newService.child_price || ''}
                          onChange={e => setNewService({ ...newService, child_price: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Service Description</label>
                <textarea
                  placeholder="Provide detailed information about the service or package inclusions..."
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-[2rem] py-5 px-6 text-sm font-medium dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none min-h-[120px]"
                  value={newService.description}
                  onChange={e => setNewService({ ...newService, description: e.target.value })}
                />
              </div>

              {/* Cost Breakdown — Admin/Super Admin only */}
              {['super_admin', 'admin'].includes(user?.role || '') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1">Cost Breakdown</label>
                    <span className="text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full uppercase tracking-widest">Admin Only</span>
                  </div>
                  <textarea
                    placeholder="e.g. Transportation: ₱5,000 | Hotel: ₱8,000 | Meals: ₱2,000 | Guide: ₱1,500..."
                    className="w-full bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-[2rem] py-5 px-6 text-sm font-medium dark:text-white focus:ring-4 focus:ring-amber-500/10 transition-all outline-none min-h-[100px]"
                    value={newService.cost_breakdown}
                    onChange={e => setNewService({ ...newService, cost_breakdown: e.target.value })}
                  />
                  <p className="text-[10px] text-amber-500 font-bold pl-1">This breakdown is only visible to Super Admin and Admin roles.</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste URL and press Enter or click Add..."
                    className="flex-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                    value={newService.image_url}
                    onChange={e => setNewService({ ...newService, image_url: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newService.image_url.trim()) {
                          setServiceImages(prev => [...prev, newService.image_url.trim()]);
                          setNewService({ ...newService, image_url: '' });
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newService.image_url.trim()) {
                        setServiceImages(prev => [...prev, newService.image_url.trim()]);
                        setNewService({ ...newService, image_url: '' });
                      }
                    }}
                    className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex gap-4">
              <button
                onClick={() => { setShowAddService(false); setIsEditingService(false); setServiceImages([]); setNewService({ name: '', category: 'Package', description: '', price: 0, image_url: '', child_discount: 30, has_booking_fields: false, adult_price: 0, child_price: 0, is_tour: false, bus_price: 0, coaster_price: 0, tour_kms: 0, tour_hours: 0, cost_breakdown: '' }); }}
                className="flex-1 py-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (isEditingService && editingServiceId) {
                      await billingApi.updateService(editingServiceId, { ...newService, images: serviceImages });
                    } else {
                      await billingApi.createService({ ...newService, images: serviceImages });
                    }
                    queryClient.invalidateQueries({ queryKey: ['billing-services'] });
                    setIsEditingService(false);
                    setEditingServiceId(null);
                    setServiceImages([]);
                    setNewService({ name: '', category: 'Package', description: '', price: 0, image_url: '', child_discount: 30, has_booking_fields: false, adult_price: 0, child_price: 0, is_tour: false, bus_price: 0, coaster_price: 0, tour_kms: 0, tour_hours: 0, cost_breakdown: '' });
                    setShowAddService(false);
                  } catch (err) {
                    alert('Failed to save service');
                  }
                }}
                className="flex-2 py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <LuCheck className="w-5 h-5" /> {isEditingService ? 'Update Service' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Detail Modal */}
      {showDetailModal && selectedServiceForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-xl duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh]">
            {/* Gallery Column */}
            <div className="flex-1 bg-gray-50 dark:bg-gray-800 relative group">
              {(selectedServiceForDetail.images && selectedServiceForDetail.images.length > 0) ? (
                <>
                  <img
                    src={selectedServiceForDetail.images[detailImageIndex]?.startsWith('http')
                      ? selectedServiceForDetail.images[detailImageIndex]
                      : `/storage/${selectedServiceForDetail.images[detailImageIndex]}`}
                    className="w-full h-full object-contain p-6 mx-auto bg-gray-50 dark:bg-gray-800"
                    alt={selectedServiceForDetail.name}
                  />
                  {selectedServiceForDetail.images.length > 1 && (
                    <div className="absolute inset-x-0 bottom-8 flex justify-center gap-2">
                      {selectedServiceForDetail.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setDetailImageIndex(i)}
                          className={`w-3 h-3 rounded-full border-2 border-white transition-all ${detailImageIndex === i ? 'bg-blue-600 w-8' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  )}
                  {selectedServiceForDetail.images.length > 1 && (
                    <div className="absolute inset-y-0 inset-x-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setDetailImageIndex(prev => prev > 0 ? prev - 1 : (selectedServiceForDetail.images?.length || 1) - 1)} className="p-3 bg-white dark:bg-gray-900/20 backdrop-blur-md rounded-full text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"><LuChevronLeft className="w-6 h-6" /></button>
                      <button onClick={() => setDetailImageIndex(prev => (prev + 1) % (selectedServiceForDetail.images?.length || 1))} className="p-3 bg-white dark:bg-gray-900/20 backdrop-blur-md rounded-full text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"><LuChevronRight className="w-6 h-6" /></button>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 dark:text-gray-300 gap-4">
                  <LuImage className="w-20 h-20 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Preview Available</p>
                </div>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="absolute top-6 right-6 p-3 bg-white dark:bg-gray-900/20 backdrop-blur-md border border-white/20 rounded-2xl text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {/* Info Column */}
            <div className="w-full md:w-[400px] p-10 flex flex-col border-l border-gray-100 dark:border-gray-800 relative">
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedServiceForDetail.category === 'Documentation' ? 'bg-blue-50 text-blue-600' :
                      selectedServiceForDetail.category === 'Package' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-violet-50 text-violet-600'
                    }`}>
                    {selectedServiceForDetail.category}
                  </span>

                  {(user?.role === 'super_admin' || user?.role === 'admin') && (
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
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-4 leading-tight uppercase tracking-tighter">
                  {selectedServiceForDetail.name}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 mb-8 pr-2 custom-scrollbar">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Service Description</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                    {selectedServiceForDetail.description}
                  </p>
                </div>

                {selectedServiceForDetail.creator && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Published By</p>
                    <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800">
                      <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs">
                        {selectedServiceForDetail.creator.first_name[0]}{selectedServiceForDetail.creator.last_name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white leading-none">
                          {selectedServiceForDetail.creator.first_name} {selectedServiceForDetail.creator.last_name}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold tracking-tight mt-1">
                          {selectedServiceForDetail.creator.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cost Breakdown — Admin/Super Admin view only */}
                {['super_admin', 'admin'].includes(user?.role || '') && selectedServiceForDetail.cost_breakdown && (
                  <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-100 dark:border-amber-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Cost Breakdown</p>
                      <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Admin Only</span>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedServiceForDetail.cost_breakdown}
                    </p>
                  </div>
                )}

                {/* Dynamic Passenger counter controls for booking types */}
                {selectedServiceForDetail.has_booking_fields && (
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Booking Guest Configuration</p>

                    {/* Adults counter */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white leading-none uppercase">Adults</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">₱{selectedDetailAdultPrice.toLocaleString()} / Pax</p>
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
                          onClick={() => setBookingAdults(prev => prev + 1)}
                          className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                        >
                          <LuPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Children counter */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white leading-none uppercase">Children</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">₱{selectedDetailChildPrice.toLocaleString()} / Pax ({selectedDetailChildDiscount}% OFF)</p>
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
                          onClick={() => setBookingChildren(prev => prev + 1)}
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
                        <button onClick={() => setBookingTourExtraDays(prev => Math.max(0, prev - 1))} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                          <LuMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-black text-gray-900 dark:text-white">{bookingTourExtraDays}</span>
                        <button onClick={() => setBookingTourExtraDays(prev => prev + 1)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400">
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
                        <button onClick={() => setBookingTourExtraHours(prev => Math.max(0, prev - 1))} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                          <LuMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-black text-gray-900 dark:text-white">{bookingTourExtraHours}</span>
                        <button onClick={() => setBookingTourExtraHours(prev => prev + 1)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                          <LuPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-450 dark:text-gray-400 uppercase tracking-widest mb-2">Package Investment</p>
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
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/80 text-[10px] text-gray-400 font-medium space-y-1">
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
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/80 text-[10px] text-gray-400 font-medium space-y-1">
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
                  <p className="text-[10px] text-gray-400 font-medium mt-2">* VAT Inclusive Price</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (selectedServiceForDetail.is_tour) {
                      const basePrice = bookingTourVehicle === 'Bus' ? (selectedServiceForDetail.bus_price || 0) : (selectedServiceForDetail.coaster_price || 0);
                      const extraDaysPrice = bookingTourExtraDays * (bookingTourVehicle === 'Bus' ? 22010 : 16780);
                      const extraHoursPrice = bookingTourExtraHours * (bookingTourVehicle === 'Bus' ? 1950 : 1680);
                      const computedPrice = basePrice + extraDaysPrice + extraHoursPrice;
                      addToCart(selectedServiceForDetail, undefined, undefined, computedPrice, bookingTourVehicle, bookingTourExtraDays, bookingTourExtraHours);
                    } else if (selectedServiceForDetail.has_booking_fields) {
                      const computedPrice = (bookingAdults * selectedDetailAdultPrice) + (bookingChildren * selectedDetailChildPrice);
                      addToCart(selectedServiceForDetail, bookingAdults, bookingChildren, computedPrice);
                    } else {
                      addToCart(selectedServiceForDetail);
                    }
                    setShowDetailModal(false);
                  }}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <LuPlus className="w-5 h-5" /> Add to Current Order
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full py-5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-gray-900 dark:text-white dark:hover:text-white transition-all"
                >
                  Keep Browsing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden !important;
          }
          /* Show the invoice and all its children */
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          /* Hide the modal overlay/backdrop */
          .fixed.inset-0 {
            background: transparent !important;
            backdrop-filter: none !important;
          }
          /* Hide scrollable wrapper background, show invoice only */
          .print-wrapper {
            background: none !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          /* Position invoice at top of page */
          #printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px 40px !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background-image: none !important;
          }
          /* Force white background */
          html, body, #root {
            background-color: #ffffff !important;
            background-image: none !important;
            color: #111827 !important;
          }
          /* Neutralize dark-mode classes in print */
          .dark, [class*="dark:"] {
            background-color: #ffffff !important;
            color: #111827 !important;
            border-color: #e5e7eb !important;
          }
          /* Force standard text colors on elements */
          #printable-invoice p, 
          #printable-invoice span, 
          #printable-invoice td, 
          #printable-invoice th, 
          #printable-invoice h2, 
          #printable-invoice h3, 
          #printable-invoice div {
            color: #111827 !important;
          }
          /* Preserve branding accents */
          #printable-invoice .text-blue-600 {
            color: #1d4ed8 !important;
          }
          #printable-invoice .text-emerald-600 {
            color: #047857 !important;
          }
          #printable-invoice .text-gray-400,
          #printable-invoice .text-gray-500 {
            color: #6b7280 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      ` }} />

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

      {/* Success / Error Alert Dialog */}
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
