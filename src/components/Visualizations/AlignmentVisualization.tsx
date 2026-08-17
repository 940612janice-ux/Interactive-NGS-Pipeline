import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, Download, Settings, Upload } from 'lucide-react';

interface AlignmentVisualizationProps {
  onComplete?: () => void;
}

const REF_BASES = 'TGAATTTTGGATTACTAAGGAATTTACAGTACAAAAATGTACTTGTTAACACAGTGACAT';
const REF_LENGTH = REF_BASES.length;
const REF_START = 10000001;
const BASE_COLOR_MAP: Record<string, string> = { A: '#ff6b6b', C: '#ffa500', G: '#4da3ff', T: '#4cc38a' };
// 行首固定欄位（read 名稱 / Reference 標籤）寬度：對應 Tailwind w-36，Reference 與 Reads 共用，
// 確保序列起點 X 座標完全一致（標籤 pr-4 的內縮已包含在 144px 內）
const GUTTER_W = 144;
// 每個鹼基格子的寬度（單位：字元寬 ch）。Reference 與 Read 共用，改這個等於同時調整間距；
// 若想只調一邊可分別改，但會造成錯位
const CELL_CH = 2;
// 鹼基格間距：必須與 index.css 內 .ref-bases 的 gap 一致（Reference 是 flex gap: 2px），
// read 要沿用相同推進法（每格 2ch + gap），否則越往右越對不齊
const BASE_GAP_PX = 2;

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
      baseEl.className = `ref-base base-${base} w-[${CELL_CH}ch] text-center font-bold`;
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
      label.className = 'w-36 shrink-0 text-right pr-10 text-xs text-neutral-500 select-none';
      label.style.width = `${GUTTER_W}px`;
      label.textContent = `${read.id} (${read.matchCount}/${read.seq.length})`;
      row.appendChild(label);

      const bases = document.createElement('div');
      bases.className = 'flex whitespace-pre tracking-normal shrink-0';
      bases.style.letterSpacing = 'normal';
      // 與 Reference 相同的推進法：每格寬 2ch（w-[2ch]）＋ flex gap 2px，
      // 起點 offset 也是一格一格的累進（calc 混合 ch 與 px），確保越往右越不跑位
      bases.style.gap = `${BASE_GAP_PX}px`;
      bases.style.paddingLeft = `calc(${startPos * CELL_CH}ch + ${startPos * BASE_GAP_PX}px)`;
      read.seq.split('').forEach((base) => {
        const span = document.createElement('span');
        span.className = `w-[${CELL_CH}ch] text-center font-bold`;
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
    // 與 Reference 推進法一致：每格 = 格子寬(2ch) + gap(2px)
    const cellW = getCharWidth() * CELL_CH + BASE_GAP_PX;
    const col = Math.floor(x / cellW);
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
        <span class="read-id text-[12px] font-bold" style="color:#9fb0c3">${read.id}</span>
        <span class="read-seq text-[14px] font-mono tracking-normal" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:normal">${read.seq.split('').map((b) => `<span style="color:${BASE_COLOR_MAP[b] || '#ccc'}">${b}</span>`).join('')}</span>
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
      {/* Left: 檔案處理流程 */}
      <div className="alignment-left flex flex-col gap-4">
        <div className="fastqc-panel flex-1 flex flex-col rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>檔案處理</h3>
            <span className="fastqc-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>File Processing</span>
          </div>
          <div className="processing-flow flex-1 flex flex-col justify-center gap-2 min-h-0">
            {/* Input */}
            <div className="flow-card rounded-xl border p-4" style={{ backgroundColor: '#0b1220', borderColor: '#1e2a38' }}>
              <div className="flex items-center gap-2 mb-2">
                <Download size={18} style={{ color: '#4da3ff' }} />
                <span className="text-[14px] font-bold" style={{ color: '#e6e9f2' }}>輸入 (Input)</span>
              </div>
              <ul className="flow-list text-[12px] space-y-1 leading-relaxed" style={{ color: '#9fb0c3' }}>
                <li><span className="font-bold" style={{ color: '#c9ced6' }}>檔案格式：</span>Clean FASTQ</li>
                <li><span className="font-bold" style={{ color: '#c9ced6' }}>內容：</span>無座標、已過濾低品質的 DNA 定序短片段</li>
              </ul>
            </div>
            <div className="flow-arrow flex justify-center" style={{ color: '#4da3ff' }}>
              <ArrowDown size={18} strokeWidth={2.5} />
            </div>
            {/* Processing */}
            <div className="flow-card rounded-xl border p-4" style={{ backgroundColor: '#0b1220', borderColor: '#1e2a38' }}>
              <div className="flex items-center gap-2 mb-2">
                <Settings size={18} style={{ color: '#4da3ff' }} />
                <span className="text-[14px] font-bold" style={{ color: '#e6e9f2' }}>處理 (Processing)</span>
              </div>
              <ul className="flow-list text-[12px] space-y-1 leading-relaxed" style={{ color: '#9fb0c3' }}>
                <li><span className="font-bold" style={{ color: '#c9ced6' }}>工具：</span>BWA-MEM</li>
                <li><span className="font-bold" style={{ color: '#c9ced6' }}>動作：</span>將 reads 與 hg38 參考基因體對齊 (Align)，尋找座標</li>
              </ul>
            </div>
            <div className="flow-arrow flex justify-center" style={{ color: '#4da3ff' }}>
              <ArrowDown size={18} strokeWidth={2.5} />
            </div>
            {/* Output */}
            <div className="flow-card rounded-xl border p-4" style={{ backgroundColor: '#0b1220', borderColor: '#1e2a38' }}>
              <div className="flex items-center gap-2 mb-2">
                <Upload size={18} style={{ color: '#4da3ff' }} />
                <span className="text-[14px] font-bold" style={{ color: '#e6e9f2' }}>輸出 (Output)</span>
              </div>
              <ul className="flow-list text-[12px] space-y-1 leading-relaxed" style={{ color: '#9fb0c3' }}>
                <li><span className="font-bold" style={{ color: '#c9ced6' }}>原始輸出：</span>SAM 檔 (檔案體積太大，直接轉成 BAM 檔)</li>
                <li><span className="font-bold" style={{ color: '#c9ced6' }}>檔案格式：</span>Raw BAM</li>
                <li><span className="font-bold" style={{ color: '#c9ced6' }}>內容：</span>包含座標與比對品質資訊的二進位檔案</li>
              </ul>
            </div>
          </div>
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
              className="ref-sequence font-mono text-xs bg-[#080c14] border rounded-lg p-2 overflow-x-auto cursor-copy flex-1 min-h-[130px]"
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