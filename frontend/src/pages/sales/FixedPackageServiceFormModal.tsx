import { LuX, LuCamera, LuCheck, LuTrash2 } from 'react-icons/lu';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import { getBreakdownSum, type NewServiceForm } from './fixedPackagesUtils';

interface FixedPackageServiceFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  newService: NewServiceForm;
  setNewService: React.Dispatch<React.SetStateAction<NewServiceForm>>;
  serviceImages: string[];
  setServiceImages: React.Dispatch<React.SetStateAction<string[]>>;
  userRole?: string;
  onBackdropClose: () => void;
  onCloseIcon: () => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}

export default function FixedPackageServiceFormModal({
  isOpen,
  isEditing,
  newService,
  setNewService,
  serviceImages,
  setServiceImages,
  userRole,
  onBackdropClose,
  onCloseIcon,
  onCancel,
  onSave,
}: FixedPackageServiceFormModalProps) {
  if (!isOpen) return null;

  const canSeeCostBreakdown = ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(userRole || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md duration-300" onClick={onBackdropClose}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">{isEditing ? 'Edit Service Details' : 'Register New Service'}</h3>
            <p className="text-[10px] text-gray-405 font-bold uppercase tracking-widest">{isEditing ? 'Modify catalog item properties' : 'Create a new item in the catalog'}</p>
          </div>
          <button onClick={onCloseIcon} className="p-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
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
                <option value="Joiners">Joiners</option>
                <option value="Documentation">Documentation</option>
                <option value="Transport">Transportation</option>
                <option value="Printing Services">Printing Services</option>
                <option value="Other">Other Services</option>
              </select>
            </div>
          </div>

          {newService.category === 'Joiners' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Bus Price (₱)</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                  value={newService.bus_price}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setNewService({ ...newService, bus_price: formatted, is_tour: true, price: formatted });
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Coaster Price (₱)</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                  value={newService.coaster_price}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setNewService({ ...newService, coaster_price: formatted });
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Distance (KMS)</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                  value={newService.tour_kms}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    if ((val.split('.').length - 1) > 1) return;
                    setNewService({ ...newService, tour_kms: val });
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Time (Hours)</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                  value={newService.tour_hours}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    if ((val.split('.').length - 1) > 1) return;
                    setNewService({ ...newService, tour_hours: val });
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
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Base Price (₱)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black">₱</span>
                <input
                  type="text"
                  placeholder="0.00"
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 pl-10 pr-5 text-xl font-black dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                  value={newService.price}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setNewService(prev => {
                      const prevPriceNum = Number(parseMoneyInput(prev.price)) || 0;
                      const prevAdultPriceNum = Number(parseMoneyInput(prev.adult_price)) || 0;
                      const prevChildPriceNum = Number(parseMoneyInput(prev.child_price)) || 0;
                      const prevDiscountNum = Number(prev.child_discount) || 0;
                      const newPriceNum = Number(clean) || 0;

                      const adultPrice = prev.has_booking_fields && (prevAdultPriceNum === 0 || prevAdultPriceNum === prevPriceNum) ? formatted : prev.adult_price;
                      const childPrice = prev.has_booking_fields && (prevChildPriceNum === 0 || prevChildPriceNum === prevPriceNum * (1 - prevDiscountNum / 100))
                        ? formatMoneyInput(String(newPriceNum * (1 - prevDiscountNum / 100)))
                        : prev.child_price;

                      return {
                        ...prev,
                        price: formatted,
                        adult_price: adultPrice,
                        child_price: childPrice
                      };
                    });
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

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Child Discount Rate (%)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 30"
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-5 pr-16 text-sm font-black dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                  value={newService.child_discount}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    if ((val.split('.').length - 1) > 1) return;
                    const discount = Math.min(100, Math.max(0, Number(val) || 0));
                    const discountStr = val === '' ? '' : String(discount);

                    setNewService(prev => {
                      const priceNum = Number(prev.price) || 0;
                      const prevDiscountNum = Number(prev.child_discount) || 0;
                      const prevChildPriceNum = Number(prev.child_price) || 0;

                      const childPrice = prev.has_booking_fields && (prevChildPriceNum === 0 || prevChildPriceNum === priceNum * (1 - prevDiscountNum / 100))
                        ? String(priceNum * (1 - discount / 100))
                        : prev.child_price;

                      return {
                        ...prev,
                        child_discount: discountStr,
                        child_price: childPrice
                      };
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
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
                  adult_price: nextVal ? (newService.adult_price || newService.price) : '',
                  child_price: nextVal ? (newService.child_price || formatMoneyInput(String((Number(parseMoneyInput(newService.price)) || 0) * (1 - (Number(newService.child_discount) || 0) / 100)))) : ''
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
                      type="text"
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 pl-10 pr-5 text-sm font-black dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={newService.adult_price || ''}
                      onChange={e => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setNewService({ ...newService, adult_price: formatted });
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

                <div className="space-y-2">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Child Price (₱)</label>
                    <button
                       onClick={() => setNewService({ ...newService, child_price: formatMoneyInput(String((Number(parseMoneyInput(newService.price)) || 0) * (1 - (Number(newService.child_discount) || 0) / 100))) })}
                      className="text-[9px] font-black text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-tight"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black">₱</span>
                    <input
                      type="text"
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-gray-855 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 pl-10 pr-5 text-sm font-black dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={newService.child_price || ''}
                      onChange={e => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setNewService({ ...newService, child_price: formatted });
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
          {canSeeCostBreakdown && (
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

              {/* Real-time Tally Status */}
              {newService.cost_breakdown && (() => {
                const breakdownSum = getBreakdownSum(newService.cost_breakdown);
                const servicePrice = Number(parseMoneyInput(newService.price) || 0);
                const isTallyMatch = Math.abs(breakdownSum - servicePrice) < 0.01;
                const diff = breakdownSum - servicePrice;

                return (
                  <div className={`mt-2 p-4 rounded-2xl border transition-all duration-300 ${isTallyMatch
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'
                    }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        {isTallyMatch ? (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-extrabold">✓</span>
                        ) : (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 font-extrabold">!</span>
                        )}
                        <span>
                          {isTallyMatch
                            ? 'Cost breakdown tallies with Base Price'
                            : 'Cost breakdown does not tally with Base Price'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div>Breakdown Sum: <span className="font-extrabold">₱{breakdownSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        <div>Base Price: <span className="font-extrabold">₱{servicePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        {!isTallyMatch && (
                          <div className="text-[10px] opacity-85 mt-0.5">
                            Difference: <span className="font-extrabold">{diff > 0 ? '+' : ''}₱{diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <p className="text-[10px] text-amber-500 font-bold pl-1">This breakdown is visible to management and agent roles.</p>
            </div>
          )}

          {/* Inclusions & Exclusions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Inclusions (Optional)</label>
              <textarea
                placeholder="e.g. Roundtrip airfare, 3-star hotel accommodation, Daily breakfast, Tour guide..."
                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-[2rem] py-5 px-6 text-sm font-medium dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none min-h-[100px]"
                value={newService.inclusions}
                onChange={e => setNewService({ ...newService, inclusions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Exclusions (Optional)</label>
              <textarea
                placeholder="e.g. Personal expenses, Tips/gratuities, Travel insurance, Optional tours..."
                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-[2rem] py-5 px-6 text-sm font-medium dark:text-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none min-h-[100px]"
                value={newService.exclusions}
                onChange={e => setNewService({ ...newService, exclusions: e.target.value })}
              />
            </div>
          </div>

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
            onClick={onCancel}
            className="flex-1 py-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex-2 py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <LuCheck className="w-5 h-5" /> {isEditing ? 'Update Service' : 'Confirm Registration'}
          </button>
        </div>
      </div>
    </div>
  );
}
