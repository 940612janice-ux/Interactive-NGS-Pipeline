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

  function chromBands(cx: number, cy: number, h: number, w: number, r: number) {
    const top = cy - h / 2;
    const bandH = Math.max(2, Math.min(4.5, h * 0.06));
    const pBands = [0.20, 0.42, 0.68].map((f) => f * r);
    const qBands = [0.22, 0.40, 0.58, 0.76, 0.90].map((f) => r + f * (1 - r));
    return pBands.concat(qBands).map((t) => {
      const y = top + t * h;
      const hw = halfWidth(t, r) * w;
      const bw = Math.max(1.5, hw * 1.4);
      return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(y - bandH / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${bandH.toFixed(1)}" rx="1" fill="#6b64a5" opacity="0.5"/>`;
    }).join('');
  }

  const W = 940;
  const CELL_W = 110;
  const W_MAX = 9;

  const rowLayout: Array<{ row: number[]; maxH: number; y: number }> = [];
  let yCursor = 30;
  ROWS.forEach((row) => {
    const maxH = Math.max(...row.map((i) => chromHeight(CHROMOSOMES[i].size)));
    rowLayout.push({ row, maxH, y: yCursor });
    yCursor += maxH + 28;
  });
  const H = yCursor + 8;

  let shapes = '';
  let bands = '';
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
      const color = isSex ? '#ffb84d' : '#c9c2f0';
      const gap = 26;
      const rods = isSex ? [0] : [-gap, gap];

      rods.forEach((ox) => {
        shapes += `<path d="${chromPath(cx + ox, cy, h, W_MAX, chrom.cen)}" fill="${color}" stroke="#8f88cd" stroke-width="0.8" stroke-linejoin="round"/>`;
        bands += chromBands(cx + ox, cy, h, W_MAX, chrom.cen);
        labels += `<text x="${(cx + ox).toFixed(1)}" y="${(y + maxH + 20).toFixed(1)}" text-anchor="middle" font-size="${isSex ? 13 : 12}" font-weight="700" fill="${isSex ? '#ffb84d' : '#8b96ab'}">${chrom.label}</text>`;
      });
    });
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="人類正常核型，23 對染色體" style="width:100%;height:auto;">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#0a0e17"/>
      <text x="${W / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="#e6e9f2">人類正常核型 · 46,XY（參考基因體 hg38 / GRCh38）</text>
      ${shapes}
      ${bands}
      ${labels}
    </svg>
  `;
}

const REF_BASES = 'TGAATTTTGGATTACTAAGGAATTTACAGTACAAAAATGTACTTGTTAACACAGTGACAT';
const REF_LENGTH = REF_BASES.length;
const REF_START = 10000001;
const BASE_COLOR_MAP: Record<string, string> = { A: '#ff6b6b', C: '#ffa500', G: '#4da3ff', T: '#4cc38a' };
const COMPLEMENT: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };

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
  const resultRef = useRef<HTMLDivElement>(null);
  const samRef = useRef<HTMLDivElement>(null);
  const [reads, setReads] = useState<Read[]>(INITIAL_READS);
  const [alignedCount, setAlignedCount] = useState(0);
  const [samOutput, setSamOutput] = useState('');
  const [message, setMessage] = useState('');
  const readsRef2 = useRef(reads);

  useEffect(() => {
    readsRef2.current = reads;
  }, [reads]);

  const renderReference = () => {
    if (!refSeqRef.current) return;
    const el = refSeqRef.current;
    el.innerHTML = '';
    const label = document.createElement('div');
    label.className = 'ref-label text-[11px] font-bold mb-1';
    label.style.color = '#9fb0c3';
    label.textContent = `hg38 chr1: ${REF_START.toLocaleString()}–${(REF_START + REF_LENGTH - 1).toLocaleString()}`;
    el.appendChild(label);

    const basesEl = document.createElement('div');
    basesEl.className = 'ref-bases flex flex-wrap gap-[2px] whitespace-nowrap overflow-x-auto';
    basesEl.style.fontFamily = 'monospace';
    basesEl.style.fontSize = '11px';
    basesEl.style.lineHeight = '1.6';
    REF_BASES.split('').forEach((base, i) => {
      const baseEl = document.createElement('span');
      baseEl.className = `ref-base base-${base}`;
      baseEl.textContent = base;
      baseEl.style.padding = '0 1px';
      baseEl.style.borderRadius = '2px';
      baseEl.style.color = BASE_COLOR_MAP[base] || '#ccc';
      (baseEl as HTMLElement).dataset.pos = String(i);
      basesEl.appendChild(baseEl);
    });
    el.appendChild(basesEl);
  };

  const highlightAlignment = (read: Read, startPos: number): number => {
    const baseEls = refSeqRef.current?.querySelectorAll('.ref-base');
    if (!baseEls) return 0;
    let matchCount = 0;
    for (let i = 0; i < read.seq.length; i++) {
      const idx = startPos + i;
      if (idx < 0 || idx >= baseEls.length) continue;
      const el = baseEls[idx] as HTMLElement;
      el.classList.add('aligned-base');
      const refBase = REF_BASES[idx];
      const isMatch = refBase === COMPLEMENT[read.seq[i]];
      if (isMatch) {
        el.style.background = read.color;
        el.style.opacity = '0.7';
        el.style.boxShadow = `0 0 8px ${read.color}`;
        matchCount++;
      } else {
        el.style.background = 'rgba(255,255,255,0.15)';
        el.style.opacity = '0.5';
      }
    }

    if (resultRef.current) {
      const indicator = document.createElement('div');
      indicator.className = 'alignment-indicator absolute h-[4px] rounded-full';
      indicator.style.left = `${(startPos / REF_LENGTH) * 100}%`;
      indicator.style.width = `${Math.max(2, (read.seq.length / REF_LENGTH) * 100)}%`;
      indicator.style.background = read.color;
      indicator.style.top = '0';
      const span = document.createElement('span');
      span.className = 'indicator-label absolute -top-4 left-0 text-[9px] font-bold whitespace-nowrap';
      span.style.color = read.color;
      span.textContent = `${read.id} (${matchCount}/${read.seq.length})`;
      indicator.appendChild(span);
      resultRef.current.appendChild(indicator);
    }

    return matchCount;
  };

  const renderSAMOutput = (alignedReads: Read[]) => {
    if (!samRef.current) return;
    const header = '@HD\tVN:1.0\tSO:coordinate';
    const header2 = '@SQ\tSN:chr1\tLN:60';
    const lines = alignedReads
      .filter((r) => r.aligned && r.position >= 0)
      .map((r) => `${r.id}\t0\tchr1\t${REF_START + r.position}\t60\t${r.seq.length}M (${r.matchCount}/${r.seq.length} match)\t*\t0\t${r.seq.length}\t${r.seq}\t*`);
    setSamOutput([header, header2, ...lines].join('\n'));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const readIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(readIdx) || readIdx < 0 || readIdx >= readsRef2.current.length) return;
    const read = readsRef2.current[readIdx];
    if (read.aligned) return;

    const bases = refSeqRef.current?.querySelector('.ref-bases') as HTMLElement;
    const rect = refSeqRef.current?.getBoundingClientRect();
    if (!rect || !bases) return;
    const x = e.clientX - rect.left + (bases.scrollLeft || 0);
    const pos = Math.round((x / (bases.scrollWidth || rect.width)) * REF_LENGTH) - Math.floor(read.seq.length / 2);
    const clampedPos = Math.max(0, Math.min(REF_LENGTH - read.seq.length, pos));

    const newReads = readsRef2.current.map((r, i) => (i === readIdx ? { ...r, aligned: true, position: clampedPos } : r));
    const updatedRead = newReads[readIdx];
    const matchCount = highlightAlignment(updatedRead, clampedPos);
    newReads[readIdx] = { ...updatedRead, matchCount };

    const newCount = alignedCount + 1;
    setReads(newReads);
    setAlignedCount(newCount);
    setMessage(`比對中: ${read.id} → chr1:${REF_START + clampedPos} (${matchCount}/${read.seq.length} match)`);

    if (newCount === newReads.length) {
      setMessage('✅ 所有 Read 比對完成！');
      renderSAMOutput(newReads);
    }
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
        <span class="read-id text-[10px] font-bold" style="color:#9fb0c3">${read.id}</span>
        <span class="read-seq text-[11px] font-mono" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${read.seq.split('').map((b) => `<span style="color:${BASE_COLOR_MAP[b] || '#ccc'}">${b}</span>`).join('')}</span>
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

  return (
    <div className="alignment-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
        <div className="fastqc-panel flex flex-col rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Read 比對地圖</h3>
            <span className="fastqc-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>hg38 Reference</span>
          </div>
          <div className="alignment-map flex flex-col gap-2">
            <div
              ref={refSeqRef}
              className="ref-sequence bg-[#080c14] border rounded-lg p-3 overflow-x-auto cursor-copy"
              style={{ borderColor: '#1e2a38' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onWheel={(e) => {
                const bases = refSeqRef.current?.querySelector('.ref-bases') as HTMLElement;
                if (!bases || bases.scrollWidth <= bases.clientWidth) return;
                if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
                  e.preventDefault();
                  bases.scrollLeft += e.deltaY;
                }
              }}
            />
            <div ref={readsRef} className="reads-container min-h-[80px] p-2 rounded-lg" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }} />
            <div className="alignment-result relative h-[14px]" ref={resultRef} />
            <div className="alignment-legend flex flex-wrap gap-3 text-[10px]" style={{ color: '#9fb0c3' }}>
              {Object.entries(BASE_COLOR_MAP).map(([b, c]) => (
                <span key={b} className="legend-item flex items-center gap-1"><span className="legend-dot inline-block w-2 h-2 rounded-full" style={{ background: c }} /> {b}</span>
              ))}
              <span className="legend-item flex items-center gap-1"><span className="legend-dot inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} /> 不匹配 (灰)</span>
            </div>
          </div>
        </div>

        <div className="fastqc-panel flex flex-col rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>比對結果</h3>
            <span className="fastqc-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>SAM Format</span>
          </div>
          {message && <div className="text-[12px] mb-2" style={{ color: '#ffb84d' }}>{message}</div>}
          <pre className="sam-output bg-[#080c14] border rounded-lg p-3 font-mono text-[11px] leading-[1.7] overflow-auto max-h-[220px]" style={{ borderColor: '#1e2a38', color: '#c6d3e3', whiteSpace: 'pre-wrap' }}>{samOutput}</pre>
        </div>
      </div>
    </div>
  );
};