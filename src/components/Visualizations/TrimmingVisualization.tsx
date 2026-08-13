import React, { useEffect, useMemo, useState } from 'react';

interface TrimmingVisualizationProps {
  onComplete?: () => void;
}

type Status = 'pass' | 'warn' | 'fail';
type TabId = 'core' | 'traits' | 'machine';

interface ChartSeries {
  name: string;
  color: string;
  values: number[];
  dashed?: boolean;
  area?: boolean;
  areaFill?: string;
}

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface QualityBox {
  pos: number;
  min: number;
  q1: number;
  med: number;
  q3: number;
  max: number;
  mean: number;
}

/* ===== 可重現的偽隨機產生器（seed 固定，切換 Tab 不會閃動） ===== */
function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ===== 資料產生器 ===== */

// Adapter Content：各 adapter 於定序尾端的累積百分比
function genAdapterSeries(): ChartSeries[] {
  const rnd = mulberry32(7);
  const defs = [
    { name: 'Illumina Universal Adapter', color: '#ef4444' },
    { name: 'Illumina Small RNA Adapter', color: '#f97316' },
    { name: 'Nextera Transposase', color: '#eab308' },
    { name: 'PolyA', color: '#22c55e' },
  ];
  return defs.map((d, j) => {
    const values: number[] = [];
    for (let p = 0; p < 50; p++) {
      let v: number;
      if (j === 0) v = p < 34 ? 0.5 + (rnd() - 0.5) * 0.4 : ((p - 34) / 15) * 12 + (rnd() - 0.5) * 0.8;
      else if (j === 1) v = 0.9 + rnd() * 0.9;
      else if (j === 2) v = 0.35 + rnd() * 0.35;
      else v = 0.15 + rnd() * 0.2;
      values.push(Math.max(0, Math.round(v * 100) / 100));
    }
    return { name: d.name, color: d.color, values };
  });
}

// Per Base Sequence Content：四鹼基 A / C / G / T（依專案規範配色）
type BaseKey = 'A' | 'C' | 'G' | 'T';
const BASES: { key: BaseKey; name: string; color: string }[] = [
  { key: 'A', name: 'A', color: '#ef4444' },
  { key: 'C', name: 'C', color: '#f97316' },
  { key: 'G', name: 'G', color: '#3b82f6' },
  { key: 'T', name: 'T', color: '#22c55e' },
];
const BASE_MEANS: Record<BaseKey, number> = { A: 29.5, C: 20.3, G: 20.2, T: 30.0 };

function genBaseContent(): ChartSeries[] {
  const rnd = mulberry32(33);
  return BASES.map((b) => {
    const values = Array.from({ length: 50 }, (_, p) => {
      const wobble = p < 12 ? (rnd() - 0.5) * 9 : (rnd() - 0.5) * 1.2;
      return Math.max(0, Math.round((BASE_MEANS[b.key] + wobble) * 10) / 10);
    });
    return { name: b.name, color: b.color, values };
  });
}

// Per-Base Sequence Quality：50 個位置的盒狀圖資料（min / Q1 / 中位數 / Q3 / max / mean）
function genQualityBoxes(): QualityBox[] {
  const rnd = mulberry32(2026);
  const boxes: QualityBox[] = [];
  for (let p = 0; p < 50; p++) {
    const decline = Math.max(0, p - 32) * 0.28;
    const med = 35.5 - decline + (rnd() - 0.5) * 1.4;
    const spread = 1.8 + rnd() * 1.2;
    boxes.push({
      pos: p + 1,
      min: Math.max(2, med - 6 - rnd() * 2.5),
      q1: med - spread,
      med,
      q3: med + spread * 0.85,
      max: Math.min(41, med + 2.5 + rnd() * 1.5),
      mean: med + (rnd() - 0.5) * 1.6,
    });
  }
  return boxes;
}

// Per Tile Sequence Quality：26 個 Tile × 60 個位置的熱圖資料
const TILE_ROWS = 26;
const TILE_COLS = 60;

function genTileQuality(): number[][] {
  const rnd = mulberry32(55);
  const grid: number[][] = [];
  for (let r = 0; r < TILE_ROWS; r++) {
    const row: number[] = [];
    const baseline = (r >= 10 && r <= 13) || (r >= 20 && r <= 22) ? 24 + rnd() * 4 : 32 + rnd() * 6;
    for (let c = 0; c < TILE_COLS; c++) {
      const tail = c > 45 ? -(c - 45) * 0.18 : 0;
      row.push(Math.min(40, Math.max(8, baseline + tail + (rnd() - 0.5) * 4)));
    }
    grid.push(row);
  }
  return grid;
}

function tileColor(q: number): string {
  if (q >= 30) return `rgba(34, 197, 94, ${0.2 + ((q - 30) / 10) * 0.8})`;
  if (q >= 20) return `rgba(234, 179, 8, ${0.3 + ((q - 20) / 10) * 0.6})`;
  return `rgba(239, 68, 68, ${0.4 + (q / 20) * 0.6})`;
}

// Sequence Length Distribution：序列長度長條圖資料
const LENGTH_BARS: BarItem[] = [
  { label: '148', value: 2, color: '#3b82f6' },
  { label: '149', value: 6, color: '#3b82f6' },
  { label: '150', value: 14, color: '#3b82f6' },
  { label: '151', value: 82, color: '#3b82f6' },
  { label: '152', value: 9, color: '#3b82f6' },
  { label: '153', value: 3, color: '#3b82f6' },
  { label: '154', value: 1, color: '#3b82f6' },
];

// Overrepresented Sequences：表格資料
const OVERREP_ROWS = [
  { seq: 'TGCCTTGCCAGCCCGCTCAGTTTGGGCATGAGATTCGACCTCCGACC', count: '1,214,376', pct: 4.96, source: 'Illumina Universal Adapter (2nd strand)', color: '#ef4444' },
  { seq: 'GATCGGAAGAGCACACGTCTGAACTCCAGTCACATCACGATCTCGTAT', count: '623,441', pct: 2.54, source: 'Illumina Universal Adapter', color: '#f97316' },
  { seq: 'CCTAGGGTTTTCCCAGTCACGACGTTGTAAAACGACGGCCAGTGAATT', count: '189,312', pct: 0.77, source: 'RNA 5S ribosomal RNA', color: '#eab308' },
  { seq: 'AGATCGGAAGAGCACACGTCTGAACTCCAGTCACCGATGTATCTCGTAT', count: '152,876', pct: 0.62, source: 'Illumina Small RNA Adapter', color: '#eab308' },
  { seq: 'ACACTCTTTCCCTACACGACGCTCTTCCGATCTTGCTACTCATCGATCG', count: '98,512', pct: 0.40, source: 'Illumina TruSeq Adapter', color: '#22c55e' },
];

// Tab 頁籤設定
const TABS: { id: TabId; label: string; en: string }[] = [
  { id: 'core', label: '核心 QC', en: 'Core QC' },
  { id: 'traits', label: '序列特性', en: 'Sequence Traits' },
  { id: 'machine', label: '定序與高頻', en: 'Machine & Sequences' },
];

/* ===== 共用元件 ===== */

const STATUS_META: Record<Status, { label: string; text: string; bg: string; dot: string }> = {
  pass: { label: 'PASS', text: '#22c55e', bg: 'rgba(34,197,94,0.12)', dot: '#22c55e' },
  warn: { label: 'WARN', text: '#eab308', bg: 'rgba(234,179,8,0.12)', dot: '#eab308' },
  fail: { label: 'FAIL', text: '#ef4444', bg: 'rgba(239,68,68,0.12)', dot: '#ef4444' },
};

// Pass / Warn / Fail 狀態標籤（圓點 + 文字）
const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
      style={{ color: meta.text, backgroundColor: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot, boxShadow: `0 0 4px ${meta.dot}` }} />
      {meta.label}
    </span>
  );
};

// 圖表卡片容器：標題 + 狀態 Badge + 圖例 + 圖表內容
const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  status?: Status;
  badgeText?: string;
  legend?: React.ReactNode;
  info?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, status, badgeText, legend, info, className, children }) => {
  return (
    <div
      className={`flex flex-col rounded-2xl border overflow-hidden min-h-[280px] ${className || ''}`}
      style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-bold" style={{ color: '#e8eef5' }}>{title}</h3>
            {status && <StatusBadge status={status} />}
            {info}
          </div>
          {subtitle && (
            <p className="text-[11px] mt-0.5" style={{ color: '#9fb0c3' }}>{subtitle}</p>
          )}
        </div>
        {badgeText && (
          <span
            className="shrink-0 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border"
            style={{ color: '#94a3b8', backgroundColor: '#0f172a', borderColor: '#334155' }}
          >
            {badgeText}
          </span>
        )}
      </div>
      {legend && (
        <div className="px-4 flex flex-wrap gap-x-4 gap-y-1 pb-1">{legend}</div>
      )}
      <div className="flex-1 px-3 pb-3 flex items-center">{children}</div>
    </div>
  );
};

// 圖例項目
const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="inline-flex items-center gap-1.5 text-[10px]" style={{ color: '#94a3b8' }}>
    <span className="inline-block w-3 h-[2px] rounded" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
    {label}
  </span>
);

// 提示符號 ℹ️（hover 顯示說明文字）
const InfoHint: React.FC<{ text: string }> = ({ text }) => (
  <span className="relative inline-flex items-center group">
    <span
      className="inline-flex w-[18px] h-[18px] rounded-full items-center justify-center text-[10px] cursor-help select-none"
      style={{ color: '#94a3b8', backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: '1px' }}
    >
      ℹ️
    </span>
    <span
      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-56 px-3 py-2 rounded-lg text-[11px] font-normal leading-snug z-20 shadow-xl"
      style={{ backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: '1px', color: '#c6d3e3' }}
    >
      {text}
    </span>
  </span>
);

/* ===== 通用 SVG 長條圖 ===== */
interface BarChartProps {
  bars: BarItem[];
  yMax?: number;
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ bars, yMax, height = 230 }) => {
  const W = 560;
  const H = height;
  const pad = { top: 18, right: 18, bottom: 26, left: 42 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const maxV = yMax || Math.max(...bars.map((b) => b.value)) * 1.1;
  const yOf = (v: number) => pad.top + (1 - v / maxV) * innerH;
  const barW = innerW / bars.length;
  const n = bars.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
      {Array.from({ length: 5 }, (_, i) => {
        const v = (maxV / 4) * i;
        return (
          <g key={i}>
            <line x1={pad.left} x2={W - pad.right} y1={yOf(v)} y2={yOf(v)} stroke="#293548" strokeWidth="1" strokeDasharray="3 4" />
            <text x={pad.left - 7} y={yOf(v) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{v.toFixed(0)}</text>
          </g>
        );
      })}
      {bars.map((b, i) => {
        const x = pad.left + i * barW;
        const w = barW * 0.6;
        const h = Math.max(1, yOf(0) - yOf(b.value));
        const showLabel = n <= 10 || i % Math.ceil(n / 10) === 0;
        return (
          <g key={b.label + i}>
            <rect x={x + (barW - w) / 2} y={yOf(b.value)} width={w} height={h} rx="2" fill={b.color || '#3b82f6'} opacity="0.9" />
            {showLabel && (
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">{b.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/* ===== Per Tile Sequence Quality：熱圖（含 Tile Q 值過濾門檻） ===== */
const PerTileHeatmap: React.FC = () => {
  const grid = useMemo(genTileQuality, []);
  const [threshold, setThreshold] = useState(30);
  const rows = grid.length;
  const cols = grid[0].length;
  const failing = grid.reduce((acc, row) => acc + row.filter((q) => q < threshold).length, 0);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px] font-bold shrink-0" style={{ color: '#94a3b8' }}>Tile Q 值過濾門檻</span>
        <input
          type="range"
          min={20}
          max={40}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="tile-slider w-full h-2 appearance-none bg-[#0f1520] rounded-full cursor-pointer"
        />
        <span className="shrink-0 font-mono font-bold text-right" style={{ minWidth: '3rem', color: failing > 0 ? '#f87171' : '#22c55e' }}>
          Q{threshold}
        </span>
      </div>

      <div className="w-full flex gap-3">
        <div className="grid gap-[2px] text-[9px] text-right pr-1" style={{ gridTemplateRows: `repeat(${rows}, 10px)`, color: '#64748b' }}>
          {Array.from({ length: rows }, (_, r) => (
            <span key={r} className="flex items-center justify-end leading-none">{r + 1}</span>
          ))}
        </div>
        <div className="flex-1 min-w-0 max-w-[620px]">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {grid.map((row, r) =>
              row.map((q, c) => {
                const warn = q < threshold;
                return (
                  <div
                    key={`${r}-${c}-${warn ? threshold : 0}`}
                    className={`rounded-[1px] ${warn ? 'tile-warn' : ''}`}
                    style={{ backgroundColor: tileColor(q), height: 10 }}
                    title={`Tile ${r + 1} · Position ${c + 1} · Q${q.toFixed(0)}`}
                  />
                );
              })
            )}
          </div>
          <div className="flex justify-between text-[9px] mt-1.5" style={{ color: '#64748b' }}>
            <span>Position 1</span>
            <span>20</span>
            <span>40</span>
            <span>60</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 text-[10px]" style={{ color: failing > 0 ? '#f87171' : '#64748b' }}>
        {failing > 0
          ? `${failing} 個 Tile 低於 Q${threshold} 標準 → 紅色警戒外框（品質不達標的 Tile 已被標記，但不消失）`
          : `所有 Tile 品質均 ≥ Q${threshold}`}
      </div>
    </div>
  );
};

/* ===== Overrepresented Sequences：表格（可勾選標記污染源） ===== */
const OverrepTable: React.FC = () => {
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-[12px] border-collapse min-w-[580px]">
        <thead>
          <tr className="border-b" style={{ borderColor: '#334155' }}>
            <th className="py-2 pr-4 w-8"></th>
            {['Sequence', 'Count', 'Percentage', 'Possible Source'].map((h) => (
              <th key={h} className="py-2 pr-4 text-[10px] font-bold tracking-wider" style={{ color: '#64748b' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OVERREP_ROWS.map((row, i) => {
            const isMarked = marked.has(i);
            return (
              <tr
                key={i}
                className="border-b"
                style={{
                  borderColor: '#1e293b',
                  backgroundColor: isMarked ? 'rgba(153,27,27,0.28)' : undefined,
                  transition: 'background-color 0.25s ease',
                }}
              >
                <td className="py-2.5 pr-4">
                  <input
                    type="checkbox"
                    checked={isMarked}
                    onChange={() => toggle(i)}
                    className="appearance-none w-4 h-4 rounded border cursor-pointer"
                    style={{ backgroundColor: isMarked ? '#ef4444' : '#0f172a', borderColor: isMarked ? '#ef4444' : '#334155' }}
                  />
                </td>
                <td className="py-2.5 pr-4 font-mono text-[11px] truncate max-w-[260px]" style={{ color: '#e8eef5' }}>{row.seq}</td>
                <td className="py-2.5 pr-4 font-mono" style={{ color: '#94a3b8' }}>{row.count}</td>
                <td
                  className="py-2.5 pr-4 font-mono font-bold"
                  style={{ color: isMarked ? '#64748b' : row.color, textDecoration: isMarked ? 'line-through' : undefined }}
                >
                  {row.pct}%
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: '#94a3b8' }}>{row.source}</span>
                    {isMarked && (
                      <span
                        className="mark-pop inline-flex items-center justify-center rounded-full px-2 py-1 text-[7px] font-black tracking-wider shrink-0"
                        style={{
                          color: '#fecaca',
                          backgroundColor: 'rgba(153,27,27,0.9)',
                          border: '1.5px solid #ef4444',
                          boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                        }}
                      >
                        Marked
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 text-[10px]" style={{ color: marked.size > 0 ? '#f87171' : '#64748b' }}>
        {marked.size > 0
          ? `已標記 ${marked.size} 筆污染源 → 文字保留、Percentage 已失效（劃線）`
          : '點擊勾選框標記污染源：該列會亮起暗紅高亮，並在文字右側蓋上 Marked 徽章'}
      </div>
    </div>
  );
};

/* ===== Per Sequence GC Content：互動式 GC 過濾曲線圖 ===== */
const GC_OBSERVED = (() => {
  const rnd = mulberry32(13);
  const bins = 101;
  const mean = 48;
  const sd = 6;
  const gaussian = (x: number) => Math.exp(-((x - mean) ** 2) / (2 * sd * sd));
  return Array.from({ length: bins }, (_, i) => {
    const noise = 1 + (rnd() - 0.5) * 0.12;
    return Math.round(gaussian(i) * 15 * noise * 100) / 100;
  });
})();

const GcFilterChart: React.FC = () => {
  const [maxGc, setMaxGc] = useState(60);
  const values = GC_OBSERVED;
  const W = 560;
  const H = 230;
  const pad = { top: 14, right: 18, bottom: 26, left: 42 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const yMax = 18;
  const n = values.length;
  const xOf = (g: number) => pad.left + (g / 100) * innerW;
  const yOf = (v: number) => pad.top + (1 - v / yMax) * innerH;
  const maxIdx = Math.round((maxGc / 100) * (n - 1));
  const thresholdX = xOf(maxGc);

  const passPath = `${values.slice(0, maxIdx + 1).map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf((i / (n - 1)) * 100)} ${yOf(v)}`).join(' ')} L${thresholdX} ${pad.top + innerH} L${pad.left} ${pad.top + innerH} Z`;
  const filteredPath = `M${thresholdX} ${yOf(values[maxIdx])} ${values.slice(maxIdx + 1).map((v, i) => `L${xOf(((maxIdx + 1 + i) / (n - 1)) * 100)} ${yOf(v)}`).join(' ')} L${pad.left + innerW} ${pad.top + innerH} L${thresholdX} ${pad.top + innerH} Z`;

  const particles = useMemo(() => {
    const rnd = mulberry32(99);
    const list: { x: number; y: number; r: number; delay: number; dur: number }[] = [];
    for (let i = 0; i < 36; i++) {
      const g = maxGc + rnd() * (100 - maxGc);
      const idx = Math.round((g / 100) * (n - 1));
      list.push({
        x: xOf(g),
        y: yOf(values[idx]) + rnd() * 10,
        r: 1 + rnd() * 1.8,
        delay: rnd() * 1.8,
        dur: 1.3 + rnd() * 1.3,
      });
    }
    return list;
  }, [maxGc]);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        {/* 網格 + Y 軸刻度 */}
        {['0', '5', '10', '15'].map((t, i) => {
          const v = (yMax / 3) * i;
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={yOf(v)} y2={yOf(v)} stroke="#293548" strokeWidth="1" strokeDasharray="3 4" />
              <text x={pad.left - 7} y={yOf(v) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
            </g>
          );
        })}
        {/* X 軸刻度 */}
        {[0, 20, 40, 60, 80, 100].map((t) => (
          <text key={t} x={xOf(t)} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{t}%</text>
        ))}
        <text x={pad.left + innerW / 2} y={H - 1} textAnchor="middle" fontSize="10" fill="#475569">GC content (%)</text>

        {/* 通過區（綠色動態光暈） */}
        <path d={passPath} className="gc-pass-glow" fill="rgba(34,197,94,0.16)" />
        <path d={passPath} fill="rgba(34,197,94,0.10)" />
        <path d={passPath} fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />

        {/* 被過濾區（橙色，粒子掉落） */}
        <path d={filteredPath} fill="rgba(249,115,22,0.14)" />
        <path d={filteredPath} fill="none" stroke="#fb923c" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

        {/* 曲線 */}
        <polyline points={values.map((v, i) => `${xOf((i / (n - 1)) * 100)},${yOf(v)}`).join(' ')} fill="none" stroke="#e8eef5" strokeWidth="1.5" opacity="0.85" />

        {/* 粒子 */}
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill="#fb923c"
            className="gc-particle"
            style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
          />
        ))}

        {/* Max GC 垂直閾值線 */}
        <line x1={thresholdX} x2={thresholdX} y1={pad.top} y2={pad.top + innerH} stroke="#fb923c" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px rgba(251,146,60,0.7))' }} />
        <text x={thresholdX} y={pad.top + 5} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fb923c">MAX {maxGc}%</text>
      </svg>

      {/* Max GC 滑桿 */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[11px] font-medium shrink-0" style={{ color: '#94a3b8' }}>Max GC</span>
        <input
          type="range"
          className="gc-threshold-slider w-full h-2 appearance-none bg-[#0f1520] rounded-full cursor-pointer"
          min={30}
          max={80}
          value={maxGc}
          step={1}
          onChange={(e) => setMaxGc(parseInt(e.target.value))}
        />
        <span className="text-[14px] font-bold font-mono shrink-0 w-12 text-right" style={{ color: '#fb923c' }}>{maxGc}%</span>
      </div>
      <div className="mt-1.5 text-center text-[10px]" style={{ color: '#64748b' }}>
        GC 含量 ≥ {maxGc}% 的 Reads 將被過濾
      </div>
    </div>
  );
};

/* ===== Per Base N Content：N 鹼基過濾雷射動畫 ===== */
const N_SEQ: { letter: string; isN: boolean }[] = (() => {
  const bases = ['A', 'C', 'G', 'T'];
  const rnd = mulberry32(5);
  const nPos = [5, 14, 15, 23, 31, 40, 41, 49, 57, 58];
  return Array.from({ length: 64 }, (_, i) => ({
    letter: nPos.includes(i) ? 'N' : bases[Math.floor(rnd() * 4)],
    isN: nPos.includes(i),
  }));
})();

const NCellW = 11;
const NSweepMs = 4200;
const NDissMs = 380;
const NRestoreMs = 1000;
const NHoldMs = 1500;
const NCycle = NSweepMs + NHoldMs;

const NBaseFilterChart: React.FC = () => {
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setT((prev) => (prev + dt >= NCycle ? 0 : prev + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const len = N_SEQ.length;
  const W = 720;
  const H = 200;
  const padLeft = 16;
  const topY = 92;
  const totalW = len * NCellW;

  const beamFrac = Math.min(1, t / NSweepMs);
  const restoreProg = Math.min(1, Math.max(0, (t - NSweepMs) / NRestoreMs));
  const beamX = padLeft - 26 + beamFrac * (totalW + 52);

  // 每顆 N 的溶解進度
  const foreign = (i: number) => {
    if (!N_SEQ[i].isN) return 0;
    const frac = i / len;
    const hitT = frac * NSweepMs;
    if (t < hitT) return 0;
    return Math.min(1, (t - hitT) / NDissMs);
  };

  // 已去除的 N 數量（live 計數）
  const removedNTotal = N_SEQ.filter((c) => c.isN).length;
  let scannedN = 0;
  for (let i = 0; i < len; i++) {
    if (N_SEQ[i].isN && foreign(i) >= 1) scannedN++;
  }

  const cells: React.ReactNode[] = [];
  let removedBefore = 0;
  for (let i = 0; i < len; i++) {
    const c = N_SEQ[i];
    const prog = foreign(i);
    const isRemoved = c.isN && prog >= 1;
    const occupying = !c.isN || !isRemoved || restoreProg > 0;
    const disp = i - removedBefore;

    if (occupying) {
      const x = padLeft + disp * NCellW;
      if (c.isN) {
        const dissolving = prog > 0 && prog < 1;
        const opacity = dissolving ? 1 - prog * 0.7 : 1;
        const dy = -(prog * 14);
        const scale = 1 - prog * 0.55;
        const color = dissolving ? '#ff4d4d' : '#9ca3af';
        cells.push(
          <text
            key={i}
            x={0}
            y={topY}
            fontSize={15}
            textAnchor="middle"
            fontFamily="Consolas, 'Courier New', monospace"
            fill={color}
            opacity={opacity}
            style={{
              transform: `translate(${x}px, ${dy}px) scale(${scale})`,
              transformOrigin: `${x + NCellW / 2}px ${topY}px`,
              transformBox: 'view-box',
              transition: 'transform 0.25s ease, opacity 0.18s ease, fill 0.1s ease',
            }}
          >
            N
          </text>
        );
      } else {
        cells.push(
          <text
            key={i}
            x={0}
            y={topY}
            fontSize={13.5}
            textAnchor="middle"
            fontFamily="Consolas, 'Courier New', monospace"
            fontWeight={500}
            fill="#cbd5e1"
            opacity={0.9}
            style={{
              transform: `translate(${x}px, 0px)`,
              transformBox: 'view-box',
              transition: 'transform 0.25s ease',
            }}
          >
            {c.letter}
          </text>
        );
      }
    } else {
      removedBefore++;
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold" style={{ color: '#e2e8f0' }}>Read · 64 bp 前段</span>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span style={{ color: '#94a3b8' }}>已去除 N</span>
          <span className="font-bold" style={{ color: '#ff4d4d' }}>{Math.min(scannedN, removedNTotal)} / {removedNTotal}</span>
          <span style={{ color: '#3b82f6' }}>
            <span className="animate-blink">▌</span> 雷射掃描 {Math.round(beamFrac * 100)}%
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        {/* 暗色網格 */}
        {[50, 62, 74, 86, 98, 110].map((gy) => (
          <line key={gy} x1={padLeft} x2={padLeft + totalW} y1={gy} y2={gy} stroke="#1e2a3a" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        <line x1={padLeft} x2={padLeft + totalW} y1={topY + 12} y2={topY + 12} stroke="#334155" strokeWidth="1" />

        {/* 讀序底條 */}
        <rect x={padLeft} y={topY - 26} width={totalW} height={44} rx="6" fill="rgba(15,23,42,0.6)" stroke="#1e2a3a" strokeWidth="1" />

        {/* 序列鹼基 */}
        {cells}

        {/* 雷射：尾端漸層 + 光束 */}
        <rect
          x={beamX - 42}
          y={topY - 30}
          width={42}
          height={48}
          rx="6"
          fill="url(#n-beam-trail)"
          opacity="0.35"
        />
        <rect x={beamX - 3} y={topY - 30} width={3} height={48} fill="#60a5fa" style={{ filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.9))' }} />

        <defs>
          <linearGradient id="n-beam-trail" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.75" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mt-1.5 text-center text-[10px]" style={{ color: '#64748b' }}>
        N 鹼基含量高的 Reads 將被去除，剩餘序列自動接合
      </div>
    </div>
  );
};

/* ===== Per Base Sequence Quality：盒狀圖 + 可拖曳裁剪位置 ===== */
const QualityTrimChart: React.FC = () => {
  const boxes = useMemo(genQualityBoxes, []);
  const [trimPos, setTrimPos] = useState(36);

  const W = 560;
  const H = 230;
  const pad = { top: 14, right: 18, bottom: 26, left: 42 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const yMin = 2;
  const yMax = 41;
  const yOf = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const xOf = (i: number) => pad.left + (i / (boxes.length - 1)) * innerW;
  const barW = (innerW / boxes.length) * 0.55;
  const yTicks = ['Q10', 'Q20', 'Q30', 'Q40'];
  const xTicks = ['1', '10', '20', '30', '40', '50'];

  const cutX = xOf(trimPos - 1);
  const trimmedBp = boxes.length - trimPos + 1;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        {yTicks.map((t) => {
          const v = Number(t.slice(1));
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={yOf(v)} y2={yOf(v)} stroke="#293548" strokeWidth="1" strokeDasharray="3 4" />
              <text x={pad.left - 7} y={yOf(v) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
            </g>
          );
        })}
        {xTicks.map((t) => (
          <text key={t} x={xOf(Number(t) - 1)} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{t}</text>
        ))}

        {/* 待切除區域 */}
        <rect
          x={cutX}
          y={pad.top}
          width={Math.max(0, W - pad.right - cutX)}
          height={innerH}
          fill="rgba(239,68,68,0.10)"
          stroke="rgba(239,68,68,0.45)"
          strokeWidth="1"
          strokeDasharray="4 3"
          rx="2"
        />
        <text x={cutX + 6} y={pad.top + 13} fontSize="10" fontWeight="bold" fill="#f87171">
          待切除
        </text>
        <line x1={cutX} x2={cutX} y1={pad.top} y2={pad.top + innerH} stroke="#ef4444" strokeWidth="1.5" />

        {boxes.map((b) => {
          const x = xOf(b.pos - 1) - barW / 2;
          const yBox = yOf(b.q3);
          const hBox = Math.max(1, yOf(b.q1) - yOf(b.q3));
          return (
            <g key={b.pos}>
              <line x1={xOf(b.pos - 1)} x2={xOf(b.pos - 1)} y1={yOf(b.min)} y2={yOf(b.max)} stroke="#64748b" strokeWidth="1" />
              <line x1={xOf(b.pos - 1) - 3} x2={xOf(b.pos - 1) + 3} y1={yOf(b.max)} y2={yOf(b.max)} stroke="#64748b" strokeWidth="1" />
              <line x1={xOf(b.pos - 1) - 3} x2={xOf(b.pos - 1) + 3} y1={yOf(b.min)} y2={yOf(b.min)} stroke="#64748b" strokeWidth="1" />
              <rect x={x} y={yBox} width={barW} height={hBox} rx="1" fill="rgba(234,179,8,0.22)" stroke="#eab308" strokeWidth="1" />
              <line x1={x} x2={x + barW} y1={yOf(b.med)} y2={yOf(b.med)} stroke="#eab308" strokeWidth="2" />
            </g>
          );
        })}
        <polyline points={boxes.map((b, i) => `${xOf(i)},${yOf(b.med)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2" />
        <polyline
          points={boxes.map((b, i) => `${xOf(i)},${yOf(b.mean)}`).join(' ')}
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      </svg>

      {/* 裁剪位置滑桿 */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[11px] font-bold shrink-0" style={{ color: '#94a3b8' }}>裁剪位置</span>
        <input
          type="range"
          min={2}
          max={50}
          step={1}
          value={trimPos}
          onChange={(e) => setTrimPos(Number(e.target.value))}
          className="trim-slider w-full h-2 appearance-none bg-[#0f1520] rounded-full cursor-pointer"
        />
        <span className="shrink-0 font-mono font-bold text-right" style={{ minWidth: '3.2rem', color: '#f87171' }}>
          {trimPos} bp
        </span>
      </div>
      <div className="mt-1.5 text-center text-[10px]" style={{ color: '#64748b' }}>
        裁剪點 {trimPos} bp 之後的 {trimmedBp} bp 為待切除區段（低品質尾端）
      </div>
    </div>
  );
};

/* ===== Sequence Duplication Levels：重複序列去重動畫（PCR Dedup） ===== */
const DUP_BASES = ['A', 'C', 'G', 'T', 'A', 'T', 'C', 'G', 'A', 'T', 'C', 'G', 'A'];
const DUP_BASE_COLOR: Record<string, string> = { A: '#22c55e', C: '#3b82f6', G: '#f59e0b', T: '#ef4444' };
const DUP_SCAN_MS = 2400;
const DUP_MERGE_MS = 2000;
const DUP_HOLD_MS = 1600;
const DUP_RESTORE_MS = 800;
const DUP_CYCLE = DUP_SCAN_MS + DUP_MERGE_MS + DUP_HOLD_MS + DUP_RESTORE_MS;

const DupDedupeChart: React.FC = () => {
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setT((prev) => (prev + dt >= DUP_CYCLE ? 0 : prev + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scanning = t < DUP_SCAN_MS;
  const mergeProg = Math.max(0, Math.min(1, (t - DUP_SCAN_MS) / DUP_MERGE_MS));
  const holding = t >= DUP_SCAN_MS + DUP_MERGE_MS && t < DUP_SCAN_MS + DUP_MERGE_MS + DUP_HOLD_MS;
  const restoreProg = Math.max(0, Math.min(1, (t - DUP_SCAN_MS - DUP_MERGE_MS - DUP_HOLD_MS) / DUP_RESTORE_MS));

  const m = scanning ? 0 : mergeProg * (1 - restoreProg);
  const beamX = Math.min(1, t / DUP_SCAN_MS) * 100;
  const count = Math.max(1, Math.ceil(4 - mergeProg * 3));
  const pulse = 1 + 0.025 * Math.sin(t / 200);

  let badgeText = '×4';
  let badgeColor = '#fbbf24';
  if (!scanning) {
    if (mergeProg < 1) {
      badgeText = `×${count}`;
      badgeColor = count > 2 ? '#f87171' : '#22c55e';
    } else if (holding) {
      badgeText = '×1 Unique';
      badgeColor = '#22c55e';
    } else {
      badgeText = '×4';
      badgeColor = '#fbbf24';
    }
  }

  const phaseLabel = scanning ? '掃描偵測中' : mergeProg < 1 ? '去重合併中' : holding ? '重複移除完成' : '重置';
  const detailText = scanning
    ? '雷射光束掃描 4 條完全相同的重複 Reads…'
    : mergeProg < 1
      ? '3 條重複序列淡出收縮，併入主序列'
      : holding
        ? 'PCR 重複 ×4 → 去除 3 個 → 保留 1 條 Unique'
        : '掃描下一批 Reads…';
  const statusColor = holding ? '#22c55e' : scanning ? '#60a5fa' : '#94a3b8';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: '#e2e8f0' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
          {phaseLabel}
        </span>
        <span className="font-mono text-[12px]" style={{ color: '#64748b' }}>
          Coverage <span className="font-bold" style={{ color: '#e2e8f0' }}>4</span> Reads
        </span>
      </div>

      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          height: 160,
          border: '1px solid #1b2a45',
          background:
            'radial-gradient(circle at 50% 30%, rgba(37,99,235,0.08) 0%, transparent 55%), radial-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(180deg, #0b1220 0%, #0f1520 100%)',
          backgroundSize: '100% 100%, 18px 18px, 100% 100%',
        }}
      >
        {scanning && (
          <>
            <div
              className="absolute inset-y-0"
              style={{
                left: `calc(${beamX}% - 1px)`,
                width: 2,
                zIndex: 12,
                background: 'linear-gradient(180deg, rgba(96,165,250,0), rgba(96,165,250,0.95) 20%, rgba(96,165,250,0.95) 80%, rgba(96,165,250,0))',
                boxShadow: '0 0 18px 3px rgba(96,165,250,0.5)',
              }}
            />
            <div
              className="absolute inset-y-0"
              style={{
                left: `calc(${beamX}% - 12px)`,
                width: 24,
                zIndex: 11,
                background: 'linear-gradient(90deg, rgba(96,165,250,0) 0%, rgba(96,165,250,0.2) 50%, rgba(96,165,250,0) 100%)',
              }}
            />
          </>
        )}

        <div className="absolute" style={{ left: '50%', top: '50%', width: 148, height: 64, transform: 'translate(-50%, -50%)' }}>
          {[1, 2, 3].map((i) => {
            const dx = i * 11;
            const dy = i * 9;
            return (
              <div
                key={i}
                className="absolute rounded-md border"
                style={{
                  width: 148,
                  height: 64,
                  left: 0,
                  top: 0,
                  zIndex: 10 - i,
                  opacity: 0.6 * (1 - m),
                  transform: `translate(${dx * (1 - m)}px, ${dy * (1 - m)}px) scale(${1 - 0.5 * m})`,
                  borderColor: 'rgba(59,130,246,0.45)',
                  background: 'linear-gradient(180deg, #101a2e 0%, #0d1526 100%)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                }}
              >
                <div className="flex items-center justify-between px-2.5 pt-1.5">
                  <span className="font-mono text-[9px]" style={{ color: '#64748b' }}>READ_0482</span>
                  <span className="rounded px-1 text-[8px] font-bold" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.12)' }}>dup</span>
                </div>
                <div className="flex items-center gap-[3px] px-2.5 mt-1.5">
                  {DUP_BASES.map((b, j) => (
                    <span key={j} style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: DUP_BASE_COLOR[b], opacity: 0.5 + 0.5 * (1 - m) }} />
                  ))}
                </div>
              </div>
            );
          })}

          <div
            className="absolute rounded-md border"
            style={{
              width: 148,
              height: 64,
              left: 0,
              top: 0,
              zIndex: 10,
              transform: `scale(${pulse})`,
              transformOrigin: 'center',
              borderColor: holding ? 'rgba(34,197,94,0.8)' : 'rgba(96,165,250,0.8)',
              background: 'linear-gradient(180deg, #14223b 0%, #101a2e 100%)',
              boxShadow: holding ? '0 0 20px rgba(34,197,94,0.35)' : '0 0 14px rgba(96,165,250,0.25)',
            }}
          >
            <div className="flex items-center justify-between px-2.5 pt-1.5">
              <span className="font-mono text-[9px]" style={{ color: '#94a3b8' }}>READ_0482</span>
              <span
                className="rounded px-1.5 py-px text-[9px] font-bold font-mono"
                style={{ color: badgeColor, background: `${badgeColor}1f`, border: `1px solid ${badgeColor}55` }}
              >
                {badgeText}
              </span>
            </div>
            <div className="flex items-center gap-[3px] px-2.5 mt-1.5">
              {DUP_BASES.map((b, j) => (
                <span key={j} style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: DUP_BASE_COLOR[b] }} />
              ))}
            </div>
            <div className="flex items-center justify-between px-2.5 mt-1">
              <span className="text-[8px] font-bold" style={{ color: holding ? '#22c55e' : '#64748b' }}>
                {holding ? '✔ Unique' : 'PCR Copy'}
              </span>
              <span className="font-mono text-[8px]" style={{ color: '#475569' }}>Q35.2</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px]" style={{ color: '#64748b' }}>{detailText}</span>
        <span className="font-mono text-[10px]" style={{ color: '#475569' }}>PCR duplicates</span>
      </div>
    </div>
  );
};

/* ===== Per Base Sequence Content：開頭掃描遮罩卡尺 (Scan Mask) ===== */
const BaseContentMaskChart: React.FC = () => {
  const series = useMemo(genBaseContent, []);
  const [maskOn, setMaskOn] = useState(false);
  const [maskLen, setMaskLen] = useState(10);
  const [sweepProg, setSweepProg] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!maskOn || maskLen === 0) {
      setSweepProg(0);
      setLocked(false);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const DUR = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      setSweepProg(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setLocked(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [maskOn, maskLen]);

  const W = 560;
  const H = 230;
  const pad = { top: 14, right: 18, bottom: 26, left: 42 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const n = 50;
  const yMax = 50;
  const xOf = (i: number) => pad.left + (i / (n - 1)) * innerW;
  const yOf = (v: number) => pad.top + (1 - v / yMax) * innerH;
  const clamp = (v: number) => Math.max(0, Math.min(yMax, v));
  const yTicks = ['0%', '10%', '20%', '30%', '40%', '50%'];
  const xTicks = ['1', '10', '20', '30', '40', '50'];

  const maskX1 = pad.left;
  const maskEndIdx = maskLen > 0 ? maskLen - 1 : 0;
  const maskX2 = xOf(maskEndIdx);
  const maskW = maskX2 - maskX1;
  const sweepEdgeX = maskX1 + maskW * sweepProg;

  let waveD = '';
  if (maskW > 0) {
    const step = maskW / maskLen;
    waveD = `M ${maskX1} ${pad.top}`;
    for (let k = 0; k < maskLen; k++) {
      waveD += ` a ${step / 2} ${step / 2} 0 0 1 ${step} 0`;
    }
  }

  const masked = maskOn && maskLen > 0;

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-2">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={maskOn}
            onChange={(e) => setMaskOn(e.target.checked)}
            className="appearance-none w-4 h-4 rounded border cursor-pointer"
            style={{ backgroundColor: maskOn ? '#2dd4bf' : '#0f172a', borderColor: maskOn ? '#2dd4bf' : '#334155' }}
          />
          <span className="text-[11px] font-bold" style={{ color: maskOn ? '#2dd4bf' : '#94a3b8' }}>開頭標記範圍</span>
        </label>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[11px] font-bold shrink-0" style={{ color: '#94a3b8' }}>bp 遮罩範圍</span>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={maskLen}
            onChange={(e) => setMaskLen(Number(e.target.value))}
            className="mask-slider w-full h-2 appearance-none bg-[#0f1520] rounded-full cursor-pointer"
          />
          <span className="shrink-0 font-mono font-bold text-right" style={{ minWidth: '3.4rem', color: '#2dd4bf' }}>{maskLen} bp</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        {yTicks.map((t, i) => {
          const v = (i / (yTicks.length - 1)) * yMax;
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={yOf(v)} y2={yOf(v)} stroke="#293548" strokeWidth="1" strokeDasharray="3 4" />
              <text x={pad.left - 7} y={yOf(v) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
            </g>
          );
        })}
        {xTicks.map((t, i) => (
          <text key={t + i} x={pad.left + (i / (xTicks.length - 1)) * innerW} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{t}</text>
        ))}

        {series.map((s) => (
          <polyline
            key={s.name}
            points={s.values.map((v, i) => `${xOf(i)},${yOf(clamp(v))}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        ))}

        {/* 掃描遮罩卡尺（擴展覆蓋中） */}
        {masked && sweepProg > 0 && sweepProg < 1 && (
          <g>
            <rect x={maskX1} y={pad.top} width={Math.max(0, sweepEdgeX - maskX1)} height={innerH} fill="rgba(45,212,191,0.16)" />
            <line
              x1={sweepEdgeX}
              x2={sweepEdgeX}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="#2dd4bf"
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 0 6px rgba(45,212,191,0.9))' }}
            />
          </g>
        )}

        {/* 鎖定框 + [Masked] 註記 */}
        {locked && masked && (
          <g>
            <rect x={maskX1} y={pad.top} width={maskW} height={innerH} fill="rgba(6,18,34,0.35)" />
            <path d={waveD} fill="none" stroke="#2dd4bf" strokeWidth="1.5" />
            <line x1={maskX1} x2={maskX1} y1={pad.top} y2={pad.top + innerH} stroke="#2dd4bf" strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />
            <line x1={maskX2} x2={maskX2} y1={pad.top} y2={pad.top + innerH} stroke="#2dd4bf" strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />
            <text x={maskX2 - 5} y={pad.top + 13} textAnchor="end" fontSize="10" fontWeight="bold" fill="#2dd4bf" className="mask-annotation">
              [Masked: 1–{maskLen}bp]
            </text>
          </g>
        )}
      </svg>

      {masked && (
        <div className="mt-2 text-[10px]" style={{ color: '#5eead4' }}>
          <span className="inline-block w-3 h-3 rounded-sm mr-1.5 align-middle border" style={{ borderColor: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.15)' }} />
          開頭 1–{maskLen}bp 已標記（Masked）→ downstream 分析時將自動被忽略
        </div>
      )}
    </div>
  );
};

/* ===== Adapter Content：比對敏感度標記動畫 ===== */
const AdapterTagChart: React.FC<{ adapters: ChartSeries[] }> = ({ adapters }) => {
  const [sensitivity, setSensitivity] = useState(0);
  const tagProg = sensitivity / 100;
  const tagged = adapters.find((s) => s.name === 'Illumina Universal Adapter');

  const W = 560;
  const H = 230;
  const pad = { top: 14, right: 18, bottom: 26, left: 42 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const yMax = 15;
  const n = 50;
  const xOf = (i: number) => pad.left + (i / (n - 1)) * innerW;
  const yOf = (v: number) => pad.top + (1 - v / yMax) * innerH;
  const clamp = (v: number) => Math.max(0, Math.min(yMax, v));
  const yTicks = ['0%', '5%', '10%', '15%'];
  const xTicks = ['1', '10', '20', '30', '40', '50'];

  const TAG_START = 35;
  let hatchD = '';
  if (tagged) {
    hatchD = `M ${xOf(TAG_START)} ${pad.top}`;
    for (let i = TAG_START; i < n; i++) {
      hatchD += ` L ${xOf(i)} ${yOf(clamp(tagged.values[i]))}`;
    }
    hatchD += ` L ${xOf(n - 1)} ${pad.top} Z`;
  }
  const showTaggedLabel = tagProg > 0.3;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[11px] font-bold shrink-0" style={{ color: '#94a3b8' }}>比對敏感度</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={sensitivity}
          onChange={(e) => setSensitivity(Number(e.target.value))}
          className="adapter-slider w-full h-2 appearance-none bg-[#0f1520] rounded-full cursor-pointer"
        />
        <span className="shrink-0 font-mono font-bold text-right" style={{ minWidth: '3rem', color: tagProg > 0 ? '#fbbf24' : '#94a3b8' }}>
          {sensitivity}%
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        {yTicks.map((t, i) => {
          const v = (i / (yTicks.length - 1)) * yMax;
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={yOf(v)} y2={yOf(v)} stroke="#293548" strokeWidth="1" strokeDasharray="3 4" />
              <text x={pad.left - 7} y={yOf(v) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
            </g>
          );
        })}
        {xTicks.map((t, i) => (
          <text key={t + i} x={pad.left + (i / (xTicks.length - 1)) * innerW} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{t}</text>
        ))}
        <text x={pad.left + innerW / 2} y={H - 1} textAnchor="middle" fontSize="10" fill="#475569">Position (bp)</text>

        {/* 警示標記網格 (Hatching)：覆蓋 >35 bp 上升段 */}
        {tagProg > 0 && (
          <g style={{ transition: 'opacity 0.25s ease' }} opacity={0.55 * tagProg}>
            <path d={hatchD} fill="url(#adapter-hatch)" />
            <path d={hatchD} fill="rgba(234,179,8,0.12)" />
          </g>
        )}

        {/* 被標記的紅色 Adapter 線段 → 虛線 + 暗色半透明 */}
        {adapters.map((s) => {
          const isTagged = tagProg > 0 && s.name === 'Illumina Universal Adapter';
          return (
            <polyline
              key={s.name}
              points={s.values.map((v, i) => `${xOf(i)},${yOf(clamp(v))}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={isTagged ? 1.5 : 2}
              strokeDasharray={isTagged ? '5 4' : undefined}
              opacity={isTagged ? 1 - 0.6 * tagProg : 1}
              strokeLinejoin="round"
              style={{ transition: 'opacity 0.2s ease' }}
            />
          );
        })}

        {/* [Tagged: Adapter] 標籤 */}
        {showTaggedLabel && (
          <g className="mask-annotation">
            <text x={xOf(n - 1) - 6} y={pad.top + 13} textAnchor="end" fontSize="10" fontWeight="bold" fill="#fbbf24">
              [Tagged: Adapter]
            </text>
            <text x={xOf(n - 1) - 6} y={pad.top + 26} textAnchor="end" fontSize="9" fill="#f87171">
              {'>'}35 bp 區段
            </text>
          </g>
        )}

        <defs>
          <pattern id="adapter-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(239,68,68,0.55)" strokeWidth="1.6" />
          </pattern>
        </defs>
      </svg>

      <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: tagProg > 0 ? '#f87171' : '#64748b' }}>
        <span>
          {tagProg > 0
            ? '已標記 1 種 Adapter（>35 bp 上升段）→ 去除後避免錯誤比對'
            : '敏感度 0% · 所有 Adapter 曲線正常保留'}
        </span>
        <span className="font-mono" style={{ color: '#475569' }}>
          {tagProg > 0 ? 'Tagged 1 · Safe 3' : 'Safe 4'}
        </span>
      </div>
    </div>
  );
};

/* ===== 各 Tab 內容面板 ===== */

// Tab 1：核心 QC（2x2 網格）
const CoreQCTab: React.FC = () => {
  const adapters = useMemo(genAdapterSeries, []);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard
        title="Per Base Sequence Quality"
        subtitle="拖曳進度條設定裁剪位置"
        status="pass"
        badgeText="Phred Q"
        info={<InfoHint text="拖曳進度條設定裁剪位置，位於裁剪點右側的後續片段將被切除。" />}
        legend={
          <>
            <LegendItem color="#3b82f6" label="Median 中位數" />
            <LegendItem color="#ef4444" label="Mean 平均" />
            <LegendItem color="#eab308" label="Q1–Q3 四分位距" />
            <LegendItem color="#f87171" label="待切除" />
          </>
        }
      >
        <QualityTrimChart />
      </ChartCard>

      <ChartCard
        title="Adapter Content"
        subtitle="Adapter 含量（定序尾端累積）"
        status="pass"
        badgeText="% of reads"
        info={<InfoHint text="檢測 DNA 尾端是否殘留建庫用的人工接頭（Adapter）。標記並去除接頭可避免後續比對到錯誤的基因組位置。" />}
        legend={adapters.map((a) => <LegendItem key={a.name} color={a.color} label={a.name} />)}
      >
        <AdapterTagChart adapters={adapters} />
      </ChartCard>

      <ChartCard
        title="Per Sequence GC Content"
        subtitle="GC 過濾閾值調整"
        status="pass"
        badgeText="GC %"
        info={<InfoHint text="過濾掉整體 GC 含量比例過高或過低的 Reads。" />}
        legend={
          <>
            <LegendItem color="#22c55e" label="通過（保留）" />
            <LegendItem color="#fb923c" label="被過濾（掉落）" />
          </>
        }
      >
        <GcFilterChart />
      </ChartCard>

      <ChartCard
        title="Sequence Duplication Levels"
        subtitle="PCR 重複序列比例檢測"
        status="warn"
        badgeText="Duplicate Reads"
        info={<InfoHint text="移除完全一模一樣的重複序列，減少 PCR 擴增誤差。" />}
        legend={
          <>
            <LegendItem color="#60a5fa" label="掃描光束" />
            <LegendItem color="#94a3b8" label="重複 Reads ×4" />
            <LegendItem color="#22c55e" label="保留 Unique ×1" />
          </>
        }
      >
        <DupDedupeChart />
      </ChartCard>
    </div>
  );
};

// Tab 2：序列特性
const TraitsTab: React.FC = () => {
  const bases = useMemo(genBaseContent, []);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard
        className="lg:col-span-2"
        title="Sequence Length Distribution"
        subtitle="序列長度分布"
        status="pass"
        badgeText="bp"
        info={<InfoHint text="排除因先前修剪接頭/尾端而「過短」的 reads，以確保留下來的 Reads 都有足夠長度能精準比對。" />}
        legend={<LegendItem color="#3b82f6" label="Reads（%）" />}
      >
        <BarChart bars={LENGTH_BARS} yMax={100} />
      </ChartCard>

      <ChartCard
        title="Per Base N Content"
        subtitle="N 鹼基雷射過濾"
        status="pass"
        badgeText="N %"
        info={<InfoHint text="去除未知鹼基 (N) 含量比例過高的 Reads。" />}
        legend={
          <>
            <LegendItem color="#9ca3af" label="N 鹼基" />
            <LegendItem color="#3b82f6" label="掃描雷射" />
            <LegendItem color="#ff4d4d" label="N 被過濾（溶解）" />
          </>
        }
      >
        <NBaseFilterChart />
      </ChartCard>

      <ChartCard
        title="Per Base Sequence Content"
        subtitle="逐鹼基四鹼基組成（A/T/C/G）"
        status="warn"
        badgeText="ATCG"
        info={<InfoHint text="檢查數據中 A、T、C、G 四種鹼基在每位置的分布是否均勻。若前段波動較大，通常為基因建庫化學反應限制或殘留特異性接頭。" />}
        legend={bases.map((b) => <LegendItem key={b.name} color={b.color} label={`${b.name} 鹼基`} />)}
      >
        <BaseContentMaskChart />
      </ChartCard>
    </div>
  );
};

// Tab 3：定序與高頻
const MachineTab: React.FC = () => (
  <div className="flex flex-col gap-4">
    <ChartCard
      title="Per Tile Sequence Quality"
      subtitle="逐 Tile × 位置之定序品質熱圖"
      status="pass"
      badgeText="Heatmap"
      info={<InfoHint text="檢測定序晶片上各個物理區域（Tile）的品質。若僅有特定區域出現異常（熱圖顯現偏紅/藍），通常為晶片局部瑕疵、氣泡或流道堵塞導致。" />}
      legend={
        <>
          <LegendItem color="#22c55e" label="Q ≥ 30" />
          <LegendItem color="#eab308" label="Q 20–30" />
          <LegendItem color="#ef4444" label="Q < 20" />
          <LegendItem color="#f87171" label="警戒外框" />
        </>
      }
    >
      <PerTileHeatmap />
    </ChartCard>

    <ChartCard
      title="Overrepresented Sequences"
      subtitle="過度呈現之序列（前 5 筆）"
      status="fail"
      badgeText="Table"
      info={<InfoHint text="檢查數據中是否有出現頻率異常高（> 0.1%）的特定片段。常見原因包含殘留的 Adapter、引物，或生物樣本本身高度表達的 RNA（如 rRNA）。" />}
    >
      <OverrepTable />
    </ChartCard>
  </div>
);

/* ===== Tab 頁籤按鈕 ===== */
const TabButton: React.FC<{ active: boolean; label: string; en: string; onClick: () => void }> = ({
  active,
  label,
  en,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="px-4 py-2.5 rounded-t-lg text-[13px] font-medium transition-all border-b-2 -mb-px"
    style={{
      color: active ? '#3b82f6' : '#94a3b8',
      borderBottomColor: active ? '#3b82f6' : 'transparent',
      backgroundColor: active ? 'rgba(59,130,246,0.08)' : 'transparent',
    }}
  >
    <span className="block leading-tight">{label}</span>
    <span className="block text-[10px] font-normal" style={{ color: active ? '#3b82f6' : '#64748b' }}>{en}</span>
  </button>
);

/* ===== 主元件 ===== */
export const TrimmingVisualization: React.FC<TrimmingVisualizationProps> = () => {
  const [activeTab, setActiveTab] = useState<TabId>('core');
  const [showIntro, setShowIntro] = useState(true);
  const [showTips, setShowTips] = useState(true);

  return (
    <div className="flex flex-col gap-4 min-h-[600px]">
      {/* 頁面標題 */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold" style={{ color: '#e8eef5' }}>修剪與過濾</h2>
        </div>
      </header>

      {/* 步驟解說框：檢測目的 + 輸出結果 */}
      {showIntro && (
        <div className="intro-dialog shrink-0 rounded-2xl border p-4 animate-fade-up" style={{ backgroundColor: '#1e293b', borderColor: '#22c55e' }}>
          <div className="flex items-start gap-3">
            <div className="dialog-body flex-1">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1.5 text-[15px] font-bold tracking-wide transition-colors"
                  style={{ color: '#22c55e' }}
                  onClick={() => setShowTips((v) => !v)}
                >
                  <span className="dialog-chevron inline-block transition-transform" style={{ transform: showTips ? 'rotate(90deg)' : 'none' }}>▸</span>
                  🧪 步驟解說 · 修剪與過濾
                </button>
                <button
                  className="dialog-close flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold transition-colors shrink-0"
                  style={{ color: '#94a3b8', backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: '1px' }}
                  onClick={() => setShowIntro(false)}
                  aria-label="關閉解說"
                >
                  ✕
                </button>
              </div>
              {showTips && (
                <div className="dialog-tips mt-2.5 pt-2.5 border-t overflow-y-auto pr-1" style={{ borderColor: '#334155', maxHeight: '170px' }}>
                  <ul className="text-[12px] leading-[1.8] flex flex-col gap-2" style={{ color: '#c6d3e3' }}>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded text-[9px] font-black flex items-center justify-center" style={{ backgroundColor: '#22c55e', color: '#06222b' }}>1</span>
                      <span><strong style={{ color: '#e8eef5' }}>檢測目的：</strong>標記檢測項目中未通過預設標準的鹼基</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded text-[9px] font-black flex items-center justify-center" style={{ backgroundColor: '#fb923c', color: '#0f1520' }}>2</span>
                      <span><strong style={{ color: '#e8eef5' }}>輸出結果：</strong>設定各個檢測項目的參數後，將一步過濾掉不符合標準的鹼基</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 主內容區：Tab 導覽 + 面板 */}
      <div className="flex-1 min-w-0">
        <nav className="flex border-b" style={{ borderColor: '#334155' }}>
          {TABS.map((t) => (
            <TabButton
              key={t.id}
              active={activeTab === t.id}
              label={t.label}
              en={t.en}
              onClick={() => setActiveTab(t.id)}
            />
          ))}
        </nav>

        <div key={activeTab} className="pt-4 animate-fade-in">
          {activeTab === 'core' && <CoreQCTab />}
          {activeTab === 'traits' && <TraitsTab />}
          {activeTab === 'machine' && <MachineTab />}
        </div>
      </div>
    </div>
  );
};
