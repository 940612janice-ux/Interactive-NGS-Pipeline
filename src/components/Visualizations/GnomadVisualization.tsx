import React, { useEffect, useRef, useState } from 'react';

interface GnomadVisualizationProps {
  onComplete?: () => void;
}

interface Variant {
  id: string;
  pos: string;
  ref: string;
  alt: string;
  af: number;
  isGermline: boolean;
}

const VARIANTS: Variant[] = [
  { id: 'VAR001', pos: 'chr1:1000012', ref: 'A', alt: 'T', af: 0.45, isGermline: true },
  { id: 'VAR002', pos: 'chr1:1000023', ref: 'C', alt: 'G', af: 0.02, isGermline: false },
  { id: 'VAR003', pos: 'chr1:1000035', ref: 'G', alt: 'A', af: 0.38, isGermline: true },
  { id: 'VAR004', pos: 'chr1:1000047', ref: 'T', alt: 'C', af: 0.01, isGermline: false },
  { id: 'VAR005', pos: 'chr1:1000058', ref: 'A', alt: 'C', af: 0.52, isGermline: true },
  { id: 'VAR006', pos: 'chr1:1000072', ref: 'T', alt: 'A', af: 0.03, isGermline: false },
  { id: 'VAR007', pos: 'chr1:1000085', ref: 'C', alt: 'T', af: 0.15, isGermline: true },
  { id: 'VAR008', pos: 'chr1:1000098', ref: 'G', alt: 'T', af: 0.005, isGermline: false },
  { id: 'VAR009', pos: 'chr1:1000103', ref: 'A', alt: 'G', af: 0.28, isGermline: true },
  { id: 'VAR010', pos: 'chr1:1000115', ref: 'T', alt: 'G', af: 0.015, isGermline: false },
];

export const GnomadVisualization: React.FC<GnomadVisualizationProps> = () => {
  const [dropped, setDropped] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('等待過濾...');
  const progressFillRef = useRef<HTMLDivElement>(null);
  const filteredVcfRef = useRef<HTMLDivElement>(null);
  const rawVcfRef = useRef<HTMLDivElement>(null);
  const dragIconRef = useRef<HTMLDivElement>(null);

  const totalVariants = VARIANTS.length;
  const filteredOut = dropped ? VARIANTS.filter((v) => v.isGermline).length : 0;
  const passCount = totalVariants - filteredOut;
  const maxAF = Math.max(...VARIANTS.map((v) => v.af));

  const startFiltering = () => {
    if (dropped || filtering) return;
    setDropped(true);
    setFiltering(true);
    setPhaseLabel('🧹 開始過濾 Germline 變異...');
    if (dragIconRef.current) dragIconRef.current.style.opacity = '1';

    const germline = VARIANTS.filter((v) => v.isGermline);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= germline.length) {
        clearInterval(timer);
        setFiltering(false);
        setPhaseLabel(`✅ 過濾完成，保留 ${totalVariants - germline.length} 個 Somatic 變異`);
        if (filteredVcfRef.current) filteredVcfRef.current.style.boxShadow = '0 0 0 2px rgba(76,195,138,0.4)';
        return;
      }
      if (progressFillRef.current) progressFillRef.current.style.width = ((i + 1) / totalVariants) * 100 + '%';
      setPhaseLabel(`過濾中: ${i + 1}/${germline.length} Germline...`);
      i++;
    }, 300);
    return timer;
  };

  useEffect(() => {
    const timer = setTimeout(() => startFiltering(), 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    startFiltering();
  };

  return (
    <div className="gnomad-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="gnomad-left flex flex-col gap-4">
        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>VCF 過濾結果</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>gnomAD Population Data</span>
          </div>
          <div className="gnomad-vcf-view flex flex-col gap-1 max-h-[230px] overflow-auto">
            {VARIANTS.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-mono transition-all"
                style={{
                  backgroundColor: dropped && v.isGermline ? 'rgba(255,107,107,0.1)' : 'rgba(255,255,255,0.03)',
                  opacity: dropped && v.isGermline ? 0.3 : 1,
                }}
              >
                <span className="font-bold w-[60px]" style={{ color: v.isGermline ? '#ff6b6b' : '#4cc38a' }}>{v.id}</span>
                <span className="flex-1" style={{ color: '#c6d3e3' }}>{v.pos}</span>
                <span className="w-[20px] text-center" style={{ color: '#e8eef5' }}>{v.ref}</span>
                <span className="w-[20px] text-center" style={{ color: '#e8eef5' }}>{v.alt}</span>
                <span className="w-[40px] text-right" style={{ color: '#9fb0c3' }}>{v.af.toFixed(3)}</span>
                <span className="w-[70px] text-right font-bold" style={{ color: dropped && v.isGermline ? '#ff6b6b' : v.isGermline ? '#ff6b6b' : '#4cc38a' }}>
                  {dropped && v.isGermline ? 'FILTER' : v.isGermline ? 'Germline' : 'Somatic'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>族群頻率分佈</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>gnomAD AF Distribution</span>
          </div>
          <div className="flex items-end gap-2 h-[120px]">
            {VARIANTS.map((v) => (
              <div key={v.id} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[8px] font-mono mb-0.5" style={{ color: v.isGermline ? '#ff6b6b' : '#4cc38a' }}>{v.af.toFixed(2)}</span>
                <div className="w-full rounded-t" style={{ height: `${(v.af / maxAF) * 100}%`, background: v.isGermline ? 'rgba(255,107,107,0.7)' : 'rgba(76,195,138,0.7)', minHeight: '2px' }} title={v.id} />
              </div>
            ))}
          </div>
        </div>

        <div className="bqsr-summary flex gap-3">
          <div className="summary-stat flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>候選變異總數</span>
            <span className="stat-value text-[18px] font-bold font-mono" style={{ color: '#e8eef5' }}>{totalVariants}</span>
          </div>
          <div className="summary-stat flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>過濾後剩下</span>
            <span className="stat-value text-[18px] font-bold font-mono" style={{ color: '#4cc38a' }}>{passCount}</span>
            <span className="stat-change text-[10px] font-bold" style={{ color: '#ff6b6b' }}>{filteredOut > 0 ? `- ${(filteredOut / totalVariants * 100).toFixed(0)}%` : ''}</span>
          </div>
          <div className="summary-stat flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>過濾率</span>
            <span className="stat-value text-[18px] font-bold font-mono" style={{ color: '#ff6b6b' }}>{filteredOut > 0 ? `${(filteredOut / totalVariants * 100).toFixed(0)}%` : '0%'}</span>
          </div>
        </div>
      </div>

      <div className="gnomad-right flex flex-col gap-4">
        <div className="bqsr-file-flow flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="bqsr-file-box flex flex-col items-center p-4 flex-1 rounded-xl" ref={rawVcfRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📄</div>
            <div className="file-name text-[14px] font-bold text-center">somatic_raw.vcf</div>
            <div className="file-type text-[11px]" style={{ color: '#9fb0c3' }}>Raw VCF</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl font-bold" style={{ color: '#ffb84d' }}>→</div>
            <div ref={dragIconRef} className="text-3xl" style={{ opacity: 0, transition: 'opacity 0.5s' }}>🧹</div>
          </div>
          <div className="bqsr-file-box flex flex-col items-center p-4 flex-1 rounded-xl" ref={filteredVcfRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📄</div>
            <div className="file-name text-[13px] font-bold text-center">somatic_germline_filtered.vcf</div>
            <div className="file-type text-[11px]" style={{ color: '#4cc38a' }}>Germline-filtered VCF</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl text-[12px]" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px', color: '#9fb0c3' }}>
          <p>拖曳 gnomAD 資料庫到 VCF 中，過濾掉天生遺傳變異 (Germline)。</p>
        </div>

        <div
          className="gnomad-drag-area p-6 rounded-2xl text-center border-2 border-dashed transition-all flex-1 flex items-center justify-center"
          style={{ borderColor: dropped ? 'rgba(76,195,138,0.5)' : '#3b4b5f', backgroundColor: dropped ? 'rgba(76,195,138,0.06)' : 'rgba(255,255,255,0.02)' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div draggable className="px-5 py-3 rounded-xl text-[15px] font-bold select-none" style={{ backgroundColor: '#1b2430', borderColor: '#3b4b5f', borderWidth: '1px', color: '#e8eef5', cursor: 'grab' }}>
            <span style={{ fontSize: '20px' }}>🧬</span> gnomAD
          </div>
        </div>

        <div className="gnomad-progress p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" ref={progressFillRef} style={{ backgroundColor: '#ff6b6b', width: '0%' }} />
          </div>
          <div className="progress-label text-center text-[12px]" style={{ color: '#c6d3e3' }}>{phaseLabel}</div>
        </div>
      </div>
    </div>
  );
};