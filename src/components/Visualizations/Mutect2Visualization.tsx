import React, { useEffect, useRef, useState } from 'react';

interface Mutect2VisualizationProps {
  onComplete?: () => void;
}

const REF_START = 10000001;
const REGION_LENGTH = 120;
const BASE_COLORS: Record<string, string> = { A: '#ff6b6b', T: '#4da3ff', C: '#4cc38a', G: '#ffb84d' };

const NORMAL_READS = [
  { start: 10, len: 30, seq: 'TGAATTTTGGATTACTAAGGAATTTACA' },
  { start: 20, len: 25, seq: 'GAATTTTGGATTACTAAGGAATTTAC' },
  { start: 40, len: 28, seq: 'TTTTGGATTACTAAGGAATTTACAGTAC' },
  { start: 55, len: 30, seq: 'GAATTTACAGTACAAAAATGTACTTG' },
  { start: 75, len: 25, seq: 'TTACAGTACAAAAATGTACTTGTTAA' },
  { start: 90, len: 28, seq: 'GTACAAAAATGTACTTGTTAACACAG' },
];

interface TumorRead {
  start: number;
  len: number;
  seq: string;
  somatic: boolean;
  mutPos?: number[];
}

const TUMOR_READS: TumorRead[] = [
  { start: 10, len: 30, seq: 'TGAATTTTGGATTACTAAGGAATTTACA', somatic: false },
  { start: 12, len: 25, seq: 'GAATTTTGGATTACTAAGGAATTTA', somatic: false },
  { start: 38, len: 28, seq: 'TTTTGGATTACTAAGGAATTTGAGTAC', somatic: true, mutPos: [22] },
  { start: 55, len: 30, seq: 'GAATTTACAGTACAAAAATGTACTTG', somatic: false },
  { start: 73, len: 25, seq: 'TTACAGTACAAAAATGTACTTGTTA', somatic: true, mutPos: [14] },
  { start: 90, len: 28, seq: 'GTACAAAAATGTACTTGTTAACACAG', somatic: false },
  { start: 100, len: 20, seq: 'TGTACTTGTTAACACAGTGA', somatic: true, mutPos: [5] },
];

const SVG_WIDTH = 500;
const TRACK_HEIGHT = 50;
const READ_HEIGHT = 16;
const READ_SPACING = 8;

function renderTrackSvg(reads: Array<{ start: number; len: number; seq: string; somatic?: boolean; mutPos?: number[] }>, trackName: string, isTumor: boolean): string {
  const defsId = 'glow-' + Math.random().toString(36).substr(2, 9);
  const maxY = reads.length * (READ_HEIGHT + READ_SPACING) + 8;
  const svgH = TRACK_HEIGHT + 30;
  let rects = '';
  let texts = '';
  let ids = '';

  reads.forEach((read, idx) => {
    const y = 8 + (idx * (READ_HEIGHT + READ_SPACING));
    const bgWidth = (read.len / REGION_LENGTH) * SVG_WIDTH;
    const bgX = (read.start / REGION_LENGTH) * SVG_WIDTH;

    rects += `<rect x="${bgX}" y="${y}" width="${bgWidth}" height="${READ_HEIGHT}" rx="2" fill="#1a2535" stroke="#3b4b5f" stroke-width="1"/>`;

    for (let b = 0; b < read.seq.length; b++) {
      const base = read.seq[b];
      const color = BASE_COLORS[base] || '#fff';
      let attrs = `fill="${color}"`;
      if (isTumor && read.somatic && read.mutPos && read.mutPos.includes(b)) {
        attrs = `font-weight="bold" fill="#ff6b6b" filter="url(#${defsId})"`;
      }
      texts += `<text x="${(bgX + (b / read.len) * bgWidth).toFixed(1)}" y="${(y + READ_HEIGHT / 1.3).toFixed(1)}" font-size="7" font-family="monospace" text-anchor="middle" ${attrs}>${base}</text>`;
    }

    ids += `<text x="4" y="${(y + READ_HEIGHT / 1.3).toFixed(1)}" font-size="7" font-family="monospace" fill="${isTumor ? '#ff6b6b' : '#4da3ff'}" opacity="0.7">${trackName}${idx + 1}</text>`;
  });

  const h = Math.max(svgH, maxY + 8);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${h}" style="width:100%;height:auto;cursor:pointer">
      <defs>
        <filter id="${defsId}">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      ${rects}${texts}${ids}
    </svg>
  `;
}

export const Mutect2Visualization: React.FC<Mutect2VisualizationProps> = () => {
  const [discovered, setDiscovered] = useState<TumorRead[]>([]);
  const [phaseLabel, setPhaseLabel] = useState('比對 Tumor vs Normal...');
  const progressFillRef = useRef<HTMLDivElement>(null);
  const vcfFileRef = useRef<HTMLDivElement>(null);
  const rawBamRef = useRef<HTMLDivElement>(null);
  const tumorSvgRef = useRef<HTMLDivElement>(null);
  const discoveredRef = useRef(discovered);
  discoveredRef.current = discovered;

  const somaticVariants = TUMOR_READS.filter((r) => r.somatic).map((r) => ({ ...r, chrPos: REF_START + r.start }));
  const showable = discovered.length === 0 ? somaticVariants : discovered;

  const handleTumorClick = (e: React.MouseEvent) => {
    if (discoveredRef.current.length >= somaticVariants.length) return;
    const rect = tumorSvgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const relX = (x / rect.width) * REGION_LENGTH;
    const clickedRead = TUMOR_READS.find((r) => r.start <= relX && relX < r.start + r.len);
    if (clickedRead && clickedRead.somatic) {
      if (!discoveredRef.current.some((d) => d === clickedRead)) {
        setDiscovered((prev) => [...prev, clickedRead]);
      }
    }
  };

  useEffect(() => {
    const phases = [
      { label: '📦 載入 Analysis-ready BAM...', time: 800 },
      { label: '🔍 正在比對 Tumor vs Normal...', time: 1000 },
      { label: '⚡ 發現體細胞突變位點...', time: 800 },
      { label: '✅ 輸出 Raw VCF (候選突變)', time: 500 },
    ];
    let i = 0;
    const runNext = () => {
      if (i >= phases.length) {
        setPhaseLabel(`✅ 比對完成，發現 ${somaticVariants.length} 個體細胞突變`);
        if (vcfFileRef.current) vcfFileRef.current.style.boxShadow = '0 0 0 2px rgba(76,195,138,0.4)';
        return;
      }
      const phase = phases[i];
      setPhaseLabel(phase.label);
      if (progressFillRef.current) progressFillRef.current.style.width = ((i + 1) / phases.length) * 100 + '%';
      if (i === 0 && rawBamRef.current) rawBamRef.current.style.boxShadow = '0 0 0 2px rgba(77,163,255,0.4)';
      i++;
      setTimeout(runNext, phase.time);
    };
    const t = setTimeout(runNext, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mutect2-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="mutect2-left flex flex-col gap-4">
        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>IGV 雙軌對比圖</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>Tumor vs Matched Normal</span>
          </div>
          <div className="mutect2-igv flex flex-col gap-2">
            <div className="igv-track flex flex-col bg-[#080c14] border rounded-lg p-1" style={{ borderColor: '#1e2a38' }}>
              <div className="text-[10px] font-bold px-1 mb-0.5" style={{ color: '#4da3ff' }}>Normal</div>
              <div dangerouslySetInnerHTML={{ __html: renderTrackSvg(NORMAL_READS, 'Normal', false) }} />
            </div>
            <div className="igv-track flex flex-col bg-[#080c14] border rounded-lg p-1" style={{ borderColor: '#1e2a38' }}>
              <div className="text-[10px] font-bold px-1 mb-0.5" style={{ color: '#ff6b6b' }}>Tumor</div>
              <div ref={tumorSvgRef} onClick={handleTumorClick} dangerouslySetInnerHTML={{ __html: renderTrackSvg(TUMOR_READS, 'Tumor', true) }} />
            </div>
            <div className="relative h-4">
              {[0, 20, 40, 60, 80, 100, 120].map((i) => (
                <span key={i} className="absolute text-[9px] font-mono" style={{ left: `${(i / REGION_LENGTH) * 100}%`, transform: 'translateX(-50%)', color: '#6b7b8c' }}>{(REF_START + i).toLocaleString()}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5 flex-1 flex flex-col" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Somatic Variant 清單</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>{discovered.length} / {somaticVariants.length} 已發現</span>
          </div>
          <div className="mutect2-variants flex-1 overflow-auto flex flex-col gap-2">
            {showable.map((v, idx) => (
              <div key={idx} className="mutect2-variant-item p-2.5 rounded-lg" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px', opacity: discovered.length > 0 && !discovered.includes(v) ? 0.35 : 1 }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold" style={{ color: '#ff6b6b' }}>SOMATIC_{idx + 1}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(76,195,138,0.15)', color: '#4cc38a' }}>PASS</span>
                </div>
                <div className="text-[11px] font-mono" style={{ color: '#ff6b6b' }}>Tumor: {v.seq}</div>
                <div className="text-[10px]" style={{ color: '#9fb0c3' }}>Position: {REF_START + v.start}-{REF_START + v.start + v.len - 1}</div>
                {v.mutPos?.map((pos, pi) => {
                  const refBase = 'ACGT'[Math.floor(Math.random() * 4)];
                  const altBase = v.seq[pos];
                  return (
                    <div key={pi} className="text-[11px] font-mono mt-0.5">
                      <span style={{ color: '#9fb0c3' }}>chr1:{REF_START + v.start + pos} </span>
                      <span style={{ color: '#c6d3e3' }}>{refBase}→</span>
                      <span style={{ color: '#ff6b6b', fontWeight: 700 }}>{altBase}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mutect2-right flex flex-col gap-4">
        <div className="bqsr-file-flow flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="bqsr-file-box flex flex-col items-center p-4 flex-1 rounded-xl" ref={rawBamRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📦</div>
            <div className="file-name text-[14px] font-bold text-center">sample.recal.bam</div>
            <div className="file-type text-[11px]" style={{ color: '#9fb0c3' }}>Analysis-ready BAM</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl font-bold" style={{ color: '#ffb84d' }}>→</div>
            <div className="text-3xl animate-pulse">🔍</div>
          </div>
          <div className="bqsr-file-box flex flex-col items-center p-4 flex-1 rounded-xl" ref={vcfFileRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📄</div>
            <div className="file-name text-[14px] font-bold text-center">somatic_raw.vcf</div>
            <div className="file-type text-[11px]" style={{ color: '#4cc38a' }}>Raw VCF</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl text-[12px]" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px', color: '#9fb0c3' }}>
          <p>點擊 Tumor 軌道上的 reads，可將與 Normal 不同的位置 high-light 為體細胞突變。</p>
        </div>

        <div className="mutect2-progress p-4 rounded-2xl flex-1 flex flex-col justify-center" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" ref={progressFillRef} style={{ backgroundColor: '#ff6b6b', width: '0%' }} />
          </div>
          <div className="progress-label text-center text-[13px] font-medium" style={{ color: '#c6d3e3' }}>{phaseLabel}</div>
        </div>
      </div>
    </div>
  );
};