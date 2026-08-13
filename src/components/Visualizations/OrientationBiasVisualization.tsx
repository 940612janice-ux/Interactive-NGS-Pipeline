import React, { useEffect, useRef, useState } from 'react';

interface OrientationBiasVisualizationProps {
  onComplete?: () => void;
}

type RunStatus = 'idle' | 'running' | 'done';

/* ===== 左側：DNA 對齊視圖資料 ===== */
const RUNG_TOPS = [8, 26, 44, 62, 80, 98, 116, 134, 152, 170, 188, 206, 224];
const RUNG_BASES: Record<number, string> = { 8: 'A', 26: 'C', 44: 'G', 62: 'T', 80: 'A', 98: 'G', 116: 'G', 134: 'C', 152: 'A', 170: 'C', 188: 'G', 206: 'T', 224: 'A' };
const COMPLEMENT: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };
const VARIANT_Y = 116;

interface ReadLine {
  side: 'l' | 'r';
  top: number;
  width: number;
  artifact: boolean;
}

const READS: ReadLine[] = [
  { side: 'l', top: 20, width: 36, artifact: false },
  { side: 'l', top: 50, width: 32, artifact: false },
  { side: 'l', top: 112, width: 36, artifact: true },
  { side: 'l', top: 142, width: 34, artifact: false },
  { side: 'l', top: 182, width: 38, artifact: false },
  { side: 'r', top: 32, width: 36, artifact: false },
  { side: 'r', top: 66, width: 32, artifact: false },
  { side: 'r', top: 148, width: 36, artifact: false },
  { side: 'r', top: 188, width: 34, artifact: false },
  { side: 'r', top: 212, width: 38, artifact: false },
];

const PanelHeader: React.FC<{ label: string; zh: string; color: string }> = ({ label, zh, color }) => (
  <div className="flex items-center justify-between px-1">
    <span className="text-[11px] font-bold tracking-[0.18em]" style={{ color }}>
      {label} <span className="font-normal" style={{ color: '#9fb0c3' }}>· {zh}</span>
    </span>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
  </div>
);

const ReadBar: React.FC<{ r: ReadLine }> = ({ r }) => {
  const isLeft = r.side === 'l';
  const fill = r.artifact
    ? 'linear-gradient(90deg, rgba(255,107,107,0.9), rgba(255,107,107,0.4))'
    : 'linear-gradient(90deg, rgba(77,163,255,0.85), rgba(77,163,255,0.35))';
  const glow = r.artifact ? 'rgba(255,107,107,0.55)' : 'rgba(77,163,255,0.4)';
  return (
    <div
      className="ob-read absolute flex items-center rounded-[3px]"
      style={{
        top: r.top,
        height: 9,
        width: `${r.width}%`,
        left: isLeft ? '10%' : undefined,
        right: isLeft ? undefined : '10%',
        background: fill,
        boxShadow: `0 0 8px ${glow}`,
        animationDelay: `${(r.top % 20) * 0.06}s`,
      }}
    >
      {r.artifact && (
        <span className="absolute font-mono text-[8px] font-bold" style={{ color: '#fff', ...(isLeft ? { right: 2 } : { left: 2 }) }}>
          T
        </span>
      )}
      <span className="absolute text-[9px] leading-none" style={{ color: 'rgba(232,238,245,0.85)', ...(isLeft ? { left: 1 } : { right: 1 }) }}>
        {isLeft ? '→' : '←'}
      </span>
    </div>
  );
};

export const OrientationBiasVisualization: React.FC<OrientationBiasVisualizationProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [threshold, setThreshold] = useState(0.4);
  const [phaseLabel, setPhaseLabel] = useState('等待啟動 — 準備以經驗貝氏模型學習 read orientation。');
  const timersRef = useRef<number[]>([]);

  const analyzed = status !== 'idle';
  const done = status === 'done';

  const run = () => {
    if (status !== 'idle') return;
    setStatus('running');
    setPhaseLabel('讀取變異候選的 F1R2 / F2R1 計數，學習先驗分布…');
    timersRef.current.push(
      window.setTimeout(() => setPhaseLabel('最大後驗估計：正鏈 (F1R2) 支援數異常偏高，疑似氧化損傷單鏈假突變…'), 800),
      window.setTimeout(() => setPhaseLabel('已套用 orientation_bias 濾網：剔除 G>T 疑慮變異，保留真實突變。'), 2100),
      window.setTimeout(() => {
        setStatus('done');
        onComplete?.();
      }, 2600)
    );
  };

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const f1r2Height = analyzed ? '92%' : '46%';
  const f2r1Height = analyzed ? '6%' : '42%';
  const f1r2Count = analyzed ? '412' : '124';
  const f2r1Count = analyzed ? '7' : '118';

  return (
    <div className="orientation-bias-visual flex flex-col gap-3 h-[calc(100vh-13rem)] min-h-[640px]">
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
          <h2 className="text-[17px] font-bold whitespace-nowrap" style={{ color: '#e8eef5' }}>Read Orientation Bias</h2>
          <span className="text-[15px] shrink-0" style={{ color: '#3b4b5f' }}>|</span>
          <span className="text-[14px] font-bold whitespace-nowrap" style={{ color: '#ffb84d' }}>剔除 FFPE / 氧化損傷假突變</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 ml-3 shrink-0">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: '#9fb0c3', backgroundColor: 'rgba(15,21,32,0.7)', border: '1px solid #2c3a4b' }}>
            GATK LearnReadOrientationModel · FilterByOrientationBias
          </span>
        </div>
      </div>

      {/* ===== 三欄主體 ===== */}
      <div className="grid flex-1 gap-3 min-h-0" style={{ gridTemplateColumns: 'minmax(260px,320px) minmax(320px,1fr) minmax(300px,340px)' }}>
        {/* ===== 左側：輸入與定序對齊區 ===== */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
          <PanelHeader label="INPUT & ALIGNMENT AREA" zh="輸入與定序對齊區" color="#ffb84d" />
          <div className="rounded-2xl border p-4 flex flex-col gap-3 shrink-0" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-bold" style={{ color: '#ffb84d' }}>Ref / Alt Strand</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>F1R2 / F2R1</span>
            </div>
            <div
              className="relative rounded-xl"
              style={{
                height: 250,
                backgroundColor: '#0f1520',
                border: '1px solid #1e2a38',
                background: 'radial-gradient(ellipse at 50% 45%, rgba(255,184,77,0.10), rgba(15,21,32,0) 65%)',
              }}
            >
              <div className="absolute top-3 bottom-3 w-[3px] rounded-full" style={{ left: '46%', background: 'linear-gradient(180deg, rgba(255,184,77,0.95), rgba(255,184,77,0.25))' }} />
              <div className="absolute top-3 bottom-3 w-[3px] rounded-full" style={{ right: '46%', background: 'linear-gradient(180deg, rgba(255,184,77,0.95), rgba(255,184,77,0.25))' }} />
              {RUNG_TOPS.map((y, i) => {
                const b1 = RUNG_BASES[y];
                const b2 = COMPLEMENT[b1];
                const variant = y === VARIANT_Y;
                return (
                  <div key={y} className="absolute left-0 right-0 flex items-center justify-center" style={{ top: y, height: 9, transform: `translateX(${i % 2 === 0 ? 2 : -2}px)` }}>
                    <span className="absolute" style={{ left: '46%', width: '8%', height: 1.5, background: variant ? 'rgba(255,107,107,0.9)' : 'rgba(255,184,77,0.65)' }} />
                    <span className="absolute font-mono text-[7px]" style={{ left: '44%', color: variant ? '#ff6b6b' : '#ffb84d' }}>{variant ? 'T' : b1}</span>
                    <span className="absolute font-mono text-[7px]" style={{ right: '44%', color: '#ffb84d', opacity: 0.8 }}>{b2}</span>
                  </div>
                );
              })}
              {READS.map((r, i) => (
                <ReadBar key={i} r={r} />
              ))}
              <div
                className="ob-ring-pulse absolute flex items-center justify-center rounded-full font-mono font-bold"
                style={{ left: '50%', top: VARIANT_Y, width: 26, height: 26, transform: 'translate(-50%, -50%)', border: '2px solid #ffb84d', color: '#ffb84d', backgroundColor: 'rgba(255,184,77,0.14)', fontSize: 9 }}
              >
                G&gt;T
              </div>
              <div className="absolute left-2 top-1.5 text-[8px] font-bold tracking-wider" style={{ color: 'rgba(255,184,77,0.75)' }}>5′ — REF STRAND</div>
            </div>
            <div className="flex items-center justify-center">
              <span className="whitespace-nowrap text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ color: '#ffb84d', backgroundColor: 'rgba(255,184,77,0.08)', border: '1px solid rgba(255,184,77,0.5)', boxShadow: '0 0 12px rgba(255,184,77,0.25)' }}>
                ⚠ 疑慮突變 (G&gt;T Artifact Candidate)
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] px-1">
              <span className="flex items-center gap-1" style={{ color: '#4da3ff' }}><span className="inline-block w-3 h-[5px] rounded-sm" style={{ backgroundColor: 'rgba(77,163,255,0.8)' }} /> F1R2 正鏈 reads</span>
              <span className="flex items-center gap-1" style={{ color: '#ff6b6b' }}><span className="inline-block w-3 h-[5px] rounded-sm" style={{ backgroundColor: 'rgba(255,107,107,0.85)' }} /> 帶變異 reads (G&gt;T)</span>
              <span className="flex items-center gap-1" style={{ color: '#ffb84d' }}><span className="inline-block w-2 h-2 rounded-full border-2" style={{ borderColor: '#ffb84d' }} /> 疑慮突變</span>
            </div>
          </div>
        </div>

        {/* ===== 中間：統計模型與鏈偏好分析區 ===== */}
        <div className="flex flex-col gap-3 rounded-2xl border p-4 min-h-0 overflow-hidden" style={{ backgroundColor: '#1b2430', borderColor: '#2c3a4b' }}>
          <PanelHeader label="BIAS MODEL & ALGORITHM" zh="統計模型與鏈偏好分析" color="#ffb84d" />
          <div className="text-center shrink-0">
            <p className="text-[11px]" style={{ color: '#9fb0c3' }}>[ 統計演算法：經驗貝氏模型（Empirical Bayes Orientation Model）]</p>
            <span className="mt-1.5 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide" style={{ color: '#ffb84d', backgroundColor: 'rgba(255,184,77,0.1)', border: '1px solid rgba(255,184,77,0.35)' }}>
              Learned Read Orientation Model
            </span>
          </div>

          {analyzed && (
            <div className="ob-oxo-flash flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0" style={{ color: '#ff6b6b', backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.45)' }}>
              <span className="font-mono text-[14px]" style={{ textShadow: '0 0 8px rgba(255,107,107,0.8)' }}>O₂</span>
              <span>❌ 氧化損傷假突變警示 (FFPE / OxoG)</span>
            </div>
          )}

          {/* 鏈偏好長條圖 */}
          <div className="flex-1 flex flex-col justify-center min-h-0 py-1">
            <div className="text-center text-[11px] font-bold mb-2 shrink-0" style={{ color: '#c6d3e3' }}>
              G&gt;T 變異 · 鏈偏好計數分布 <span className="font-normal" style={{ color: '#9fb0c3' }}>(Strand Bias)</span>
            </div>
            <div className="flex items-end justify-center gap-10" style={{ height: 200 }}>
              <div className="flex flex-col items-center gap-1.5 justify-end h-full">
                <span className="font-mono text-[16px] font-bold" style={{ color: analyzed ? '#ff6b6b' : '#9fb0c3' }}>{f1r2Count}</span>
                <div
                  className="w-[72px] rounded-t-lg"
                  style={{
                    height: f1r2Height,
                    transition: 'height 1.4s cubic-bezier(0.34,1.3,0.5,1)',
                    background: 'linear-gradient(180deg, #ff6b6b, #d63a3a)',
                    boxShadow: analyzed ? '0 0 18px rgba(255,107,107,0.55)' : '0 0 6px rgba(255,107,107,0.2)',
                  }}
                />
                <span className="text-[10px] whitespace-nowrap" style={{ color: '#c6d3e3' }}>正鏈 (F1R2 Strand Count)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 justify-end h-full">
                <span className="font-mono text-[16px] font-bold" style={{ color: analyzed ? '#4da3ff' : '#9fb0c3' }}>{f2r1Count}</span>
                <div
                  className="w-[72px] rounded-t-lg"
                  style={{
                    height: f2r1Height,
                    transition: 'height 1.4s cubic-bezier(0.34,1.3,0.5,1)',
                    background: 'linear-gradient(180deg, #4da3ff, #2f6fce)',
                    boxShadow: analyzed ? '0 0 10px rgba(77,163,255,0.4)' : '0 0 4px rgba(77,163,255,0.15)',
                  }}
                />
                <span className="text-[10px] whitespace-nowrap" style={{ color: '#c6d3e3' }}>反鏈 (F2R1 Strand Count)</span>
              </div>
            </div>
            <div className="text-center text-[10px] mt-2 shrink-0" style={{ color: done ? '#ffb84d' : '#5b6b7c' }}>
              {done ? '⚠ 極度不平衡：變異只出現在單鏈，判定為 FFPE / 氧化損傷假突變' : '鏈偏好均衡 = 真實雙鏈突變；單鏈極度失衡 = 假突變'}
            </div>
          </div>

          {/* 狀態列 */}
          <div className="w-full rounded-lg px-3 py-2 text-center text-[11px] shrink-0" style={{ backgroundColor: '#0f1520', border: '1px solid #2c3a4b', color: '#c6d3e3' }}>
            {phaseLabel}
          </div>
        </div>

        {/* ===== 右側：輸出區 ===== */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
          <PanelHeader label="OUTPUT AREA" zh="輸出區" color="#4cc38a" />

          {/* 鏈偏好過濾閾值滑桿 */}
          <div className="rounded-2xl border p-3.5 shrink-0" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb84d" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <rect x="2" y="5" width="20" height="14" rx="3" />
                <line x1="6" y1="12" x2="14" y2="12" />
                <circle cx="16" cy="12" r="2.4" fill="#ffb84d" stroke="none" />
              </svg>
              <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: '#e8eef5' }}>鏈偏好過濾閾值</span>
              <span className="text-[10px] hidden sm:inline" style={{ color: '#9fb0c3' }}>(Orientation Bias Threshold)</span>
              <span className="ml-auto font-mono text-[12px] font-bold" style={{ color: '#ffb84d' }}>{threshold.toFixed(2)}</span>
            </div>
            <input type="range" className="ob-threshold-slider w-full" min={0} max={0.8} step={0.01} value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} />
            <div className="flex justify-between text-[9px] px-1 mt-1" style={{ color: '#5b6b7c' }}>
              <span>0 · 嚴格</span>
              <span>0.8 · 寬鬆</span>
            </div>
          </div>

          {/* Code Terminal 視窗 */}
          <div className="rounded-xl overflow-hidden border shrink-0" style={{ backgroundColor: '#070b12', borderColor: '#1e2a38' }}>
            <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ backgroundColor: '#0d1520', borderColor: '#1e2a38' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
              <span className="ml-2 text-[12px] font-mono" style={{ color: '#9fb0c3' }}>orientation-models.tar.gz</span>
              <span className="ml-auto text-[9px] font-mono whitespace-nowrap" style={{ color: done ? '#4cc38a' : '#5b6b7c' }}>
                {done ? '● model learned' : '○ ready'}
              </span>
            </div>
            <div className="relative p-3 font-mono text-[12px] leading-[1.95]">
              {done && <div className="terminal-scan pointer-events-none absolute left-0 right-0 h-8" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,184,77,0.04), rgba(255,184,77,0.15), transparent)' }} />}
              <div className="whitespace-nowrap" style={{ color: '#ffb84d' }}>資訊維度 :</div>
              <div className="h-1.5" />
              <div className="flex items-center gap-2 whitespace-nowrap" style={{ color: '#c6d3e3' }}>
                <span style={{ color: '#4da3ff' }}>[1]</span>
                <span>DNA 損傷類型矩陣</span>
                <span className="ml-auto" style={{ color: done ? '#4cc38a' : '#5b6b7c' }}>{done ? '✓ 已學習' : ''}</span>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap" style={{ color: '#c6d3e3' }}>
                <span style={{ color: '#4da3ff' }}>[2]</span>
                <span>正反鏈方向性偏向分布</span>
                <span className="ml-auto" style={{ color: done ? '#4cc38a' : '#5b6b7c' }}>{done ? '✓ 已學習' : ''}</span>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap" style={{ color: '#c6d3e3' }}>
                <span style={{ color: '#4da3ff' }}>[3]</span>
                <span>先驗概率矩陣</span>
                <span className="ml-auto" style={{ color: done ? '#4cc38a' : '#5b6b7c' }}>{done ? '✓ 已學習' : ''}</span>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap" style={{ color: '#c6d3e3' }}>
                <span style={{ color: '#4da3ff' }}>[4]</span>
                <span>Read Orientation Quality (ROQ) 校正參數</span>
                <span className="ml-auto" style={{ color: done ? '#4cc38a' : '#5b6b7c' }}>{done ? '✓ 已學習' : ''}</span>
              </div>
              <div className="h-1.5" />
              {done && <span className="animate-blink" style={{ color: '#4cc38a' }}>▌</span>}
            </div>
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
            {status === 'idle' ? '分析突變偏好' : status === 'running' ? '⏳ 學習模型並過濾中…' : '✓ 分析完成'}
          </button>
          {status === 'idle' && (
            <svg className="cursor-float absolute" width="26" height="26" viewBox="0 0 24 24" style={{ left: 'calc(100% - 6px)', top: -24 }}>
              <path d="M5 2.5v15.6l5.1-5.1L13.6 21l2.6-1.4-3.5-8.4L19 10 5 2.5z" fill="#e8eef5" stroke="#0f1520" strokeWidth="1.4" />
            </svg>
          )}
        </div>
        <span className="text-[11px]" style={{ color: '#9fb0c3' }}>
          按下按鈕，學習 read orientation 模型並剔除 FFPE / 氧化損傷造成的假突變
        </span>
      </div>
    </div>
  );
};
