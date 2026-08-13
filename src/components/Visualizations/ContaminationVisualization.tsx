import React, { useEffect, useRef, useState } from 'react';

interface ContaminationVisualizationProps {
  onComplete?: () => void;
}

type RunStatus = 'idle' | 'running' | 'done';

const HELIX_BASE: Record<string, string> = {
  A: '#ff6b6b',
  C: '#4cc38a',
  G: '#ffb84d',
  T: '#4da3ff',
};

const HELIX_PAIRS = ['AT', 'CG', 'TA', 'GC', 'AT', 'CG', 'TA', 'GC'];

const POP_DOTS = [
  { x: 12, y: 18, s: 3, c: '#4da3ff', o: 0.9 },
  { x: 24, y: 11, s: 3, c: '#4cc38a', o: 0.8 },
  { x: 36, y: 19, s: 3, c: '#ffb84d', o: 0.9 },
  { x: 18, y: 32, s: 2, c: '#7a6bff', o: 0.8 },
  { x: 32, y: 34, s: 2, c: '#4da3ff', o: 0.85 },
  { x: 11, y: 42, s: 3, c: '#ff8fb1', o: 0.8 },
  { x: 26, y: 43, s: 2, c: '#4cc38a', o: 0.9 },
  { x: 38, y: 40, s: 2, c: '#ffb84d', o: 0.85 },
  { x: 23, y: 24, s: 2, c: '#e8eef5', o: 0.7 },
  { x: 42, y: 29, s: 2, c: '#4da3ff', o: 0.7 },
  { x: 16, y: 27, s: 2, c: '#ff6b6b', o: 0.6 },
  { x: 34, y: 46, s: 2, c: '#7a6bff', o: 0.7 },
];

/* ===== Gauge geometry ===== */
const CX = 120;
const CY = 118;
const GR = 96;

const polar = (angle: number, r: number) => {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
};

const arcPath = (a1: number, a2: number) => {
  const p1 = polar(a1, GR);
  const p2 = polar(a2, GR);
  const large = a1 - a2 > 180 ? 1 : 0;
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${GR} ${GR} 0 ${large} 0 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
};

const ZONES = [
  { from: 180, to: 128, color: '#ff6b6b', toClean: false },
  { from: 128, to: 76, color: '#ffb84d', toClean: false },
  { from: 76, to: 0, color: '#4cc38a', toClean: true },
];

const TICKS = Array.from({ length: 13 }, (_, i) => i * 15);

/* ===== CalculateContamination 輸出 — 4 大資訊維度 ===== */
const CONTAM_DIMENSIONS: { id: number; title: string }[] = [
  { id: 1, title: '樣品整體交叉污染率' },
  { id: 2, title: '污染率估計不確定度' },
  { id: 3, title: '基因體區塊 MAF 分段資訊' },
  { id: 4, title: '濾除風險評估' },
];

/* ===== Small presentational blocks ===== */

const PanelHeader: React.FC<{ label: string; zh: string; color: string }> = ({ label, zh, color }) => (
  <div className="flex items-center justify-between px-1">
    <span className="text-[11px] font-bold tracking-[0.18em]" style={{ color }}>
      {label} <span className="font-normal" style={{ color: '#9fb0c3' }}>· {zh}</span>
    </span>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
  </div>
);

const DocShell: React.FC<{ accent: string; children: React.ReactNode }> = ({ accent, children }) => (
  <div className="relative w-[96px] h-[116px]">
    <span className="data-pulse-ring absolute -inset-5 rounded-[28px]" style={{ background: `${accent}22` }} />
    <span className="data-pulse-ring absolute -inset-5 rounded-[28px]" style={{ background: `${accent}22`, animationDelay: '1.2s' }} />
    <div className="absolute inset-0 rounded-xl border" style={{ backgroundColor: '#1b2430', borderColor: '#3b4b5f', boxShadow: '0 8px 22px rgba(0,0,0,0.45)' }} />
    <div className="absolute top-0 right-0 w-[22px] h-[22px]" style={{ background: 'linear-gradient(135deg, transparent 50%, #2c3a4b 50%)' }} />
    <div className="absolute top-0 right-0 w-[22px] h-[22px]" style={{ background: 'linear-gradient(135deg, transparent 50%, #232f3e 50%)' }} />
    <div className="absolute top-[14px] left-[12px] w-[46px] h-[5px] rounded-full" style={{ background: accent, opacity: 0.85 }} />
    <div className="absolute top-[24px] left-[12px] w-[30px] h-[3px] rounded-full" style={{ background: '#3b4b5f' }} />
    <div className="absolute inset-0 flex items-center justify-center pb-2">{children}</div>
  </div>
);

const HelixPattern: React.FC = () => (
  <div className="animate-helix-sway relative w-[60px] h-[72px]">
    <div className="absolute left-[12px] top-0 bottom-0 w-[2px] rounded-full" style={{ background: 'linear-gradient(180deg, #4da3ff, #7a6bff)' }} />
    <div className="absolute right-[12px] top-0 bottom-0 w-[2px] rounded-full" style={{ background: 'linear-gradient(180deg, #ffb84d, #4cc38a)' }} />
    {HELIX_PAIRS.map((pair, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      return (
        <div key={i} className="absolute left-0 right-0 h-[9px]" style={{ top: i * 9, transform: `translateX(${dir * 3}px)` }}>
          <span className="absolute top-[1px] left-[2px] w-[7px] h-[7px] rounded-full" style={{ background: HELIX_BASE[pair[0]], boxShadow: `0 0 6px ${HELIX_BASE[pair[0]]}` }} />
          <span className="absolute top-[3px] left-[10px] right-[10px] h-[1px]" style={{ background: 'rgba(232,238,245,0.4)' }} />
          <span className="absolute top-[1px] right-[2px] w-[7px] h-[7px] rounded-full" style={{ background: HELIX_BASE[pair[1]], boxShadow: `0 0 6px ${HELIX_BASE[pair[1]]}` }} />
        </div>
      );
    })}
  </div>
);

const GlobePattern: React.FC = () => (
  <div
    className="relative w-[56px] h-[56px] rounded-full overflow-hidden border shrink-0"
    style={{
      borderColor: 'rgba(77,163,255,0.45)',
      background: 'radial-gradient(circle at 40% 30%, #1b2430 0%, #0f1520 75%)',
      boxShadow: 'inset 0 0 14px rgba(77,163,255,0.25), 0 0 14px rgba(77,163,255,0.25)',
    }}
  >
    <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: 'rgba(77,163,255,0.2)' }} />
    <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'rgba(77,163,255,0.2)' }} />
    {POP_DOTS.map((d, i) => (
      <span key={i} className="absolute rounded-full" style={{ left: d.x, top: d.y, width: d.s, height: d.s, background: d.c, opacity: d.o, boxShadow: `0 0 5px ${d.c}` }} />
    ))}
  </div>
);

const DatabaseIcon: React.FC = () => (
  <svg width="26" height="24" viewBox="0 0 36 30" style={{ flexShrink: 0 }}>
    <ellipse cx="18" cy="7" rx="15" ry="6" fill="none" stroke="#7a6bff" strokeWidth="2" />
    <path d="M3 7v16c0 3.3 6.7 6 15 6s15-2.7 15-6V7" fill="none" stroke="#4da3ff" strokeWidth="2" />
    <path d="M3 15c0 3.3 6.7 6 15 6s15-2.7 15-6" fill="none" stroke="#7a6bff" strokeWidth="2" opacity="0.7" />
  </svg>
);

const FlowArrows: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-1.5 h-full">
    {[0, 1, 2].map((i) => (
      <span key={i} className="data-flow-dot text-[11px]" style={{ color: '#4da3ff', textShadow: '0 0 6px #4da3ff', animationDelay: `${i * 0.3}s` }}>
        ➤
      </span>
    ))}
  </div>
);

interface MechanismProps {
  status: RunStatus;
  contam: number;
}

const CalcMechanism: React.FC<MechanismProps> = ({ status, contam }) => {
  const sp = status === 'idle' ? 18 : status === 'running' ? 4 : 10;
  const spR = status === 'idle' ? 14 : status === 'running' ? 3.4 : 8;
  const orb = status === 'idle' ? 7 : status === 'running' ? 2.2 : 4.5;
  return (
    <div
      className="relative w-[300px] h-[300px] rounded-full shrink-0"
      style={{
        background: 'radial-gradient(circle, #1b2430 0%, #0f1520 72%)',
        border: '1px solid #2c3a4b',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 30px rgba(77,163,255,0.1)',
      }}
    >
      <div className="absolute inset-1.5 rounded-full" style={{ border: '2px dashed rgba(77,163,255,0.4)', animation: `spin ${sp}s linear infinite` }} />
      <div className="absolute inset-5 rounded-full" style={{ border: '1px dashed rgba(255,184,77,0.35)', animation: `spinReverse ${spR}s linear infinite` }} />
      <div className="absolute inset-9 rounded-full" style={{ border: '5px dashed rgba(122,107,255,0.3)', animation: `spin ${sp}s linear infinite` }} />
      <div className="absolute inset-14 rounded-full" style={{ border: '2px dotted rgba(77,163,255,0.45)', animation: `spinReverse ${spR}s linear infinite` }} />

      <div className="absolute inset-0 rounded-full" style={{ animation: `spin ${orb}s linear infinite` }}>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <span key={a} className="absolute w-[7px] h-[7px] rounded-full" style={{ left: '50%', top: '50%', background: '#4da3ff', boxShadow: '0 0 8px #4da3ff', transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-118px)` }} />
        ))}
      </div>
      <div className="absolute inset-0 rounded-full" style={{ animation: `spinReverse ${orb * 1.4}s linear infinite` }}>
        {[30, 150, 270].map((a) => (
          <span key={a} className="absolute w-[6px] h-[6px] rounded-full" style={{ left: '50%', top: '50%', background: '#ffb84d', boxShadow: '0 0 8px #ffb84d', transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-140px)` }} />
        ))}
      </div>
      <div className="absolute inset-0 rounded-full" style={{ animation: `spin ${orb * 1.8}s linear infinite` }}>
        {[90, 210, 330].map((a) => (
          <span key={a} className="absolute w-[5px] h-[5px] rounded-full" style={{ left: '50%', top: '50%', background: '#4cc38a', boxShadow: '0 0 6px #4cc38a', transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-102px)` }} />
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative flex flex-col items-center justify-center rounded-full"
          style={{
            width: 132,
            height: 132,
            background: '#0f1520',
            border: '2px solid #ffb84d',
            boxShadow: '0 0 26px rgba(255,184,77,0.35), inset 0 0 20px rgba(255,184,77,0.08)',
          }}
        >
          <span className="text-[9px] tracking-[0.14em]" style={{ color: '#9fb0c3' }}>CONTAMINATION</span>
          <span className="font-mono text-[38px] leading-none font-bold mt-0.5" style={{ color: '#ffb84d', textShadow: '0 0 16px rgba(255,184,77,0.55)' }}>
            {contam.toFixed(1)}%
          </span>
          <span className="text-[9px]" style={{ color: '#9fb0c3' }}>MLE Estimate</span>
        </div>
      </div>
    </div>
  );
};

interface GaugeProps {
  status: RunStatus;
}

const Gauge: React.FC<GaugeProps> = ({ status }) => {
  const clean = status === 'done';
  const needleAngle = status === 'idle' ? 150 : 30;
  return (
    <svg viewBox="0 0 240 132" className="w-full max-w-[300px]">
      <path d={arcPath(180, 0)} fill="none" stroke="#1b2430" strokeWidth="16" strokeLinecap="round" />
      {ZONES.map((z) => (
        <path
          key={z.color}
          d={arcPath(z.from, z.to)}
          fill="none"
          stroke={z.color}
          strokeWidth="10"
          strokeLinecap="round"
          opacity={status === 'idle' && z.toClean ? 0.45 : 1}
          className={z.toClean && clean ? 'zone-clean-glow' : undefined}
        />
      ))}
      {TICKS.map((a) => (
        <line
          key={a}
          x1={polar(a, 106).x}
          y1={polar(a, 106).y}
          x2={polar(a, 112).x}
          y2={polar(a, 112).y}
          stroke={a % 45 === 0 ? '#c6d3e3' : '#3b4b5f'}
          strokeWidth={a % 45 === 0 ? 2 : 1}
        />
      ))}
      <text x={polar(172, 68).x} y={polar(172, 68).y} textAnchor="middle" fontSize="10" fill="#ff6b6b" fontWeight="700">High</text>
      <text x={polar(110, 60).x} y={polar(110, 60).y} textAnchor="middle" fontSize="9" fill="#ffb84d" fontWeight="700">Moderate</text>
      <text x={polar(15, 82).x} y={polar(15, 82).y} textAnchor="middle" fontSize="10" fill={clean ? '#4cc38a' : '#9fb0c3'} fontWeight="700">Clean 潔淨</text>
      <g
        style={{
          transformOrigin: `${CX}px ${CY}px`,
          transform: `rotate(${needleAngle - 90}deg)`,
          transition: 'transform 1.5s cubic-bezier(0.34, 1.2, 0.5, 1)',
        }}
        className={clean ? 'needle-clean-glow' : undefined}
      >
        <line x1={CX} y1={CY + 12} x2={CX} y2={CY - 74} stroke={clean ? '#4cc38a' : '#e8eef5'} strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx={CX} cy={CY} r="7" fill={clean ? '#4cc38a' : '#e8eef5'} className={clean ? 'needle-clean-glow' : undefined} />
      <circle cx={CX} cy={CY} r="2.8" fill="#0f1520" />
    </svg>
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

const renderContamSections = (done: boolean) => (
  <>
    <div className="whitespace-nowrap" style={{ color: '#ffb84d' }}>資訊維度 :</div>
    <div className="h-1.5" />
    {CONTAM_DIMENSIONS.map((sec) => (
      <div key={sec.id} className="flex items-center gap-2 whitespace-nowrap" style={{ color: '#c6d3e3' }}>
        <span style={{ color: '#4da3ff' }}>[{sec.id}]</span>
        <span>{sec.title}</span>
        <span className="ml-auto" style={{ color: done ? '#4cc38a' : '#5b6b7c' }}>{done ? '✓ 已估算' : ''}</span>
      </div>
    ))}
    <div className="h-1.5" />
    {done && <span className="animate-blink" style={{ color: '#4cc38a' }}>▌</span>}
  </>
);

export const ContaminationVisualization: React.FC<ContaminationVisualizationProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [contam, setContam] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('等待啟動 — 準備輸入樣本 VCF 與群體頻率資料。');
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);

  const cleanPct = status === 'idle' ? null : 100 - contam;

  const run = () => {
    if (status !== 'idle') return;
    setStatus('running');
    setPhaseLabel('讀取樣本 VCF 與群體頻率資料…');

    const target = 2.0;
    const dur = 1800;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setContam(eased * target);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    timersRef.current.push(
      window.setTimeout(() => setPhaseLabel('Maximum Likelihood 迭代中：配適少數等位基因頻率模型…'), 700),
      window.setTimeout(() => setPhaseLabel('交叉污染率估算完成：2.0% — 低於 5% 門檻，樣本潔淨。'), 1900),
      window.setTimeout(() => {
        setStatus('done');
        onComplete?.();
      }, 2400)
    );
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className="contamination-visual flex flex-col gap-3 h-[calc(100vh-13rem)] min-h-[640px]">
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
            1
          </span>
          <h2 className="text-[17px] font-bold whitespace-nowrap" style={{ color: '#e8eef5' }}>Contamination Estimation</h2>
          <span className="text-[15px] shrink-0" style={{ color: '#3b4b5f' }}>|</span>
          <span className="text-[14px] font-bold whitespace-nowrap" style={{ color: '#ffb84d' }}>計算交叉污染率</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 ml-3 shrink-0">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: '#9fb0c3', backgroundColor: 'rgba(15,21,32,0.7)', border: '1px solid #2c3a4b' }}>
            GATK GetPileupSummaries · CalculateContamination
          </span>
        </div>
      </div>

      {/* ===== 三欄主體 ===== */}
      <div className="grid flex-1 gap-3 min-h-0" style={{ gridTemplateColumns: 'minmax(240px,300px) 26px minmax(300px,1fr) minmax(290px,340px)' }}>
        {/* 左側：輸入區 */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
          <PanelHeader label="INPUT AREA" zh="輸入區" color="#4da3ff" />
          <div className="rounded-2xl border p-4 flex flex-col items-center gap-3" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
            <DocShell accent="#4da3ff">
              <HelixPattern />
            </DocShell>
            <div className="text-center">
              <div className="text-[14px] font-bold" style={{ color: '#e8eef5' }}>樣本 VCF (Raw)</div>
              <div className="text-[11px]" style={{ color: '#9fb0c3' }}>待測樣本</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: '#4da3ff', backgroundColor: 'rgba(77,163,255,0.12)', border: '1px solid rgba(77,163,255,0.35)' }}>
              somatic_raw.vcf
            </span>
          </div>

          <div className="rounded-2xl border p-4 flex flex-col items-center gap-3" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
            <DocShell accent="#7a6bff">
              <div className="flex items-end gap-2">
                <GlobePattern />
                <DatabaseIcon />
              </div>
            </DocShell>
            <div className="text-center">
              <div className="text-[14px] font-bold" style={{ color: '#e8eef5' }}>群體數據庫</div>
              <div className="text-[10px]" style={{ color: '#9fb0c3' }}>Allele Frequencies · 參考群體</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: '#7a6bff', backgroundColor: 'rgba(122,107,255,0.12)', border: '1px solid rgba(122,107,255,0.35)' }}>
              gnomAD AF
            </span>
          </div>
        </div>

        {/* 流向箭頭 */}
        <FlowArrows />

        {/* 中間：演算法核心 */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border p-4 min-h-0 overflow-hidden" style={{ backgroundColor: '#1b2430', borderColor: '#2c3a4b' }}>
          <PanelHeader label="ALGORITHM" zh="演算核心" color="#ffb84d" />
          <div className="text-center shrink-0">
            <p className="text-[11px]" style={{ color: '#9fb0c3' }}>[ 統計演算法：根據少數等位基因頻率分佈計算污染 ]</p>
            <span
              className="mt-1.5 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide"
              style={{ color: '#ffb84d', backgroundColor: 'rgba(255,184,77,0.1)', border: '1px solid rgba(255,184,77,0.35)' }}
            >
              Maximum Likelihood Estimation
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0 py-1">
            <CalcMechanism status={status} contam={contam} />
          </div>
          <div className="w-full rounded-lg px-3 py-2 text-center text-[11px] shrink-0" style={{ backgroundColor: '#0f1520', border: '1px solid #2c3a4b', color: '#c6d3e3' }}>
            {phaseLabel}
          </div>
        </div>

        {/* 右側：輸出區 */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
          <PanelHeader label="OUTPUT AREA" zh="輸出區" color="#4cc38a" />
          <div className="rounded-2xl border p-3.5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[13px] font-bold" style={{ color: '#4cc38a' }}>樣本潔淨度</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: cleanPct !== null ? '#4cc38a' : '#9fb0c3', backgroundColor: cleanPct !== null ? 'rgba(76,195,138,0.12)' : 'rgba(155,176,195,0.1)', border: '1px solid ' + (cleanPct !== null ? 'rgba(76,195,138,0.4)' : 'rgba(155,176,195,0.25)') }}>
                {status === 'done' ? 'Clean ✓' : status === 'running' ? '分析中…' : '待計算'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <Gauge status={status} />
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-[26px] font-bold leading-none" style={{ color: status === 'done' ? '#4cc38a' : '#9fb0c3' }}>
                  {cleanPct === null ? '—' : cleanPct.toFixed(1)}
                </span>
                <span className="text-[11px]" style={{ color: '#9fb0c3' }}>% Clean</span>
              </div>
            </div>
          </div>

          {/* Code Terminal 視窗 */}
          <div className="rounded-xl overflow-hidden border shrink-0" style={{ backgroundColor: '#070b12', borderColor: '#1e2a38' }}>
            <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ backgroundColor: '#0d1520', borderColor: '#1e2a38' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
              <span className="ml-2 text-[12px] font-mono" style={{ color: '#9fb0c3' }}>contamination.table</span>
              <span className="ml-auto text-[9px] font-mono whitespace-nowrap" style={{ color: status === 'done' ? '#ffb84d' : '#5b6b7c' }}>
                {status === 'done' ? '● contamination marked' : '○ ready'}
              </span>
            </div>
            <div className="relative p-3 font-mono text-[10px] leading-[1.95]">
              {status === 'done' && (
                <div className="terminal-scan pointer-events-none absolute left-0 right-0 h-8" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,184,77,0.04), rgba(255,184,77,0.15), transparent)' }} />
              )}
              {renderContamSections(status === 'done')}
            </div>
          </div>

          {/* 處理後的 VCF */}
          <div
            className="rounded-2xl border p-3.5 flex items-center gap-3 transition-all shrink-0"
            style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', boxShadow: status === 'done' ? '0 0 0 2px rgba(76,195,138,0.35), 0 0 18px rgba(76,195,138,0.25)' : 'none' }}
          >
            <DocIconSmall highlight={status === 'done'} />
            <div className="min-w-0">
              <div className="text-[13px] font-bold" style={{ color: '#e8eef5' }}>處理後的 VCF</div>
              <div className="text-[11px] font-mono truncate" style={{ color: '#9fb0c3' }}>somatic_contamination_filtered.vcf</div>
            </div>
            <span
              className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ color: status === 'done' ? '#4cc38a' : '#9fb0c3', backgroundColor: status === 'done' ? 'rgba(76,195,138,0.12)' : 'rgba(155,176,195,0.1)', border: '1px solid ' + (status === 'done' ? 'rgba(76,195,138,0.4)' : 'rgba(155,176,195,0.25)') }}
            >
              {status === 'done' ? '已標記污染' : '待標記'}
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
            {status === 'idle' ? '▶ 開始計算' : status === 'running' ? '⏳ 計算中…' : '✓ 計算完成'}
          </button>
          {status === 'idle' && (
            <svg className="cursor-float absolute" width="26" height="26" viewBox="0 0 24 24" style={{ left: 'calc(100% - 6px)', top: -24 }}>
              <path d="M5 2.5v15.6l5.1-5.1L13.6 21l2.6-1.4-3.5-8.4L19 10 5 2.5z" fill="#e8eef5" stroke="#0f1520" strokeWidth="1.4" />
            </svg>
          )}
        </div>
        <span className="text-[11px]" style={{ color: '#9fb0c3' }}>
          按下按鈕，讓 MLE 演算法估算交叉污染率並標記污染位點
        </span>
      </div>
    </div>
  );
};
