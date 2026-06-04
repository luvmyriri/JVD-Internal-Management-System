import { useState, useMemo } from 'react';
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
  LuTrash2,
  LuCamera,
  LuCheck,
  LuPrinter
} from 'react-icons/lu';
import { Pencil, Trash2 } from 'lucide-react';
import { billingApi, type Service } from '../../api/billing';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LoadingScreen, Dropdown, ConfirmDialog } from '../../components/ui';
import SalesCheckout, { type CartItem } from './SalesCheckout';

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

  // Tour booking states
  const [bookingTourVehicle, setBookingTourVehicle] = useState<'Bus' | 'Coaster'>('Bus');
  const [bookingTourExtraDays, setBookingTourExtraDays] = useState<number>(0);
  const [bookingTourExtraHours, setBookingTourExtraHours] = useState<number>(0);

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

  const handlePrintService = () => {
    if (!selectedServiceForDetail) return;
    
    const service = selectedServiceForDetail;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the brochure.');
      return;
    }

    const formatPrice = (amount: number) => {
      return '₱' + Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // Determine current selections and compute total price
    let pricingRowsHTML = '';
    let totalPrice = 0;

    if (service.is_tour) {
      const basePrice = bookingTourVehicle === 'Bus' ? (service.bus_price || 0) : (service.coaster_price || 0);
      const extraDaysPrice = bookingTourExtraDays * (bookingTourVehicle === 'Bus' ? 22010 : 16780);
      const extraHoursPrice = bookingTourExtraHours * (bookingTourVehicle === 'Bus' ? 1950 : 1680);
      totalPrice = basePrice + extraDaysPrice + extraHoursPrice;

      pricingRowsHTML = `
        <tr>
          <td style="font-weight: 600; color: #0f172a;">Vehicle Rental (${bookingTourVehicle})</td>
          <td class="text-right">${formatPrice(basePrice)}</td>
          <td class="text-center font-semibold">1 Unit</td>
          <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(basePrice)}</td>
        </tr>
      `;
      if (bookingTourExtraDays > 0) {
        pricingRowsHTML += `
          <tr>
            <td style="font-weight: 600; color: #0f172a;">Extra Rental Days</td>
            <td class="text-right">${formatPrice(bookingTourVehicle === 'Bus' ? 22010 : 16780)}</td>
            <td class="text-center font-semibold">${bookingTourExtraDays} Day(s)</td>
            <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(extraDaysPrice)}</td>
          </tr>
        `;
      }
      if (bookingTourExtraHours > 0) {
        pricingRowsHTML += `
          <tr>
            <td style="font-weight: 600; color: #0f172a;">Extra Rental Hours</td>
            <td class="text-right">${formatPrice(bookingTourVehicle === 'Bus' ? 1950 : 1680)}</td>
            <td class="text-center font-semibold">${bookingTourExtraHours} Hour(s)</td>
            <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(extraHoursPrice)}</td>
          </tr>
        `;
      }
    } else if (service.has_booking_fields) {
      const adultTotal = bookingAdults * selectedDetailAdultPrice;
      const childTotal = bookingChildren * selectedDetailChildPrice;
      totalPrice = adultTotal + childTotal;

      pricingRowsHTML = `
        <tr>
          <td style="font-weight: 600; color: #0f172a;">Adult Guest Tickets</td>
          <td class="text-right">${formatPrice(selectedDetailAdultPrice)}</td>
          <td class="text-center font-semibold">${bookingAdults} Pax</td>
          <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(adultTotal)}</td>
        </tr>
      `;
      if (bookingChildren > 0) {
        pricingRowsHTML += `
          <tr>
            <td style="font-weight: 600; color: #0f172a;">Child Guest Tickets (${selectedDetailChildDiscount}% Off)</td>
            <td class="text-right">${formatPrice(selectedDetailChildPrice)}</td>
            <td class="text-center font-semibold">${bookingChildren} Pax</td>
            <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(childTotal)}</td>
          </tr>
        `;
      }
    } else {
      totalPrice = service.price || 0;
      pricingRowsHTML = `
        <tr>
          <td style="font-weight: 600; color: #0f172a;">Standard Base Rate</td>
          <td class="text-right">${formatPrice(totalPrice)}</td>
          <td class="text-center font-semibold">1 Option</td>
          <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(totalPrice)}</td>
        </tr>
      `;
    }

    const firstImage = service.images && service.images.length > 0 
      ? (service.images[0].startsWith('http') ? service.images[0] : `${window.location.origin}/storage/${service.images[0]}`) 
      : `${window.location.origin}/JVD 3D.png`;

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const agentName = user ? `${user.first_name} ${user.last_name}` : 'JVD Events Agent';
    const refNo = `JVD-QT-${Math.floor(100000 + Math.random() * 900000)}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - ${service.name}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            color: #334155;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .container {
            max-width: 800px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            min-height: 94vh;
            justify-content: space-between;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 18px;
            margin-bottom: 22px;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .logo {
            height: 52px;
            width: auto;
          }

          .brand-text h1 {
            font-size: 20px;
            font-weight: 800;
            margin: 0;
            color: #1e3a8a;
            letter-spacing: -0.03em;
          }

          .brand-text p {
            font-size: 10px;
            color: #3b82f6;
            margin: 3px 0 0 0;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.15em;
          }

          .meta-info {
            text-align: right;
            font-size: 11px;
            color: #475569;
            line-height: 1.5;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px 14px;
            border-radius: 12px;
          }

          .meta-title {
            font-size: 13px;
            font-weight: 800;
            color: #1e3a8a;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .service-section {
            margin-bottom: 24px;
          }

          .service-category {
            display: inline-block;
            background: #eff6ff;
            color: #2563eb;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding: 4px 10px;
            border-radius: 6px;
            margin-bottom: 10px;
          }

          .service-title {
            font-size: 26px;
            font-weight: 850;
            color: #0f172a;
            margin: 0 0 12px 0;
            text-transform: uppercase;
            letter-spacing: -0.02em;
            line-height: 1.1;
          }

          .layout-grid {
            display: flex;
            gap: 24px;
            margin-bottom: 25px;
          }

          .image-col {
            flex: 1;
            max-width: 45%;
          }

          .service-image {
            width: 100%;
            height: 190px;
            object-fit: cover;
            border-radius: 18px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          }

          .desc-col {
            flex: 1.2;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }

          .desc-label {
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 8px;
          }

          .desc-text {
            font-size: 13px;
            line-height: 1.6;
            color: #334155;
            margin: 0;
          }

          .table-section {
            margin-bottom: 25px;
          }

          .table-title {
            font-size: 11px;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 12px;
            border-left: 4px solid #2563eb;
            padding-left: 10px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            border: 1px solid #e2e8f0;
          }

          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 12px 14px;
            border-bottom: 2px solid #e2e8f0;
            font-size: 10px;
          }

          td {
            padding: 12px 14px;
            border-bottom: 1px solid #e2e8f0;
            color: #475569;
          }

          tr:last-child td {
            border-bottom: none;
          }

          .text-right {
            text-align: right;
          }

          .text-center {
            text-align: center;
          }

          .total-box {
            background: #f8fafc;
            border-left: 6px solid #2563eb;
            border-top: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px 24px;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .total-label {
            font-size: 12px;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .total-amount {
            font-size: 26px;
            font-weight: 900;
            color: #1e3a8a;
            letter-spacing: -0.02em;
          }

          .disclaimer {
            font-size: 9px;
            color: #64748b;
            margin-top: 8px;
            line-height: 1.4;
          }

          .footer-section {
            border-top: 1px solid #e2e8f0;
            padding-top: 25px;
            margin-top: auto;
          }

          .sign-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
          }

          .sign-col {
            width: 45%;
          }

          .sign-line {
            border-bottom: 1.5px solid #cbd5e1;
            margin-top: 45px;
            margin-bottom: 6px;
          }

          .sign-title {
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .sign-name {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
          }

          .company-info {
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            line-height: 1.4;
            letter-spacing: 0.02em;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div>
            <!-- Header -->
            <div class="header">
              <div class="brand">
                <img class="logo" src="${window.location.origin}/JVD 3D.png" alt="JVD Logo" onerror="this.style.display='none'">
                <div class="brand-text">
                  <h1>JVD Events & Travels</h1>
                  <p>Management Co.</p>
                </div>
              </div>
              <div class="meta-info">
                <div class="meta-title">Official Quotation</div>
                <div><strong>Ref No:</strong> ${refNo}</div>
                <div><strong>Date:</strong> ${currentDate}</div>
              </div>
            </div>

            <!-- Service Details -->
            <div class="service-section">
              <span class="service-category">${service.category}</span>
              <h2 class="service-title">${service.name}</h2>
              
              <div class="layout-grid">
                <div class="image-col">
                  <img class="service-image" src="${firstImage}" alt="${service.name}">
                </div>
                <div class="desc-col">
                  <div class="desc-label">Package Inclusions & Description</div>
                  <p class="desc-text">${service.description}</p>
                </div>
              </div>
            </div>

            <!-- Pricing Breakdown -->
            <div class="table-section">
              <div class="table-title">Pricing & Configuration Summary</div>
              <table>
                <thead>
                  <tr>
                    <th class="text-left">Details</th>
                    <th class="text-right" style="width: 130px;">Unit Rate</th>
                    <th class="text-center" style="width: 100px;">Quantity</th>
                    <th class="text-right" style="width: 130px;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${pricingRowsHTML}
                </tbody>
              </table>

              <div class="total-box">
                <span class="total-label">Total Investment</span>
                <span class="total-amount">${formatPrice(totalPrice)}</span>
              </div>
              <p class="disclaimer">* Pricing listed is VAT-inclusive and valid for 15 days from the date of quotation generation.</p>
            </div>
          </div>

          <!-- Print Footer -->
          <div class="footer-section">
            <div class="sign-grid">
              <div class="sign-col">
                <div class="sign-title">Prepared By</div>
                <div class="sign-line"></div>
                <div class="sign-name">${agentName}</div>
                <div style="font-size: 9px; color: #64748b; font-weight: 500;">Travel Agent / Coordinator</div>
              </div>
              <div class="sign-col">
                <div class="sign-title">Customer Acceptance</div>
                <div class="sign-line"></div>
                <div class="sign-name">___________________________</div>
                <div style="font-size: 9px; color: #64748b; font-weight: 500;">Signature Over Printed Name</div>
              </div>
            </div>
            
            <div class="company-info">
              JVD Events & Travels Management Co. • Ground Floor, JVD Bldg • contact@jvdevents.com • +63 (2) 8123-4567
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
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
      price: Number(service.price),
      image_url: '',
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
              <div className="flex overflow-x-auto hide-scrollbar flex-nowrap bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 h-12 items-center flex-1 sm:flex-none">
                {['All', 'Documentation', 'Package', 'Transport', 'Tours & Travels', 'Printing Services'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 whitespace-nowrap px-4 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center ${selectedCategory === cat
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
                    setNewService({ name: '', category: 'Package', description: '', price: 0, image_url: '', child_discount: 30, has_booking_fields: false, adult_price: 0, child_price: 0, is_tour: false, bus_price: 0, coaster_price: 0, tour_kms: 0, tour_hours: 0, cost_breakdown: '' });
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
      </div>

      {/* Right Side: Checkout Panel */}
      <SalesCheckout
        cart={cart}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
        clearCart={() => setCart([])}
      />

      {/* Add/Edit Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">{isEditingService ? 'Edit Service Details' : 'Register New Service'}</h3>
                <p className="text-[10px] text-gray-405 font-bold uppercase tracking-widest">{isEditingService ? 'Modify catalog item properties' : 'Create a new item in the catalog'}</p>
              </div>
              <button onClick={() => { setShowAddService(false); setServiceImages([]); }} className="p-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
                <LuX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
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
                  <p className="text-[10px] text-gray-405 font-bold mt-1">Enable passenger counters and set custom adult and child pricing rates for this service</p>
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

              {/* Cost Breakdown — Management roles */}
              {['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user?.role || '') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1">Cost Breakdown</label>
                    <span className="text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full uppercase tracking-widest">Internal Only</span>
                  </div>
                  <textarea
                    placeholder="e.g. Transportation: ₱5,000 | Hotel: ₱8,000 | Meals: ₱2,000 | Guide: ₱1,500..."
                    className="w-full bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-[2rem] py-5 px-6 text-sm font-medium dark:text-white focus:ring-4 focus:ring-amber-500/10 transition-all outline-none min-h-[100px]"
                    value={newService.cost_breakdown}
                    onChange={e => setNewService({ ...newService, cost_breakdown: e.target.value })}
                  />
                  <p className="text-[10px] text-amber-500 font-bold pl-1">This breakdown is visible to management and agent roles.</p>
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
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-650 gap-4">
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
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-4 leading-tight uppercase tracking-tighter">
                  {selectedServiceForDetail.name}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 mb-8 pr-2 custom-scrollbar">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Service Description</p>
                  <p className="text-sm text-gray-655 dark:text-gray-405 font-medium leading-relaxed">
                    {selectedServiceForDetail.description}
                  </p>
                </div>

                {/* Cost Breakdown — Visible to all Sales page viewers */}
                {['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary', 'reservation_officer', 'office_staff'].includes(user?.role || '') && selectedServiceForDetail.cost_breakdown && (
                  <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-100 dark:border-amber-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Cost Breakdown</p>
                      <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Internal Use Only</span>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedServiceForDetail.cost_breakdown}
                    </p>
                  </div>
                )}

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
                        <p className="text-[9px] text-gray-405 mt-1 font-bold">
                          {selectedServiceForDetail.creator.email}
                        </p>
                      </div>
                    </div>
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
                          onClick={() => setBookingAdults(prev => prev + 1)}
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
                  <p className="text-[10px] text-gray-450 mt-2">* VAT Inclusive Price</p>
                </div>
              </div>

              <div className="space-y-3 font-black">
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
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <LuPlus className="w-5 h-5" /> Add to Current Order
                </button>
                <button
                  type="button"
                  onClick={handlePrintService}
                  className="w-full py-5 bg-slate-800 dark:bg-gray-800 text-white rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-700 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <LuPrinter className="w-5 h-5" /> Print Brochure / Quotation
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full py-5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-2xl text-[10px] uppercase tracking-widest hover:text-gray-900 dark:text-white dark:hover:text-white transition-all"
                >
                  Keep Browsing
                </button>
              </div>
            </div>
          </div>
        </div>
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
