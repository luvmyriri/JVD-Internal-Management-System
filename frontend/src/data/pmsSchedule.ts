// Real Lionsjade Corporation PMS Schedule
// Source: Regular Preventive Maintenance Schedule document

export interface PmsLevel {
  type: string;
  shortLabel: string;
  color: string;       // tailwind bg color
  textColor: string;   // tailwind text color
  interval: string;
  checklist: string[];
  note?: string;
}

export const PMS_LEVELS: Record<string, PmsLevel> = {
  first: {
    type: 'First PMS',
    shortLabel: '1st PMS',
    color: 'bg-purple-50 dark:bg-purple-500/10',
    textColor: 'text-purple-700 dark:text-purple-400',
    interval: '5,000 km',
    note: 'Free Labor and Filters',
    checklist: [
      'Replace Engine Oil and Oil filter (10 ltrs Engine Oil 15W-40)',
      'Replace Fuel Filter (Primary & Secondary)',
      'Check / Clean Air Filter Element',
      'Check / Adjust Tension of all fan Belts',
      'Check / Replace Transmission Oil (3.5 ltrs; API GL4 SAE 85W-90)',
      'Grease All Underchassis Fittings – Front & Rear Leafspring, Slack Adjuster Frt & Rear, King Pin LH/RH, S-Cam Frt & Rear, Propeller Shaft and Transmission (27 grease points)',
      'Checking and Adjustment of Clutch',
      'Check / Re-torque Front and Rear U-Bolts',
      'Check / Adjust Front and Rear Brakes',
      'Replace Differential Gear Oil SAE 140 (4 ltrs; API GL5 SAE 140)',
      'Check / Clean Radiator and Intercooler',
      'Check / Inspect Electrical system for possible problems',
    ],
  },
  pms1: {
    type: 'PMS 1',
    shortLabel: 'PMS 1',
    color: 'bg-blue-50 dark:bg-blue-500/10',
    textColor: 'text-blue-700 dark:text-blue-400',
    interval: '15,000 km (then 55k, 95k, 135k, 175k, 215k...)',
    checklist: [
      'Replace Engine Oil and Oil filter (10 ltrs Engine Oil 15W-40)',
      'Replace Fuel Filter (Primary Only)',
      'Check / Clean Air Filter Element',
      'Check / Adjust Tension of all fan Belts',
      'Grease All Underchassis Fittings – Front & Rear Leafspring, Slack Adjuster Frt & Rear, King Pin LH/RH, S-Cam Frt & Rear, Propeller Shaft and Transmission (27 grease points)',
      'Check / Adjust Front and Rear Brakes',
      'Checking and Adjustment of Clutch',
      'Check / Clean Radiator and Intercooler',
      'Check / Inspect Electrical system for possible problems',
    ],
  },
  pms2: {
    type: 'PMS 2',
    shortLabel: 'PMS 2',
    color: 'bg-cyan-50 dark:bg-cyan-500/10',
    textColor: 'text-cyan-700 dark:text-cyan-400',
    interval: '25,000 km (then 65k, 105k, 145k, 185k, 225k...)',
    checklist: [
      'Replace Engine Oil and Oil filter (10 ltrs Engine Oil 15W-40)',
      'Replace Fuel Filter (Primary & Secondary)',
      'Check / Clean Air Filter Element',
      'Check / Adjust Tension of all fan Belts',
      'Grease All Underchassis Fittings – Front & Rear Leafspring, Slack Adjuster Frt & Rear, King Pin LH/RH, S-Cam Frt & Rear, Propeller Shaft and Transmission (27 grease points)',
      'Check / Adjust Front and Rear Brakes',
      'Checking and Adjustment of Clutch',
      'Check / Clean Radiator and Intercooler',
      'Check / Inspect Electrical system for possible problems',
    ],
  },
  pms3: {
    type: 'PMS 3',
    shortLabel: 'PMS 3',
    color: 'bg-amber-50 dark:bg-amber-500/10',
    textColor: 'text-amber-700 dark:text-amber-400',
    interval: '35,000 km (then 75k, 115k, 155k, 195k, 235k...)',
    checklist: [
      'Replace Engine Oil and Oil filter (10 ltrs Engine Oil 15W-40)',
      'Replace Fuel Filter (Primary Only)',
      'Check / Clean Air Filter Element',
      'Check / Adjust Tension of all fan Belts',
      'Grease All Underchassis Fittings – Front & Rear Leafspring, Slack Adjuster Frt & Rear, King Pin LH/RH, S-Cam Frt & Rear, Propeller Shaft and Transmission (27 grease points)',
      'Check / Adjust Front and Rear Brakes',
      'Checking and Adjustment of Clutch',
      'Check / Clean Radiator and Intercooler',
      'Check / Inspect Electrical system for possible problems',
    ],
  },
  pms4: {
    type: 'PMS 4',
    shortLabel: 'PMS 4',
    color: 'bg-rose-50 dark:bg-rose-500/10',
    textColor: 'text-rose-700 dark:text-rose-400',
    interval: '45,000 km (then 85k, 125k, 165k, 205k, 245k...)',
    checklist: [
      'Replace Engine Oil and Oil filter (10 ltrs Engine Oil 15W-40)',
      'Replace Fuel Filter (Primary & Secondary)',
      'Check / Clean Air Filter Element',
      'Check / Adjust Tension of all fan Belts',
      'Check / Replace Air Filter Element (Tune-Up)',
      'Check / Replace Transmission Oil (3.5 ltrs; API GL4 SAE 85W-90)',
      'Grease All Underchassis Fittings – Front & Rear Leafspring, Slack Adjuster Frt & Rear, King Pin LH/RH, S-Cam Frt & Rear, Propeller Shaft and Transmission (27 grease points)',
      'Replace Front and Rear Brake Lining (if necessary)',
      'Checking and Replacement of Clutch Lining',
      'Check / Re-torque Front and Rear U-Bolts',
      'Replace Differential Gear Oil SAE 140 (4 ltrs; API GL5 SAE 140)',
      'Repacking of Wheel Bearings / Lubricating (Front and Rear wheel Bearings)',
      'Check / Clean Radiator and Intercooler',
      'Clean Airconditioning System',
    ],
  },
};

export interface NextPmsInfo {
  key: string;
  level: PmsLevel;
  dueAtKm: number;
  kmRemaining: number;
  progressPct: number; // 0–100
  isOverdue: boolean;
}

/**
 * Determine the next PMS type and due mileage for a given bus.
 * Schedule: First PMS @ 5,000 km, then PMS1/2/3/4 repeating every 10,000 km
 * starting at 15,000 km.
 */
export function getNextPmsInfo(totalMileage: number): NextPmsInfo {
  const cycle = ['pms1', 'pms2', 'pms3', 'pms4'] as const;

  // Before first PMS
  if (totalMileage < 5000) {
    const km = Math.max(0, 5000 - totalMileage);
    return {
      key: 'first',
      level: PMS_LEVELS.first,
      dueAtKm: 5000,
      kmRemaining: km,
      progressPct: Math.round((totalMileage / 5000) * 100),
      isOverdue: false,
    };
  }

  // Between first PMS and PMS 1
  if (totalMileage < 15000) {
    const km = 15000 - totalMileage;
    return {
      key: 'pms1',
      level: PMS_LEVELS.pms1,
      dueAtKm: 15000,
      kmRemaining: km,
      progressPct: Math.round(((totalMileage - 5000) / 10000) * 100),
      isOverdue: false,
    };
  }

  // Regular cycle: every 10,000 km from 15,000
  const offset = totalMileage - 15000;
  const intervalsDone = Math.floor(offset / 10000);
  const nextDueAt = 15000 + (intervalsDone + 1) * 10000;
  const cycleIndex = (intervalsDone + 1) % 4;
  const key = cycle[cycleIndex];
  const prevDueAt = nextDueAt - 10000;
  const kmInInterval = totalMileage - prevDueAt;
  const kmRemaining = nextDueAt - totalMileage;

  return {
    key,
    level: PMS_LEVELS[key],
    dueAtKm: nextDueAt,
    kmRemaining,
    progressPct: Math.min(100, Math.round((kmInInterval / 10000) * 100)),
    isOverdue: kmRemaining <= 0,
  };
}
