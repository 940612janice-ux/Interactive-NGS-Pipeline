import React, { useEffect, useRef, useState } from 'react';

interface FilterMutectVisualizationProps {
  onComplete?: () => void;
}

const STATS_LABELS = ['ti', 'tv', 'n_snps', 'n_indels', 'n_multiallelic', 'n_alt_f1r2', 'n_alt_f2r1'];

const STATS: Record<string, { label: string; val: string; color: string }> = {
  ti: { label: '轉換型變異 (Ti)', val: '24', color: '#4da3ff' },
  tv: { label: '顛換型變異 (Tv)', val: '6', color: '#ffb84d' },
  n_snps: { label: 'SNPs 總數', val: '30', color: '#4cc38a' },
  n_indels: { label: 'Indels 總數', val: '5', color: '#ff6b6b' },
  n_multiallelic: { label: '多對偶基因位點', val: '2', color: '#9fb0c3' },
  n_alt_f1r2: { label: '僅 F1R2 支持', val: '3', color: '#9fb0c3' },
  n_alt_f2r1: { label: '僅 F2R1 支持', val: '2', color: '#9fb0c3' },
};

interface Variant {
  id: string;
  pos: string;
  ref: string;
  alt: string;
  rejected: boolean;
  reason: string;
}

const VARIANTS: Variant[] = [
  { id: 'VAR001', pos: 'chr1:1000023', ref: 'C', alt: 'T', rejected: false, reason: 'PASS' },
  { id: 'VAR002', pos: 'chr1:1000047', ref: 'T', alt: 'C', rejected: false, reason: 'PASS' },
  { id: 'VAR003', pos: 'chr1:1000072', ref: 'G', alt: 'A', rejected: true, reason: 'str_contraction' },
  { id: 'VAR004', pos: 'chr1:1000085', ref: 'C', alt: 'T', rejected: false, reason: 'PASS' },
  { id: 'VAR005', pos: 'chr1:1000103', ref: 'A', alt: 'G', rejected: true, reason: 'clustered_events' },
  { id: 'VAR006', pos: 'chr1:1000115', ref: 'T', alt: 'G', rejected: false, reason: 'PASS' },
  { id: 'VAR007', pos: 'chr1:1000128', ref: 'C', alt: 'A', rejected: true, reason: 'weak_evidence' },
  { id: 'VAR008', pos: 'chr1:1000142', ref: 'G', alt: 'T', rejected: false, reason: 'PASS' },
  { id: 'VAR009', pos: 'chr1:1000156', ref: 'A', alt: 'T', rejected: false, reason: 'PASS' },
  { id: 'VAR010', pos: 'chr1:1000169', ref: 'T', alt: 'C', rejected: true, reason: 'orientation_bias' },
];

export const FilterMutectVisualization: React.FC<FilterMutectVisualizationProps> = () => {
  const [phaseLabel, setPhaseLabel] = useState('等待執行 FilterMutectCalls...');
  const [applied, setApplied] = useState(false);
  const [step, setStep] = useState(0);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const outVcfRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const total = VARIANTS.length;
  const passVariants = VARIANTS.filter((v) => !v.rejected);
  const rejectedVariants = VARIANTS.filter((v) => v.rejected);

  useEffect(() => {
    const steps = [
      { delay: 400, label: '📥 讀取 orientation_filtered.vcf...', w: 15 },
      { delay: 700, label: '📊 計算過濾統計 (Ti/Tv, SNPs/Indels)...', w: 35 },
      { delay: 800, label: '⚖️ 套用過濾門檻並標記 rejection...', w: 70 },
      { delay: 600, label: '✅ 輸出 PASS VCF!', w: 100 },
    ];
    let totalDelay = 600;
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((s) => {
      totalDelay += s.delay;
      timers.push(setTimeout(() => {
        setStep((prev) => prev + 1);
        setPhaseLabel(s.label);
        if (progressFillRef.current) progressFillRef.current.style.width = s.w + '%';
        if (s.w === 35 && statsRef.current) statsRef.current.style.boxShadow = '0 0 0 2px rgba(77,163,255,0.4)';
        if (s.w === 100) {
          setApplied(true);
          if (outVcfRef.current) outVcfRef.current.style.boxShadow = '0 0 0 2px rgba(76,195,138,0.4)';
        }
      }, totalDelay));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="filter-mutect-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="fmc-left flex flex-col gap-4">
        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>VCF 統計</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>FilterMutectCalls</span>
          </div>
          <div ref={statsRef} className="grid grid-cols-3 gap-3 transition-all rounded-xl">
            {STATS_LABELS.map((k) => {
              const s = STATS[k];
              return (
                <div key={k} className="flex flex-col items-center p-2.5 rounded-lg" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
                  <span className="text-[18px] font-bold font-mono" style={{ color: s.color }}>{s.val}</span>
                  <span className="text-[9.5px] text-center mt-0.5" style={{ color: '#9fb0c3' }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5 flex-1 flex flex-col" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>過濾漏斗</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>
              {applied ? `${passVariants.length} PASS` : `${total} raw`}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 flex-1 justify-center">
            <div className="w-full flex flex-col items-center">
              <div className="w-[92%] h-[36px] flex items-center justify-center rounded-lg font-bold text-[13px] transition-all" style={{ backgroundColor: '#1b2430', borderColor: '#3b4b5f', borderWidth: '1px', color: '#e8eef5', opacity: 1 }}>
                {total} 原始候選
              </div>
              <div className="w-[3px] h-3" style={{ backgroundColor: '#3b4b5f' }} />
              <div className="w-[74%] h-[32px] flex items-center justify-center rounded-lg font-bold text-[12px] transition-all" style={{ backgroundColor: '#1b2430', borderColor: '#ffb84d', borderWidth: '1px', color: '#ffb84d', opacity: step >= 2 ? 1 : 0.3 }}>
                {rejectedVariants.length} 拒絕
              </div>
              <div className="w-[3px] h-3" style={{ backgroundColor: '#3b4b5f' }} />
              <div className="w-[56%] h-[32px] flex items-center justify-center rounded-lg font-bold text-[12px] transition-all" style={{ backgroundColor: '#0f1520', borderColor: '#4cc38a', borderWidth: applied ? '2px' : '1px', color: '#4cc38a', opacity: applied ? 1 : 0.4 }}>
                {applied ? `${passVariants.length} PASS` : '等待輸出'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fmc-right flex flex-col gap-4">
        <div className="bqsr-file-flow flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="bqsr-file-box flex flex-col items-center p-3 flex-1 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-3xl mb-1">📄</div>
            <div className="file-name text-[11px] font-bold text-center">orientation_filtered.vcf</div>
            <div className="file-type text-[10px]" style={{ color: '#9fb0c3' }}>Raw VCF</div>
          </div>
          <div className="text-xl font-bold" style={{ color: '#ffb84d' }}>→</div>
          <div className="bqsr-file-box flex flex-col items-center p-3 flex-1 rounded-xl" ref={outVcfRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-3xl mb-1">📄</div>
            <div className="file-name text-[11px] font-bold text-center">final_pass.vcf</div>
            <div className="file-type text-[10px]" style={{ color: '#4cc38a' }}>PASS VCF</div>
          </div>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5 flex-1" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[14px] font-bold" style={{ color: '#ffb84d' }}>變異審查表</h3>
            <span className="text-[11px] font-mono" style={{ color: '#9fb0c3' }}>Passed {applied ? passVariants.length : '?'} / {total}</span>
          </div>
          <div className="flex flex-col gap-1 max-h-[320px] overflow-auto">
            <div className="flex px-2 py-1.5 text-[10px] font-bold border-b" style={{ color: '#9fb0c3', borderColor: '#2e4154' }}>
              <span className="w-[70px]">ID</span><span className="flex-1">POS</span><span className="w-[70px]">REF→ALT</span><span className="w-[110px] text-right">STATUS</span>
            </div>
            {VARIANTS.map((v) => (
              <div key={v.id} className="flex items-center px-2 py-1.5 text-[11px] font-mono rounded" style={{ backgroundColor: v.rejected && applied ? 'rgba(255,107,107,0.08)' : 'transparent', opacity: v.rejected && applied ? 0.45 : 1 }}>
                <span className="w-[70px] font-bold" style={{ color: '#e8eef5' }}>{v.id}</span>
                <span className="flex-1" style={{ color: '#c6d3e3' }}>{v.pos}</span>
                <span className="w-[70px]">{v.ref}→{v.alt}</span>
                <span className="w-[110px] text-right font-bold" style={{ color: v.rejected ? '#ff6b6b' : '#4cc38a' }}>
                  {applied ? (v.rejected ? `✗ ${v.reason}` : '✓ PASS') : '審查中...'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="fmc-progress p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" ref={progressFillRef} style={{ backgroundColor: '#7a6bff', width: '0%' }} />
          </div>
          <div className="progress-label text-center text-[12px]" style={{ color: '#c6d3e3' }}>{phaseLabel}</div>
        </div>
      </div>
    </div>
  );
};