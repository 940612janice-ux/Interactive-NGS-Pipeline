import React, { useEffect, useRef, useState } from 'react';

interface OrientationBiasVisualizationProps {
  onComplete?: () => void;
}

interface Variant {
  id: string;
  pos: string;
  ref: string;
  alt: string;
  f1r2: number;
  f2r1: number;
}

const VARIANTS: Variant[] = [
  { id: 'VAR001', pos: 'chr1:1000012', ref: 'A', alt: 'T', f1r2: 0.52, f2r1: 0.48 },
  { id: 'VAR002', pos: 'chr1:1000023', ref: 'C', alt: 'G', f1r2: 0.31, f2r1: 0.29 },
  { id: 'VAR003', pos: 'chr1:1000035', ref: 'G', alt: 'A', f1r2: 0.03, f2r1: 0.95 },
  { id: 'VAR004', pos: 'chr1:1000047', ref: 'T', alt: 'C', f1r2: 0.45, f2r1: 0.41 },
  { id: 'VAR005', pos: 'chr1:1000058', ref: 'A', alt: 'C', f1r2: 0.97, f2r1: 0.02 },
  { id: 'VAR006', pos: 'chr1:1000072', ref: 'T', alt: 'A', f1r2: 0.50, f2r1: 0.49 },
  { id: 'VAR007', pos: 'chr1:1000085', ref: 'C', alt: 'T', f1r2: 0.04, f2r1: 0.90 },
  { id: 'VAR008', pos: 'chr1:1000098', ref: 'G', alt: 'T', f1r2: 0.47, f2r1: 0.46 },
];

export const OrientationBiasVisualization: React.FC<OrientationBiasVisualizationProps> = () => {
  const [learned, setLearned] = useState(false);
  const [filtered, setFiltered] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('等待學習單鏈模型...');
  const progressFillRef = useRef<HTMLDivElement>(null);
  const outVcfRef = useRef<HTMLDivElement>(null);
  const rawVcfRef = useRef<HTMLDivElement>(null);
  const modelIconRef = useRef<HTMLDivElement>(null);

  const total = VARIANTS.length;
  const biasedVariants = VARIANTS.filter((v) => Math.abs(v.f1r2 - v.f2r1) > 0.4);
  const passVariants = VARIANTS.filter((v) => Math.abs(v.f1r2 - v.f2r1) <= 0.4);
  const modelBias = VARIANTS.map((v) => Math.abs(v.f1r2 - v.f2r1));
  const maxBias = Math.max(...modelBias);

  const learn = () => {
    if (learned) return;
    setLearned(true);
    setPhaseLabel('📚 正在學習單鏈錯位模型...');
    if (progressFillRef.current) progressFillRef.current.style.width = '35%';
    if (modelIconRef.current) modelIconRef.current.style.opacity = '1';
    setTimeout(() => {
      setPhaseLabel('✅ 已建立 ReadOrientationModel，識別出 3 個單鏈偏倚變異');
      if (progressFillRef.current) progressFillRef.current.style.width = '60%';
      if (rawVcfRef.current) rawVcfRef.current.style.boxShadow = '0 0 0 2px rgba(77,163,255,0.4)';
    }, 1200);
  };

  const applyFilter = () => {
    if (filtered || !learned) return;
    setFiltered(true);
    setPhaseLabel('🛡️ 套用單鏈偏倚過濾...');
    if (progressFillRef.current) progressFillRef.current.style.width = '85%';
    setTimeout(() => {
      if (progressFillRef.current) progressFillRef.current.style.width = '100%';
      setPhaseLabel(`✅ 過濾完成！保留 ${passVariants.length} 個真實突變`);
      if (outVcfRef.current) outVcfRef.current.style.boxShadow = '0 0 0 2px rgba(76,195,138,0.4)';
    }, 1200);
  };

  useEffect(() => {
    const t1 = setTimeout(() => learn(), 1500);
    const t2 = setTimeout(() => applyFilter(), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBiased = (v: Variant) => Math.abs(v.f1r2 - v.f2r1) > 0.4;

  return (
    <div className="orientation-bias-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="ob-left flex flex-col gap-4">
        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>單鏈偏倚統計</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>LearnReadOrientationModel</span>
          </div>
          <div className="flex flex-col gap-2">
            {VARIANTS.map((v) => {
              const biased = isBiased(v);
              const removed = filtered && biased;
              const diff = Math.abs(v.f1r2 - v.f2r1);
              return (
                <div key={v.id} className="flex items-center gap-2">
                  <span className="w-[60px] font-mono text-[11px] font-bold" style={{ color: biased ? '#ffb84d' : '#4cc38a' }}>{v.id}</span>
                  <div className="flex-1 flex items-center gap-[2px] h-[22px] rounded px-1" style={{ backgroundColor: '#0f1520' }}>
                    <div className="h-[12px] rounded" style={{ width: `${(v.f1r2 / 1) * 100}%`, background: biased ? '#ffb84d' : '#4cc38a', opacity: removed ? 0.35 : 1 }} />
                    <div className="h-[12px] rounded" style={{ width: `${(v.f2r1 / 1) * 100}%`, background: biased ? '#ff6b6b' : '#4da3ff', opacity: removed ? 0.35 : 1 }} />
                  </div>
                  <span className="text-[10px] w-[90px] text-right" style={{ color: biased ? '#ffb84d' : '#4cc38a' }}>
                    {biased ? `偏倚 ${diff.toFixed(2)}` : '對稱'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3 text-[10px]">
            <span className="flex items-center gap-1" style={{ color: '#4cc38a' }}><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#4cc38a' }} /> F1R2</span>
            <span className="flex items-center gap-1" style={{ color: '#4da3ff' }}><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#4da3ff' }} /> F2R1</span>
            <span className="flex items-center gap-1" style={{ color: '#ffb84d' }}><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#ffb84d' }} /> 單鏈偏倚</span>
          </div>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5 flex-1" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>過濾結果</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>{filtered ? `${passVariants.length} 保留` : `${total} 候選`}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {VARIANTS.map((v) => {
              const biased = isBiased(v);
              const removed = filtered && biased;
              return (
                <div key={v.id} className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-[11px] font-mono" style={{ backgroundColor: removed ? 'rgba(255,107,107,0.08)' : '#0f1520', opacity: removed ? 0.4 : 1 }}>
                  <span className="font-bold w-[60px]" style={{ color: biased ? '#ffb84d' : '#4cc38a' }}>{v.id}</span>
                  <span className="flex-1" style={{ color: '#c6d3e3' }}>{v.pos}</span>
                  <span style={{ color: '#e8eef5' }}>{v.ref}→{v.alt}</span>
                  <span className="w-[70px] text-right font-bold" style={{ color: removed ? '#ff6b6b' : '#4cc38a' }}>{removed ? 'filtered' : 'PASS'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ob-right flex flex-col gap-4">
        <div className="bqsr-file-flow flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="bqsr-file-box flex flex-col items-center p-3 flex-1 rounded-xl" ref={rawVcfRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-3xl mb-1">📄</div>
            <div className="file-name text-[11px] font-bold text-center">contam_filtered.vcf</div>
            <div className="file-type text-[10px]" style={{ color: '#9fb0c3' }}>Raw VCF</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-xl font-bold" style={{ color: '#ffb84d' }}>→</div>
            <div ref={modelIconRef} className="text-2xl" style={{ opacity: 0, transition: 'opacity 0.5s' }}>📚</div>
          </div>
          <div className="bqsr-file-box flex flex-col items-center p-3 flex-1 rounded-xl" ref={outVcfRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-3xl mb-1">📄</div>
            <div className="file-name text-[11px] font-bold text-center">orientation_filtered.vcf</div>
            <div className="file-type text-[10px]" style={{ color: '#4cc38a' }}>Orientation-filtered VCF</div>
          </div>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[14px] font-bold" style={{ color: '#ffb84d' }}>ReadOrientationModel</h3>
            <span className="text-[12px] font-mono" style={{ color: learned ? '#4cc38a' : '#6b7b8c' }}>{learned ? '● trained' : '○ untrained'}</span>
          </div>
          <div className="mb-3">
            <p className="text-[11px] mb-1" style={{ color: '#9fb0c3' }}>偏倚值 = |F1R2 − F2R1|（門檻 0.4）</p>
            <div className="flex items-end gap-[3px] h-[60px] rounded-lg px-2" style={{ backgroundColor: '#0f1520' }}>
              {modelBias.map((b, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${(b / maxBias) * 100}%`, background: b > 0.4 ? '#ff6b6b' : '#4cc38a', minHeight: '4px' }} title={`VAR${String(i + 1).padStart(3, '0')} bias=${b.toFixed(2)}`} />
              ))}
            </div>
          </div>
          <p className="text-[11px]" style={{ color: '#9fb0c3' }}>
            {learned
              ? `已辨識 ${biasedVariants.length} 個單鏈偏倚（紅柱）變異，此類偏倚常來自定序接頭錯位（錯置），非真實突變。`
              : '拖曳 BAM 檔到模型上，學習真實定序錯誤的單鏈分布。'}
          </p>
        </div>

        <div
          className="ob-drag-area p-6 rounded-2xl text-center border-2 border-dashed flex-1 flex items-center justify-center"
          style={{ borderColor: learned ? 'rgba(76,195,138,0.5)' : '#3b4b5f', backgroundColor: learned ? 'rgba(76,195,138,0.06)' : 'rgba(255,255,255,0.02)' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); learn(); }}
        >
          <div draggable className="px-5 py-3 rounded-xl text-[15px] font-bold select-none" style={{ backgroundColor: '#1b2430', borderColor: '#3b4b5f', borderWidth: '1px', color: '#e8eef5', cursor: 'grab' }}>
            <span style={{ fontSize: '20px' }}>🧬</span> BAM
          </div>
        </div>

        <div className="ob-progress p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" ref={progressFillRef} style={{ backgroundColor: '#7a6bff', width: '0%' }} />
          </div>
          <div className="progress-label text-center text-[12px]" style={{ color: '#c6d3e3' }}>{phaseLabel}</div>
        </div>
      </div>
    </div>
  );
};