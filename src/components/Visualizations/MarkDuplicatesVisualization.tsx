import React, { useEffect, useRef, useState } from 'react';
import { generateRandomSequence } from '../../hooks/useUtils';

interface MarkDuplicatesVisualizationProps {
  onComplete?: () => void;
}

const READ_FLAG_DUPLICATE = 1024;
const REF_START = 10000001;
const REF_LENGTH = 120;
const COLORS = ['#4da3ff', '#7a6bff', '#4cc38a', '#ffb84d'];

const POSITIONS = [
  { start: 5, len: 60, dup: 1 },
  { start: 10, len: 55, dup: 2 },
  { start: 20, len: 60, dup: 1 },
  { start: 35, len: 50, dup: 2 },
  { start: 50, len: 60, dup: 1 },
  { start: 60, len: 55, dup: 0 },
  { start: 70, len: 50, dup: 1 },
  { start: 80, len: 60, dup: 2 },
  { start: 90, len: 55, dup: 1 },
  { start: 100, len: 50, dup: 0 },
  { start: 5, len: 55, dup: 0 },
  { start: 15, len: 60, dup: 0 },
  { start: 40, len: 50, dup: 1 },
  { start: 55, len: 60, dup: 0 },
  { start: 78, len: 50, dup: 1 },
];

interface DupRead {
  id: string;
  start: number;
  length: number;
  seq: string;
  isDuplicate: boolean;
  isMarked: boolean;
  color: string;
  flag: number;
  chrPos: number;
  _rowTop?: number;
}

function buildReads(): DupRead[] {
  const reads: DupRead[] = [];
  let counter = 0;
  POSITIONS.forEach((pos) => {
    counter++;
    reads.push({
      id: 'READ_' + String(counter).padStart(3, '0'),
      start: pos.start,
      length: pos.len,
      seq: generateRandomSequence(pos.len),
      isDuplicate: false,
      isMarked: false,
      color: COLORS[counter % COLORS.length],
      flag: 0,
      chrPos: REF_START + pos.start,
    });
    for (let d = 0; d < pos.dup; d++) {
      counter++;
      reads.push({
        id: 'READ_' + String(counter).padStart(3, '0'),
        start: pos.start,
        length: pos.len,
        seq: generateRandomSequence(pos.len),
        isDuplicate: true,
        isMarked: false,
        color: '#ff6b6b',
        flag: 0,
        chrPos: REF_START + pos.start,
      });
    }
  });
  reads.sort((a, b) => a.start - b.start);
  return reads;
}

export const MarkDuplicatesVisualization: React.FC<MarkDuplicatesVisualizationProps> = () => {
  const [reads, setReads] = useState<DupRead[]>(() => buildReads());
  const [markedCount, setMarkedCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('等待標記重複 reads...');
  const readsBoardRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);

  const totalReads = reads.length;
  const dupCount = reads.filter((r) => r.isDuplicate).length;
  const dupRate = (dupCount / totalReads) * 100;

  const markAsDuplicate = (idx: number) => {
    const read = reads[idx];
    if (read.isMarked || !read.isDuplicate) return;
    const next = reads.map((r, i) => (i === idx ? { ...r, isMarked: true, flag: READ_FLAG_DUPLICATE } : r));
    setReads(next);
    setMarkedCount((c) => c + 1);
  };

  const autoMarkAll = () => {
    if (markedCount >= dupCount) return;
    setPhaseLabel('📝 正在標記所有 PCR Duplicates...');
    const toMark = reads.map((r, i) => ({ r, i })).filter(({ r }) => r.isDuplicate && !r.isMarked).map(({ i }) => i);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= toMark.length) {
        clearInterval(timer);
        return;
      }
      markAsDuplicate(toMark[i]);
      i++;
    }, 200);
  };

  const renderFlagTable = () => {
    return (
      <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#9fb0c3', borderBottom: '1px solid #2e4154' }}>
            <th className="text-left py-1.5 px-1">QName</th>
            <th className="text-right py-1.5 px-1">Flag</th>
            <th className="text-left py-1.5 px-1">RNAME</th>
            <th className="text-right py-1.5 px-1">POS</th>
            <th className="text-right py-1.5 px-1">LEN</th>
            <th className="text-left py-1.5 px-1">Duplicate</th>
          </tr>
        </thead>
        <tbody>
          {reads.map((read, idx) => {
            const flagVal = read.isMarked ? READ_FLAG_DUPLICATE : 0;
            let dupText = '—';
            let dupColor = '#6b7b8c';
            if (read.isMarked) {
              dupText = '✓ DUP (1024)';
              dupColor = '#ff6b6b';
            } else if (read.isDuplicate) {
              dupText = '⚑ (click to mark)';
              dupColor = '#ffb84d';
            }
            return (
              <tr key={read.id} style={{ borderBottom: '1px solid #1e2a38', opacity: read.isMarked ? 0.6 : 1, background: read.isMarked ? 'rgba(255,107,107,0.06)' : 'transparent' }}>
                <td className="py-1 px-1 font-mono font-bold" style={{ color: read.color }}>{read.id}</td>
                <td className="py-1 px-1 text-right font-mono">{flagVal}</td>
                <td className="py-1 px-1 font-mono">chr1</td>
                <td className="py-1 px-1 text-right font-mono">{read.chrPos}</td>
                <td className="py-1 px-1 text-right font-mono">{read.length}</td>
                <td className="py-1 px-1" style={{ color: dupColor }}>
                  <button className="border-none bg-transparent p-0 font-inherit text-[11px]" style={{ color: dupColor, cursor: read.isMarked || !read.isDuplicate ? 'default' : 'pointer' }} onClick={() => markAsDuplicate(idx)}>
                    {dupText}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const uniqueCount = totalReads - dupCount;
  const uniquePct = (uniqueCount / totalReads) * 100;

  const renderCoverage = () => {
    const bins = 12;
    const binSize = Math.ceil(REF_LENGTH / bins);
    const rawCoverage = new Array(bins).fill(0);
    reads.forEach((read) => {
      const startBin = Math.floor(read.start / binSize);
      const endBin = Math.min(bins - 1, Math.floor((read.start + read.length - 1) / binSize));
      for (let b = startBin; b <= endBin; b++) rawCoverage[b] += 1;
    });
    const dedupCoverage = new Array(bins).fill(0);
    reads.forEach((read) => {
      if (read.isMarked) return;
      const startBin = Math.floor(read.start / binSize);
      const endBin = Math.min(bins - 1, Math.floor((read.start + read.length - 1) / binSize));
      for (let b = startBin; b <= endBin; b++) dedupCoverage[b] += 1;
    });
    const maxRaw = Math.max(...rawCoverage, 1);
    const maxDedup = Math.max(...dedupCoverage, 1);
    const rawAvg = (rawCoverage.reduce((a, b) => a + b, 0) / bins).toFixed(1);
    const dedupAvg = (dedupCoverage.reduce((a, b) => a + b, 0) / bins).toFixed(1);
    const covReduction = ((parseFloat(rawAvg) - parseFloat(dedupAvg)) / parseFloat(rawAvg) * 100).toFixed(1);

    const bars = (arr: number[], max: number, colorFn: (v: number) => string) =>
      arr.map((val, i) => (
        <div key={i} className="cov-bar flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
          <div className="rounded-t w-full" style={{ height: `${val > 0 ? (val / max) * 100 : 2}%`, background: colorFn(val), minHeight: val > 0 ? 2 : 2 }} title={`${val}x`} />
          <span className="text-[8px] font-mono" style={{ color: '#6b7b8c' }}>{val}</span>
        </div>
      ));

    return { rawAvg, dedupAvg, covReduction, rawBars: bars(rawCoverage, maxRaw, () => 'rgba(255, 184, 77, 0.7)'), dedupBars: bars(dedupCoverage, maxDedup, (v) => v === 0 ? 'rgba(255, 107, 107, 0.15)' : 'rgba(76, 195, 138, 0.7)') };
  };

  const cov = renderCoverage();

  const renderBoard = () => {
    const rows: Array<{ top: number; reads: DupRead[] }> = [];
    reads.forEach((read) => {
      let placed = false;
      for (const row of rows) {
        const overlap = row.reads.some((r) => !(read.start + read.length <= r.start || r.start + r.length <= read.start));
        if (!overlap) {
          row.reads.push(read);
          read._rowTop = row.top;
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push({ top: rows.length * 22, reads: [read] });
        read._rowTop = rows[rows.length - 1].top;
      }
    });
    return rows;
  };

  const boardRows = renderBoard();

  useEffect(() => {
    const phases = [
      { label: '📦 載入 Raw BAM ...', progress: 20 },
      { label: '🔍 掃描座標與長度 ...', progress: 40 },
      { label: '♻️ 偵測 PCR Duplicates ...', progress: 70 },
      { label: '📝 標記 Duplicate Flag (1024) ...', progress: 100 },
    ];
    let phase = 0;
    const timer = setInterval(() => {
      if (phase < phases.length) {
        setPhaseLabel(phases[phase].label);
        if (progressFillRef.current) progressFillRef.current.style.width = phases[phase].progress + '%';
        phase++;
      } else {
        clearInterval(timer);
        setReady(true);
        setPhaseLabel(`等待標記重複 reads... (${dupCount} duplicates found)`);
      }
    }, 700);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pct = markedCount > 0 ? (markedCount / dupCount) * 100 : 0;
    if (progressFillRef.current) progressFillRef.current.style.width = pct + '%';
    if (markedCount === dupCount) {
      setPhaseLabel('✅ 所有 Duplicates 已標記完成！');
    } else if (markedCount > 0) {
      setPhaseLabel(`標記進度: ${markedCount} / ${dupCount} duplicates (${pct.toFixed(0)}%)`);
    }
  }, [markedCount, dupCount]);

  return (
    <div className="mark-duplicates-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="mark-duplicates-left flex flex-col gap-4">
        <div className="fastqc-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Duplicate Reads (SAM Flag 1024)</h3>
            <span className="fastqc-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>PCR Duplicate</span>
          </div>
          <div className="dup-flag-table overflow-auto max-h-[190px]">{renderFlagTable()}</div>
        </div>

        <div className="fastqc-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Duplication Rate</h3>
            <span className="fastqc-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>Per-Library</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px]" style={{ color: '#9fb0c3' }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(76,195,138,0.8)' }} /> Unique
            </div>
            <div className="flex items-center gap-1 text-[10px]" style={{ color: '#9fb0c3' }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,107,107,0.8)' }} /> Duplicate
            </div>
          </div>
          <div className="flex h-[90px] gap-1 items-end mt-2">
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="w-full rounded-t text-center text-[9px]" style={{ height: `${uniquePct}%`, background: 'rgba(76,195,138,0.8)', minHeight: '2px' }}>{uniquePct.toFixed(1)}%</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="w-full rounded-t text-center text-[9px]" style={{ height: `${dupRate}%`, background: 'rgba(255,107,107,0.8)', minHeight: '2px' }}>{dupRate.toFixed(1)}%</div>
            </div>
          </div>
          <div className="text-[11px] mt-2" style={{ color: '#9fb0c3' }}>{dupRate.toFixed(1)}% duplication · {dupCount} / {totalReads} reads</div>
        </div>

        <div className="fastqc-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Real Coverage</h3>
            <span className="fastqc-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>Before / After Dedup</span>
          </div>
          <div className="coverage-panel flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: '#9fb0c3' }}>Raw Coverage</span>
              <span className="font-mono" style={{ color: '#ffb84d' }}>Avg: {cov.rawAvg}x</span>
            </div>
            <div className="flex items-end gap-1 h-[56px]">{cov.rawBars}</div>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: '#9fb0c3' }}>Dedup Coverage</span>
              <span className="font-mono" style={{ color: '#4cc38a' }}>Avg: {cov.dedupAvg}x</span>
            </div>
            <div className="flex items-end gap-1 h-[56px]">{cov.dedupBars}</div>
          </div>
        </div>

        <div className="fastqc-summary flex gap-3">
          <div className="summary-stat flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>Total Reads</span>
            <span className="stat-value text-[18px] font-bold font-mono" style={{ color: '#e8eef5' }}>{totalReads}</span>
          </div>
          <div className="summary-stat flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>Duplicate Reads</span>
            <span className="stat-value text-[18px] font-bold font-mono" style={{ color: '#ff6b6b' }}>{markedCount}</span>
            <span className="stat-change text-[10px] font-bold" style={{ color: '#4cc38a' }}>{dupCount - markedCount > 0 ? `- ${((dupCount - markedCount) / totalReads * 100).toFixed(1)}%` : '0%'}</span>
          </div>
          <div className="summary-stat flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>Coverage</span>
            <span className="stat-value text-[18px] font-bold font-mono" style={{ color: '#e8eef5' }}>{cov.covReduction}% ↓</span>
          </div>
        </div>
      </div>

      <div className="mark-duplicates-right flex flex-col gap-4">
        <div className="trimming-file-flow flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="trim-file-box flex flex-col items-center p-4 flex-1 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📦</div>
            <div className="file-name text-[14px] font-bold text-center">sample.bam</div>
            <div className="file-type text-[11px]" style={{ color: '#9fb0c3' }}>Raw BAM</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl font-bold" style={{ color: '#ffb84d' }}>→</div>
            <div className="text-3xl animate-bounce">📝</div>
          </div>
          <div className="trim-file-box flex flex-col items-center p-4 flex-1 rounded-xl transition-all" style={{ backgroundColor: '#0f1520', borderColor: markedCount === dupCount && dupCount > 0 ? '#4cc38a' : '#1e2a38', borderWidth: '1px', boxShadow: markedCount === dupCount && dupCount > 0 ? '0 0 0 2px rgba(76,195,138,0.4)' : 'none' }}>
            <div className="file-icon text-4xl mb-2">📦</div>
            <div className="file-name text-[14px] font-bold text-center">sample.dupmarked.bam</div>
            <div className="file-type text-[11px]" style={{ color: '#4cc38a' }}>Dup-marked BAM</div>
          </div>
        </div>

        <div className="dup-game-panel flex flex-col gap-3 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <h4 className="text-[14px] font-bold" style={{ color: '#ffb84d' }}>Stamp Duplicates 遊戲</h4>
          <p className="text-[11px]" style={{ color: '#9fb0c3' }}>點擊相同起始位置與長度的重複 reads，標記 Duplicate Flag (1024)</p>
          <div className="relative bg-[#080c14] border rounded-xl p-3 overflow-hidden" style={{ borderColor: '#1e2a38', minHeight: '170px' }}>
            <div className="relative h-1 bg-[#1e2a38] rounded mb-1" />
            <div className="relative h-4 mb-1">
              {[0, 20, 40, 60, 80, 100, 120].map((t) => (
                <span key={t} className="absolute text-[9px] font-mono" style={{ left: `${(t / REF_LENGTH) * 100}%`, color: '#6b7b8c', transform: 'translateX(-50%)' }}>{t}</span>
              ))}
            </div>
            <div ref={readsBoardRef} className="relative" style={{ height: boardRows.length * 22 + 10 }}>
              {reads.map((read, idx) => {
                const relStart = (read.start / REF_LENGTH) * 100;
                const relWidth = Math.max(2, (read.length / REF_LENGTH) * 100);
                let bg = read.color + '20';
                let border = read.color;
                let statusText = 'UNIQUE';
                let statusColor = '#6b7b8c';
                if (read.isMarked) {
                  bg = 'rgba(255,107,107,0.25)';
                  border = '#ff6b6b';
                  statusText = 'DUP 1024';
                  statusColor = '#ff6b6b';
                } else if (read.isDuplicate) {
                  bg = 'rgba(255,107,107,0.15)';
                  border = '#ffb84d';
                  statusText = 'DUPLICATE';
                  statusColor = '#ffb84d';
                }
                return (
                  <button
                    key={read.id}
                    className="absolute border rounded px-1.5 py-0.5 text-[9px] text-left transition-all"
                    style={{
                      left: `${relStart}%`,
                      width: `${relWidth}%`,
                      top: `${read._rowTop ?? 0}px`,
                      background: bg,
                      borderColor: border,
                      opacity: read.isMarked ? 0.5 : 1,
                      cursor: read.isMarked || !read.isDuplicate ? 'default' : 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: '30px',
                    }}
                    onClick={() => markAsDuplicate(idx)}
                    title={`${read.id} · ${read.chrPos}-${read.chrPos + read.length}`}
                  >
                    <span style={{ color: read.color }}>{read.id} </span>
                    <span style={{ color: statusColor }}>{statusText}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg text-[13px] font-bold disabled:opacity-40"
              style={{ backgroundColor: '#ff6b6b', color: '#0f1520' }}
              disabled={!ready || markedCount >= dupCount}
              onClick={autoMarkAll}
            >
              {markedCount >= dupCount ? '全部標記完成' : '一鍵標記全部'}
            </button>
            <span className="text-[11px] flex-1" style={{ color: '#9fb0c3' }}>
              {markedCount >= dupCount && dupCount > 0 ? '🎉 完成！標記進度: 100%' : `已標記 ${markedCount} / ${dupCount} 個 Duplicates`}
            </span>
          </div>
        </div>

        <div className="trimming-progress p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" ref={progressFillRef} style={{ backgroundColor: '#ffb84d', width: '0%' }} />
          </div>
          <div className="progress-label text-center text-[12px]" style={{ color: '#c6d3e3' }}>{phaseLabel}</div>
        </div>
      </div>
    </div>
  );
};