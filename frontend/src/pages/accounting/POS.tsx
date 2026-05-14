import { useState, useEffect } from 'react';
import { 
  LuSearch, 
  LuShoppingCart, 
  LuUser, 
  LuPlus, 
  LuMinus, 
  LuTrash2, 
  LuCreditCard, 
  LuBanknote, 
  LuSmartphone, 
  LuPrinter,
  LuCheck,
  LuX,
  LuMapPin,
  LuPhone,
  LuMail
} from 'react-icons/lu';
import { billingApi } from '../../api/billing';
import type { Service } from '../../api/billing';

interface CartItem {
  service: Service;
  quantity: number;
}

export default function POS() {
  // State
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [amountReceived, setAmountReceived] = useState<number | string>('');
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    category: 'Travel',
    description: '',
    price: 0
  });

  // Constants
  const TAX_RATE = 0.12;

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes] = await Promise.all([
          billingApi.getServices()
        ]);
        setServices(servicesRes.data.data);
      } catch (err) {
        console.error('Failed to fetch POS data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Cart operations
  const addToCart = (service: Service) => {
    setCart(prev => {
      const existing = prev.find(item => item.service.id === service.id);
      if (existing) {
        return prev.map(item => 
          item.service.id === service.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { service, quantity: 1 }];
    });
  };

  const removeFromCart = (serviceId: number) => {
    setCart(prev => prev.filter(item => item.service.id !== serviceId));
  };

  const updateQuantity = (serviceId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.service.id === serviceId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.service.price * item.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const change = typeof amountReceived === 'number' ? Math.max(0, amountReceived - total) : 0;

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    try {
      const response = await billingApi.createInvoice({
        customer_name: customerName || null,
        customer_address: customerAddress || null,
        customer_email: customerEmail || null,
        customer_contact: customerContact || null,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          service_id: item.service.id,
          quantity: item.quantity
        }))
      });

      setLastInvoice(response.data.data);
      setShowReceipt(true);
      
      // Handle PayMongo redirect if applicable
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
    } catch (err) {
      alert('Checkout failed. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] mt-4 flex flex-col lg:flex-row gap-6">
      
      {/* Left Column: Service Catalog */}
      <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Service Catalog</h2>
            <p className="text-[11px] text-gray-400 font-bold tracking-widest uppercase">Select items to add to cart</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowAddService(true)}
              className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2"
            >
              <LuPlus className="w-4 h-4" /> Add Service
            </button>
            <div className="relative">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search services..."
                className="pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-600/10 w-full md:w-48 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Categories / Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                onClick={() => addToCart(service)}
                className="flex flex-col text-left p-5 bg-white border border-gray-100 rounded-3xl hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5 transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                    {service.category}
                  </span>
                  <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <LuPlus className="w-5 h-5" />
                  </span>
                </div>
                <h3 className="font-black text-gray-900 mb-1 group-hover:text-blue-600 transition-colors tracking-tight">{service.name}</h3>
                <p className="text-xs text-gray-400 mb-6 line-clamp-2 font-medium">{service.description}</p>
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-2xl font-black text-gray-900 tracking-tighter">₱{Number(service.price).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Cart & Checkout */}
      <div className="w-full lg:w-[480px] flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-50 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <LuShoppingCart className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">Current Order</h2>
          </div>
        </div>

        {/* Scrollable Area: Cart + Customer Info */}
        <div className="flex-1 overflow-y-auto">
          {/* Cart Items */}
          <div className="p-6 space-y-4 border-b border-gray-50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-gray-400 py-10">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <LuShoppingCart className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Your cart is empty</p>
                <p className="text-[8px] font-bold uppercase tracking-widest mt-1 text-gray-300">Add services from the catalog</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.service.id} className="flex items-center gap-4 group py-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-gray-900 tracking-tight leading-tight">{item.service.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">₱{Number(item.service.price).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                    <button 
                      onClick={() => updateQuantity(item.service.id, -1)}
                      className="p-1 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-900"
                    >
                      <LuMinus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-black text-gray-900">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.service.id, 1)}
                      className="p-1 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-900"
                    >
                      <LuPlus className="w-3 h-3" />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.service.id)}
                    className="p-2 text-gray-300 hover:text-rose-500 transition-all"
                  >
                    <LuTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Customer Info Form */}
          <div className="p-6 bg-gray-50/30 space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <LuUser className="w-3 h-3" /> Customer Name
                </label>
                <input 
                  type="text"
                  placeholder="Enter name"
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-600/10 transition-all shadow-sm"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <LuPhone className="w-3 h-3" /> Contact
                  </label>
                  <input 
                    type="text"
                    placeholder="Number"
                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-600/10 transition-all shadow-sm"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <LuMail className="w-3 h-3" /> Email
                  </label>
                  <input 
                    type="email"
                    placeholder="Email address"
                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-600/10 transition-all shadow-sm"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <LuMapPin className="w-3 h-3" /> Full Address
                </label>
                <input 
                  type="text"
                  placeholder="Street, City, Province"
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-600/10 transition-all shadow-sm"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <LuCreditCard className="w-3 h-3" /> Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Cash', icon: <LuBanknote /> },
                  { id: 'GCash', icon: <LuSmartphone /> },
                  { id: 'Card', icon: <LuCreditCard /> },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border transition-all ${
                      paymentMethod === method.id 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200'
                    }`}
                  >
                    <span className="text-base">{method.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{method.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Totals & Button (Fixed) */}
        <div className="p-6 bg-white border-t border-gray-100 space-y-4 shrink-0">
          {paymentMethod === 'Cash' && cart.length > 0 && (
            <div className="grid grid-cols-2 gap-4 pb-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Received</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₱</span>
                  <input 
                    type="number"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-7 pr-3 text-sm font-black text-blue-600 focus:ring-2 focus:ring-blue-600/10"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Change</label>
                <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl py-2 px-3 text-sm font-black text-emerald-600">
                  ₱{change.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Subtotal</span>
              <span className="text-gray-900">₱{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>VAT (12%)</span>
              <span className="text-gray-900">₱{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-100">
              <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Total</span>
              <span className="text-3xl font-black text-blue-600 tracking-tighter">₱{total.toLocaleString()}</span>
            </div>
          </div>

          <button 
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'Cash' && (Number(amountReceived) < total))}
            onClick={handleCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transition-all flex justify-center items-center gap-3 mt-2 active:scale-95"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>Complete Transaction <LuCheck className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>

      {/* Formal Invoice Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <LuCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Payment Received</h3>
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
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-10" id="printable-invoice">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-12">
                <div>
                <div className="flex flex-col items-start">
                  <img src="/JVDlogo-removebg-preview.png" alt="JVD Logo" className="h-16 mb-2 object-contain" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-6 pl-1">Management System</p>
                  
                  <div className="space-y-1 pl-1">
                    <p className="text-[11px] text-gray-900 font-bold max-w-[300px] leading-relaxed">UNIT 6 -Aryanna Village Center Brgy 175. Susano Road Camarin, Caloocan City</p>
                    <div className="flex flex-col gap-0.5 mt-2">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="text-blue-600">PHONE:</span> 0976 4711294
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="text-blue-600">TEL:</span> 02 82938068
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
              <div className="grid grid-cols-2 gap-12 mb-12 border-t border-b border-gray-50 py-8">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Billed To</p>
                  <p className="text-lg font-black text-gray-900">{lastInvoice?.customer_name || 'Walk-in Customer'}</p>
                  <div className="mt-2 space-y-1">
                    {lastInvoice?.customer_contact && (
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <LuPhone className="w-3 h-3" /> {lastInvoice.customer_contact}
                      </p>
                    )}
                    {lastInvoice?.customer_email && (
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <LuMail className="w-3 h-3" /> {lastInvoice.customer_email}
                      </p>
                    )}
                    {lastInvoice?.customer_address && (
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <LuMapPin className="w-3 h-3" /> {lastInvoice.customer_address}
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-blue-600 mt-3 font-bold uppercase tracking-tight italic">Verified POS Transaction</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Payment Info</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{lastInvoice?.payment_method}</p>
                  <p className="text-xs text-emerald-600 mt-1 font-bold uppercase">Status: {lastInvoice?.status}</p>
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
                <tbody className="divide-y divide-gray-50">
                  {lastInvoice?.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-5">
                        <p className="font-black text-gray-900">{item.service?.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{item.service?.category}</p>
                      </td>
                      <td className="py-5 text-center font-bold text-gray-600">{item.quantity}</td>
                      <td className="py-5 text-right font-bold text-gray-600">₱{Number(item.unit_price).toLocaleString()}</td>
                      <td className="py-5 text-right font-black text-gray-900">₱{Number(item.total_price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="text-gray-900">₱{Number(lastInvoice?.subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>VAT (12%)</span>
                    <span className="text-gray-900">₱{Number(lastInvoice?.tax_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t-2 border-gray-900 items-center">
                    <span className="text-sm font-black text-gray-900 uppercase tracking-tighter">Total Amount</span>
                    <span className="text-2xl font-black text-blue-600">₱{Number(lastInvoice?.total_amount).toLocaleString()}</span>
                  </div>
                  {lastInvoice?.payment_method === 'Cash' && (
                    <div className="flex justify-between pt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <span>Change</span>
                      <span className="text-emerald-600">₱{(Number(amountReceived) - Number(lastInvoice?.total_amount)).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="mt-16 pt-8 border-t border-gray-50 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Thank you for choosing JVD Events & Travels!</p>
                <p className="text-[9px] text-gray-300 font-medium italic">This is an electronically generated invoice.</p>
              </div>
            </div>

            {/* Modal Footer (Not Printed) */}
            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4 shrink-0 no-print">
              <button 
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-3 py-5 bg-white border border-gray-200 hover:border-blue-600 hover:text-blue-600 text-gray-900 rounded-[2rem] font-black text-xs uppercase transition-all shadow-sm active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Add New Service</h3>
              <button onClick={() => setShowAddService(false)} className="text-gray-400 hover:text-gray-900"><LuX className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Name</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-bold"
                  value={newService.name}
                  onChange={e => setNewService({...newService, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-bold"
                    value={newService.category}
                    onChange={e => setNewService({...newService, category: e.target.value})}
                  >
                    <option>Travel</option>
                    <option>Documentation</option>
                    <option>Transportation</option>
                    <option>Accommodation</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Price (₱)</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-bold"
                    value={newService.price}
                    onChange={e => setNewService({...newService, price: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                <textarea 
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-medium h-24"
                  value={newService.description}
                  onChange={e => setNewService({...newService, description: e.target.value})}
                />
              </div>
            </div>
            <div className="p-8 bg-gray-50 flex gap-4">
              <button 
                onClick={() => setShowAddService(false)}
                className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    await billingApi.createService(newService);
                    const servicesRes = await billingApi.getServices();
                    setServices(servicesRes.data.data);
                    setShowAddService(false);
                    setNewService({ name: '', category: 'Travel', description: '', price: 0 });
                  } catch (err) {
                    alert('Failed to save service');
                  }
                }}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-600/20"
              >
                Save Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 2cm !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

    </div>
  );
}
