import { useState, useEffect, useMemo } from 'react';
import {
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
  LuLoaderCircle,
  LuPenLine
} from 'react-icons/lu';
import { billingApi, type Service } from '../../api/billing';
import { customerApi } from '../../api/customers';
import { formatMoneyInput, parseMoneyInput } from '../../utils';

export interface CartItem {
  cartId?: string;
  service: Service;
  quantity: number;
  adults?: number;
  childrenCount?: number;
  customPrice?: number;
  vehicleType?: 'Bus' | 'Coaster';
  extraDays?: number;
  extraHours?: number;
  busId?: number;
  selectedSeats?: string[];
  driverId?: number;
  driverName?: string;
  travelDate?: string;
  tourCode?: string;
  pickupLocation?: string;
  paxCount?: number;
  serviceDate?: string;
  destination?: string;
  arrivalDate?: string;
  departureDate?: string;
}

interface SalesCheckoutProps {
  cart: CartItem[];
  removeFromCart: (serviceId: number, adults?: number, childrenCount?: number, vehicleType?: 'Bus' | 'Coaster', busId?: number, cartId?: string) => void;
  updateQuantity: (serviceId: number, newQty: number, adults?: number, childrenCount?: number, vehicleType?: 'Bus' | 'Coaster', busId?: number, cartId?: string) => void;
  clearCart: () => void;
  onEditCartItem?: (item: CartItem) => void;
}

export default function SalesCheckout({ cart, removeFromCart, updateQuantity, clearCart, onEditCartItem }: SalesCheckoutProps) {

  // State
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

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Auto-search customers as user types
  useEffect(() => {
    if (selectedCustomerId) return;
    if (!customerName || customerName.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await customerApi.list({ search: customerName });
        if (res.data.success) {
          setSearchResults(res.data.data || []);
          setShowDropdown((res.data.data || []).length > 0);
        }
      } catch (err) {
        console.error('Error fetching customers', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [customerName, selectedCustomerId]);

  // Click outside to close autocomplete dropdown
  useEffect(() => {
    const clickOutside = () => setShowDropdown(false);
    window.addEventListener('click', clickOutside);
    return () => window.removeEventListener('click', clickOutside);
  }, []);

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.full_name);
    setCustomerEmail(customer.email || '');
    setCustomerContact(customer.phone || '');
    setCustomerAddress(customer.address || '');
    setShowDropdown(false);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerContact('');
    setCustomerAddress('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const TAX_RATE = 0.12;

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + ((item.customPrice ?? item.service.price) * item.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const change = amountReceived !== '' && !isNaN(Number(parseMoneyInput(String(amountReceived))))
    ? (paymentType === 'full' ? Math.max(0, Number(parseMoneyInput(String(amountReceived))) - total) : 0)
    : 0;

  const balance = (paymentType === 'downpayment' || paymentType === 'half') && amountReceived !== '' && !isNaN(Number(parseMoneyInput(String(amountReceived))))
    ? Math.max(0, total - Number(parseMoneyInput(String(amountReceived))))
    : 0;

  // Auto-update amountReceived when total changes if paymentType is 'half'
  useEffect(() => {
    if (paymentType === 'half') {
      setAmountReceived(formatMoneyInput((total / 2).toFixed(2)));
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

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!isContactValid || !isEmailValid) {
      alert('Please correct the validation errors in customer details.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await billingApi.createInvoice({
        customer_id: selectedCustomerId || undefined,
        customer_name: customerName || undefined,
        customer_address: customerAddress || undefined,
        customer_email: customerEmail || undefined,
        customer_contact: customerContact ? customerContact.replace(/[\s\-\(\)]/g, '') : undefined,
        payment_method: paymentMethod,
        payment_type: paymentType === 'half' ? 'downpayment' : paymentType,
        amount_received: paymentMethod === 'Cash' ? Number(parseMoneyInput(String(amountReceived || 0))) : undefined,
        change: paymentMethod === 'Cash' ? Number(change) : undefined,
        items: cart.map(item => ({
          service_id: item.service.id,
          quantity: item.quantity,
          unit_price: item.customPrice ?? item.service.price,
          adults: item.adults,
          children: item.childrenCount,
          service_date: item.serviceDate,
          destination: item.destination
        })),
        bus_id: cart.find(item => item.busId)?.busId || null,
        driver_id: cart.find(item => item.driverId)?.driverId || null,
        seat_map: cart.find(item => item.selectedSeats)?.selectedSeats || null,
        travel_date: cart.find(item => item.travelDate)?.travelDate || null,
        pickup_location: cart.find(item => item.pickupLocation)?.pickupLocation || null,
        tour_code: cart.find(item => item.tourCode)?.tourCode || null,
        pax_count: cart.find(item => item.paxCount)?.paxCount || null,
        arrival_datetime: cart.find(item => item.arrivalDate)?.arrivalDate || null,
        departure_datetime: cart.find(item => item.departureDate)?.departureDate || null,
      } as any);

      setLastInvoice(response.data.data);
      setReceiptAmountReceived(amountReceived);
      setReceiptChange(change);
      setShowReceipt(true);

      if (response.data.data.payment_url) {
        window.open(response.data.data.payment_url, '_blank');
      }

      clearCart();
      setCustomerName('');
      setCustomerAddress('');
      setCustomerEmail('');
      setCustomerContact('');
      setAmountReceived('');
      setPaymentMethod('Cash');
      setPaymentType('full');
      setSelectedCustomerId(null);
      setSearchResults([]);
    } catch (err) {
      alert('Checkout failed. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full lg:w-[450px] bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl flex flex-col overflow-hidden h-full">
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
            <div className="py-12 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 dark:text-gray-205">
              <LuShoppingCart className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.cartId} className="group p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all hover:border-blue-200 dark:hover:border-blue-800">
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
                      {item.busId && (
                        <p className="text-[9px] text-blue-600 dark:text-blue-450 font-black mt-1 uppercase tracking-tight">
                          Bus Assigned (ID: {item.busId}) {item.selectedSeats && item.selectedSeats.length > 0 ? `| Seats: ${item.selectedSeats.join(', ')}` : ''}
                        </p>
                      )}
                      {item.driverName && (
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-450 font-black mt-1 uppercase tracking-tight">
                          Driver Assigned: {item.driverName}
                        </p>
                      )}
                      {item.travelDate && (
                        <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-black mt-1 uppercase tracking-tight">
                          Travel Date: {item.travelDate}
                        </p>
                      )}
                      {item.tourCode && (
                        <p className="text-[9px] text-purple-600 dark:text-purple-400 font-black mt-1 uppercase tracking-tight">
                          Tour Code: {item.tourCode}
                        </p>
                      )}
                      {item.pickupLocation && (
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-black mt-1 uppercase tracking-tight">
                          Pickup: {item.pickupLocation}
                        </p>
                      )}
                      {item.arrivalDate && (
                        <p className="text-[9px] text-teal-600 dark:text-teal-400 font-black mt-1 uppercase tracking-tight">
                          Arrival: {new Date(item.arrivalDate).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {item.departureDate && (
                        <p className="text-[9px] text-rose-600 dark:text-rose-400 font-black mt-1 uppercase tracking-tight">
                          Departure: {new Date(item.departureDate).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {item.paxCount && (
                        <p className="text-[9px] text-cyan-600 dark:text-cyan-400 font-black mt-1 uppercase tracking-tight">
                          Pax Count: {item.paxCount} Pax
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 font-bold tracking-widest mt-0.5">₱{Number(item.customPrice ?? item.service.price).toLocaleString(undefined, { minimumFractionDigits: 2 })} / UNIT</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {onEditCartItem && (
                        <button
                          onClick={() => onEditCartItem(item)}
                          className="text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit details"
                        >
                          <LuPenLine className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => removeFromCart(item.service.id, item.adults, item.childrenCount, item.vehicleType, item.busId, item.cartId)} className="text-gray-300 hover:text-rose-500 transition-colors">
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-1 shadow-sm">
                      <button onClick={() => updateQuantity(item.service.id, item.quantity - 1, item.adults, item.childrenCount, item.vehicleType, item.busId, item.cartId)} className="p-1.5 hover:bg-gray-50 dark:bg-gray-800/60 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><LuMinus className="w-3 h-3" /></button>
                      <span className="w-10 text-center text-xs font-black text-gray-900 dark:text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.service.id, item.quantity + 1, item.adults, item.childrenCount, item.vehicleType, item.busId, item.cartId)} className="p-1.5 hover:bg-gray-50 dark:bg-gray-800/60 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><LuPlus className="w-3 h-3" /></button>
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
            <div className="relative group" onClick={(e) => e.stopPropagation()}>
              <LuUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition-colors z-10" />
              <input
                type="text"
                placeholder="Customer Name (type to search existing...)"
                className={`w-full pl-11 pr-10 py-3.5 bg-gray-50 dark:bg-gray-800/50 border rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white ${selectedCustomerId ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-700'}`}
                value={customerName}
                onChange={(e) => {
                  if (selectedCustomerId) handleClearSelectedCustomer();
                  setCustomerName(formatName(e.target.value));
                }}
                onFocus={() => { if (searchResults.length > 0 && !selectedCustomerId) setShowDropdown(true); }}
              />
              {selectedCustomerId && (
                <button
                  onClick={handleClearSelectedCustomer}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Clear selected customer"
                >
                  <LuX size={12} />
                </button>
              )}
              {isSearching && !selectedCustomerId && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LuLoaderCircle className="w-4 h-4 text-blue-500 animate-spin" />
                </div>
              )}
              {showDropdown && searchResults.length > 0 && !selectedCustomerId && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-50 dark:border-gray-800">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Existing Customers</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {searchResults.map((cust: any) => (
                      <button
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0"
                      >
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{cust.full_name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{cust.phone || cust.email || 'No contact info'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedCustomerId && (
                <div className="mt-2 flex items-center gap-2 px-1">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-full">
                    ✓ Linked — ID #{selectedCustomerId}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
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
              </div>
              {customerContact && !isContactValid && (
                <div className="flex items-center gap-1.5 p-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                  <LuLoaderCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold leading-tight">
                    Please enter a valid PH mobile number (e.g., 09171234567)
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
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
              </div>
              {customerEmail && !isEmailValid && (
                <div className="flex items-center gap-1.5 p-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
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
                : 'bg-gray-55 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400'
                }`}
            >
              <LuWallet className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cash</span>
            </button>
            <button
              onClick={() => setPaymentMethod('GCash')}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${paymentMethod === 'GCash'
                ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20'
                : 'bg-gray-55 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400'
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
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 rounded-2xl text-xl font-black focus:ring-4 focus:ring-blue-600/5 transition-all text-gray-900 dark:text-white placeholder:text-gray-200 dark:placeholder:text-gray-700"
                value={amountReceived}
                onChange={(e) => {
                  const clean = parseMoneyInput(e.target.value);
                  if ((clean.split('.').length - 1) > 1) return;
                  const formatted = formatMoneyInput(e.target.value);
                  setAmountReceived(formatted);
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.metaKey) return;
                  if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
            <div className="flex justify-between items-center px-1">
              {paymentType === 'full' ? (
                <>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Change</span>
                  <div className={`text-lg font-black tracking-tighter ${Number(parseMoneyInput(String(amountReceived))) - total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-700'}`}>
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
          disabled={cart.length === 0 || isProcessing || (paymentMethod === 'Cash' && paymentType === 'full' && (Number(parseMoneyInput(String(amountReceived))) < total)) || (paymentMethod === 'Cash' && (paymentType === 'downpayment' || paymentType === 'half') && (Number(parseMoneyInput(String(amountReceived))) <= 0 || Number(parseMoneyInput(String(amountReceived))) >= total)) || !isContactValid || !isEmailValid}
          onClick={handleCheckout}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 dark:bg-gray-800 dark:disabled:bg-gray-850 disabled:text-gray-405 dark:disabled:text-gray-600 dark:text-gray-300 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transition-all flex justify-center items-center gap-3 active:scale-95"
        >
          {isProcessing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <>Complete Transaction <LuCheck className="w-4 h-4" /></>
          )}
        </button>
      </div>

      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
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
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-2xl transition-all text-gray-405 hover:text-gray-900 dark:text-white"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-100 dark:bg-gray-950 flex justify-center items-start print-wrapper">
              <div
                className="w-full max-w-xl bg-white text-gray-900 border border-gray-200/80 shadow-2xl rounded-[2rem] p-10 relative overflow-hidden flex flex-col"
                id="printable-invoice"
                style={{
                  backgroundImage: 'radial-gradient(rgba(0,0,0,0.01) 1px, transparent 0)',
                  backgroundSize: '8px 8px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02), 0 0 40px rgba(0, 0, 0, 0.01) inset'
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 opacity-80" />

                <div className="flex justify-between items-start mb-12">
                  <div>
                    <div className="flex flex-col items-start">
                      <img src="/JVDlogo-removebg-preview.png" alt="JVD Logo" className="h-16 mb-2 object-contain" />
                      <p className="text-[10px] font-black text-gray-405 uppercase tracking-[0.4em] mb-6 pl-1">Management System</p>

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
                      {lastInvoice && new Date(lastInvoice.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

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

                {lastInvoice?.bus_id && (
                  <div className="my-6 p-5 bg-blue-50/50 border border-blue-100 rounded-3xl text-left">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Bus Rental Assignment</p>
                    <p className="text-xs font-black text-gray-900 mt-1 uppercase">Bus Registered: ID #{lastInvoice.bus_id}</p>
                    {lastInvoice.seat_map && lastInvoice.seat_map.length > 0 && (
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                        Seats Booked: {lastInvoice.seat_map.join(', ')} ({lastInvoice.seat_map.length} seats)
                      </p>
                    )}
                  </div>
                )}

                {lastInvoice?.driver && (
                  <div className="my-6 p-5 bg-emerald-50/50 border border-emerald-100 rounded-3xl text-left">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Driver Assignment</p>
                    <p className="text-xs font-black text-gray-900 mt-1 uppercase">
                      Driver: {lastInvoice.driver.first_name} {lastInvoice.driver.last_name} (ID #{lastInvoice.driver.id})
                    </p>
                  </div>
                )}

                {(lastInvoice?.travel_date || lastInvoice?.tour_code || lastInvoice?.pickup_location || lastInvoice?.pax_count) && (
                  <div className="my-6 p-5 bg-indigo-50/50 border border-indigo-105 rounded-3xl text-left">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Travel &amp; Joiner Specifications</p>
                    {lastInvoice.travel_date && (
                      <p className="text-xs font-black text-gray-900 mt-1 uppercase">
                        Travel Date: {new Date(lastInvoice.travel_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                    {lastInvoice.tour_code && (
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                        Tour Code/Destination: {lastInvoice.tour_code}
                      </p>
                    )}
                    {lastInvoice.arrival_datetime && (
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                        Arrival: {new Date(lastInvoice.arrival_datetime).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {lastInvoice.departure_datetime && (
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                        Departure: {new Date(lastInvoice.departure_datetime).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {lastInvoice.pax_count && (
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                        Pax Count: {lastInvoice.pax_count} Pax
                      </p>
                    )}
                    {lastInvoice.pickup_location && (
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                        Pickup Location: {lastInvoice.pickup_location}
                      </p>
                    )}
                  </div>
                )}

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
                          <span className="text-gray-900">₱{Number(parseMoneyInput(String(receiptAmountReceived || 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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

                <div className="mt-16 pt-8 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-450 font-bold uppercase tracking-widest mb-2">Thank you for choosing JVD Event & Travel!</p>
                  <p className="text-[9px] text-gray-300 font-medium italic">This is an electronically generated invoice.</p>
                </div>
              </div>
            </div>

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

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          .fixed.inset-0 {
            background: transparent !important;
            backdrop-filter: none !important;
          }
          .print-wrapper {
            background: none !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
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
          html, body, #root {
            background-color: #ffffff !important;
            background-image: none !important;
            color: #111827 !important;
          }
          .dark, [class*="dark:"] {
            background-color: #ffffff !important;
            color: #111827 !important;
            border-color: #e5e7eb !important;
          }
          #printable-invoice p, 
          #printable-invoice span, 
          #printable-invoice td, 
          #printable-invoice th, 
          #printable-invoice h2, 
          #printable-invoice h3, 
          #printable-invoice div {
            color: #111827 !important;
          }
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
    </div>
  );
}
