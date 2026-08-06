import React, { useEffect, useRef, useState } from 'react';

interface ContaminationVisualizationProps {
  onComplete?: () => void;
}

const CONT_THRESHOLD = 0.02;

interface Variant {
  id: string;
  pos: string;
  ref: string;
  alt: string;
  af: number;
}

const VARIANTS: Variant[] = [
  { id: 'VAR001', pos: 'chr1:1000023', ref: 'C', alt: 'T', af: 0.320 },
  { id: 'VAR002', pos: 'chr1:1000047', ref: 'T', alt: 'C', af: 0.180 },
  { id: 'VAR003', pos: 'chr1:1000072', ref: 'G', alt: 'A', af: 0.051 },
  { id: 'VAR004', pos: 'chr1:1000085', ref: 'C', alt: 'T', af: 0.040 },
  { id: 'VAR005', pos: 'chr1:1000103', ref: 'A', alt: 'G', af: 0.021 },
  { id: 'VAR006', pos: 'chr1:1000115', ref: 'T', alt: 'G', af: 0.016 },
  { id: 'VAR007', pos: 'chr1:1000128', ref: 'C', alt: 'A', af: 0.013 },
  { id: 'VAR008', pos: 'chr1:1000142', ref: 'G', alt: 'T', af: 0.011 },
  { id: 'VAR009', pos: 'chr1:1000156', ref: 'A', alt: 'T', af: 0.009 },
  { id: 'VAR010', pos: 'chr1:1000169', ref: 'T', alt: 'C', af: 0.007 },
  { id: 'VAR011', pos: 'chr1:1000181', ref: 'C', alt: 'T', af: 0.005 },
  { id: 'VAR012', pos: 'chr1:1000194', ref: 'G', alt: 'A', af: 0.004 },
];

export const ContaminationVisualization: React.FC<ContaminationVisualizationProps> = () => {
  const [measured, setMeasured] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [tubesFilled, setTubesFilled] = useState(false);
  const [hint, setHint] = useState('測量交叉污染比例，推算出頻率低於污染門檻的雜訊點位並踢除。');
  const [phaseLabel, setPhaseLabel] = useState('等待檢驗...');
  const progressFillRef = useRef<HTMLDivElement>(null);
  const outVcfRef = useRef<HTMLDivElement>(null);
  const rawVcfRef = useRef<HTMLDivElement>(null);

  const total = VARIANTS.length;
  const lowVariants = VARIANTS.filter((v) => v.af < CONT_THRESHOLD);
  const passVariants = VARIANTS.filter((v) => v.af >= CONT_THRESHOLD);
  const maxAF = Math.max(...VARIANTS.map((v) => v.af));

  const reps = [
    { label: 'Rep 1', pct: 1.9 },
    { label: 'Rep 2', pct: 2.1 },
    { label: 'Rep 3', pct: 2.0 },
  ];

  const measure = () => {
    if (measured) return;
    setMeasured(true);
    setPhaseLabel('🧪 正在測量交叉污染率...');
    if (progressFillRef.current) progressFillRef.current.style.width = '40%';
    setTimeout(() => {
      setTubesFilled(true);
    }, 400);
    setTimeout(() => {
      setPhaseLabel('交叉污染率 = 2.0%（AF 低於此門檻即為雜訊）');
      if (progressFillRef.current) progressFillRef.current.style.width = '60%';
      setHint(`推算出 ${lowVariants.length} 個 AF 低於 2.0% 的雜訊點位，準備踢除。`);
      if (rawVcfRef.current) rawVcfRef.current.style.boxShadow = '0 0 0 2px rgba(77,163,255,0.4)';
    }, 1400);
  };

  const kick = () => {
    if (kicked || !measured) return;
    setKicked(true);
    setPhaseLabel('🗑️ 踢除污染雜訊點位...');
    if (progressFillRef.current) progressFillRef.current.style.width = '85%';
    setTimeout(() => {
      if (progressFillRef.current) progressFillRef.current.style.width = '100%';
      setPhaseLabel(`✅ 踢除完成！保留 ${passVariants.length} 個高可信度候選`);
      setHint(`已踢除 ${lowVariants.length} 個污染雜訊點位，假突變顯著下降。`);
      if (outVcfRef.current) outVcfRef.current.style.boxShadow = '0 0 0 2px rgba(76,195,138,0.4)';
    }, 200 + lowVariants.length * 220 + 300);
  };

  useEffect(() => {
    const t1 = setTimeout(() => { if (!measured) measure(); }, 2000);
    const t2 = setTimeout(() => { if (!kicked) kick(); }, 5800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="contamination-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="filter-left flex flex-col gap-4">
        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>VCF 過濾結果</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>{kicked ? passVariants.length : total} 候選</span>
          </div>
          <div className="flex flex-col gap-1 max-h-[240px] overflow-auto">
            <div className="flex px-2 py-1.5 text-[10px] font-bold border-b" style={{ color: '#9fb0c3', borderColor: '#2e4154' }}>
              <span className="w-[70px]">ID</span><span className="flex-1">POS</span><span className="w-[70px]">REF→ALT</span><span className="w-[50px] text-right">AF</span><span className="w-[90px] text-right">FILTER</span>
            </div>
            {VARIANTS.map((v) => {
              const isLow = v.af < CONT_THRESHOLD;
              const removed = kicked && isLow;
              return (
                <div key={v.id} className="flex items-center px-2 py-1.5 text-[11px] font-mono rounded transition-all" style={{ backgroundColor: removed ? 'rgba(255,107,107,0.08)' : 'transparent', opacity: removed ? 0.4 : 1 }}>
                  <span className="w-[70px] font-bold" style={{ color: '#e8eef5' }}>{v.id}</span>
                  <span className="flex-1" style={{ color: '#c6d3e3' }}>{v.pos}</span>
                  <span className="w-[70px]">{v.ref}→{v.alt}</span>
                  <span className="w-[50px] text-right" style={{ color: '#9fb0c3' }}>{v.af.toFixed(3)}</span>
                  <span className="w-[90px] text-right font-bold" style={{ color: removed ? '#ff6b6b' : '#6b7b8c' }}>{removed ? 'contamination' : '.'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>污染過濾統計</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>{kicked ? `${Math.round((lowVariants.length / total) * 100)}% 假突變剔除` : '等待檢驗'}</span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <span className="text-[11px]" style={{ color: '#9fb0c3' }}>候選變異總數</span>
              <span className="text-[18px] font-bold font-mono">{total}</span>
            </div>
            <div className="flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <span className="text-[11px]" style={{ color: '#9fb0c3' }}>污染雜訊踢除</span>
              <span className="text-[18px] font-bold font-mono" style={{ color: '#ff6b6b' }}>{kicked ? lowVariants.length : 0}</span>
              <span className="text-[10px] font-bold" style={{ color: '#ff6b6b' }}>{kicked ? `- ${Math.round((lowVariants.length / total) * 100)}%` : ''}</span>
            </div>
            <div className="flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <span className="text-[11px]" style={{ color: '#9fb0c3' }}>過濾後保留</span>
              <span className="text-[18px] font-bold font-mono" style={{ color: '#4cc38a' }}>{kicked ? passVariants.length : total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="filter-right flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <span className="text-2xl">🧑‍🔬</span>
          <div>
            <strong className="block text-[13px]">品質品管檢驗員</strong>
            <span className="text-[11px]" style={{ color: '#9fb0c3' }}>QC Inspector · GetPileupSummaries + CalculateContamination</span>
          </div>
        </div>

        <div className="bqsr-file-flow flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="bqsr-file-box flex flex-col items-center p-3 flex-1 rounded-xl" ref={rawVcfRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-3xl mb-1">📄</div>
            <div className="file-name text-[13px] font-bold text-center">somatic_raw.vcf</div>
            <div className="file-type text-[10px]" style={{ color: '#9fb0c3' }}>Raw VCF</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-xl font-bold" style={{ color: '#ffb84d' }}>→</div>
            <div className="text-2xl animate-pulse" style={{ opacity: measured ? 1 : 0.4 }}>🧪</div>
          </div>
          <div className="bqsr-file-box flex flex-col items-center p-3 flex-1 rounded-xl" ref={outVcfRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-3xl mb-1">📄</div>
            <div className="file-name text-[11px] font-bold text-center">somatic_contam_filtered.vcf</div>
            <div className="file-type text-[10px]" style={{ color: '#4cc38a' }}>Contamination-filtered VCF</div>
          </div>
        </div>

        <div className="bqsr-panel cont-workbench p-5 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[14px] font-bold" style={{ color: '#ffb84d' }}>試管交叉污染測量</h4>
            <span className="text-[18px] font-bold font-mono" style={{ color: measured ? '#4cc38a' : '#6b7b8c' }}>{measured ? '2.0%' : '—'}</span>
          </div>
          <div className="flex gap-4 items-end mb-4">
            {reps.map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-1 flex-1">
                <div className="relative w-10 h-[90px] rounded-b-lg border" style={{ backgroundColor: '#0f1520', borderColor: '#3b4b5f', overflow: 'hidden' }}>
                  <div className="absolute bottom-0 left-0 right-0 transition-all duration-700" style={{ height: tubesFilled ? `${(r.pct / 5) * 100}%` : '4%', background: 'linear-gradient(180deg, #4cc38a, #7a6bff)' }} />
                </div>
                <span className="text-[11px]" style={{ color: '#9fb0c3' }}>{r.label}</span>
              </div>
            ))}
          </div>
          <div className="text-[11px] mb-2" style={{ color: '#9fb0c3' }}>污染門檻：AF &lt; 交叉污染率 → 雜訊</div>
          <div className="relative h-3 rounded-full overflow-hidden mb-4" style={{ backgroundColor: '#0f1520' }}>
            {VARIANTS.map((v) => (
              <div key={v.id} className="absolute top-0 bottom-0 w-[3px] rounded" style={{ left: `${(v.af / maxAF) * 100}%`, background: v.af < CONT_THRESHOLD ? '#ff6b6b' : '#ffb84d', opacity: kicked && v.af < CONT_THRESHOLD ? 0.3 : 0.9 }} title={`${v.id} AF=${v.af.toFixed(3)}`} />
            ))}
            <div className="absolute top-0 bottom-0 w-[2px] bg-white" style={{ left: `${(CONT_THRESHOLD / maxAF) * 100}%`, display: measured ? 'block' : 'none' }} />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-lg text-[13px] font-bold disabled:opacity-40" style={{ backgroundColor: '#7a6bff', color: '#0f1520' }} disabled={measured} onClick={measure}>
              {measured ? '🧪 測量完成' : '🧪 滴入檢體測量污染率'}
            </button>
            <button className="flex-1 py-2.5 rounded-lg text-[13px] font-bold disabled:opacity-40" style={{ backgroundColor: '#ff6b6b', color: '#0f1520' }} disabled={!measured || kicked} onClick={kick}>
              {kicked ? '🗑️ 已踢除污染雜訊' : '🗑️ 踢除污染雜訊點位'}
            </button>
          </div>
          <p className="text-[11px] mt-3" style={{ color: '#9fb0c3' }}>{hint}</p>
        </div>

        <div className="filter-progress p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" ref={progressFillRef} style={{ backgroundColor: '#7a6bff', width: '0%' }} />
          </div>
          <div className="progress-label text-center text-[12px]" style={{ color: '#c6d3e3' }}>{phaseLabel}</div>
        </div>
      </div>
    </div>
  );
};