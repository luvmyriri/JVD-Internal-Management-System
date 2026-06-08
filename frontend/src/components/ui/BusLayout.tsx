import { 
  LuUser, 
  LuCheck,
  LuBan,
  LuDoorOpen,
  LuConciergeBell
} from 'react-icons/lu';
import { GiSteeringWheel } from 'react-icons/gi';
import { MdOutlineWc } from 'react-icons/md';

export type SeatStatus = 'available' | 'occupied' | 'reserved' | 'selected' | 'custom';

export interface SeatInfo {
  id: string;
  number: string;
  status: SeatStatus;
  active?: boolean;
}

export interface BusLayoutProps {
  seats?: SeatInfo[];
  totalSeats?: number;        // auto-generate layout for this many seats
  hasRestroom?: boolean;       // VIP layout with WC + Door2
  onSeatClick?: (seat: SeatInfo) => void;
  viewOnly?: boolean;          // disable all clicking (read-only calendar view)
  className?: string;
  compact?: boolean;           // smaller seat widgets for calendar modal
  // POS seat selection props
  selectedSeats?: string[];    // seat numbers currently selected
  occupiedSeats?: string[];    // seat numbers already booked
  onSeatToggle?: (seatNumber: string) => void; // toggle a seat selection
  isCustomizing?: boolean;     // from remote branch
}

export const statusColors: Record<SeatStatus, { bg: string; border: string; text: string }> = {
  available: { bg: 'bg-white dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
  reserved:  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700/50' },
  selected:  { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  occupied:  { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-400 dark:text-gray-500', border: 'border-gray-200 dark:border-gray-600' },
  custom:    { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700/50' },
};

// ── Seat numbering convention ─────────────────────────────────────────────────
// Column-first, 4 seats per column from bottom (driver window) to top (door/guide window):
//   Door   | col*4+4  ...
//   Guide  | col*4+3  ...
//          |
//          | col*4+2  ...
//   Driver | col*4+1  ...
//
// Back row = seats (mainSeats+1)..(mainSeats+5)
// ─────────────────────────────────────────────────────────────────────────────

interface ColData {
  botSeat1: number;  // driver window  (n*4+1)
  botSeat2: number;  // driver aisle   (n*4+2)
  topSeat1: number;  // guide  aisle   (n*4+3)
  topSeat2: number;  // door/guide win (n*4+4)
  isWC: boolean;
  isDoor2: boolean;
}

function buildColumns(totalSeats: number, hasRestroom: boolean): ColData[] {
  const backSeats = 5;
  const mainSeats = totalSeats - backSeats;
  const seatColCount = mainSeats / 4; // number of columns with actual seats

  if (hasRestroom) {
    // VIP: first 7 seat cols → WC → Door2 → remaining seat cols
    const firstCols = Math.min(7, seatColCount);
    const lastCols  = Math.max(0, seatColCount - firstCols);
    const displayCols = seatColCount + 2; // +2 for WC and Door2 slots

    const cols: ColData[] = [];
    let seatIdx = 0;

    for (let i = 0; i < displayCols; i++) {
      if (i === firstCols) {
        cols.push({ botSeat1: 0, botSeat2: 0, topSeat1: 0, topSeat2: 0, isWC: true,   isDoor2: false });
      } else if (i === firstCols + 1) {
        cols.push({ botSeat1: 0, botSeat2: 0, topSeat1: 0, topSeat2: 0, isWC: false,  isDoor2: true  });
      } else {
        const base = seatIdx * 4 + 1;
        cols.push({ botSeat1: base, botSeat2: base + 1, topSeat1: base + 2, topSeat2: base + 3, isWC: false, isDoor2: false });
        seatIdx++;
      }
    }
    return cols;
  } else {
    return Array.from({ length: seatColCount }, (_, i) => {
      const base = i * 4 + 1;
      return { botSeat1: base, botSeat2: base + 1, topSeat1: base + 2, topSeat2: base + 3, isWC: false, isDoor2: false };
    });
  }
}

// ── Seat widget ───────────────────────────────────────────────────────────────
const Seat = ({
  seat,
  onClick,
  viewOnly = false,
  compact = false,
  isCustomizing = false,
}: {
  seat: SeatInfo;
  onClick?: (seat: SeatInfo) => void;
  viewOnly?: boolean;
  compact?: boolean;
  isCustomizing?: boolean;
}) => {
  const isActive = seat.active !== false;
  const sizeClass = compact
    ? 'w-7 h-9 rounded-t-[0.4rem] rounded-b-[0.2rem]'
    : 'w-10 h-[2.75rem] rounded-t-[0.6rem] rounded-b-[0.3rem]';

  if (!isActive) {
    if (isCustomizing) {
      return (
        <div
          onClick={() => onClick?.(seat)}
          title={`Click to configure Seat (originally ${seat.id.replace('seat-', '')})`}
          className={`${sizeClass} border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all select-none`}
        >
          <span className={`${compact ? 'text-[10px]' : 'text-[14px]'} font-black text-gray-400 dark:text-gray-600`}>+</span>
        </div>
      );
    }
    return <div className={sizeClass} />;
  }

  const colors = statusColors[seat.status];
  const isClickable = !viewOnly && (isCustomizing || seat.status === 'available' || seat.status === 'selected' || seat.status === 'custom');

  return (
    <div
      onClick={() => isClickable && onClick?.(seat)}
      title={`Seat ${seat.number} – ${seat.status}${isCustomizing ? ' (Click to edit)' : ''}`}
      className={[
        'relative border-2 flex flex-col items-center justify-center transition-all select-none',
        sizeClass,
        colors.bg, colors.border, colors.text,
        isClickable
          ? 'cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-px'
          : viewOnly
          ? 'cursor-default'
          : 'cursor-not-allowed opacity-70',
        isCustomizing ? 'border-dashed border-blue-400 ring-2 ring-blue-500/10' : '',
      ].join(' ')}
    >
      {/* headrest ridge */}
      <div className={`absolute top-0 left-0 w-full h-1.5 rounded-t-[0.5rem] opacity-25 ${seat.status === 'selected' ? 'bg-white' : 'bg-current'}`} />
      {/* left armrest */}
      <div className={`absolute left-0 top-3 w-0.5 h-4 rounded-r opacity-20 ${seat.status === 'selected' ? 'bg-white' : 'bg-current'}`} />
      {/* right armrest */}
      <div className={`absolute right-0 top-3 w-0.5 h-4 rounded-l opacity-20 ${seat.status === 'selected' ? 'bg-white' : 'bg-current'}`} />
      <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black z-10`}>{seat.number}</span>
      <div className="absolute bottom-0.5 right-0.5 opacity-50">
        {seat.status === 'occupied' && <LuUser size={8} />}
        {seat.status === 'reserved' && <LuBan size={8} />}
        {seat.status === 'selected' && <LuCheck size={8} />}
      </div>
    </div>
  );
};

// ── Component ────────────────────────────────────────────────────────────────
export default function BusLayout({
  seats = [],
  totalSeats = 49,
  hasRestroom = false,
  onSeatClick,
  viewOnly = false,
  className = '',
  compact = false,
  selectedSeats = [],
  occupiedSeats = [],
  onSeatToggle,
  isCustomizing = false,
}: BusLayoutProps) {

  const effectiveTotal = seats.length > 0 
    ? Math.max(totalSeats, seats.length + 5)  // ensure enough room
    : totalSeats;

  // Clamp to valid multiples: main seats must be divisible by 4
  const backSeats  = 5;
  const mainSeats  = Math.floor((effectiveTotal - backSeats) / 4) * 4;
  const actualTotal = mainSeats + backSeats;

  // When POS selection props are provided, build seats from them
  const posSeats: SeatInfo[] = (selectedSeats.length > 0 || occupiedSeats.length > 0 || onSeatToggle)
    ? Array.from({ length: actualTotal }, (_, i) => {
        const num = String(i + 1);
        let status: SeatStatus = 'available';
        if (occupiedSeats.includes(num)) status = 'occupied';
        else if (selectedSeats.includes(num)) status = 'selected';
        return { id: `seat-${num}`, number: num, status };
      })
    : [];

  const defaultSeats: SeatInfo[] = Array.from({ length: actualTotal }, (_, i) => ({
    id: `seat-${i + 1}`,
    number: String(i + 1),
    status: 'available',
    active: true,
  }));

  const activeSeats = posSeats.length > 0 ? posSeats : (seats.length > 0 ? seats : defaultSeats);

  const getSeat = (n: number): SeatInfo => {
    // Try finding by stable ID first so renames don't break lookup
    const foundById = activeSeats.find(s => s.id === `seat-${n}`);
    if (foundById) return foundById;
    // Fallback search by number
    const foundByNum = activeSeats.find(s => s.number === String(n));
    if (foundByNum) return foundByNum;
    return { id: `seat-${n}`, number: String(n), status: 'available', active: true };
  };

  // Wrap onSeatToggle into onSeatClick interface
  const handleSeatClick = onSeatToggle
    ? (seat: SeatInfo) => onSeatToggle(seat.number)
    : onSeatClick;

  const columns = buildColumns(actualTotal, hasRestroom);

  // Back row: last 5 seat numbers
  const backRowStart = mainSeats + 1;
  const backRowSeats = [backRowStart, backRowStart+1, backRowStart+2, backRowStart+3, backRowStart+4];

  const gapClass = compact ? 'gap-1.5' : 'gap-3';
  const colGap   = compact ? 'gap-1'   : 'gap-2';
  const frontSize = compact ? 'w-7 h-8' : 'w-10 h-[2.75rem]';

  return (
    <div className={`flex flex-col items-start bg-gray-50 dark:bg-gray-900 p-4 rounded-[2rem] shadow-inner w-full ${className}`}>

      {/* ── Legend ── */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-center gap-5 mb-5 bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full">
          {([
            { status: 'available', label: 'Available',  icon: null },
            { status: 'custom',    label: 'Custom',     icon: null },
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
      )}

      {/* ── Bus Shell ── */}
      <div className="w-full overflow-x-auto pb-2">
        <div
          className="relative bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-700 shadow-xl"
          style={{ borderRadius: '3rem', padding: compact ? '1rem 1.25rem' : '1.5rem 1.75rem', minWidth: 'max-content' }}
        >
          {/* windshield strip at top */}
          <div className="absolute top-0 left-[15%] right-[5%] h-5 bg-sky-100/60 dark:bg-sky-900/20 border-b-2 border-gray-200 dark:border-gray-700 rounded-b-3xl" />

          <div className={`flex flex-row items-stretch ${gapClass} mt-4`}>

            {/* ── FRONT BLOCK (left side) ── */}
            <div className={`flex flex-col justify-between pr-4 border-r-2 border-dashed border-gray-200 dark:border-gray-700`}>
              {/* top: Door 1 + Guide */}
              <div className="flex flex-col items-center gap-2">
                <div className={`${frontSize} bg-green-50 dark:bg-green-900/20 border-2 border-green-400/60 rounded-lg flex flex-col items-center justify-center`}>
                  <LuDoorOpen size={compact ? 10 : 13} className="text-green-600" />
                  <span className="text-[7px] font-black text-green-700 uppercase tracking-wider leading-none mt-0.5">Door</span>
                </div>
                <div className={`${frontSize} rounded-t-[0.6rem] rounded-b-[0.3rem] border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 flex flex-col items-center justify-center text-purple-500`}>
                  <LuConciergeBell size={compact ? 10 : 13} />
                  <span className="text-[7px] font-black uppercase tracking-wide text-purple-600 mt-0.5">Guide</span>
                </div>
              </div>

              {/* aisle gap */}
              <div className="my-2 h-5 flex items-center justify-center">
                <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-600 opacity-60" />
              </div>

              {/* bottom: Driver */}
              <div className="flex flex-col items-center gap-1">
                <GiSteeringWheel size={compact ? 18 : 26} className="text-gray-400" />
                <div className={`${frontSize} rounded-t-[0.6rem] rounded-b-[0.3rem] border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center`}>
                  <span className="text-[7px] font-black uppercase tracking-wide text-gray-500">Driver</span>
                </div>
              </div>
            </div>

            {/* ── SEAT COLUMNS ── */}
            <div className={`flex flex-row ${colGap}`}>
              {columns.map((col, i) => (
                <div key={i} className="flex flex-col">

                  {/* TOP PAIR (guide/door side) — WC or Door 2 replaces the 2 guide-side seats */}
                  <div className="flex flex-col gap-1">
                    {col.isWC ? (
                      <div
                        className="flex flex-col items-center justify-center rounded-xl border-2"
                        style={{
                          width: compact ? '1.75rem' : '2.5rem',
                          height: compact ? 'calc(2*2.25rem + 0.25rem)' : 'calc(2*2.75rem + 0.25rem)',
                          background: 'rgb(240 249 255)',
                          borderColor: '#7dd3fc',
                        }}
                      >
                        <MdOutlineWc size={compact ? 14 : 20} className="text-sky-500" />
                        <span className="text-[7px] font-black text-sky-600 uppercase tracking-widest mt-0.5 text-center leading-tight">
                          REST<br />ROOM
                        </span>
                      </div>
                    ) : col.isDoor2 ? (
                      <div
                        className="flex flex-col items-center justify-center rounded-xl border-2"
                        style={{
                          width: compact ? '1.75rem' : '2.5rem',
                          height: compact ? 'calc(2*2.25rem + 0.25rem)' : 'calc(2*2.75rem + 0.25rem)',
                          background: 'rgb(240 253 244)',
                          borderColor: '#86efac',
                        }}
                      >
                        <LuDoorOpen size={compact ? 10 : 15} className="text-green-600" />
                        <span className="text-[7px] font-black text-green-700 uppercase tracking-wider mt-0.5 text-center leading-tight">
                          Door 2
                        </span>
                      </div>
                    ) : (
                      <>
                        <Seat seat={getSeat(col.topSeat2)} onClick={handleSeatClick} viewOnly={viewOnly} compact={compact} isCustomizing={isCustomizing} />
                        <Seat seat={getSeat(col.topSeat1)} onClick={handleSeatClick} viewOnly={viewOnly} compact={compact} isCustomizing={isCustomizing} />
                      </>
                    )}
                  </div>

                  {/* AISLE LINE */}
                  <div className="my-2 h-5 flex items-center justify-center">
                    <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-600 opacity-50" />
                  </div>

                  {/* BOTTOM PAIR (driver side) */}
                  <div className="flex flex-col gap-1">
                    <Seat seat={getSeat(col.botSeat2)} onClick={handleSeatClick} viewOnly={viewOnly} compact={compact} isCustomizing={isCustomizing} />
                    <Seat seat={getSeat(col.botSeat1)} onClick={handleSeatClick} viewOnly={viewOnly} compact={compact} isCustomizing={isCustomizing} />
                  </div>

                </div>
              ))}
            </div>

            {/* ── BACK ROW (5 seats, vertical column on right) ── */}
            <div className={`flex flex-col justify-center ${colGap} pl-3 border-l-2 border-dashed border-gray-200 dark:border-gray-700`}>
              {backRowSeats.map(n => (
                <Seat key={n} seat={getSeat(n)} onClick={handleSeatClick} viewOnly={viewOnly} compact={compact} isCustomizing={isCustomizing} />
              ))}
            </div>

          </div>

          {/* rear bumper */}
          <div className="mt-4 border-t-2 border-gray-200 dark:border-gray-700 pt-2 flex justify-between items-center">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Front</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {actualTotal} Seats {hasRestroom ? '• VIP' : ''}
            </span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Rear</span>
          </div>
        </div>
      </div>
    </div>
  );
}
