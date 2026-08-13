import React, { useEffect, useRef, useState } from 'react';

interface MarkDuplicatesVisualizationProps {
  onComplete?: () => void;
}

/* ==================== 主題色（Dark Mode，高對比資料視覺化） ==================== */
const C = {
  cyan: '#22d3ee',      // 螢光青 Accent（執行按鈕 / 正向鏈 reads）
  green: '#34d399',     // 螢光綠（Unique / 有效覆蓋深度）
  orange: '#fb923c',    // 亮橘（Duplicate / 警告）
  red: '#f43f5e',       // 紫紅（變異地標 / 垂直標記線）
  magenta: '#f472b6',   // 變異鹼基高亮色
  violet: '#a78bfa',    // 反向鏈 reads
  panel: '#141d2e',     // 面板背景（板岩灰）
  panelDark: '#0d1420', // 深板岩（卡片內層）
  border: '#263247',
  text: '#e8eef5',
  dim: '#9fb0c3',
  faint: '#64748b',
};

/* 鹼基配色：A 紅 / C 橘 / G 藍 / T 綠 */
const BASE_COLOR: Record<string, string> = { A: '#ff6b6b', C: '#ffa500', G: '#4da3ff', T: '#4cc38a' };

/* ==================== 參考基因組視窗（hg38 chr1: 10,000,001 - 10,000,060） ==================== */
const REF_START = 10000001;
const REF_BASES = 'TGAATTTTGGATTACTAAGGAATTTACAGTACAAAAATGTACTTGTTAACACAGTGACAT';
const REF_LENGTH = REF_BASES.length;          // 60 bp
const VARIANT_INDEX = 34;                      // 0-based 位置 = 基因組座標 10,000,035
const VARIANT_POS = REF_START + VARIANT_INDEX; // 候選突變位置
const REF_BASE_AT_VARIANT = REF_BASES[VARIANT_INDEX]; // 'A'
const ALT_BASE = 'C';                          // 候選突變鹼基（A > C）
const ROW_H = 17;                              // IGV 每列 read 泳道高度

interface AlignedRead {
  id: string;
  start: number;       // 在視窗內的 0-based 起點
  length: number;
  strand: '+' | '-';
  isR1: boolean;       // 是否為第一條 mate（R1）；false = R2
  isVariant: boolean;  // 帶有候選突變鹼基 C
  isDup: boolean;      // 是否為 PCR duplicate（將被標記 SAM Flag += 1024）
}

/* 20 條 reads：12 條支援變異（僅 2 條 unique）、8 條野生型（其中 2 條 duplicate）
   → 原始 VAF 60.0% (12/20)，去重後 VAF 25.0% (2/8 unique reads) */
const READS: AlignedRead[] = [
  { id: 'READ_001', start: 0,  length: 50, strand: '+', isR1: true,  isVariant: true,  isDup: false },
  { id: 'READ_002', start: 0,  length: 50, strand: '+', isR1: false, isVariant: true,  isDup: true },
  { id: 'READ_003', start: 0,  length: 50, strand: '+', isR1: true,  isVariant: true,  isDup: true },
  { id: 'READ_004', start: 2,  length: 48, strand: '+', isR1: false, isVariant: true,  isDup: false },
  { id: 'READ_005', start: 2,  length: 48, strand: '-', isR1: true,  isVariant: true,  isDup: true },
  { id: 'READ_006', start: 2,  length: 48, strand: '-', isR1: false, isVariant: true,  isDup: true },
  { id: 'READ_007', start: 4,  length: 46, strand: '+', isR1: true,  isVariant: true,  isDup: true },
  { id: 'READ_008', start: 4,  length: 46, strand: '+', isR1: false, isVariant: true,  isDup: true },
  { id: 'READ_009', start: 6,  length: 44, strand: '-', isR1: true,  isVariant: true,  isDup: true },
  { id: 'READ_010', start: 6,  length: 44, strand: '-', isR1: false, isVariant: true,  isDup: true },
  { id: 'READ_011', start: 8,  length: 42, strand: '+', isR1: true,  isVariant: true,  isDup: true },
  { id: 'READ_012', start: 8,  length: 42, strand: '+', isR1: false, isVariant: true,  isDup: true },
  { id: 'READ_013', start: 0,  length: 50, strand: '-', isR1: true,  isVariant: false, isDup: false },
  { id: 'READ_014', start: 2,  length: 48, strand: '+', isR1: false, isVariant: false, isDup: false },
  { id: 'READ_015', start: 4,  length: 46, strand: '-', isR1: true,  isVariant: false, isDup: false },
  { id: 'READ_016', start: 6,  length: 44, strand: '+', isR1: false, isVariant: false, isDup: false },
  { id: 'READ_017', start: 8,  length: 42, strand: '-', isR1: true,  isVariant: false, isDup: false },
  { id: 'READ_018', start: 10, length: 40, strand: '+', isR1: false, isVariant: false, isDup: false },
  { id: 'READ_019', start: 10, length: 40, strand: '+', isR1: true,  isVariant: false, isDup: true },
  { id: 'READ_020', start: 12, length: 38, strand: '-', isR1: false, isVariant: false, isDup: true },
];

/* MarkDuplicates metrics（對應 Picard MarkDuplicates.metrics） */
const DUP_RATE = 46.4;    // 重複率（Per-Library）
const UNIQUE_RATE = 100 - DUP_RATE; // 53.6%
const RAW_COV = 12.5;     // 原始覆蓋深度
const EFF_COV = 6.7;      // 有效覆蓋深度 = 12.5 × 53.6%
const RAW_COV_BINS = [13.2, 12.8, 12.1, 13.5, 12.4, 11.9, 12.6, 13.0]; // 迷你柱狀圖 bin

const INITIAL_LOGS = [
  'INFO  [2026-08-10 09:12:07] 開啟 sample.bam（Raw BAM）',
  'INFO  [2026-08-10 09:12:07] 等待執行 MarkDuplicates ...',
];

/* 將 reads 依重疊情況分配至泳道（greedy），回傳每個 read 的 top 與總列數 */
function stackReads(reads: AlignedRead[]): { tops: Map<string, number>; rows: number } {
  const sorted = [...reads].sort((a, b) => a.start - b.start || b.length - a.length);
  const lanes: AlignedRead[][] = [];
  const tops = new Map<string, number>();
  sorted.forEach((r) => {
    const end = r.start + r.length;
    let lane = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].every((o) => end <= o.start || o.start + o.length <= r.start)) {
        lane = i;
        break;
      }
    }
    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
    }
    lanes[lane].push(r);
    tops.set(r.id, lane * ROW_H);
  });
  return { tops, rows: lanes.length };
}

/* 計算 SAM Flag：strand × R1/R2 決定基底旗標，duplicate 再加 1024 */
function getSamFlag(strand: '+' | '-', isR1: boolean, isDup: boolean): number {
  let baseFlag;

  if (strand === '+') {
    baseFlag = isR1 ? 99 : 163;
  } else { // '-'
    baseFlag = isR1 ? 83 : 147;
  }

  return isDup ? (baseFlag + 1024) : baseFlag;
}

/* 圓環圖：Unique（綠）vs Duplicate（橘） */
const Donut: React.FC<{ pct: number; center: string }> = ({ pct, center }) => {
  const circ = 2 * Math.PI * 30;
  const uniq = 100 - pct;
  return (
    <div className="relative shrink-0" style={{ width: 84, height: 84 }}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        {/* 底色 = 橘（Duplicate 佔比） */}
        <circle cx="42" cy="42" r="30" fill="none" stroke={C.orange} strokeWidth="11" />
        {/* 上層 = 綠（Unique 佔比） */}
        <circle
          cx="42"
          cy="42"
          r="30"
          fill="none"
          stroke={C.green}
          strokeWidth="11"
          strokeDasharray={`${(uniq / 100) * circ} ${circ}`}
          transform="rotate(-90 42 42)"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-bold"
        style={{ color: C.text, fontSize: 13 }}
      >
        {center}
      </div>
    </div>
  );
};

export const MarkDuplicatesVisualization: React.FC<MarkDuplicatesVisualizationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [markedIds, setMarkedIds] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(INITIAL_LOGS);
  const [hideDup, setHideDup] = useState(true); // 預設隱藏 Duplicate Reads
  const [showIntro, setShowIntro] = useState(true); // 步驟解說框
  const [showTips, setShowTips] = useState(true);
  const timerRef = useRef<number | null>(null);

  const markSet = new Set(markedIds);
  const isMarked = (r: AlignedRead) => markSet.has(r.id);

  /* 執行 Picard MarkDuplicates：依序把重複 reads 標上 SAM Flag 1024 */
  const runMarkDuplicates = () => {
    if (phase === 'running') return;
    const dups = READS.filter((r) => r.isDup);
    const total = dups.length;
    setPhase('running');
    setMarkedIds([]);
    setProgress(0);
    setLogs([
      ...INITIAL_LOGS,
      'INFO  [09:12:08] MarkDuplicates (Picard) 啟動',
      'INFO  [09:12:08] 掃描 20 條 reads 的座標 ...',
    ]);
    let step = 0;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      step++;
      setProgress(Math.min(100, Math.round((step / (total + 3)) * 100)));
      if (step === 1) setLogs((prev) => [...prev, 'INFO  [09:12:09] 比對相同 (coordinate, strand) 的讀段 ...']);
      if (step === 2) setLogs((prev) => [...prev, `WARN  [09:12:09] 發現 ${total} 條 PCR Duplicates，SAM Flag += 1024`]);
      if (step >= 3) {
        const idx = step - 3;
        if (idx < total) {
          const r = dups[idx];
          setMarkedIds((prev) => [...prev, r.id]);
          setLogs((prev) => [...prev, `INFO  [09:12:10] 標記 ${r.id} → SAM Flag ${getSamFlag(r.strand, r.isR1, true)}`]);
        }
      }
      if (step >= total + 3) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setProgress(100);
        setPhase('done');
        setLogs((prev) => [...prev, 'INFO  [09:12:11] 完成！保留 8 條 Unique reads', '✔ 已輸出 sample.dupmarked.bam']);
        onComplete?.();
      }
    }, 230);
  };

  /* 元件卸載時清除計時器 */
  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  /* 目前畫面可見的 reads（執行後依開關隱藏 duplicate） */
  const visibleReads = READS.filter((r) => !(phase === 'done' && hideDup && isMarked(r)));
  const hiddenCount = READS.length - visibleReads.length;
  const { tops, rows } = stackReads(visibleReads);

  /* 每個鹼基的覆蓋深度（由可見 reads 計算） */
  const coverage = new Array(REF_LENGTH).fill(0);
  visibleReads.forEach((r) => {
    for (let i = r.start; i < r.start + r.length && i < REF_LENGTH; i++) coverage[i]++;
  });
  const maxCov = Math.max(...coverage, 1);

  /* ---- 指標數值 ---- */
  const variantReads = READS.filter((r) => r.isVariant).length;              // 12
  const uniqueReads = READS.filter((r) => !r.isDup);                          // 8
  const uniqueVariant = uniqueReads.filter((r) => r.isVariant).length;        // 2
  const rawVaf = ((variantReads / READS.length) * 100).toFixed(1);            // 60.0%
  const corrVaf = ((uniqueVariant / uniqueReads.length) * 100).toFixed(1);    // 25.0%

  const done = phase === 'done';
  const running = phase === 'running';

  /* ==================== 渲染 ==================== */
  return (
    <div className="markdups-visual flex flex-col gap-4 h-[calc(100vh-13rem)] min-h-[620px]">
      {/* 步驟解說框：檢測目的 + 輸出檔案 */}
      {showIntro && (
        <div className="intro-dialog shrink-0 rounded-2xl border p-4 animate-fade-up" style={{ backgroundColor: '#141d2e', borderColor: C.cyan }}>
          <div className="flex items-start gap-3">
            <div className="dialog-body flex-1">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1.5 text-[15px] font-bold tracking-wide transition-colors"
                  style={{ color: C.cyan }}
                  onClick={() => setShowTips((v) => !v)}
                >
                  <span className="dialog-chevron inline-block transition-transform" style={{ transform: showTips ? 'rotate(90deg)' : 'none' }}>▸</span>
                  🧪 步驟解說 · Mark Duplicates（標記重複序列）
                </button>
                <button
                  className="dialog-close flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold transition-colors shrink-0"
                  style={{ color: C.dim, backgroundColor: C.panelDark, borderColor: C.border, borderWidth: '1px' }}
                  onClick={() => setShowIntro(false)}
                  aria-label="關閉解說"
                >
                  ✕
                </button>
              </div>
              {showTips && (
                <div className="dialog-tips mt-2.5 pt-2.5 border-t overflow-y-auto pr-1" style={{ borderColor: C.border, maxHeight: '170px' }}>
                  <ul className="text-[12px] leading-[1.8] flex flex-col gap-2" style={{ color: '#c6d3e3' }}>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded text-[9px] font-black flex items-center justify-center" style={{ backgroundColor: C.cyan, color: '#06222b' }}>1</span>
                      <span><strong style={{ color: C.text }}>檢測目的：</strong>利用標記重複序列，排除 PCR 複製出來的重複序列，以避免覆蓋深度、基因突變頻率過高，引發假陽性誤判。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded text-[9px] font-black flex items-center justify-center" style={{ backgroundColor: C.orange, color: '#0f1520' }}>2</span>
                      <span><strong style={{ color: C.text }}>輸出檔案：</strong>已標記的 BAM 檔且記錄各項數值，並將檔案轉成 SAM 檔，為人類方便讀取的格式。</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="grid gap-5 flex-1 min-h-0"
        style={{ gridTemplateColumns: 'minmax(0, 65fr) minmax(0, 35fr)' }}
      >
      {/* ============ 左側（65%）：IGV 軌道視覺化 ============ */}
      <div className="flex flex-col rounded-2xl border overflow-hidden" style={{ backgroundColor: C.panel, borderColor: C.border }}>
        {/* 頂部標題：基因組座標 + 參考鹼基視窗 */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b shrink-0" style={{ borderColor: C.border, backgroundColor: C.panelDark }}>
          <div>
            <div className="text-[14px] font-bold" style={{ color: C.cyan }}>
              IGV Track Viewer
              <span className="text-[11px] font-normal ml-2" style={{ color: C.dim }}>基因組比對軌道視圖</span>
            </div>
            <div className="text-[12px] font-mono mt-0.5" style={{ color: C.text }}>
              hg38 | chr1: {(REF_START).toLocaleString()} - {(REF_START + REF_LENGTH - 1).toLocaleString()}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#fda4af', backgroundColor: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)' }}>
              📍 chr1: {VARIANT_POS.toLocaleString()} 候選突變
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: C.dim, backgroundColor: 'rgba(0,0,0,0.25)' }}>
              顯示 {visibleReads.length}/{READS.length} reads{done && hiddenCount > 0 ? ` · 隱藏 ${hiddenCount} 條` : ''}
            </span>
          </div>
        </div>

        {/* 軌道本體 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="relative">
            {/* 每 10bp 的淡色縱向格線（背景層） */}
            {[10, 20, 30, 40, 50].map((g) => (
              <div
                key={g}
                className="absolute top-0 bottom-0"
                style={{ left: `${(g / REF_LENGTH) * 100}%`, width: 1, backgroundColor: 'rgba(148,163,184,0.08)' }}
              />
            ))}

            {/* 候選突變：地標 📍 + 紫紅垂直線 */}
            <div
              className="absolute top-0 bottom-0"
              style={{ left: `${(VARIANT_INDEX / REF_LENGTH) * 100}%`, width: 1.5, backgroundColor: C.red, boxShadow: `0 0 10px ${C.red}`, zIndex: 5 }}
            />
            <div
              className="absolute flex flex-col items-center"
              style={{ left: `${(VARIANT_INDEX / REF_LENGTH) * 100}%`, top: -10, transform: 'translateX(-50%)', zIndex: 6 }}
            >
              <div className="text-[13px] leading-none" style={{ textShadow: '0 0 6px rgba(244,63,94,0.9)' }}>📍</div>
              <div
                className="mt-0.5 text-[9px] font-mono font-bold whitespace-nowrap px-1.5 py-0.5 rounded"
                style={{ color: '#fda4af', backgroundColor: '#2a0f18', border: '1px solid rgba(244,63,94,0.55)' }}
              >
                {VARIANT_POS.toLocaleString()} A&gt;{ALT_BASE}
              </div>
            </div>

            {/* 座標尺規 */}
            <div className="relative h-7 mb-1">
              {[0, 10, 20, 30, 40, 50, 60].map((t) => (
                <div key={t} className="absolute flex flex-col items-center" style={{ left: `${(t / REF_LENGTH) * 100}%`, transform: 'translateX(-50%)' }}>
                  <div className="text-[9px] font-mono" style={{ color: C.faint }}>{(REF_START + t).toLocaleString()}</div>
                  <div className="w-px h-1.5" style={{ backgroundColor: '#3b4b5f' }} />
                </div>
              ))}
            </div>

            {/* 參考鹼基序列條 */}
            <div className="flex mb-3 rounded overflow-hidden" style={{ border: '1px solid #1c2836' }}>
              {REF_BASES.split('').map((b, i) => (
                <div
                  key={i}
                  className="flex-1 text-center"
                  style={{
                    height: 24,
                    lineHeight: '24px',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: BASE_COLOR[b],
                    backgroundColor: i === VARIANT_INDEX ? 'rgba(244,63,94,0.18)' : 'rgba(255,255,255,0.04)',
                    borderRight: '1px solid rgba(148,163,184,0.07)',
                    boxShadow: i === VARIANT_INDEX ? `inset 0 0 0 1px ${C.red}` : 'none',
                  }}
                >
                  {b}
                </div>
              ))}
            </div>

            {/* 覆蓋深度軌道（去重後深度明顯下降） */}
            <div className="mb-3">
              <div className="flex justify-between mb-0.5 text-[9px] font-mono" style={{ color: C.faint }}>
                <span>Coverage</span>
                <span>{maxCov}x</span>
              </div>
              <div className="flex items-end gap-px h-9 rounded overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid #1c2836', padding: 2 }}>
                {coverage.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    title={`chr1:${REF_START + i} = ${v}x`}
                    style={{
                      height: `${(v / maxCov) * 100}%`,
                      minHeight: v > 0 ? 3 : 1,
                      backgroundColor: i === VARIANT_INDEX ? C.red : C.cyan,
                      opacity: i === VARIANT_INDEX ? 0.85 : 0.4,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Reads 泳道（IGV 風格比對軌道） */}
            <div
              className="relative rounded-lg"
              style={{ height: rows * ROW_H + 6, backgroundColor: 'rgba(0,0,0,0.22)', border: '1px solid #1c2836' }}
            >
              {/* 變異位置淡色帶 */}
              <div
                className="absolute top-0 bottom-0"
                style={{ left: `${(VARIANT_INDEX / REF_LENGTH) * 100}%`, width: `${(1 / REF_LENGTH) * 100}%`, backgroundColor: 'rgba(244,63,94,0.10)', zIndex: 1 }}
              />
              {visibleReads.map((r) => {
                const marked = isMarked(r);
                const barColor = marked ? C.orange : r.strand === '+' ? C.cyan : C.violet;
                const letter = r.isVariant ? ALT_BASE : REF_BASE_AT_VARIANT;
                return (
                  <div
                    key={r.id}
                    title={`${r.id} · chr1:${(REF_START + r.start).toLocaleString()}-${(REF_START + r.start + r.length - 1).toLocaleString()} · ${r.strand === '+' ? '正向鏈' : '反向鏈'}${r.isVariant ? ` · ${REF_BASE_AT_VARIANT}>${ALT_BASE}` : ''} · ${marked ? `Duplicate (Flag ${getSamFlag(r.strand, r.isR1, true)})` : `Unique (Flag ${getSamFlag(r.strand, r.isR1, false)})`}`}
                    className="absolute overflow-hidden"
                    style={{
                      left: `${(r.start / REF_LENGTH) * 100}%`,
                      width: `${(r.length / REF_LENGTH) * 100}%`,
                      top: (tops.get(r.id) ?? 0) + 2,
                      height: ROW_H - 4,
                      backgroundColor: marked ? 'rgba(251,146,60,0.18)' : r.strand === '+' ? 'rgba(34,211,238,0.20)' : 'rgba(167,139,250,0.20)',
                      border: `1px solid ${barColor}`,
                      borderRadius: 4,
                      opacity: marked ? 0.9 : 1,
                      boxShadow: marked ? `0 0 10px rgba(251,146,60,0.35)` : 'none',
                      zIndex: 2,
                    }}
                  >
                    <span className="inline-block align-middle text-[9px] font-bold px-1" style={{ color: barColor, lineHeight: `${ROW_H - 4}px` }}>
                      {r.strand === '+' ? '→' : '←'}
                    </span>
                    <span className="inline-block align-middle text-[9px] font-mono font-bold" style={{ color: '#cbd5e1', lineHeight: `${ROW_H - 4}px` }}>
                      {r.id}
                    </span>
                    {/* 變異位置的鹼基（支援 read 顯示 C，野生型顯示 A） */}
                    <span
                      className="absolute text-[10px] font-bold"
                      style={{
                        left: `${((VARIANT_INDEX - r.start) / r.length) * 100}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: r.isVariant ? C.magenta : '#475569',
                        textShadow: r.isVariant ? `0 0 6px ${C.magenta}` : 'none',
                        zIndex: 3,
                      }}
                    >
                      {letter}
                    </span>
                    {marked && (
                      <span
                        className="absolute top-0 bottom-0 right-0 flex items-center px-1 text-[8px] font-black rounded-r"
                        style={{ color: '#0f1520', backgroundColor: C.orange }}
                      >
                        DUP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 圖例 */}
            <div className="flex flex-wrap gap-4 mt-3 text-[10px]" style={{ color: C.dim }}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: C.cyan }} /> 正向鏈 Read</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: C.violet }} /> 反向鏈 Read</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: C.magenta }} /> 候選變異鹼基 (C)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: C.orange }} /> Duplicate (Flag 1024)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ 右側（35%）：操作控制 + 核心品質指標 ============ */}
      <div className="flex flex-col gap-4 overflow-y-auto pr-1">
        {/* ---- 模組 1：操作按鈕與檢視切換 ---- */}
        <div className="rounded-2xl border p-4 shrink-0" style={{ backgroundColor: C.panel, borderColor: C.border }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[14px] font-bold" style={{ color: C.cyan }}>Operation · 操作</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: C.dim, backgroundColor: C.panelDark }}>GATK Picard</span>
          </div>

          {/* 主要按鈕：螢光青光暈 */}
          <button
            onClick={runMarkDuplicates}
            disabled={running}
            className="w-full py-3 rounded-xl font-black text-[14px] tracking-wide transition-all disabled:cursor-wait"
            style={{
              backgroundColor: running ? '#0e7490' : C.cyan,
              color: running ? '#9fb0c3' : '#06222b',
              boxShadow: running ? 'none' : '0 0 26px rgba(34,211,238,0.45), inset 0 0 12px rgba(255,255,255,0.25)',
              opacity: running ? 0.7 : 1,
            }}
          >
            {running ? `執行中 ... ${markedIds.length}/12` : done ? '✓ 完成 · 重新執行 MarkDuplicates' : '執行 Mark Duplicates'}
          </button>

          {/* 切換開關：隱藏 Duplicate Reads */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-[12px]" style={{ color: '#cbd5e1' }}>在畫面上隱藏 Duplicate Reads</span>
            <button
              onClick={() => setHideDup((v) => !v)}
              className="relative w-10 h-5 rounded-full transition-colors shrink-0"
              style={{ backgroundColor: hideDup ? C.cyan : '#334155' }}
              aria-pressed={hideDup}
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: hideDup ? 22 : 2 }} />
            </button>
          </div>
          <div className="text-[10px] mt-1" style={{ color: C.faint }}>預設開啟：執行後自動隱藏重複讀段，方便觀察 Unique reads。</div>

          {/* 進度列 */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-mono mb-1" style={{ color: C.faint }}>
              <span>MarkDuplicates 進度</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.panelDark }}>
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: done ? C.green : C.cyan, boxShadow: `0 0 10px ${C.cyan}` }}
              />
            </div>
          </div>

          {/* 即時日誌（迷你終端） */}
          <div
            className="mt-3 rounded-lg p-2 font-mono text-[10px] leading-relaxed overflow-hidden h-[86px]"
            style={{ backgroundColor: '#0a0f18', border: '1px solid #1c2836', color: '#7dd3fc' }}
          >
            {logs.slice(-4).map((l, i) => (
              <div key={i} className="whitespace-pre-wrap">{l}</div>
            ))}
          </div>
        </div>

        {/* ---- 模組 2：三大核心品質指標 ---- */}
        <div className="flex flex-col gap-4">
          {/* 卡片 1：重複率 */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: C.panel, borderColor: C.border }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-bold" style={{ color: C.text }}>重複率 Duplication Rate</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: C.faint, backgroundColor: C.panelDark }}>Per-Library</span>
            </div>
            <div className="flex items-center gap-4">
              <Donut pct={done ? DUP_RATE : 0} center={done ? `${DUP_RATE}%` : '0.0%'} />
              <div className="flex-1">
                <div className="text-[30px] font-black font-mono leading-none" style={{ color: done ? C.orange : C.dim }}>
                  {done ? `${DUP_RATE}%` : '—'}
                </div>
                <div className="flex gap-3 mt-2 text-[10px]" style={{ color: C.dim }}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.green }} /> {UNIQUE_RATE}% Unique</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.orange }} /> {done ? DUP_RATE : 0}% Duplicate</span>
                </div>
              </div>
            </div>
            {done ? (
              <div className="mt-3 text-[11px] font-bold px-2 py-1 rounded-lg text-center" style={{ color: '#fde047', backgroundColor: 'rgba(253,224,71,0.12)', border: '1px solid rgba(253,224,71,0.35)' }}>
                ⚠ 高重複率警告 (&gt;20%)
              </div>
            ) : (
              <div className="mt-3 text-[10px] text-center" style={{ color: C.faint }}>點擊「執行 Mark Duplicates」偵測重複讀段</div>
            )}
          </div>

          {/* 卡片 2：有效覆蓋深度 */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: C.panel, borderColor: C.border }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-bold" style={{ color: C.text }}>有效覆蓋深度 Effective Coverage</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: C.faint, backgroundColor: C.panelDark }}>Before / After Dedup</span>
            </div>
            <div className="flex items-end gap-4">
              <div className="shrink-0">
                <div className="text-[10px]" style={{ color: C.faint }}>有效深度</div>
                <div className="text-[30px] font-black font-mono leading-none" style={{ color: done ? C.green : C.faint }}>{done ? `${EFF_COV}x` : '—'}</div>
                <div className="text-[11px] mt-1" style={{ color: C.dim }}>
                  原始 <span className="line-through decoration-2" style={{ color: C.faint }}>{RAW_COV}x</span>
                </div>
              </div>
              {/* 迷你柱狀圖：去重前(橘) vs 去重後(綠) */}
              <div className="flex-1">
                <div className="flex items-end gap-1 h-14">
                  {RAW_COV_BINS.map((v, i) => (
                    <div key={i} className="flex-1 flex items-end gap-px h-full">
                      <div
                        className="flex-1 rounded-t-sm"
                        title={`Raw ${v}x`}
                        style={{ height: `${(v / 14) * 100}%`, minHeight: 2, backgroundColor: C.orange, opacity: done ? 0.45 : 0.85 }}
                      />
                      {done && (
                        <div
                          className="flex-1 rounded-t-sm"
                          title={`有效 ${(v * (UNIQUE_RATE / 100)).toFixed(1)}x`}
                          style={{ height: `${((v * (UNIQUE_RATE / 100)) / 14) * 100}%`, minHeight: 2, backgroundColor: C.green, boxShadow: `0 0 6px rgba(52,211,153,0.5)` }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[9px]" style={{ color: C.faint }}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: C.orange }} /> 原始 {RAW_COV}x</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: C.green }} /> 有效 {EFF_COV}x</span>
                </div>
              </div>
            </div>
            {done && (
              <div className="mt-3 text-[10px]" style={{ color: C.green }}>
                已扣除 -{DUP_RATE}% 冗餘深度（{EFF_COV}x = {RAW_COV}x × {UNIQUE_RATE}%）
              </div>
            )}
          </div>

          {/* 卡片 3：變異頻率校正 */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: C.panel, borderColor: C.border }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-bold" style={{ color: C.text }}>變異頻率校正 VAF Calibration</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: C.faint, backgroundColor: C.panelDark }}>chr1:{VARIANT_POS.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* 原始 VAF */}
              <div className="flex-1 rounded-xl p-2 text-center" style={{ backgroundColor: C.panelDark, border: '1px solid #1c2836' }}>
                <div className="text-[9px] font-bold" style={{ color: C.faint }}>原始 VAF</div>
                <div className="text-[18px] font-black font-mono line-through decoration-2" style={{ color: '#fda4af' }}>{rawVaf}%</div>
                <div className="text-[9px] font-mono" style={{ color: C.faint }}>({variantReads}/{READS.length} reads)</div>
              </div>
              <div className="text-[20px] font-bold shrink-0" style={{ color: C.cyan }}>➜</div>
              {/* 校正後 VAF */}
              <div className="flex-1 rounded-xl p-2 text-center" style={{ backgroundColor: 'rgba(52,211,153,0.08)', border: done ? `1px solid ${C.green}` : '1px solid #1c2836' }}>
                <div className="text-[9px] font-bold" style={{ color: C.faint }}>校正後 VAF</div>
                <div className="text-[20px] font-black font-mono" style={{ color: done ? C.green : C.faint }}>{done ? `${corrVaf}%` : '—'}</div>
                <div className="text-[9px] font-mono" style={{ color: C.faint }}>({uniqueVariant}/{uniqueReads.length} unique reads)</div>
              </div>
            </div>
            {done && (
              <div className="mt-3 text-[11px] font-bold px-2 py-1 rounded-lg text-center" style={{ color: C.green, backgroundColor: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.4)' }}>
                ✓ 已成功防止假陽性 (False Positive Prevented)
              </div>
            )}
            <div className="mt-3 text-[10px] text-center" style={{ color: C.faint }}>已校正 PCR 人為擴增偏差 (PCR artifact bias)</div>
          </div>
        </div>

        {/* ---- 模組 3：SAM Read 明細表格 ---- */}
        <div className="rounded-2xl border overflow-hidden shrink-0" style={{ backgroundColor: C.panel, borderColor: C.border }}>
          <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ borderColor: C.border, backgroundColor: C.panelDark }}>
            <h4 className="text-[14px] font-bold" style={{ color: C.text }}>SAM Read 明細</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: C.dim, backgroundColor: 'rgba(0,0,0,0.25)' }}>
              {done ? 'Dedup-marked BAM' : 'Raw BAM'}
            </span>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
              <thead className="sticky top-0" style={{ backgroundColor: C.panelDark }}>
                <tr style={{ color: C.faint }}>
                  <th className="text-left py-1.5 px-3 font-bold">Read ID</th>
                  <th className="text-right py-1.5 px-3 font-bold">Pos</th>
                  <th className="text-right py-1.5 px-3 font-bold">SAM Flag</th>
                  <th className="text-left py-1.5 px-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {READS.map((r) => {
                  const marked = isMarked(r);
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderTop: '1px solid #1c2836',
                        backgroundColor: marked ? 'rgba(251,146,60,0.07)' : 'transparent',
                        opacity: phase === 'done' && marked && hideDup ? 0.55 : 1,
                      }}
                    >
                      <td className="py-1 px-3 font-mono font-bold" style={{ color: r.isVariant ? C.magenta : '#cbd5e1' }}>{r.id}</td>
                      <td className="py-1 px-3 text-right font-mono" style={{ color: C.dim }}>{(REF_START + r.start).toLocaleString()}</td>
                      <td className="py-1 px-3 text-right font-mono" style={{ color: marked ? C.orange : C.faint }}>{getSamFlag(r.strand, r.isR1, marked)}</td>
                      <td className="py-1 px-3">
                        {done ? (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: marked ? C.orange : C.green, backgroundColor: marked ? 'rgba(251,146,60,0.15)' : 'rgba(52,211,153,0.12)' }}
                          >
                            {marked ? 'Duplicate' : 'Unique'}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: C.faint, backgroundColor: 'rgba(0,0,0,0.25)' }}>待偵測</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[10px] border-t" style={{ borderColor: C.border, color: C.faint }}>
            {done
              ? `共 ${READS.length} reads · ${READS.filter((r) => r.isDup).length} 條 Duplicate（Flag 1024）已標記，${uniqueReads.length} 條 Unique 保留`
              : `共 ${READS.length} reads · 等待執行 MarkDuplicates 偵測重複`}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
