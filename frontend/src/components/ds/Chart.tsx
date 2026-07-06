import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/**
 * Tokenized bar chart (roadmap 3.2 #9 / DESIGN_DIRECTION §1.4). Indigo (brand) rounded-top
 * bars, hairline horizontal gridlines, muted axes — the Micro-Dashboard / Dashboard-Flaws
 * look. Colors are read from the resolved CSS vars so it flips with light/dark mode. Wrap
 * dashboard analytics in this instead of configuring recharts per page. Under `.jvd`.
 */
interface BarDatum {
  label: string;
  value: number;
}
interface ChartProps {
  data: BarDatum[];
  height?: number;
  /** show the Y axis (default hidden for compact cards) */
  showYAxis?: boolean;
}

function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function Chart({ data, height = 220, showYAxis = false }: ChartProps) {
  // Re-read tokens when the theme toggles so bars/axes recolor without a remount.
  const [tokens, setTokens] = useState(() => ({ brand: '#1D4ED8', border: '#D4D4D8', muted: '#737373', surface: '#FFFFFF' }));
  useEffect(() => {
    const read = () => setTokens({
      brand: cssVar('--jvd-brand', '#1D4ED8'),
      border: cssVar('--jvd-border', '#D4D4D8'),
      muted: cssVar('--jvd-ink-muted', '#737373'),
      surface: cssVar('--jvd-surface', '#FFFFFF'),
    });
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: showYAxis ? 0 : -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={tokens.border} strokeDasharray="0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: tokens.muted, fontSize: 12 }} />
        <YAxis hide={!showYAxis} tickLine={false} axisLine={false} tick={{ fill: tokens.muted, fontSize: 12 }} width={36} />
        <Tooltip
          cursor={{ fill: tokens.border, opacity: 0.3 }}
          contentStyle={{
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: 10,
            fontSize: 12,
            color: tokens.muted,
          }}
        />
        <Bar dataKey="value" fill={tokens.brand} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}
