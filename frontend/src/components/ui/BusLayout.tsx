import { 
  LuUser, 
  LuCheck,
  LuBan,
  LuDoorOpen,
  LuConciergeBell
} from 'react-icons/lu';
import { GiSteeringWheel } from 'react-icons/gi';
import { MdOutlineWc } from 'react-icons/md';

export type SeatStatus = 'available' | 'occupied' | 'reserved' | 'selected';

export interface SeatInfo {
  id: string;
  number: string;
  status: SeatStatus;
}

export interface BusLayoutProps {
  seats?: SeatInfo[];
  hasRestroom?: boolean;
  onSeatClick?: (seat: SeatInfo) => void;
  className?: string;
}

const statusColors: Record<SeatStatus, { bg: string; border: string; text: string }> = {
  available: { bg: 'bg-white dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
  selected:  { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  occupied:  { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-400 dark:text-gray-500', border: 'border-gray-200 dark:border-gray-600' },
  reserved:  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700/50' },
};

const Seat = ({ seat, onClick }: { seat: SeatInfo; onClick?: (seat: SeatInfo) => void }) => {
  const colors = statusColors[seat.status];
  const isClickable = seat.status === 'available' || seat.status === 'selected';
  return (
    <div
      onClick={() => isClickable && onClick?.(seat)}
      title={`Seat ${seat.number} – ${seat.status}`}
      className={[
        'relative w-10 h-[2.75rem] rounded-t-[0.6rem] rounded-b-[0.3rem] border-2',
        'flex flex-col items-center justify-center transition-all select-none',
        colors.bg, colors.border, colors.text,
        isClickable ? 'cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-px' : 'cursor-not-allowed opacity-70',
      ].join(' ')}
    >
      {/* headrest ridge */}
      <div className={`absolute top-0 left-0 w-full h-1.5 rounded-t-[0.5rem] opacity-25 ${seat.status === 'selected' ? 'bg-white' : 'bg-current'}`} />
      {/* left armrest */}
      <div className={`absolute left-0 top-3 w-0.5 h-4 rounded-r opacity-20 ${seat.status === 'selected' ? 'bg-white' : 'bg-current'}`} />
      {/* right armrest */}
      <div className={`absolute right-0 top-3 w-0.5 h-4 rounded-l opacity-20 ${seat.status === 'selected' ? 'bg-white' : 'bg-current'}`} />
      <span className="text-[10px] font-black z-10">{seat.number}</span>
      <div className="absolute bottom-0.5 right-0.5 opacity-50">
        {seat.status === 'occupied' && <LuUser size={8} />}
        {seat.status === 'reserved' && <LuBan size={8} />}
        {seat.status === 'selected' && <LuCheck size={8} />}
      </div>
    </div>
  );
};

// ── Column data builder ──────────────────────────────────────────────────────
// TOP section  = guide/curbside (has WC + Door2 for VIP)
// BOT section  = driver side   (always uninterrupted)
//
// VIP layout (12 cols):
//   cols 0-6  → 7 seat pairs  (TOP seats 25-38)
//   col  7    → RESTROOM      (no top seat)
//   col  8    → DOOR 2        (no top seat)
//   cols 9-11 → 3 seat pairs  (TOP seats 39-44)
//   BOT       → seats 1-24 across all 12 columns
//   BACK      → seats 45-49
//   Total: 14 + 6 + 24 + 5 = 49
//
// Standard (11 cols): BOT=1-22  TOP=23-44  BACK=45-49  → total 49

interface ColData {
  botSeat1: number; // driver-side, aisle row
  botSeat2: number; // driver-side, window row
  topSeat1: number; // guide-side, window row
  topSeat2: number; // guide-side, aisle row
  isWC: boolean;
  isDoor2: boolean;
}

function buildColumns(hasRestroom: boolean): ColData[] {
  const totalCols = hasRestroom ? 12 : 11;
  // offset where guide-side (TOP) seat numbers start
  const topOffset = totalCols * 2 + 1; // 23 for standard, 25 for VIP

  return Array.from({ length: totalCols }, (_, i) => {
    const botSeat1 = i * 2 + 1;
    const botSeat2 = i * 2 + 2;

    let topSeat1 = 0, topSeat2 = 0;
    let isWC = false, isDoor2 = false;

    if (hasRestroom) {
      // VIP: 7 seat pairs → RESTROOM (col 7) → DOOR 2 (col 8) → 3 seat pairs (cols 9-11)
      if (i === 7) {
        isWC = true;
      } else if (i === 8) {
        isDoor2 = true;
      } else if (i < 7) {
        // cols 0-6: top seats 25-38
        topSeat1 = i * 2 + topOffset;
        topSeat2 = i * 2 + topOffset + 1;
      } else {
        // cols 9-11: skip 2 (WC + Door2) → top seats 39-44
        topSeat1 = (i - 2) * 2 + topOffset;
        topSeat2 = (i - 2) * 2 + topOffset + 1;
      }
    } else {
      topSeat1 = i * 2 + topOffset;
      topSeat2 = i * 2 + topOffset + 1;
    }

    return { botSeat1, botSeat2, topSeat1, topSeat2, isWC, isDoor2 };
  });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BusLayout({
  seats = [],
  hasRestroom = false,
  onSeatClick,
  className = '',
}: BusLayoutProps) {

  const defaultSeats: SeatInfo[] = Array.from({ length: 49 }, (_, i) => ({
    id: `seat-${i + 1}`,
    number: String(i + 1),
    status: 'available',
  }));

  const activeSeats = seats.length > 0 ? seats : defaultSeats;
  const getSeat = (n: number): SeatInfo =>
    activeSeats.find(s => s.number === String(n)) ??
    { id: `dummy-${n}`, number: String(n), status: 'available' };

  const columns = buildColumns(hasRestroom);

  return (
    <div className={`flex flex-col items-start bg-gray-50 dark:bg-gray-900 p-6 rounded-[2rem] shadow-inner w-full ${className}`}>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center justify-center gap-5 mb-6 bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full">
        {([
          { status: 'available', label: 'Available',  icon: null },
          { status: 'selected',  label: 'Selected',   icon: <LuCheck size={10} /> },
          { status: 'occupied',  label: 'Occupied',   icon: <LuUser  size={10} /> },
          { status: 'reserved',  label: 'Reserved',   icon: <LuBan   size={10} /> },
        ] as const).map(({ status, label, icon }) => {
          const c = statusColors[status];
          return (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${c.bg} ${c.border} ${c.text}`}>
                {icon}
              </div>
              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Bus Shell ── */}
      <div className="w-full overflow-x-auto pb-2">
        <div
          className="relative bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-700 shadow-xl"
          style={{ borderRadius: '3rem', padding: '1.5rem 1.75rem', minWidth: 'max-content' }}
        >
          {/* windshield strip at top */}
          <div className="absolute top-0 left-[15%] right-[5%] h-5 bg-sky-100/60 dark:bg-sky-900/20 border-b-2 border-gray-200 dark:border-gray-700 rounded-b-3xl" />

          <div className="flex flex-row items-stretch gap-3 mt-4">

            {/* ── FRONT BLOCK (left side) ── */}
            <div className="flex flex-col justify-between pr-4 border-r-2 border-dashed border-gray-200 dark:border-gray-700">
              {/* top: Door 1 + Guide */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-9 h-10 bg-green-50 dark:bg-green-900/20 border-2 border-green-400/60 rounded-lg flex flex-col items-center justify-center">
                  <LuDoorOpen size={13} className="text-green-600" />
                  <span className="text-[7px] font-black text-green-700 uppercase tracking-wider leading-none mt-0.5">Door 1</span>
                </div>
                <div className="w-10 h-[2.75rem] rounded-t-[0.6rem] rounded-b-[0.3rem] border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 flex flex-col items-center justify-center text-purple-500">
                  <LuConciergeBell size={13} />
                  <span className="text-[7px] font-black uppercase tracking-wide text-purple-600 mt-0.5">Guide</span>
                </div>
              </div>

              {/* aisle gap */}
              <div className="my-2 h-5 flex items-center justify-center">
                <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-600 opacity-60" />
              </div>

              {/* bottom: Driver */}
              <div className="flex flex-col items-center gap-1">
                <GiSteeringWheel size={26} className="text-gray-400" />
                <div className="w-10 h-[2.75rem] rounded-t-[0.6rem] rounded-b-[0.3rem] border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-[7px] font-black uppercase tracking-wide text-gray-500">Driver</span>
                </div>
              </div>
            </div>

            {/* ── SEAT COLUMNS ── */}
            <div className="flex flex-row gap-2">
              {columns.map((col, i) => (
                <div key={i} className="flex flex-col">

                  {/* TOP PAIR (guide/curbside) — WC or Door 2 replaces the 2 guide-side seats */}
                  <div className="flex flex-col gap-1">
                    {col.isWC ? (
                      <div
                        className="flex flex-col items-center justify-center w-10 rounded-xl border-2"
                        style={{
                          height: 'calc(2*2.75rem + 0.25rem)', /* same as 2 stacked seats + gap-1 */
                          background: 'rgb(240 249 255)',
                          borderColor: '#7dd3fc',
                        }}
                      >
                        <MdOutlineWc size={20} className="text-sky-500" />
                        <span className="text-[7px] font-black text-sky-600 uppercase tracking-widest mt-0.5 text-center leading-tight">
                          REST<br />ROOM
                        </span>
                      </div>
                    ) : col.isDoor2 ? (
                      <div
                        className="flex flex-col items-center justify-center w-10 rounded-xl border-2"
                        style={{
                          height: 'calc(2*2.75rem + 0.25rem)',
                          background: 'rgb(240 253 244)',
                          borderColor: '#86efac',
                        }}
                      >
                        <LuDoorOpen size={15} className="text-green-600" />
                        <span className="text-[7px] font-black text-green-700 uppercase tracking-wider mt-0.5 text-center leading-tight">
                          Door 2
                        </span>
                      </div>
                    ) : (
                      <>
                        <Seat seat={getSeat(col.topSeat1)} onClick={onSeatClick} />
                        <Seat seat={getSeat(col.topSeat2)} onClick={onSeatClick} />
                      </>
                    )}
                  </div>

                  {/* AISLE LINE */}
                  <div className="my-2 h-5 flex items-center justify-center">
                    <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-600 opacity-50" />
                  </div>

                  {/* BOTTOM PAIR (driver side) — always present for all 12 columns */}
                  <div className="flex flex-col gap-1">
                    <Seat seat={getSeat(col.botSeat1)} onClick={onSeatClick} />
                    <Seat seat={getSeat(col.botSeat2)} onClick={onSeatClick} />
                  </div>

                </div>
              ))}
            </div>

            {/* ── BACK ROW (5 seats, vertical column on right) ── */}
            <div className="flex flex-col justify-center gap-1 pl-3 border-l-2 border-dashed border-gray-200 dark:border-gray-700">
              {[45, 46, 47, 48, 49].map(n => (
                <Seat key={n} seat={getSeat(n)} onClick={onSeatClick} />
              ))}
            </div>

          </div>

          {/* rear bumper */}
          <div className="mt-4 border-t-2 border-gray-200 dark:border-gray-700 pt-2 flex justify-end">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Rear</span>
          </div>
        </div>
      </div>
    </div>
  );
}
