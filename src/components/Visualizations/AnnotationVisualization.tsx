import React, { useEffect, useRef, useState } from 'react';

interface AnnotationVisualizationProps {
  onComplete?: () => void;
}

interface Variant {
  id: string;
  pos: string;
  ref: string;
  alt: string;
  af: number;
  label: string;
  gene: string;
  effect: string;
}

const VARIANTS: Variant[] = [
  { id: 'VAR001', pos: 'chr1:1000023', ref: 'C', alt: 'T', af: 0.320, label: 'Variant 1', gene: 'EGFR', effect: 'missense' },
  { id: 'VAR002', pos: 'chr1:1000047', ref: 'T', alt: 'C', af: 0.180, label: 'Variant 2', gene: 'TP53', effect: 'nonsense' },
  { id: 'VAR003', pos: 'chr1:1000072', ref: 'G', alt: 'A', af: 0.051, label: 'Variant 3', gene: 'KRAS', effect: 'missense' },
  { id: 'VAR004', pos: 'chr1:1000085', ref: 'C', alt: 'T', af: 0.040, label: 'Variant 4', gene: 'BRCA1', effect: 'frameshift' },
  { id: 'VAR005', pos: 'chr1:1000103', ref: 'A', alt: 'G', af: 0.021, label: 'Variant 5', gene: 'PIK3CA', effect: 'missense' },
];

const EFFORTS: Record<string, { name: string; f: number }> = {
  CARLOS: { name: 'CARLOS', f: 0.04 },
  ERIC: { name: 'ERIC', f: 0.03 },
  MAPP: { name: 'MAPP', f: 0.03 },
  CALIBRATION: { name: 'CALIBRATION', f: 0.02 },
  CHASM: { name: 'CHASM', f: 0.02 },
  CLINVAR: { name: 'CLINVAR', f: 0.02 },
  COSMIC: { name: 'COSMIC', f: 0.02 },
};

export const AnnotationVisualization: React.FC<AnnotationVisualizationProps> = () => {
  const [dragged, setDragged] = useState(false);
  const [batch, setBatch] = useState(false);
  const [annotated, setAnnotated] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('等待註解變異...');
  const progressFillRef = useRef<HTMLDivElement>(null);
  const knowledgeref = useRef<HTMLDivElement>(null);
  const batchRef = useRef<HTMLDivElement>(null);

  const dropVariant = () => {
    if (dragged) return;
    setDragged(true);
    setPhaseLabel('🔬 註解 Variant 1 → EGFR (missense)');
    if (progressFillRef.current) progressFillRef.current.style.width = '20%';
    setTimeout(() => {
      setPhaseLabel('✅ 註解完成！擷取到致病性、臨床意義等資訊');
      if (progressFillRef.current) progressFillRef.current.style.width = '40%';
      if (knowledgeref.current) knowledgeref.current.style.boxShadow = '0 0 0 2px rgba(122,107,255,0.4)';
    }, 800);
  };

  const batchAnnotate = () => {
    if (batch || !dragged) return;
    setBatch(true);
    setPhaseLabel('⚡ 批次註解剩餘 4 個變異...');
    if (progressFillRef.current) progressFillRef.current.style.width = '70%';
    setTimeout(() => {
      setAnnotated(true);
      setPhaseLabel('✅ 全部 5 個變異註解完成！');
      if (progressFillRef.current) progressFillRef.current.style.width = '100%';
      if (batchRef.current) batchRef.current.style.boxShadow = '0 0 0 2px rgba(76,195,138,0.4)';
    }, 1000);
  };

  useEffect(() => {
    const t = setTimeout(() => dropVariant(), 1200);
    const t2 = setTimeout(() => batchAnnotate(), 2800);
    return () => { clearTimeout(t); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAnnotated = (idx: number) => (idx === 0 && dragged) || (batch && idx > 0);

  return (
    <div className="annotation-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="annot-left flex flex-col gap-4">
        <div className="bqsr-panel rounded-2xl border p-5 flex-1 flex flex-col" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>候選變異</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>{VARIANTS.length} variants</span>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {VARIANTS.map((v, idx) => {
              const done = isAnnotated(idx);
              return (
                <div
                  key={v.id}
                  draggable={!done}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', v.id)}
                  onClick={() => { if (idx === 0) dropVariant(); else if (dragged) batchAnnotate(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all select-none cursor-grab"
                  style={{ backgroundColor: done ? 'rgba(76,195,138,0.12)' : '#0f1520', borderColor: done ? 'rgba(76,195,138,0.5)' : '#1e2a38', borderWidth: '1px', opacity: done ? 1 : 1 }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[15px]" style={{ backgroundColor: '#1b2430' }}>{done ? '✅' : '🧬'}</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold" style={{ color: '#e8eef5' }}>{v.label}</div>
                    <div className="text-[10px] font-mono" style={{ color: '#9fb0c3' }}>{v.pos} · {v.ref}→{v.alt} · AF {v.af.toFixed(3)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[12px] font-bold" style={{ color: done ? '#4cc38a' : '#9fb0c3' }}>{done ? v.gene : '—'}</span>
                    <span className="text-[10px]" style={{ color: done ? '#4cc38a' : '#6b7b8c' }}>{done ? v.effect : '待註解'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="annot-right flex flex-col gap-4">
        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>知識庫資料塔</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>VEP · ANNOVAR</span>
          </div>
          <div
            ref={knowledgeref}
            className="relative h-[180px] rounded-xl overflow-hidden transition-all"
            style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); dropVariant(); }}
          >
            <div className="absolute bottom-0 left-0 right-0 h-[120px]" style={{ background: 'linear-gradient(180deg, transparent, rgba(77,163,255,0.18))' }} />
            {Object.values(EFFORTS).map((e, i) => {
              const top = 130 - (i + 1) * 16;
              return (
                <div key={e.name} className="absolute left-0 right-0 flex justify-center" style={{ top }}>
                  <div className="flex items-center justify-between px-3 h-[26px] w-[85%] rounded-full text-[10px] font-bold font-mono" style={{ backgroundColor: '#1b2430', borderColor: '#2e4154', borderWidth: '1px', color: '#c6d3e3' }}>
                    <span>{e.name}</span>
                    <span style={{ color: '#7a6bff' }}>{(e.f * 100).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] mt-2 text-center" style={{ color: '#9fb0c3' }}>拖曳變異到此塔中，進行基因、致病性、臨床意義註解</p>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5 flex-1" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[14px] font-bold" style={{ color: '#ffb84d' }}>註解輸出</h3>
            <span className="text-[11px] font-mono" style={{ color: '#9fb0c3' }}>{annotated ? '5/5 annotated' : `${dragged ? '1/5' : '0/5'}`}</span>
          </div>
          <div ref={batchRef} className="flex flex-col gap-1.5">
            {VARIANTS.map((v, idx) => {
              const done = isAnnotated(idx);
              return (
                <div key={v.id} className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-[11px] font-mono transition-all" style={{ backgroundColor: done ? '#0f1520' : 'rgba(255,255,255,0.02)', borderColor: done ? '#2e4154' : '#1e2a38', borderWidth: '1px', opacity: done ? 1 : 0.35 }}>
                  <span className="w-[70px] font-bold" style={{ color: '#e8eef5' }}>{v.id}</span>
                  <span className="flex-1" style={{ color: '#c6d3e3' }}>{v.pos}</span>
                  <span className="w-[80px] font-bold" style={{ color: done ? '#4cc38a' : '#6b7b8c' }}>{done ? v.gene : '···'}</span>
                  <span className="w-[90px]" style={{ color: done ? '#4cc38a' : '#6b7b8c' }}>{done ? v.effect : '···'}</span>
                  <span className="w-[80px] text-right font-bold" style={{ color: done ? '#4cc38a' : '#6b7b8c' }}>{done ? 'annotated' : 'pending'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="annot-progress p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" ref={progressFillRef} style={{ backgroundColor: '#7a6bff', width: '0%' }} />
          </div>
          <div className="progress-label text-center text-[12px]" style={{ color: '#c6d3e3' }}>{phaseLabel}</div>
        </div>
      </div>
    </div>
  );
};