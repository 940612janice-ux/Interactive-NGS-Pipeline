import React, { useEffect, useRef, useState } from 'react';

interface AlignmentVisualizationProps {
  onComplete?: () => void;
}

const CHROMOSOMES = [
  { label: '1', size: 248, cen: 0.45 },
  { label: '2', size: 242, cen: 0.40 },
  { label: '3', size: 198, cen: 0.47 },
  { label: '4', size: 190, cen: 0.27 },
  { label: '5', size: 181, cen: 0.29 },
  { label: '6', size: 170, cen: 0.35 },
  { label: '7', size: 159, cen: 0.37 },
  { label: '8', size: 145, cen: 0.35 },
  { label: '9', size: 138, cen: 0.36 },
  { label: '10', size: 133, cen: 0.36 },
  { label: '11', size: 135, cen: 0.40 },
  { label: '12', size: 133, cen: 0.39 },
  { label: '13', size: 115, cen: 0.17 },
  { label: '14', size: 107, cen: 0.18 },
  { label: '15', size: 102, cen: 0.19 },
  { label: '16', size: 90, cen: 0.43 },
  { label: '17', size: 83, cen: 0.40 },
  { label: '18', size: 80, cen: 0.30 },
  { label: '19', size: 59, cen: 0.48 },
  { label: '20', size: 63, cen: 0.46 },
  { label: '21', size: 48, cen: 0.25 },
  { label: '22', size: 51, cen: 0.27 },
  { label: 'X', size: 156, cen: 0.37 },
  { label: 'Y', size: 57, cen: 0.40 },
];

const ROWS = [
  [0, 1, 2],
  [3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14],
  [15, 16, 17],
  [18, 19],
  [20, 21],
  [22, 23],
];

// 單色 G-banding：level 0 = 淺色區，1~5 = 由淺到深
const BAND_COLORS = ['#ffffff', '#c9c9c9', '#8f8f8f', '#565656', '#2c2c2c', '#101010'];

// 每條染色體的 G 帶：[起點比例, 終點比例, 深淺 0~5]，比例為 0（p 端）到 1（q 端）
const G_BANDS: Record<string, Array<[number, number, number]>> = {
  '1': [
    [0.01, 0.03, 2], [0.05, 0.08, 2], [0.09, 0.11, 2], [0.14, 0.17, 4], [0.19, 0.22, 3],
    [0.24, 0.27, 3], [0.29, 0.32, 2], [0.35, 0.38, 4], [0.40, 0.43, 3],
    [0.46, 0.53, 5], [0.55, 0.58, 2], [0.60, 0.63, 3], [0.66, 0.70, 3],
    [0.73, 0.77, 2], [0.80, 0.83, 3], [0.86, 0.90, 2], [0.93, 0.96, 4],
  ],
  '2': [
    [0.02, 0.05, 2], [0.09, 0.12, 4], [0.15, 0.18, 3], [0.21, 0.24, 3], [0.27, 0.30, 2],
    [0.33, 0.36, 4],
    [0.43, 0.46, 4], [0.49, 0.52, 4], [0.55, 0.58, 3], [0.61, 0.64, 4],
    [0.67, 0.70, 4], [0.73, 0.76, 3], [0.79, 0.82, 4], [0.85, 0.88, 4], [0.91, 0.94, 3],
  ],
  '3': [
    [0.03, 0.06, 2], [0.10, 0.14, 2], [0.17, 0.20, 3], [0.23, 0.26, 3], [0.29, 0.32, 2],
    [0.35, 0.38, 2], [0.41, 0.44, 3],
    [0.54, 0.57, 3], [0.60, 0.63, 3], [0.66, 0.69, 2], [0.72, 0.75, 3],
    [0.78, 0.81, 2], [0.84, 0.87, 3], [0.90, 0.93, 2], [0.96, 1.0, 3],
  ],
  '4': [
    [0.02, 0.05, 2], [0.08, 0.11, 3], [0.14, 0.17, 3], [0.20, 0.23, 2],
    [0.30, 0.33, 4], [0.36, 0.39, 4], [0.42, 0.45, 4], [0.48, 0.51, 3],
    [0.54, 0.58, 4], [0.61, 0.64, 3], [0.68, 0.71, 4], [0.74, 0.78, 3],
    [0.81, 0.85, 4], [0.88, 0.92, 3],
  ],
  '5': [
    [0.02, 0.04, 2], [0.08, 0.11, 3], [0.14, 0.17, 2], [0.20, 0.23, 3],
    [0.33, 0.36, 4], [0.39, 0.42, 3], [0.46, 0.49, 3], [0.52, 0.55, 4],
    [0.59, 0.62, 3], [0.66, 0.69, 3], [0.73, 0.76, 4], [0.80, 0.83, 3], [0.86, 0.90, 3],
  ],
  '6': [
    [0.02, 0.05, 3], [0.08, 0.11, 2], [0.14, 0.17, 3], [0.20, 0.23, 2], [0.26, 0.30, 3],
    [0.39, 0.42, 3], [0.45, 0.48, 3], [0.51, 0.55, 3], [0.58, 0.61, 2],
    [0.65, 0.68, 2], [0.71, 0.75, 2], [0.78, 0.81, 2], [0.85, 0.88, 2],
  ],
  '7': [
    [0.02, 0.05, 3], [0.08, 0.11, 3], [0.14, 0.17, 2], [0.20, 0.23, 3], [0.26, 0.29, 2],
    [0.32, 0.35, 3],
    [0.41, 0.44, 3], [0.47, 0.51, 2], [0.54, 0.58, 3], [0.61, 0.64, 2],
    [0.68, 0.71, 2], [0.74, 0.78, 3], [0.81, 0.85, 2], [0.88, 0.92, 2],
  ],
  '8': [
    [0.02, 0.05, 2], [0.08, 0.11, 3], [0.14, 0.17, 2], [0.20, 0.23, 3], [0.27, 0.30, 2],
    [0.39, 0.42, 3], [0.45, 0.48, 3], [0.51, 0.55, 3], [0.58, 0.62, 2],
    [0.65, 0.69, 2], [0.72, 0.76, 3], [0.79, 0.83, 2], [0.86, 0.90, 2],
  ],
  '9': [
    [0.02, 0.05, 2], [0.08, 0.11, 3], [0.14, 0.17, 2], [0.20, 0.23, 3], [0.26, 0.30, 2],
    [0.37, 0.42, 5], [0.45, 0.48, 3], [0.51, 0.54, 3], [0.58, 0.61, 3],
    [0.64, 0.68, 2], [0.71, 0.75, 2], [0.78, 0.82, 2], [0.85, 0.89, 2],
  ],
  '10': [
    [0.02, 0.05, 3], [0.08, 0.11, 2], [0.14, 0.17, 3], [0.20, 0.23, 2], [0.27, 0.30, 2],
    [0.40, 0.43, 3], [0.46, 0.50, 3], [0.53, 0.56, 3], [0.60, 0.63, 3],
    [0.66, 0.70, 2], [0.73, 0.77, 2], [0.80, 0.84, 2], [0.87, 0.91, 2],
  ],
  '11': [
    [0.02, 0.05, 2], [0.09, 0.12, 3], [0.16, 0.19, 3], [0.23, 0.26, 2], [0.30, 0.33, 3],
    [0.44, 0.47, 4], [0.50, 0.53, 3], [0.56, 0.59, 3], [0.62, 0.65, 3],
    [0.68, 0.72, 2], [0.75, 0.78, 3], [0.81, 0.85, 2], [0.88, 0.92, 2],
  ],
  '12': [
    [0.02, 0.04, 2], [0.08, 0.11, 3], [0.15, 0.18, 3], [0.22, 0.25, 2], [0.29, 0.32, 3],
    [0.43, 0.46, 4], [0.49, 0.52, 3], [0.55, 0.58, 3], [0.61, 0.64, 3],
    [0.67, 0.70, 2], [0.73, 0.77, 3], [0.80, 0.84, 2], [0.87, 0.91, 2],
  ],
  '13': [
    [0.05, 0.09, 2], [0.13, 0.16, 2],
    [0.21, 0.25, 3], [0.28, 0.32, 4], [0.36, 0.40, 4], [0.43, 0.47, 3],
    [0.51, 0.55, 4], [0.59, 0.63, 3], [0.67, 0.71, 3], [0.75, 0.79, 3], [0.83, 0.88, 2],
  ],
  '14': [
    [0.06, 0.10, 2], [0.14, 0.17, 2],
    [0.22, 0.26, 3], [0.30, 0.34, 4], [0.38, 0.42, 3], [0.46, 0.50, 3],
    [0.54, 0.58, 3], [0.62, 0.66, 2], [0.70, 0.74, 3], [0.78, 0.82, 2], [0.86, 0.90, 2],
  ],
  '15': [
    [0.06, 0.10, 2], [0.14, 0.18, 2],
    [0.23, 0.27, 3], [0.31, 0.35, 3], [0.39, 0.43, 3], [0.47, 0.51, 3],
    [0.55, 0.59, 3], [0.63, 0.67, 2], [0.71, 0.75, 2], [0.79, 0.83, 2], [0.87, 0.91, 2],
  ],
  '16': [
    [0.03, 0.07, 2], [0.11, 0.15, 3], [0.19, 0.23, 3], [0.27, 0.31, 3], [0.35, 0.39, 3],
    [0.44, 0.47, 5], [0.51, 0.55, 3], [0.59, 0.63, 3], [0.67, 0.71, 2],
    [0.75, 0.79, 3], [0.83, 0.87, 2], [0.91, 0.95, 2],
  ],
  '17': [
    [0.03, 0.07, 2], [0.11, 0.15, 3], [0.19, 0.23, 2], [0.27, 0.31, 3],
    [0.44, 0.48, 2], [0.52, 0.56, 3], [0.60, 0.64, 3], [0.68, 0.72, 2],
    [0.76, 0.80, 2], [0.84, 0.88, 2], [0.92, 0.96, 2],
  ],
  '18': [
    [0.03, 0.07, 2], [0.11, 0.15, 3], [0.19, 0.23, 2], [0.27, 0.30, 3],
    [0.35, 0.39, 3], [0.43, 0.47, 4], [0.51, 0.55, 4], [0.59, 0.63, 3],
    [0.67, 0.71, 3], [0.75, 0.79, 3], [0.83, 0.87, 2], [0.91, 0.95, 2],
  ],
  '19': [
    [0.04, 0.08, 2], [0.12, 0.16, 2], [0.20, 0.24, 2], [0.28, 0.32, 2], [0.36, 0.40, 2],
    [0.56, 0.60, 3], [0.64, 0.68, 2], [0.72, 0.76, 3], [0.80, 0.84, 2], [0.88, 0.92, 2],
  ],
  '20': [
    [0.04, 0.08, 2], [0.12, 0.16, 2], [0.20, 0.24, 3], [0.28, 0.32, 2], [0.36, 0.40, 2],
    [0.54, 0.58, 3], [0.62, 0.66, 3], [0.70, 0.74, 3], [0.78, 0.82, 2], [0.86, 0.90, 3],
  ],
  '21': [
    [0.08, 0.13, 2], [0.19, 0.24, 2],
    [0.30, 0.36, 3], [0.42, 0.47, 3], [0.53, 0.59, 3], [0.65, 0.71, 3], [0.77, 0.83, 3],
  ],
  '22': [
    [0.09, 0.14, 2], [0.20, 0.26, 2],
    [0.32, 0.37, 3], [0.43, 0.48, 3], [0.53, 0.58, 3], [0.64, 0.69, 3], [0.74, 0.79, 3],
  ],
  'X': [
    [0.02, 0.05, 3], [0.08, 0.11, 2], [0.14, 0.17, 3], [0.20, 0.23, 2], [0.26, 0.29, 3],
    [0.32, 0.36, 2],
    [0.41, 0.44, 3], [0.47, 0.50, 3], [0.53, 0.57, 3], [0.60, 0.63, 3],
    [0.66, 0.70, 3], [0.73, 0.77, 3], [0.80, 0.84, 2], [0.87, 0.91, 2],
  ],
  'Y': [
    [0.08, 0.14, 2], [0.20, 0.26, 2], [0.32, 0.38, 2],
    [0.46, 0.52, 3], [0.58, 0.64, 3], [0.70, 0.76, 3], [0.82, 0.88, 3],
  ],
};

function createKaryotypeSVG(): string {
  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

  function halfWidth(t: number, r: number) {
    if (t < r) {
      if (t < r * 0.22) return lerp(0.05, 1, t / (r * 0.22));
      if (t < r * 0.80) return 1;
      return lerp(1, 0.16, (t - r * 0.80) / (r * 0.20));
    }
    const u = (t - r) / (1 - r);
    if (u < 0.20) return lerp(0.16, 1, u / 0.20);
    if (u < 0.72) return 1;
    return lerp(1, 0.05, (u - 0.72) / 0.28);
  }

  function chromHeight(size: number) {
    return 16 + (size / 248) * 88;
  }

  function chromPath(cx: number, cy: number, h: number, w: number, r: number) {
    const N = 36;
    const top = cy - h / 2;
    let d = `M ${cx.toFixed(1)} ${top.toFixed(1)}`;
    for (let k = 1; k <= N; k++) {
      const t = k / N;
      d += ` L ${(cx - halfWidth(t, r) * w).toFixed(1)} ${(top + t * h).toFixed(1)}`;
    }
    for (let k = N - 1; k >= 0; k--) {
      const t = k / N;
      d += ` L ${(cx + halfWidth(t, r) * w).toFixed(1)} ${(top + t * h).toFixed(1)}`;
    }
    return d + ' Z';
  }

  // 單色 G-banding：以 clipPath 把帶紋剪進染色體輪廓內
  function chromBands(cx: number, cy: number, h: number, w: number, label: string) {
    const top = cy - h / 2;
    const bands = G_BANDS[label] || [];
    return bands.map(([start, end, level]) => {
      if (level <= 0) return '';
      const y1 = top + start * h;
      const y2 = top + end * h;
      const bw = w * 3.4;
      return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.4, y2 - y1).toFixed(1)}" fill="${BAND_COLORS[level]}"/>`;
    }).join('');
  }

  const W = 800;
  const CELL_W = 110;
  const W_MAX = 9;

  const rowLayout: Array<{ row: number[]; maxH: number; y: number }> = [];
  let yCursor = 35;
  ROWS.forEach((row) => {
    const maxH = Math.max(...row.map((i) => chromHeight(CHROMOSOMES[i].size)));
    rowLayout.push({ row, maxH, y: yCursor });
    yCursor += maxH + 30;
  });
  const H = yCursor + 30;

  let defs = '';
  let shapes = '';
  let labels = '';

  rowLayout.forEach(({ row, maxH, y }) => {
    const n = row.length;
    const totalW = n * CELL_W;
    const xStart = (W - totalW) / 2 + CELL_W / 2;
    row.forEach((idx, i) => {
      const chrom = CHROMOSOMES[idx];
      const cx = xStart + i * CELL_W;
      const cy = y + maxH / 2;
      const h = chromHeight(chrom.size);
      const isSex = idx >= 22;
      const gap = 26;
      const rods = isSex ? [0] : [-gap, gap];

      rods.forEach((ox, rodIdx) => {
        const rodCx = cx + ox;
        const clipId = `gband-${idx}-${rodIdx}`;
        const pathD = chromPath(rodCx, cy, h, W_MAX, chrom.cen);
        defs += `<clipPath id="${clipId}"><path d="${pathD}"/></clipPath>`;
        shapes += `<path d="${pathD}" fill="#e9e9e9" stroke="#7d7d7d" stroke-width="0.8" stroke-linejoin="round"/>`;
        shapes += `<g clip-path="url(#${clipId})">${chromBands(rodCx, cy, h, W_MAX, chrom.label)}</g>`;
      });

      labels += `<text x="${cx.toFixed(1)}" y="${(y + maxH + 20).toFixed(1)}" text-anchor="middle" font-size="${isSex ? 13 : 12}" font-weight="700" fill="#c9ced6">${chrom.label}</text>`;
    });
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="人類男性正常核型，46,XY" style="width:100%;height:auto;">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#0a0e17"/>
      <text x="${W / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="#e6e9f2">人類男性正常核型 · 46,XY（參考基因體 hg38 / GRCh38）</text>
      ${defs}
      ${shapes}
      ${labels}
    </svg>
  `;
}

const REF_BASES = 'TGAATTTTGGATTACTAAGGAATTTACAGTACAAAAATGTACTTGTTAACACAGTGACAT';
const REF_LENGTH = REF_BASES.length;
const REF_START = 10000001;
const BASE_COLOR_MAP: Record<string, string> = { A: '#ff6b6b', C: '#ffa500', G: '#4da3ff', T: '#4cc38a' };
// 行首固定欄位（read 名稱 / Reference 標籤）寬度：對應 Tailwind w-36，Reference 與 Reads 共用，
// 確保序列起點 X 座標完全一致（標籤 pr-4 的內縮已包含在 144px 內）
const GUTTER_W = 144;

// 測量等寬字型（font-mono）的單一字元寬度：落點欄位換算的基準
let cachedCharWidth: number | null = null;
function getCharWidth(): number {
  if (cachedCharWidth) return cachedCharWidth;
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.whiteSpace = 'pre';
  // 沿用 Reference 實際套用的字型（Tailwind font-mono），確保測量結果與畫面一致
  const basesEl = document.querySelector('.ref-bases') as HTMLElement | null;
  if (basesEl) {
    const cs = getComputedStyle(basesEl);
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontSize = cs.fontSize;
    probe.style.letterSpacing = cs.letterSpacing;
  } else {
    probe.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    probe.style.fontSize = '14px';
    probe.style.letterSpacing = 'normal';
  }
  probe.textContent = 'A';
  document.body.appendChild(probe);
  cachedCharWidth = probe.getBoundingClientRect().width || 8.4;
  probe.remove();
  return cachedCharWidth;
}

interface Read {
  id: string;
  seq: string;
  color: string;
  aligned: boolean;
  position: number;
  matchCount: number;
}

const INITIAL_READS: Read[] = [
  { id: 'Read 1', seq: 'TGAATTTTGGATTAC', color: '#ff6b6b', aligned: false, position: -1, matchCount: 0 },
  { id: 'Read 2', seq: 'ATTACTAAGGAATTTAC', color: '#4da3ff', aligned: false, position: -1, matchCount: 0 },
  { id: 'Read 3', seq: 'AATTTACAGTACAAAAAT', color: '#4cc38a', aligned: false, position: -1, matchCount: 0 },
  { id: 'Read 4', seq: 'GTACTTGTTAACAC', color: '#ffb84d', aligned: false, position: -1, matchCount: 0 },
  { id: 'Read 5', seq: 'ACACAGTGACAT', color: '#7a6bff', aligned: false, position: -1, matchCount: 0 },
];

export const AlignmentVisualization: React.FC<AlignmentVisualizationProps> = () => {
  const refSeqRef = useRef<HTMLDivElement>(null);
  const readsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null) as React.MutableRefObject<HTMLDivElement | null>;
  const [reads, setReads] = useState<Read[]>(INITIAL_READS);
  const [alignedLanes, setAlignedLanes] = useState<Array<{ read: Read; startPos: number }>>([]);
  const readsRef2 = useRef(reads);

  useEffect(() => {
    readsRef2.current = reads;
  }, [reads]);

  const renderReference = () => {
    if (!refSeqRef.current) return;
    const el = refSeqRef.current;
    el.innerHTML = '';
    const label = document.createElement('div');
    label.className = 'ref-label text-[10px] font-bold mb-0.5';
    label.style.color = '#9fb0c3';
    label.textContent = `hg38 chr1: ${REF_START.toLocaleString()}–${(REF_START + REF_LENGTH - 1).toLocaleString()}`;
    el.appendChild(label);

    // 行首固定欄位（w-36）+ 等寬字型（font-mono / whitespace-pre / tracking-normal）：
    // Reference 與下方 read 共用相同欄位與字型，保證每個鹼基欄位垂直對齊
    const rowEl = document.createElement('div');
    rowEl.className = 'flex items-center';
    const gutterEl = document.createElement('span');
    gutterEl.className = '<w-36> shrink-0 text-right pr-10 font-bold text-neutral-300 select-none';
    gutterEl.style.width = `${GUTTER_W}px`;
    gutterEl.textContent = 'Reference';
    rowEl.appendChild(gutterEl);

    const basesEl = document.createElement('div');
    basesEl.className = 'ref-bases flex whitespace-pre tracking-normal shrink-0';
    basesEl.style.letterSpacing = 'normal';
    REF_BASES.split('').forEach((base, i) => {
      const baseEl = document.createElement('span');
      baseEl.className = `ref-base base-${base} w-[1ch] text-center font-bold`;
      baseEl.textContent = base;
      baseEl.style.color = BASE_COLOR_MAP[base] || '#cbd5e1';
      (baseEl as HTMLElement).dataset.pos = String(i);
      basesEl.appendChild(baseEl);
    });
    rowEl.appendChild(basesEl);
    el.appendChild(rowEl);

    // 分隔線：Reference 列與 Reads 列表之間
    const divider = document.createElement('div');
    divider.className = 'my-1 border-t border-neutral-800';
    el.appendChild(divider);

    // 已比對 reads 的文字行（純文字序列）：直接在 Reference 序列正下方，
    // 行首標籤寬度固定為 w-36、Offset 以 paddingLeft: ${offset}ch 推開，與 Reference 保持垂直等寬對齊
    const trackEl = document.createElement('div');
    trackEl.className = 'mt-1 flex flex-col gap-1.5';
    trackRef.current = trackEl;
    el.appendChild(trackEl);
  };

  // 計算 read 對齊到 reference 位置後的正確比對數（不塗改 reference 鹼基）
  const highlightAlignment = (read: Read, startPos: number): number => {
    let matchCount = 0;
    for (let i = 0; i < read.seq.length; i++) {
      const idx = startPos + i;
      if (idx < 0 || idx >= REF_LENGTH) continue;
      if (REF_BASES[idx] === read.seq[i]) matchCount++;
    }
    return matchCount;
  };

  // 已比對的 read：在 Reference 序列正下方建立「純文字序列」文字行，
  // 行首標籤寬度固定 w-36、Offset 以 paddingLeft: ${offset}ch 推開，與 Reference 垂直等寬對齊
  const renderTrackedReads = () => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    el.innerHTML = '';
    alignedLanes.forEach(({ read, startPos }) => {
      const row = document.createElement('div');
      row.className = 'flex items-center';

      const label = document.createElement('span');
      label.className = 'w-36 shrink-0 text-right pr-4 text-xs text-neutral-500 select-none';
      label.style.width = `${GUTTER_W}px`;
      label.textContent = `${read.id} (${read.matchCount}/${read.seq.length})`;
      row.appendChild(label);

      const bases = document.createElement('div');
      bases.className = 'flex whitespace-pre tracking-normal shrink-0';
      bases.style.letterSpacing = 'normal';
      // 以 ch 單位精確推開 offset 個字元，讓真實序列起點與 Reference 相同欄位對齊
      bases.style.paddingLeft = `${startPos}ch`;
      read.seq.split('').forEach((base) => {
        const span = document.createElement('span');
        span.className = 'w-[1ch] text-center font-bold';
        span.style.color = BASE_COLOR_MAP[base] || '#cbd5e1';
        span.textContent = base;
        bases.appendChild(span);
      });
      row.appendChild(bases);
      el.appendChild(row);
    });
  };

  // 自動比對：在 reference 上滑動 read，找出 match 最多的最佳起點
  // （落點欄位僅作為相同分數時的取捨依據，真正的「自動對位」由這裡決定）
  const findBestPosition = (read: Read, preferCol: number): number => {
    let bestPos = 0;
    let bestScore = -1;
    const readCenter = read.seq.length / 2;
    for (let start = 0; start <= REF_LENGTH - read.seq.length; start++) {
      let score = 0;
      for (let i = 0; i < read.seq.length; i++) {
        if (REF_BASES[start + i] === read.seq[i]) score++;
      }
      const center = start + readCenter;
      if (score > bestScore || (score === bestScore && Math.abs(center - preferCol) < Math.abs(bestPos + readCenter - preferCol))) {
        bestScore = score;
        bestPos = start;
      }
    }
    return bestPos;
  };

  // 取得滑鼠落點對應的 reference 鹼基欄位（0-indexed），確保與序列完全對齊
  const getDropColumn = (clientX: number, clientY: number): number => {
    // 優先：滑鼠直接落在某個鹼基格上 → 以該格的資料位置為準
    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (hit && hit.classList?.contains('ref-base') && hit.dataset.pos) {
      return parseInt(hit.dataset.pos, 10);
    }
    // 備援：以 .ref-bases 左緣為基準，依等寬字元寬度換算成最近的鹼基欄位
    const basesEl = refSeqRef.current?.querySelector('.ref-bases') as HTMLElement;
    if (!basesEl) return 0;
    const basesRect = basesEl.getBoundingClientRect();
    const x = clientX - basesRect.left + (basesEl.scrollLeft || 0);
    const charW = getCharWidth();
    const col = Math.round((x - charW / 2) / charW);
    return Math.max(0, Math.min(REF_LENGTH - 1, col));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const readIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(readIdx) || readIdx < 0 || readIdx >= readsRef2.current.length) return;
    const read = readsRef2.current[readIdx];
    if (read.aligned) return;

    const bases = refSeqRef.current?.querySelector('.ref-bases') as HTMLElement;
    if (!bases) return;
    const col = getDropColumn(e.clientX, e.clientY);
    // 自動對位：不直接用落點，而是找出 read 與 reference 配對最好的位置
    const clampedPos = findBestPosition(read, col);

    const newReads = readsRef2.current.map((r, i) => (i === readIdx ? { ...r, aligned: true, position: clampedPos } : r));
    const updatedRead = newReads[readIdx];
    const matchCount = highlightAlignment(updatedRead, clampedPos);
    newReads[readIdx] = { ...updatedRead, matchCount };
    setAlignedLanes((prev) => [...prev, { read: newReads[readIdx], startPos: clampedPos }]);
    setReads(newReads);
  };

  const renderReadsList = () => {
    if (!readsRef.current) return;
    const el = readsRef.current;
    el.innerHTML = '';
    reads.forEach((read, idx) => {
      const readEl = document.createElement('div');
      readEl.className = 'read-item flex items-center gap-2 px-2 py-1 rounded border mb-1';
      readEl.draggable = !read.aligned;
      readEl.style.borderColor = read.aligned ? 'rgba(255,255,255,0.1)' : '#c0c0c0';
      readEl.style.opacity = read.aligned ? '0.3' : '1';
      readEl.style.cursor = read.aligned ? 'default' : 'grab';
      readEl.innerHTML = `
        <span class="read-id text-[14px] font-bold" style="color:#9fb0c3">${read.id}</span>
        <span class="read-seq text-[16px] font-mono tracking-normal" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:normal">${read.seq.split('').map((b) => `<span style="color:${BASE_COLOR_MAP[b] || '#ccc'}">${b}</span>`).join('')}</span>
      `;
      readEl.addEventListener('dragstart', (ev) => {
        if (ev.dataTransfer) ev.dataTransfer.setData('text/plain', idx.toString());
      });
      el.appendChild(readEl);
    });
  };

  useEffect(() => {
    renderReference();
  }, []);

  useEffect(() => {
    renderReadsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reads]);

  useEffect(() => {
    renderTrackedReads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignedLanes]);

  return (
    <div className="alignment-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
      {/* Left: Karyotype */}
      <div className="alignment-left flex flex-col gap-4">
        <div className="fastqc-panel flex-1 flex flex-col rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>人類參考基因體 hg38</h3>
            <span className="fastqc-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>23 對染色體</span>
          </div>
          <div className="karyotype-wrap flex-1 overflow-auto flex items-center" dangerouslySetInnerHTML={{ __html: createKaryotypeSVG() }} />
        </div>
      </div>

      {/* Right: Alignment map */}
      <div className="alignment-right flex flex-col gap-4">
        <div className="fastqc-panel flex-1 flex flex-col rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Read 比對地圖</h3>
            <span className="fastqc-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>hg38 Reference</span>
          </div>
          {/* 卡片拉長：整個面板填滿右欄高度，讓下方 reads 可以直接拉到上方參考序列 */}
          <div className="alignment-map flex flex-col gap-2 flex-1 min-h-0">
            {/* 參考序列（hg38 chr1: 10,000,001–10,000,060）：拉長成主要拖放區 */}
            <div
              ref={refSeqRef}
              className="ref-sequence font-mono text-sm bg-[#080c14] border rounded-lg p-2 overflow-x-auto cursor-copy flex-1 min-h-[130px]"
              style={{ borderColor: '#1e2a38', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onWheel={(e) => {
                const el = refSeqRef.current;
                if (!el || el.scrollWidth <= el.clientWidth) return;
                if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
                  e.preventDefault();
                  el.scrollLeft += e.deltaY;
                }
              }}
            />
            {/* 已比對 reads 以純文字序列顯示在 Reference 正下方（renderTrackedReads 建置） */}
            {/* 下方 reads：拖曳到上方參考序列即可比對 */}
            <div ref={readsRef} className="reads-container min-h-[80px] max-h-[220px] overflow-y-auto p-2 rounded-lg shrink-0" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }} />
            <div className="alignment-legend flex flex-wrap gap-3 text-[10px]" style={{ color: '#9fb0c3' }}>
              {Object.entries(BASE_COLOR_MAP).map(([b, c]) => (
                <span key={b} className="legend-item flex items-center gap-1"><span className="legend-dot inline-block w-2 h-2 rounded-full" style={{ background: c }} /> {b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};