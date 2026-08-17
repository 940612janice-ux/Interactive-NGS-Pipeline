import React, { CSSProperties, useEffect, useRef, useState } from 'react';

interface FilterMutectVisualizationProps {
  onComplete?: () => void;
}

type RunStatus = 'idle' | 'running' | 'done';

const VCF_ROWS = [
  { chrom: 'chr2', pos: '253982', id: '.', ref: 'C', alt: 'A', qual: '.', filter: 'contamination', info: 'TLOD=3.15;AF=0.01;POP_AF=0.0001', color: '#ffb84d' },
  { chrom: 'chr3', pos: '412640', id: '.', ref: 'G', alt: 'T', qual: '.', filter: 'PASS', info: 'TLOD=12.82;ROQ=48;AF=0.28;POP_AF=0.0000', color: '#4cc38a' },
  { chrom: 'chr7', pos: '140453136', id: '.', ref: 'A', alt: 'T', qual: '.', filter: 'germline', info: 'TLOD=1.85;AF=0.49;POP_AF=0.4520', color: '#4da3ff' },
  { chrom: 'chr17', pos: '7578408', id: '.', ref: 'C', alt: 'T', qual: '.', filter: 'orientation', info: 'TLOD=4.20;ROQ=8;AF=0.05;POP_AF=0.0000', color: '#ff8fb1' },
];

const PanelHeader: React.FC<{ label: string; zh: string; color: string }> = ({ label, zh, color }) => (
  <div className="flex items-center justify-between px-1">
    <span className="text-[11px] font-bold tracking-[0.18em]" style={{ color }}>
      {label} <span className="font-normal" style={{ color: '#9fb0c3' }}>· {zh}</span>
    </span>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
  </div>
);

const MutectIcon: React.FC = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
    <path d="M12 3 20 9l-2.3 6.8H6.3L4 9l8-6z" stroke="#4da3ff" strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
    <circle cx="12" cy="9.4" r="2.4" fill="#4da3ff" />
    <line x1="12" y1="9.4" x2="12" y2="15.8" stroke="#4da3ff" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const ContamIcon: React.FC = () => (
  <svg width="28" height="32" viewBox="0 0 24 30" fill="none">
    <path d="M12 2.5C12 2.5 4 12 4 18a8 8 0 0 0 16 0C20 12 12 2.5 12 2.5z" stroke="#7a6bff" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 8.5c0 0 4.6 5.6 4.6 9.5a4.6 4.6 0 0 1-9.2 0C7.4 14.1 12 8.5 12 8.5z" fill="#7a6bff" opacity="0.3" />
    <circle cx="9.4" cy="13" r="1.5" fill="#e8eef5" />
    <circle cx="14.6" cy="19" r="1.5" fill="#e8eef5" />
    <line x1="14.2" y1="11.6" x2="9.8" y2="20.4" stroke="#e8eef5" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const OrientIcon: React.FC = () => (
  <svg width="32" height="30" viewBox="0 0 24 22" fill="none">
    <line x1="3" y1="11" x2="21" y2="11" stroke="#ffb84d" strokeWidth="1.5" />
    <path d="M21 11l-4-4M21 11l-4 4" stroke="#ffb84d" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11l4-4M3 11l4 4" stroke="#ffb84d" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    <circle cx="12" cy="11" r="2.2" fill="#ffb84d" />
  </svg>
);

const INPUT_CARDS = [
  { accent: '#4da3ff', title: 'Mutect2 資料檢測結果', subtitle: '原始呼叫 · tumor vs normal', file: 'somatic_raw.vcf', icon: <MutectIcon /> },
  { accent: '#7a6bff', title: 'Contamination 資料檢測結果', subtitle: '交叉污染率 2.0%', file: 'contamination.table', icon: <ContamIcon /> },
  { accent: '#ffb84d', title: 'Orientation Bias 資料檢測結果', subtitle: 'FFPE / OxoG 假突變標記', file: 'orientation_filtered.vcf', icon: <OrientIcon /> },
];

const InputFileCard: React.FC<{ accent: string; title: string; subtitle: string; file: string; icon: React.ReactNode; status: RunStatus }> = ({ accent, title, subtitle, file, icon, status }) => {
  const done = status === 'done';
  return (
    <div
      className="rounded-2xl border p-3 flex flex-col items-center gap-2 shrink-0"
      style={{
        backgroundColor: '#2c3a4b',
        borderColor: done ? `${accent}` : '#3b4b5f',
        opacity: status === 'running' ? 0.92 : 1,
        transition: 'border-color .45s, box-shadow .45s, opacity .3s',
        boxShadow: done ? `0 0 0 1px ${accent}33, 0 0 16px ${accent}22` : 'none',
      }}
    >
      <div className="relative">
        <span className="data-pulse-ring absolute -inset-4 rounded-[22px]" style={{ background: `${accent}22` }} />
        <span className="data-pulse-ring absolute -inset-4 rounded-[22px]" style={{ background: `${accent}22`, animationDelay: '1.15s' }} />
        <div className="relative w-[74px] h-[92px] rounded-xl border" style={{ backgroundColor: '#1b2430', borderColor: '#3b4b5f', boxShadow: '0 8px 20px rgba(0,0,0,0.45)' }}>
          <div className="absolute top-0 right-0 w-[18px] h-[18px]" style={{ background: 'linear-gradient(135deg, transparent 50%, #2c3a4b 50%)' }} />
          <div className="absolute top-0 right-0 w-[18px] h-[18px]" style={{ background: 'linear-gradient(135deg, transparent 50%, #232f3e 50%)' }} />
          <div className="absolute top-[12px] left-[11px] w-[38px] h-[5px] rounded-full" style={{ background: accent, opacity: 0.9 }} />
          <div className="absolute inset-0 flex items-center justify-center pb-1">{icon}</div>
        </div>
        {done && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ color: '#0f1520', background: '#4cc38a', boxShadow: '0 0 10px rgba(76,195,138,0.7)' }}>
            ✓
          </span>
        )}
      </div>
      <div className="text-center px-1">
        <div className="text-[12.5px] font-bold whitespace-nowrap" style={{ color: '#e8eef5' }}>{title}</div>
        <div className="text-[10px]" style={{ color: '#9fb0c3' }}>{subtitle}</div>
      </div>
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: accent, backgroundColor: `${accent}1f`, border: `1px solid ${accent}59`, opacity: status === 'done' ? 1 : 0.85 }}>
        {file}
      </span>
    </div>
  );
};

const FlowArrows: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-1.5 h-full">
    {[0, 1, 2].map((i) => (
      <span key={i} className="data-flow-dot text-[11px]" style={{ color: '#4da3ff', textShadow: '0 0 6px #4da3ff', animationDelay: `${i * 0.3}s` }}>
        ➤
      </span>
    ))}
  </div>
);

const GearRing: React.FC<{ size: number; inner: number; color: string; teeth: number; speed: number; reverse?: boolean; opacity?: number }> = ({ size, inner, color, teeth, speed, reverse, opacity = 0.45 }) => {
  const seg = 360 / teeth;
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `calc(50% - ${size / 2}px)`,
        top: `calc(50% - ${size / 2}px)`,
        background: `repeating-conic-gradient(from 0deg, ${color} 0deg ${seg / 2}deg, transparent ${seg / 2}deg ${seg}deg)`,
        WebkitMask: `radial-gradient(circle closest-side, transparent 0%, transparent ${inner - 1}%, black ${inner}%, black 100%)`,
        mask: `radial-gradient(circle closest-side, transparent 0%, transparent ${inner - 1}%, black ${inner}%, black 100%)`,
        animation: `${reverse ? 'spinReverse' : 'spin'} ${speed} linear infinite`,
        opacity,
      } as CSSProperties}
    />
  );
};

interface MechanismProps {
  status: RunStatus;
  fdr: number;
}

const CalcMechanism: React.FC<MechanismProps> = ({ status, fdr }) => {
  const ring = status === 'idle' ? 16 : status === 'running' ? 4.2 : 9;
  const ringRev = status === 'idle' ? 24 : status === 'running' ? 6.2 : 12;
  const orb = status === 'idle' ? 7 : status === 'running' ? 2 : 4;
  const done = status === 'done';
  return (
    <div
      className="relative w-[280px] h-[280px] rounded-full shrink-0"
      style={{
        background: 'radial-gradient(circle, #1b2430 0%, #0f1520 72%)',
        border: '1px solid #2c3a4b',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 30px rgba(255,184,77,0.08)',
      }}
    >
      <div className="absolute inset-1.5 rounded-full" style={{ border: '2px dashed rgba(77,163,255,0.4)', animation: `spin ${ring}s linear infinite` }} />
      <div className="absolute inset-5 rounded-full" style={{ border: '1px dashed rgba(255,184,77,0.35)', animation: `spinReverse ${ringRev}s linear infinite` }} />
      <div className="absolute inset-9 rounded-full" style={{ border: '5px dashed rgba(122,107,255,0.3)', animation: `spin ${ring}s linear infinite` }} />
      <div className="absolute rounded-full" style={{ inset: 13, border: '2px dotted rgba(77,163,255,0.45)', animation: `spinReverse ${ringRev}s linear infinite` }} />

      <GearRing size={232} inner={55} color="#4da3ff" teeth={24} speed={ring} />
      <GearRing size={186} inner={50} color="#ffb84d" teeth={18} speed={ringRev} reverse opacity={0.35} />
      <GearRing size={142} inner={58} color="#7a6bff" teeth={16} speed={ring} opacity={0.4} />

      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 280">
        {[30, 90, 150, 210, 270].map((a) => (
          <line key={a} x1="140" y1="16" x2="140" y2="264" stroke="rgba(77,163,255,0.35)" strokeWidth="1" strokeDasharray="11 9" className="data-lane" transform={`rotate(${a} 140 140)`} style={{ animationDelay: `${a * 0.045}s` }} />
        ))}
        <circle cx="140" cy="140" r="90" fill="none" stroke="rgba(255,184,77,0.22)" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(122,107,255,0.28)" strokeWidth="1" strokeDasharray="2 7" />
      </svg>

      <div className="absolute inset-0 rounded-full" style={{ animation: `spin ${orb}s linear infinite` }}>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <span key={a} className="absolute w-[7px] h-[7px] rounded-full" style={{ left: '50%', top: '50%', background: '#4da3ff', boxShadow: '0 0 8px #4da3ff', transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-108px)` }} />
        ))}
      </div>
      <div className="absolute inset-0 rounded-full" style={{ animation: `spinReverse ${orb * 1.4}s linear infinite` }}>
        {[30, 150, 270].map((a) => (
          <span key={a} className="absolute w-[6px] h-[6px] rounded-full" style={{ left: '50%', top: '50%', background: '#ffb84d', boxShadow: '0 0 8px #ffb84d', transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-130px)` }} />
        ))}
      </div>
      <div className="absolute inset-0 rounded-full" style={{ animation: `spin ${orb * 1.8}s linear infinite` }}>
        {[90, 210, 330].map((a) => (
          <span key={a} className="absolute w-[5px] h-[5px] rounded-full" style={{ left: '50%', top: '50%', background: '#4cc38a', boxShadow: '0 0 6px #4cc38a', transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-88px)` }} />
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="fmc-core-glow relative flex flex-col items-center justify-center rounded-full"
          style={{
            width: 124,
            height: 124,
            background: '#0f1520',
            border: `2px solid ${done ? '#4cc38a' : '#ffb84d'}`,
            boxShadow: done
              ? '0 0 26px rgba(76,195,138,0.4), inset 0 0 20px rgba(76,195,138,0.1)'
              : '0 0 26px rgba(255,184,77,0.35), inset 0 0 20px rgba(255,184,77,0.08)',
          }}
        >
          <span className="text-[8.5px] tracking-[0.14em]" style={{ color: '#9fb0c3' }}>RESIDUAL FDR</span>
          <span className="font-mono text-[36px] leading-none font-bold mt-0.5" style={{ color: '#ffb84d', textShadow: '0 0 16px rgba(255,184,77,0.55)' }}>
            {fdr.toFixed(1)}%
          </span>
          <span className="text-[9px]" style={{ color: done ? '#4cc38a' : '#9fb0c3' }}>
            {done ? 'PASS ✓ 潔淨' : status === 'running' ? '估算中…' : '待整合'}
          </span>
        </div>
      </div>
    </div>
  );
};

const DocIconSmall: React.FC<{ highlight: boolean }> = ({ highlight }) => (
  <div className="relative w-11 h-14 shrink-0 rounded-md border" style={{ backgroundColor: '#1b2430', borderColor: highlight ? '#4cc38a' : '#3b4b5f' }}>
    <div className="absolute top-0 right-0 w-[14px] h-[14px]" style={{ background: 'linear-gradient(135deg, transparent 50%, #2c3a4b 50%)' }} />
    <div className="absolute inset-x-1.5 top-3 h-1.5 rounded" style={{ background: highlight ? 'rgba(76,195,138,0.85)' : '#3b4b5f' }} />
    <div className="absolute inset-x-1.5 top-6 h-1 rounded" style={{ background: '#3b4b5f' }} />
    <div className="absolute inset-x-1.5 top-8 h-1 rounded" style={{ background: '#3b4b5f' }} />
  </div>
);

export const FilterMutectVisualization: React.FC<FilterMutectVisualizationProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [fdr, setFdr] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('等待啟動 — 整合 Mutect2、Contamination 與 Orientation Bias 三份判讀結果。');
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);

  const run = () => {
    if (status !== 'idle') return;
    setStatus('running');
    setPhaseLabel('讀取 Mutect2 / Contamination / Orientation Bias 三份判讀結果…');

    const dur = 2200;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setFdr(Math.sin(p * Math.PI) * 6.2);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    timersRef.current.push(
      window.setTimeout(() => setPhaseLabel('貝氏模型計算每位點為真變異的後驗機率（P(local)）…'), 800),
      window.setTimeout(() => setPhaseLabel('套用 False Discovery Rate 門檻，判定 PASS / 各濾網標記…'), 1650),
      window.setTimeout(() => {
        setFdr(0);
        setStatus('done');
        setPhaseLabel('✅ 整合完成：3 個位點被標記、1 個 PASS，殘留 FDR ≈ 0.0%。');
        onComplete?.();
      }, 2350)
    );
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const done = status === 'done';

  return (
    <div className="filter-mutect-visual flex flex-col gap-3 h-[calc(100vh-13rem)] min-h-[640px]">
      {/* ===== 頂部標題列 ===== */}
      <div
        className="relative overflow-hidden rounded-2xl border px-5 py-3.5 flex items-center justify-between shrink-0"
        style={{ background: 'linear-gradient(90deg, rgba(77,163,255,0.16), rgba(15,21,32,0.4) 45%, rgba(122,107,255,0.14))', borderColor: '#2c3a4b' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #4da3ff, transparent)' }} />
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[14px] font-bold shrink-0"
            style={{ color: '#0f1520', background: 'linear-gradient(135deg,#4da3ff,#7a6bff)', boxShadow: '0 0 14px rgba(77,163,255,0.5)' }}
          >
            2
          </span>
          <h2 className="text-[17px] font-bold whitespace-nowrap" style={{ color: '#e8eef5' }}>FilterMutectCalls</h2>
          <span className="text-[15px] shrink-0" style={{ color: '#3b4b5f' }}>|</span>
          <span className="text-[14px] font-bold whitespace-nowrap" style={{ color: '#ffb84d' }}>整合前三步驟 filter 之判讀結果</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 ml-3 shrink-0">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: '#9fb0c3', backgroundColor: 'rgba(15,21,32,0.7)', border: '1px solid #2c3a4b' }}>
            GATK FilterMutectCalls
          </span>
        </div>
      </div>

      {/* ===== 三欄主體 ===== */}
      <div className="grid flex-1 gap-3 min-h-0" style={{ gridTemplateColumns: 'minmax(240px,280px) 24px minmax(330px,1fr) minmax(300px,360px)' }}>
        {/* 左側：輸入區 */}
        <div className="flex flex-col gap-2 min-h-0 overflow-y-auto pr-0.5">
          <PanelHeader label="INPUT AREA" zh="輸入區" color="#4da3ff" />
          {INPUT_CARDS.map((c) => (
            <InputFileCard key={c.title} accent={c.accent} title={c.title} subtitle={c.subtitle} file={c.file} icon={c.icon} status={status} />
          ))}
        </div>

        {/* 流向箭頭 */}
        <FlowArrows />

        {/* 中間：統計模型與演算法 */}
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border p-4 min-h-0 overflow-hidden" style={{ backgroundColor: '#1b2430', borderColor: '#2c3a4b' }}>
          <PanelHeader label="BIAS MODEL & ALGORITHM" zh="統計模型與演算法" color="#ffb84d" />
          <div className="text-center shrink-0">
            <p className="text-[11px]" style={{ color: '#9fb0c3' }}>[ 統計演算法：以機率公式為核心的演算法 ]</p>
            <div className="mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide" style={{ color: '#ffb84d', backgroundColor: 'rgba(255,184,77,0.1)', border: '1px solid rgba(255,184,77,0.35)' }}>
                Bayesian Statistical Model
              </span>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide" style={{ color: '#ffb84d', backgroundColor: 'rgba(255,184,77,0.1)', border: '1px solid rgba(255,184,77,0.35)' }}>
                False Discovery Rate
              </span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0 py-1">
            <CalcMechanism status={status} fdr={fdr} />
          </div>
          <div className="w-full rounded-lg px-3 py-2 text-center text-[11px] shrink-0" style={{ backgroundColor: '#0f1520', border: '1px solid #2c3a4b', color: '#c6d3e3' }}>
            {phaseLabel}
          </div>
        </div>

        {/* 右側：輸出區 */}
        <div className="flex flex-col gap-2 min-h-0 overflow-y-auto pr-0.5">
          <PanelHeader label="OUTPUT AREA" zh="輸出區" color="#4cc38a" />

          {/* Code Terminal 視窗 */}
          <div className="rounded-xl overflow-hidden border shrink-0" style={{ backgroundColor: '#070b12', borderColor: '#1e2a38' }}>
            <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ backgroundColor: '#0d1520', borderColor: '#1e2a38' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
              <span className="ml-2 text-[12px] font-mono" style={{ color: '#9fb0c3' }}>somatic_final_filtered.vcf</span>
              <span className="ml-auto text-[9px] font-mono whitespace-nowrap" style={{ color: done ? '#ffb84d' : '#5b6b7c' }}>
                {status === 'idle' ? '○ ready' : status === 'running' ? '◐ filtering' : '● FDR-filtered'}
              </span>
            </div>
            <div className="relative p-2.5">
              {done && (
                <div className="terminal-scan pointer-events-none absolute left-0 right-0 h-8" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,184,77,0.04), rgba(255,184,77,0.15), transparent)' }} />
              )}
              <div className="font-mono text-[10px] leading-[1.95] overflow-x-auto whitespace-nowrap">
                <div className="flex gap-1 pr-2" style={{ color: '#5b6b7c' }}>
                  <span style={{ width: 40 }}>#CHROM</span>
                  <span style={{ width: 62 }}>POS</span>
                  <span style={{ width: 14 }}>ID</span>
                  <span style={{ width: 22 }}>REF</span>
                  <span style={{ width: 22 }}>ALT</span>
                  <span style={{ width: 18 }}>QUAL</span>
                  <span style={{ width: 84 }}>FILTER</span>
                  <span>INFO</span>
                </div>
                {VCF_ROWS.map((r) => (
                  <div key={r.chrom + r.pos} className="flex gap-1 pr-2" style={{ color: '#c6d3e3', opacity: done ? 1 : status === 'running' ? 0.85 : 0.6, transition: 'opacity .4s' }}>
                    <span style={{ width: 40 }}>{r.chrom}</span>
                    <span style={{ width: 62 }}>{r.pos}</span>
                    <span style={{ width: 14 }}>{r.id}</span>
                    <span style={{ width: 22 }}>{r.ref}</span>
                    <span style={{ width: 22 }}>{r.alt}</span>
                    <span style={{ width: 18 }}>{r.qual}</span>
                    <span style={{ width: 84, color: r.color, fontWeight: 700 }}>{r.filter}</span>
                    <span style={{ color: '#8fa3b8' }}>{r.info}</span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 pt-1.5 border-t text-[10px] font-mono flex items-center justify-between" style={{ borderColor: '#1e2a38', color: '#9fb0c3' }}>
                <span>整合判定</span>
                <span className="flex gap-2.5">
                  <span style={{ color: '#ff6b6b' }}>{done ? '⨯ 3 標記' : '—'}</span>
                  <span style={{ color: '#4cc38a' }}>{done ? '✓ 1 PASS' : '—'}</span>
                </span>
              </div>
              {done && <span className="animate-blink font-mono text-[10px]" style={{ color: '#4cc38a' }}>▌</span>}
            </div>
          </div>

          {/* FILTER 標籤圖例 */}
          <div className="rounded-xl border p-2.5 shrink-0" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38' }}>
            <div className="text-[9px] font-bold tracking-wider mb-1.5" style={{ color: '#9fb0c3' }}>FILTER 標籤判讀</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono">
              <span style={{ color: '#ffb84d' }}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: '#ffb84d' }} />contamination</span>
              <span style={{ color: '#4cc38a' }}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: '#4cc38a' }} />PASS</span>
              <span style={{ color: '#4da3ff' }}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: '#4da3ff' }} />germline</span>
              <span style={{ color: '#ff8fb1' }}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: '#ff8fb1' }} />orientation</span>
            </div>
          </div>

          {/* 處理後的 VCF */}
          <div
            className="rounded-2xl border p-3.5 flex items-center gap-3 transition-all shrink-0"
            style={{
              backgroundColor: '#0f1520',
              borderColor: '#1e2a38',
              boxShadow: done ? '0 0 0 2px rgba(76,195,138,0.35), 0 0 18px rgba(76,195,138,0.25)' : 'none',
            }}
          >
            <DocIconSmall highlight={done} />
            <div className="min-w-0">
              <div className="text-[13px] font-bold" style={{ color: '#e8eef5' }}>最終 PASS VCF</div>
              <div className="text-[11px] font-mono truncate" style={{ color: '#9fb0c3' }}>somatic_final_filtered.vcf</div>
            </div>
            <span
              className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{
                color: done ? '#4cc38a' : '#9fb0c3',
                backgroundColor: done ? 'rgba(76,195,138,0.12)' : 'rgba(155,176,195,0.1)',
                border: '1px solid ' + (done ? 'rgba(76,195,138,0.4)' : 'rgba(155,176,195,0.25)'),
              }}
            >
              {done ? '已輸出 PASS' : '待輸出'}
            </span>
          </div>
        </div>
      </div>

      {/* ===== 底部互動區 ===== */}
      <div className="relative flex flex-col items-center gap-1.5 shrink-0 pb-1">
        <div className="relative">
          <button
            onClick={run}
            disabled={status !== 'idle'}
            className="btn-calc-glow px-14 py-3.5 rounded-2xl text-[17px] font-bold tracking-wide transition-transform hover:scale-[1.04] active:scale-95 disabled:cursor-default"
            style={{ background: 'linear-gradient(135deg, #3f8cff, #2563eb)', color: '#e8eef5', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            {status === 'idle' ? '▶ 分析最終潛在突變' : status === 'running' ? '⏳ 整合三濾網並計算 FDR…' : '✓ 分析完成：PASS VCF'}
          </button>
          {status === 'idle' && (
            <svg className="cursor-float absolute" width="26" height="26" viewBox="0 0 24 24" style={{ left: 'calc(100% - 6px)', top: -24 }}>
              <path d="M5 2.5v15.6l5.1-5.1L13.6 21l2.6-1.4-3.5-8.4L19 10 5 2.5z" fill="#e8eef5" stroke="#0f1520" strokeWidth="1.4" />
            </svg>
          )}
        </div>
        <span className="text-[11px]" style={{ color: '#9fb0c3' }}>
          按下按鈕，以貝氏模型與 FDR 整合前三步驟 filter 結果，產出最終 PASS VCF
        </span>
      </div>
    </div>
  );
};