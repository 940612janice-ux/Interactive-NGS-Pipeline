import React, { useMemo, useState } from 'react';

interface FastQCVisualizationProps {
  onComplete?: () => void;
}

type Status = 'pass' | 'warn' | 'fail';
type TabId = 'core' | 'traits' | 'machine' | 'overview';

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

// Per-Base Quality Score：50 個位置的盒狀圖資料（min / Q1 / 中位數 / Q3 / max / mean）
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

// Per Sequence GC Content：理論分布（高斯）與實際分布兩條曲線
function genGcSeries(): ChartSeries[] {
  const rnd = mulberry32(13);
  const bins = 101;
  const mean = 48;
  const sd = 6;
  const gaussian = (x: number) => Math.exp(-((x - mean) ** 2) / (2 * sd * sd));
  const theoretical = Array.from({ length: bins }, (_, i) => Math.round(gaussian(i) * 15 * 100) / 100);
  const observed = Array.from({ length: bins }, (_, i) => {
    const noise = 1 + (rnd() - 0.5) * 0.12;
    return Math.round(gaussian(i) * 15 * noise * 100) / 100;
  });
  return [
    { name: 'Theoretical Distribution', color: '#3b82f6', values: theoretical, dashed: true },
    { name: 'Observed Distribution', color: '#ef4444', values: observed, area: true, areaFill: '#ef4444' },
  ];
}

// 逐鹼基 N 含量：50 個位置，開頭與結尾略高
function genNContent(): number[] {
  const rnd = mulberry32(21);
  return Array.from({ length: 50 }, (_, p) => {
    const edge = p < 3 ? (3 - p) * 0.12 : p > 46 ? (p - 46) * 0.15 : 0;
    const noise = (rnd() - 0.5) * 0.03;
    return Math.max(0, Math.round((0.02 + edge + noise) * 1000) / 1000);
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

// Sequence Duplication Levels：長條圖資料
const DUPLICATION_LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '50', '100', '500', '1k', '5k', '10k', '>10k'];
const DUPLICATION_PERCENT = [64.2, 17.5, 7.8, 3.6, 2.1, 1.4, 1.0, 0.7, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05];
const DUP_BARS: BarItem[] = DUPLICATION_LEVELS.map((label, i) => ({
  label,
  value: DUPLICATION_PERCENT[i],
  color: i < 5 ? '#22c55e' : i < 10 ? '#eab308' : '#ef4444',
}));

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

// FastQC 10 項模組狀態清單
interface ModuleStatus {
  name: string;
  en: string;
  status: Status;
}

const MODULES: ModuleStatus[] = [
  { name: 'Adapter Content', en: 'Adapter 含量', status: 'pass' },
  { name: 'Per Base Sequence Quality', en: '鹼基定序品質', status: 'pass' },
  { name: 'Per Tile Sequence Quality', en: ' Tile 定序品質', status: 'pass' },
  { name: 'Per Sequence Quality Scores', en: '序列品質分數', status: 'pass' },
  { name: 'Per Base Sequence Content', en: '鹼基序列組成', status: 'warn' },
  { name: 'Per Sequence GC Content', en: '序列 GC 含量', status: 'pass' },
  { name: 'Per Base N Content', en: '鹼基 N 含量', status: 'pass' },
  { name: 'Sequence Length Distribution', en: '序列長度分布', status: 'pass' },
  { name: 'Sequence Duplication Levels', en: '序列重複程度', status: 'warn' },
  { name: 'Overrepresented Sequences', en: '過度呈現序列', status: 'fail' },
];

// KPI 卡片資料
const KPI_ITEMS = [
  { label: 'Total Reads', value: '24,504,828', change: '▼ 2.1%', good: false },
  { label: 'Avg Quality', value: '32.2', change: '▲ +1.8', good: true },
  { label: 'Adapter %', value: '2.2%', change: '▼ 8.5% → 2.2%', good: true },
];

// Tab 頁籤設定
const TABS: { id: TabId; label: string; en: string }[] = [
  { id: 'core', label: '核心 QC', en: 'Core QC' },
  { id: 'traits', label: '序列特性', en: 'Sequence Traits' },
  { id: 'machine', label: '定序與高頻', en: 'Machine & Sequences' },
  { id: 'overview', label: '數據概覽', en: 'Overview' },
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
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, status, badgeText, legend, className, children }) => {
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

/* ===== 通用 SVG 折線圖 ===== */
interface LineChartProps {
  series: ChartSeries[];
  yMax: number;
  yMin?: number;
  xTicks?: string[];
  yTicks?: string[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

const LineChart: React.FC<LineChartProps> = ({ series, yMax, yMin = 0, xTicks, yTicks, xLabel, yLabel, height = 230 }) => {
  const W = 560;
  const H = height;
  const pad = { top: 14, right: 18, bottom: 26, left: 42 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const xOf = (i: number, n: number) => pad.left + (i / (n - 1)) * innerW;
  const yOf = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const clamp = (v: number) => Math.max(yMin, Math.min(yMax, v));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
      {yTicks?.map((t, i) => {
        const v = yMin + (i / (yTicks.length - 1)) * (yMax - yMin);
        return (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={yOf(v)} y2={yOf(v)} stroke="#293548" strokeWidth="1" strokeDasharray="3 4" />
            <text x={pad.left - 7} y={yOf(v) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
          </g>
        );
      })}
      {xTicks?.map((t, i) => (
        <text key={t + i} x={pad.left + (i / (xTicks.length - 1)) * innerW} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{t}</text>
      ))}
      {xLabel && (
        <text x={pad.left + innerW / 2} y={H - 1} textAnchor="middle" fontSize="10" fill="#475569">{xLabel}</text>
      )}
      {yLabel && (
        <text x={13} y={pad.top + innerH / 2} textAnchor="middle" fontSize="10" fill="#475569" transform={`rotate(-90 13 ${pad.top + innerH / 2})`}>{yLabel}</text>
      )}
      {series.map((s) => {
        const n = s.values.length;
        const pts = s.values.map((v, i) => `${xOf(i, n)},${yOf(clamp(v))}`).join(' ');
        const path = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i, n)} ${yOf(clamp(v))}`).join(' ');
        return (
          <g key={s.name}>
            {s.area && (
              <path
                d={`${path} L${xOf(n - 1, n)} ${pad.top + innerH} L${pad.left} ${pad.top + innerH} Z`}
                fill={s.areaFill || s.color}
                opacity="0.12"
              />
            )}
            <polyline
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeDasharray={s.dashed ? '5 4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
};

/* ===== Per-Base Quality：盒狀圖（Median 藍線 / Mean 紅線 / Q1–Q3 黃框） ===== */
const PerBaseQualityChart: React.FC = () => {
  const boxes = useMemo(genQualityBoxes, []);
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

  return (
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
      <text x={pad.left - 15} y={H - 8} textAnchor="end" fontSize="9" fill="#64748b">(5')</text>
      <text x={W - pad.right + 10} y={H - 8} textAnchor="start" fontSize="9" fill="#64748b">(3')</text>
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
  );
};

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

/* ===== Per Tile Sequence Quality：熱圖 ===== */
const PerTileHeatmap: React.FC = () => {
  const grid = useMemo(genTileQuality, []);
  const rows = grid.length;
  const cols = grid[0].length;

  return (
    <div className="w-full flex gap-3">
      <div className="grid gap-[2px] text-[9px] text-right pr-1" style={{ gridTemplateRows: `repeat(${rows}, 10px)`, color: '#64748b' }}>
        {Array.from({ length: rows }, (_, r) => (
          <span key={r} className="flex items-center justify-end leading-none">{r + 1}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0 max-w-[620px]">
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {grid.map((row, r) =>
            row.map((q, c) => (
              <div
                key={`${r}-${c}`}
                className="rounded-[1px]"
                style={{ backgroundColor: tileColor(q), height: 10 }}
                title={`Tile ${r + 1} · Position ${c + 1} · Q${q.toFixed(0)}`}
              />
            ))
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
  );
};

/* ===== Overrepresented Sequences：表格 ===== */
const OverrepTable: React.FC = () => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-left text-[12px] border-collapse min-w-[560px]">
      <thead>
        <tr className="border-b" style={{ borderColor: '#334155' }}>
          {['Sequence', 'Count', 'Percentage', 'Possible Source'].map((h) => (
            <th key={h} className="py-2 pr-4 text-[10px] font-bold tracking-wider" style={{ color: '#64748b' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {OVERREP_ROWS.map((row, i) => (
          <tr key={i} className="border-b" style={{ borderColor: '#1e293b' }}>
            <td className="py-2.5 pr-4 font-mono text-[11px] truncate max-w-[260px]" style={{ color: '#e8eef5' }}>{row.seq}</td>
            <td className="py-2.5 pr-4 font-mono" style={{ color: '#94a3b8' }}>{row.count}</td>
            <td className="py-2.5 pr-4 font-mono font-bold" style={{ color: row.color }}>{row.pct}%</td>
            <td className="py-2.5 pr-4 text-[11px]" style={{ color: '#94a3b8' }}>{row.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ===== 各 Tab 內容面板 ===== */

// Tab 1：核心 QC（2x2 網格）
const CoreQCTab: React.FC = () => {
  const adapters = useMemo(genAdapterSeries, []);
  const gc = useMemo(genGcSeries, []);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard
        title="Per Base Sequence Quality"
        subtitle="逐鹼基定序品質"
        status="pass"
        badgeText="Phred Q"
        legend={
          <>
            <LegendItem color="#3b82f6" label="Median 中位數" />
            <LegendItem color="#ef4444" label="Mean 平均" />
            <LegendItem color="#eab308" label="Q1–Q3 四分位距" />
          </>
        }
      >
        <PerBaseQualityChart />
      </ChartCard>

      <ChartCard
        title="Adapter Content"
        subtitle="Adapter 含量（定序尾端累積）"
        status="pass"
        badgeText="% of reads"
        legend={adapters.map((a) => <LegendItem key={a.name} color={a.color} label={a.name} />)}
      >
        <LineChart
          series={adapters}
          yMax={15}
          yTicks={['0%', '5%', '10%', '15%']}
          xTicks={['1', '10', '20', '30', '40', '50']}
          xLabel="Position (bp)"
          yLabel="Adapter %"
        />
      </ChartCard>

      <ChartCard
        title="Per Sequence GC Content"
        subtitle="逐序列 GC 含量分布"
        status="pass"
        badgeText="GC %"
        legend={
          <>
            <LegendItem color="#3b82f6" label="理論分布" />
            <LegendItem color="#ef4444" label="實際分布" />
          </>
        }
      >
        <LineChart
          series={gc}
          yMax={18}
          yTicks={['0', '5', '10', '15']}
          xTicks={['0', '20', '40', '60', '80', '100']}
          xLabel="GC content (%)"
          yLabel="Reads %"
        />
      </ChartCard>

      <ChartCard
        title="Sequence Duplication Levels"
        subtitle="序列重複程度分布"
        status="warn"
        badgeText="% of library"
        legend={
          <>
            <LegendItem color="#22c55e" label="低重複" />
            <LegendItem color="#eab308" label="中度重複" />
            <LegendItem color="#ef4444" label="高重複" />
          </>
        }
      >
        <BarChart bars={DUP_BARS} yMax={70} />
      </ChartCard>
    </div>
  );
};

/* ===== Per Sequence Quality Score：平均品質分布 ===== */
const FQ_Q_MIN = 2;
const FQ_Q_MAX = 41;
const FQ_MEAN = 35.0;
const FQ_SD = 2.2;

function genPerSeqQuality(): number[] {
  const rnd = mulberry32(2026);
  return Array.from({ length: FQ_Q_MAX - FQ_Q_MIN + 1 }, (_, i) => {
    const q = FQ_Q_MIN + i;
    const g = Math.exp(-((q - FQ_MEAN) ** 2) / (2 * FQ_SD * FQ_SD));
    const noise = 1 + (rnd() - 0.5) * 0.06;
    return Math.round(g * 240000 * noise);
  });
}

const PerSeqQualityChart: React.FC = () => {
  const observed = useMemo(genPerSeqQuality, []);
  const W = 560;
  const H = 230;
  const pad = { top: 14, right: 18, bottom: 26, left: 48 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const bins = observed.length;
  const yMax = 250000;
  const xOf = (q: number) => pad.left + ((q - FQ_Q_MIN) / (bins - 1)) * innerW;
  const yOf = (v: number) => pad.top + (1 - v / yMax) * innerH;
  const barW = (innerW / bins) * 0.8;
  const yTicks = ['0', '50k', '100k', '150k', '200k', '250k'];
  const xTicks = ['2', '10', '20', '30', '40'];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        {yTicks.map((t) => {
          const v = Number(t.replace('k', '')) * (t.includes('k') ? 1000 : 1);
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={yOf(v)} y2={yOf(v)} stroke="#293548" strokeWidth="1" strokeDasharray="3 4" />
              <text x={pad.left - 7} y={yOf(v) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
            </g>
          );
        })}
        {xTicks.map((t) => (
          <text key={t} x={xOf(Number(t))} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{t}</text>
        ))}

        {observed.map((v, i) => {
          const q = FQ_Q_MIN + i;
          const x = xOf(q) - barW / 2;
          const h = Math.max(0, yOf(0) - yOf(v));
          return (
            <rect
              key={q}
              x={x}
              y={yOf(v)}
              width={barW}
              height={h}
              fill="rgba(59,130,246,0.32)"
              stroke="rgba(59,130,246,0.55)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: '#64748b' }}>
        <span>Mean Quality <b style={{ color: '#e8eef5' }}>{FQ_MEAN.toFixed(1)}</b></span>
        <span>SD <b style={{ color: '#e8eef5' }}>{FQ_SD.toFixed(1)}</b></span>
        <span>Reads {'<'} Q20: <b style={{ color: '#22c55e' }}>&lt;1%</b></span>
      </div>
    </div>
  );
};

// Tab 2：序列特性
const TraitsTab: React.FC = () => {
  const bases = useMemo(genBaseContent, []);
  const nContent = useMemo(genNContent, []);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard
        className="lg:col-span-2"
        title="Sequence Length Distribution"
        subtitle="序列長度分布"
        status="pass"
        badgeText="bp"
        legend={<LegendItem color="#3b82f6" label="Reads（%）" />}
      >
        <BarChart bars={LENGTH_BARS} yMax={100} />
      </ChartCard>

      <ChartCard
        className="lg:col-span-2"
        title="Per Sequence Quality Score"
        subtitle="每條 Read 平均品質分數分布"
        badgeText="Phred Q"
        legend={<LegendItem color="#3b82f6" label="Observed 實際分布" />}
      >
        <PerSeqQualityChart />
      </ChartCard>

      <ChartCard
        title="Per Base N Content"
        subtitle="逐鹼基 N 含量"
        status="pass"
        badgeText="N %"
        legend={<LegendItem color="#22c55e" label="N 含量（%）" />}
      >
        <LineChart
          series={[{ name: 'N Content', color: '#22c55e', values: nContent }]}
          yMax={0.6}
          yTicks={['0%', '0.2%', '0.4%', '0.6%']}
          xTicks={['1', '10', '20', '30', '40', '50']}
          xLabel="Position (bp)"
        />
      </ChartCard>

      <ChartCard
        title="Per Base Sequence Content"
        subtitle="逐鹼基四鹼基組成（A/T/C/G）"
        status="warn"
        badgeText="ATCG"
        legend={bases.map((b) => <LegendItem key={b.name} color={b.color} label={`${b.name} 鹼基`} />)}
      >
        <LineChart
          series={bases}
          yMax={50}
          yTicks={['0%', '10%', '20%', '30%', '40%', '50%']}
          xTicks={['1', '10', '20', '30', '40', '50']}
          xLabel="Position (bp)"
          yLabel="Base %"
        />
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
      legend={
        <>
          <LegendItem color="#22c55e" label="Q ≥ 30" />
          <LegendItem color="#eab308" label="Q 20–30" />
          <LegendItem color="#ef4444" label="Q < 20" />
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
    >
      <OverrepTable />
    </ChartCard>
  </div>
);

// Tab 4：數據概覽（10 項狀態清單 + KPI 卡片）
const OverviewTab: React.FC = () => (
  <div className="flex flex-col gap-4">
    <div className="rounded-2xl border p-4" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold" style={{ color: '#e8eef5' }}>FastQC 10 項模組狀態</h3>
        <span className="text-[11px]" style={{ color: '#64748b' }}>Basic Statistics 已包含在內</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {MODULES.map((m) => (
          <div
            key={m.name}
            className="flex items-center justify-between gap-2 p-2.5 rounded-lg"
            style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: '1px' }}
          >
            <div className="min-w-0">
              <div className="text-[12px] font-bold truncate" style={{ color: '#e8eef5' }}>{m.name}</div>
              <div className="text-[10px]" style={{ color: '#64748b' }}>{m.en}</div>
            </div>
            <StatusBadge status={m.status} />
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {KPI_ITEMS.map((k) => (
        <div key={k.label} className="rounded-2xl border p-4" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
          <div className="text-[11px]" style={{ color: '#9fb0c3' }}>{k.label}</div>
          <div className="text-[24px] font-bold font-mono mt-1" style={{ color: '#e8eef5' }}>{k.value}</div>
          <div className="text-[11px] font-bold mt-1" style={{ color: k.good ? '#22c55e' : '#ef4444' }}>{k.change}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ===== 右側檔案資訊 + 整體狀態 Summary ===== */
const FileIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-10 h-10 shrink-0" fill="none" aria-hidden="true">
    <path d="M6 2h9l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.2" />
    <path d="M15 2v5h5" stroke="#3b82f6" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

const SummaryRow: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <div
    className="flex items-center justify-between p-2.5 rounded-lg"
    style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: '1px' }}
  >
    <span className="flex items-center gap-2 text-[12px] font-bold" style={{ color }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      {label}
    </span>
    <span className="text-[14px] font-bold font-mono" style={{ color: '#e8eef5' }}>{count}</span>
  </div>
);

const FileInfoPanel: React.FC = () => {
  const summary = { pass: 7, warn: 2, fail: 1 };
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-4 sticky top-0 self-start">
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
        <div className="flex items-center gap-3 px-4 pt-4">
          <FileIcon />
          <div className="min-w-0">
            <div className="text-[14px] font-bold truncate" style={{ color: '#e8eef5' }}>sample_R1.fastq</div>
            <div className="text-[11px]" style={{ color: '#9fb0c3' }}>Raw FASTQ · gzip</div>
          </div>
        </div>
        {/* Basic Statistics 表格：Measure / Value 兩欄，仿照 FastQC 既有格式 */}
        <div className="mt-3">
          <div className="flex items-center justify-between px-4 pb-2">
            <h4 className="text-[12px] font-bold" style={{ color: '#d1dbe9' }}>Basic Statistics</h4>
            <span className="text-[10px] font-mono" style={{ color: '#64748b' }}>NovaSeq 6000</span>
          </div>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#0f172a' }}>
                <th className="px-4 py-1.5 text-left font-bold" style={{ color: '#64748b' }}>Measure</th>
                <th className="px-4 py-1.5 text-right font-bold" style={{ color: '#64748b' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t" style={{ borderColor: '#334155' }}>
                <td className="px-4 py-1.5" style={{ color: '#94a3b8' }}>Filename</td>
                <td className="px-4 py-1.5 text-right font-mono" style={{ color: '#e8eef5' }}>sample_R1.fastq</td>
              </tr>
              <tr className="border-t" style={{ borderColor: '#334155' }}>
                <td className="px-4 py-1.5" style={{ color: '#94a3b8' }}>File type</td>
                <td className="px-4 py-1.5 text-right font-mono" style={{ color: '#e8eef5' }}>Conventional base calls</td>
              </tr>
              <tr className="border-t" style={{ borderColor: '#334155' }}>
                <td className="px-4 py-1.5" style={{ color: '#94a3b8' }}>Encoding</td>
                <td className="px-4 py-1.5 text-right font-mono" style={{ color: '#e8eef5' }}>Sanger / Illumina 1.9</td>
              </tr>
              <tr className="border-t" style={{ borderColor: '#334155' }}>
                <td className="px-4 py-1.5" style={{ color: '#94a3b8' }}>Total Sequences</td>
                <td className="px-4 py-1.5 text-right font-mono" style={{ color: '#e8eef5' }}>24,504,828</td>
              </tr>
              <tr className="border-t" style={{ borderColor: '#334155' }}>
                <td className="px-4 py-1.5" style={{ color: '#94a3b8' }}>Sequences flagged as poor quality</td>
                <td className="px-4 py-1.5 text-right font-mono" style={{ color: '#e8eef5' }}>0</td>
              </tr>
              <tr className="border-t" style={{ borderColor: '#334155' }}>
                <td className="px-4 py-1.5" style={{ color: '#94a3b8' }}>Sequence length</td>
                <td className="px-4 py-1.5 text-right font-mono" style={{ color: '#e8eef5' }}>151 bp</td>
              </tr>
              <tr className="border-t border-b-0" style={{ borderColor: '#334155' }}>
                <td className="px-4 py-1.5" style={{ color: '#94a3b8' }}>%GC</td>
                <td className="px-4 py-1.5 text-right font-mono font-bold" style={{ color: '#22c55e' }}>48%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border p-4 flex-1" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
        <h4 className="text-[12px] font-bold mb-3" style={{ color: '#9fb0c3' }}>整體狀態 Summary</h4>
        <div className="space-y-2">
          <SummaryRow label="PASS" count={summary.pass} color="#22c55e" />
          <SummaryRow label="WARN" count={summary.warn} color="#eab308" />
          <SummaryRow label="FAIL" count={summary.fail} color="#ef4444" />
        </div>
        <div
          className="mt-4 p-3 rounded-xl text-center"
          style={{ backgroundColor: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.3)', borderWidth: '1px' }}
        >
          <div className="text-[10px] font-bold tracking-wider" style={{ color: '#eab308' }}>建議檢查</div>
          <div className="text-[11px] mt-1 leading-relaxed" style={{ color: '#c6d3e3' }}>
            Overrepresented Sequences 與 Duplication 需進一步處理
          </div>
        </div>
      </div>
    </aside>
  );
};

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
export const FastQCVisualization: React.FC<FastQCVisualizationProps> = () => {
  const [activeTab, setActiveTab] = useState<TabId>('core');

  return (
    <div className="flex flex-col gap-4 min-h-[600px]">
      {/* 頁面標題 */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold" style={{ color: '#e8eef5' }}>數據品質檢測</h2>
        </div>
        <span
          className="hidden md:inline-block text-[12px] font-mono font-bold px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: '1px', color: '#3b82f6' }}
        >
          sample_R1.fastq
        </span>
      </header>

      <div className="flex gap-4 items-start">
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
            {activeTab === 'overview' && <OverviewTab />}
          </div>
        </div>

        {/* 右側檔案資訊 + 整體狀態 Summary */}
        <FileInfoPanel />
      </div>
    </div>
  );
};
