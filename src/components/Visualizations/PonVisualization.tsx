import React, { useEffect, useRef, useState } from 'react';

interface PonVisualizationProps {
  onComplete?: () => void;
}

interface Variant {
  id: string;
  pos: string;
  ref: string;
  alt: string;
  isArtifact: boolean;
  pass: boolean;
}

const VARIANTS: Variant[] = [
  { id: 'VAR001', pos: 'chr1:1000012', ref: 'A', alt: 'T', isArtifact: true, pass: false },
  { id: 'VAR002', pos: 'chr1:1000023', ref: 'C', alt: 'G', isArtifact: false, pass: true },
  { id: 'VAR003', pos: 'chr1:1000035', ref: 'G', alt: 'A', isArtifact: true, pass: false },
  { id: 'VAR004', pos: 'chr1:1000047', ref: 'T', alt: 'C', isArtifact: false, pass: true },
  { id: 'VAR005', pos: 'chr1:1000058', ref: 'A', alt: 'C', isArtifact: true, pass: false },
  { id: 'VAR006', pos: 'chr1:1000072', ref: 'T', alt: 'A', isArtifact: false, pass: true },
  { id: 'VAR007', pos: 'chr1:1000085', ref: 'C', alt: 'T', isArtifact: true, pass: false },
  { id: 'VAR008', pos: 'chr1:1000098', ref: 'G', alt: 'T', isArtifact: false, pass: true },
];

export const PonVisualization: React.FC<PonVisualizationProps> = () => {
  const [dropped, setDropped] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('等待過濾...');
  const progressFillRef = useRef<HTMLDivElement>(null);
  const finalVcfRef = useRef<HTMLDivElement>(null);
  const gnomadVcfRef = useRef<HTMLDivElement>(null);
  const filterIconRef = useRef<HTMLDivElement>(null);

  const total = VARIANTS.length;
  const artifactCount = VARIANTS.filter((v) => v.isArtifact).length;
  const passCount = total - artifactCount;
  const passVariants = VARIANTS.filter((v) => v.pass || (!dropped && !v.isArtifact));

  const startFiltering = () => {
    if (dropped) return;
    setDropped(true);
    setPhaseLabel('🛡️ 開始過濾平台噪聲...');
    if (filterIconRef.current) filterIconRef.current.style.opacity = '1';

    const artifacts = VARIANTS.filter((v) => v.isArtifact);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= artifacts.length) {
        clearInterval(timer);
        setPhaseLabel(`✅ 過濾完成，保留 ${passCount} 個 PASS 變異`);
        if (finalVcfRef.current) finalVcfRef.current.style.boxShadow = '0 0 0 2px rgba(76,195,138,0.4)';
        return;
      }
      if (progressFillRef.current) progressFillRef.current.style.width = ((i + 1) / total) * 100 + '%';
      setPhaseLabel(`過濾中: ${i + 1}/${artifacts.length} 噪聲...`);
      i++;
    }, 300);
    return timer;
  };

  useEffect(() => {
    const phases = [
      { label: '📦 載入 Germline-filtered VCF...', phase: 1, wait: 600 },
      { label: '🧹 比對 Panel of Normals...', phase: 2, wait: 700 },
      { label: '🛡️ 過濾平台技術雜訊...', phase: 3, wait: 800 },
      { label: '✅ 輸出 PASS VCF!', phase: 4, wait: 400 },
    ];
    let i = 0;
    const runNext = () => {
      if (i >= phases.length) {
        if (finalVcfRef.current) finalVcfRef.current.style.boxShadow = '0 0 0 2px rgba(76,195,138,0.4)';
        return;
      }
      const phase = phases[i];
      setPhaseLabel(phase.label);
      if (progressFillRef.current) progressFillRef.current.style.width = ((i + 1) / phases.length) * 100 + '%';
      if (phase.phase === 1 && gnomadVcfRef.current) gnomadVcfRef.current.style.boxShadow = '0 0 0 2px rgba(77,163,255,0.4)';
      i++;
      setTimeout(runNext, phase.wait);
    };
    const t = setTimeout(runNext, 300);
    const t2 = setTimeout(() => startFiltering(), 2000);
    return () => { clearTimeout(t); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    startFiltering();
  };

  return (
    <div className="pon-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="pon-left flex flex-col gap-4">
        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>PoN 噪聲過濾</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>Panel of Normals</span>
          </div>
          <div className="flex flex-col gap-2">
            {VARIANTS.map((v) => (
              <div key={v.id} className="flex items-center gap-2">
                <span className="w-[60px] font-mono text-[11px] font-bold" style={{ color: v.isArtifact ? '#ff6b6b' : '#4cc38a' }}>{v.id}</span>
                <div className="flex-1 h-[26px] rounded flex items-center px-2" style={{ backgroundColor: '#0f1520' }}>
                  <div className="h-[14px] rounded" style={{ width: v.isArtifact ? '60%' : '30%', background: v.isArtifact ? '#ff6b6b' : '#4cc38a' }} />
                </div>
                <span className="text-[10px] w-[70px] text-right" style={{ color: v.isArtifact ? '#ff6b6b' : '#4cc38a' }}>
                  {v.isArtifact ? '平台噪聲' : '真實突變'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5 flex-1 flex flex-col" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>PoN 篩選結果</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>{passVariants.length} 候選</span>
          </div>
          <div className="pon-variants flex-1 overflow-auto flex flex-col gap-1.5">
            {VARIANTS.map((v) => {
              const isFiltered = dropped && v.isArtifact;
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-[11px] font-mono"
                  style={{ backgroundColor: isFiltered ? 'rgba(255,107,107,0.1)' : '#0f1520', opacity: isFiltered ? 0.3 : 1 }}
                >
                  <span className="font-bold w-[60px]" style={{ color: v.isArtifact ? '#ff6b6b' : '#4cc38a' }}>{v.id}</span>
                  <span className="flex-1" style={{ color: '#c6d3e3' }}>{v.pos}</span>
                  <span style={{ color: '#e8eef5' }}>{v.ref}→{v.alt}</span>
                  <span className="w-[60px] text-right font-bold" style={{ color: isFiltered ? '#ff6b6b' : v.pass ? '#4cc38a' : '#ffb84d' }}>
                    {isFiltered ? 'FILTER' : v.pass ? 'PASS' : '候選'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pon-right flex flex-col gap-4">
        <div className="bqsr-file-flow flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="bqsr-file-box flex flex-col items-center p-4 flex-1 rounded-xl" ref={gnomadVcfRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📄</div>
            <div className="file-name text-[13px] font-bold text-center">somatic_filtered.vcf</div>
            <div className="file-type text-[11px]" style={{ color: '#9fb0c3' }}>Germline-filtered VCF</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl font-bold" style={{ color: '#ffb84d' }}>→</div>
            <div ref={filterIconRef} className="text-3xl" style={{ opacity: 0, transition: 'opacity 0.5s' }}>🛡️</div>
          </div>
          <div className="bqsr-file-box flex flex-col items-center p-4 flex-1 rounded-xl" ref={finalVcfRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📄</div>
            <div className="file-name text-[14px] font-bold text-center">somatic_pass.vcf</div>
            <div className="file-type text-[11px]" style={{ color: '#4cc38a' }}>PASS VCF</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl text-[12px]" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px', color: '#9fb0c3' }}>
          <p>拖曳 PoN 資料庫到 VCF 中，過濾掉平台技術雜訊造成的假陽性。</p>
        </div>

        <div
          className="pon-drag-area p-6 rounded-2xl text-center border-2 border-dashed transition-all flex-1 flex items-center justify-center"
          style={{ borderColor: dropped ? 'rgba(76,195,138,0.5)' : '#3b4b5f', backgroundColor: dropped ? 'rgba(76,195,138,0.06)' : 'rgba(255,255,255,0.02)' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div draggable className="px-5 py-3 rounded-xl text-[15px] font-bold select-none" style={{ backgroundColor: '#1b2430', borderColor: '#3b4b5f', borderWidth: '1px', color: '#e8eef5', cursor: 'grab' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span> PoN
          </div>
        </div>

        <div className="pon-progress p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" ref={progressFillRef} style={{ backgroundColor: '#7a6bff', width: '0%' }} />
          </div>
          <div className="progress-label text-center text-[12px]" style={{ color: '#c6d3e3' }}>{phaseLabel}</div>
        </div>
      </div>
    </div>
  );
};