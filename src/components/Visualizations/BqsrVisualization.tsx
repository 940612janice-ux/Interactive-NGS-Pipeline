import React, { useEffect, useRef, useState } from 'react';

interface BqsrVisualizationProps {
  onComplete?: () => void;
}

const REF_BASES = 'TGAATTTTGGATTACTAAGGAATTTACAGTACAAAAATGTACTTGTTAACACAGTGACAT';
const REF_LENGTH = REF_BASES.length;
const REF_START = 10000001;
const BASE_COLORS: Record<string, string> = { A: '#ff6b6b', T: '#4da3ff', C: '#4cc38a', G: '#ffb84d' };
const DBSNP_SITES = [12, 18, 25, 33, 45, 52, 67, 78, 91];

export const BqsrVisualization: React.FC<BqsrVisualizationProps> = () => {
  const [currentBias, setCurrentBias] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [bamPhase, setBamPhase] = useState('');
  const beforePointsRef = useRef<HTMLDivElement>(null);
  const afterPointsRef = useRef<HTMLDivElement>(null);
  const idealLineRef = useRef<HTMLDivElement>(null);
  const calFillRef = useRef<HTMLDivElement>(null);
  const calTextRef = useRef<HTMLDivElement>(null);
  const gapStatRef = useRef<HTMLSpanElement>(null);
  const rawBamRef = useRef<HTMLDivElement>(null);
  const finalBamRef = useRef<HTMLDivElement>(null);

  const cycles = 50;
  const qcData: Array<{ cycle: number; reported: number; empirical: number; hasDbsnp: boolean }> = [];
  for (let c = 0; c < cycles; c++) {
    const reportedQ = 25 + Math.sin(c * 0.3) * 4 + (c < 10 ? -3 : c > 40 ? -2 : 0);
    const systematicBias = reportedQ - 3 - Math.sin(c * 0.2) * 2;
    const empiricalQ = Math.max(5, systematicBias + (Math.random() - 0.5) * 2);
    qcData.push({ cycle: c + 1, reported: reportedQ, empirical: empiricalQ, hasDbsnp: DBSNP_SITES.includes(c) });
  }

  const plotWidth = 480;
  const plotHeight = 280;
  const paddingLeft = 50;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingRight = 20;
  const plotInnerW = plotWidth - paddingLeft - paddingRight;
  const plotInnerH = plotHeight - paddingTop - paddingBottom;
  const maxQ = 50;
  const minQ = 0;

  const yToPixel = (q: number) => plotInnerH - ((q - minQ) / (maxQ - minQ)) * plotInnerH;
  const xToPixel = (cycle: number) => (cycle / cycles) * plotInnerW;

  const recalibratedData = qcData.map((d) => {
    let recalibratedEmpirical = d.reported - currentBias * 2;
    recalibratedEmpirical = Math.max(5, Math.min(50, recalibratedEmpirical));
    return { ...d, recalibratedEmpirical };
  });

  const avgReported = qcData.reduce((s, d) => s + d.reported, 0) / qcData.length;
  const avgEmpiricalBefore = qcData.reduce((s, d) => s + d.empirical, 0) / qcData.length;
  const avgEmpirical = recalibratedData.reduce((s, d) => s + d.recalibratedEmpirical, 0) / recalibratedData.length;
  const gapAfter = Math.abs(avgReported - avgEmpirical);
  const empiricalDiff = avgEmpirical - avgEmpiricalBefore;
  const gapPercent = Math.max(0, 100 - (gapAfter / 10) * 100);

  const renderAxes = () => {
    if (!idealLineRef.current) return;
    const el = idealLineRef.current;
    el.innerHTML = '';
    const yLabels = [0, 10, 20, 30, 40, 50];
    yLabels.forEach((q) => {
      const div = document.createElement('div');
      div.className = 'absolute text-[9px]';
      div.style.bottom = `${(q / maxQ) * 100}%`;
      div.style.left = '-38px';
      div.style.color = '#9fb0c3';
      div.textContent = 'Q' + q;
      el.appendChild(div);
    });
    const xLabels = [0, 10, 20, 30, 40, 50];
    xLabels.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'absolute text-[9px]';
      div.style.left = `${(c / cycles) * 100}%`;
      div.style.top = '100%';
      div.style.color = '#9fb0c3';
      div.textContent = String(c);
      el.appendChild(div);
    });

    const diagonal = document.createElement('div');
    diagonal.className = 'absolute';
    diagonal.style.left = '0';
    diagonal.style.top = `${plotInnerH}px`;
    diagonal.style.width = '100%';
    diagonal.style.height = '1px';
    diagonal.style.transformOrigin = '0 0';
    diagonal.style.transform = 'rotate(-48deg)';
    diagonal.style.background = 'rgba(76, 195, 138, 0.6)';
    el.appendChild(diagonal);

    const label = document.createElement('div');
    label.className = 'absolute text-[10px] font-bold';
    label.style.left = `${plotInnerW}px`;
    label.style.top = '0';
    label.style.color = '#4cc38a';
    label.textContent = '理想校準線 (45°)';
    el.appendChild(label);
  };

  const renderPoints = () => {
    if (!beforePointsRef.current || !afterPointsRef.current) return;
    const beforePoints = beforePointsRef.current;
    const afterPoints = afterPointsRef.current;
    beforePoints.innerHTML = '';
    afterPoints.innerHTML = '';
    qcData.forEach((d, i) => {
      const beforeEl = document.createElement('div');
      beforeEl.className = 'absolute w-[3px] h-[3px] rounded-full';
      beforeEl.style.background = '#ff6b6b';
      beforeEl.style.boxShadow = '0 0 3px rgba(255,107,107,0.6)';
      beforeEl.style.left = `${paddingLeft + xToPixel(d.cycle)}px`;
      beforeEl.style.top = `${yToPixel(d.reported) + paddingTop}px`;
      beforeEl.title = `Cycle ${d.cycle}: Reported=${d.reported.toFixed(1)}`;
      beforePoints.appendChild(beforeEl);

      const afterEl = document.createElement('div');
      afterEl.className = 'absolute w-[3px] h-[3px] rounded-full';
      afterEl.style.background = '#4cc38a';
      afterEl.style.boxShadow = '0 0 3px rgba(76,195,138,0.6)';
      afterEl.style.left = `${paddingLeft + xToPixel(d.cycle)}px`;
      afterEl.style.top = `${yToPixel(recalibratedData[i].recalibratedEmpirical) + paddingTop}px`;
      afterEl.title = `Cycle ${d.cycle}: Empirical=${recalibratedData[i].recalibratedEmpirical.toFixed(1)} (recalibrated)`;
      afterPoints.appendChild(afterEl);
    });

    if (gapStatRef.current) {
      gapStatRef.current.textContent = `Δ=${gapAfter.toFixed(1)} Q`;
      gapStatRef.current.style.color = gapAfter < 3 ? '#4cc38a' : gapAfter < 6 ? '#ffb84d' : '#ff6b6b';
    }
    if (calFillRef.current) calFillRef.current.style.width = gapPercent + '%';
    if (calTextRef.current) {
      calTextRef.current.textContent = gapAfter < 2 ? '✅ 校准完成!' : `校准中... 差距: ${gapAfter.toFixed(1)} Q`;
    }
  };

  const renderGenomeTrack = () => {
    if (!genomeTrackRef.current) return;
    genomeTrackRef.current.innerHTML = '';
    for (let i = 0; i < REF_LENGTH; i++) {
      const base = REF_BASES[i];
      const cell = document.createElement('div');
      cell.className = 'flex items-center justify-center font-mono text-[10px]';
      cell.style.width = '100%';
      cell.style.background = BASE_COLORS[base];
      cell.style.color = '#0a0e17';
      cell.style.fontWeight = '700';
      cell.textContent = base;
      if (DBSNP_SITES.includes(i)) {
        cell.style.background = '#ff6b6b';
        cell.title = `dbSNP位点: chr1:${REF_START + i}`;
      }
      genomeTrackRef.current.appendChild(cell);
    }
  };

  const genomeTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    renderAxes();
    renderPoints();
    renderGenomeTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBias]);

  useEffect(() => {
    const phases = [
      { label: '📦 載入 Deduplicated BAM...', phase: 1, wait: 600 },
      { label: '⚖️ 執行 BaseRecalibrator...', phase: 2, wait: 700 },
      { label: '📊 建立 Q-score 模型...', phase: 3, wait: 700 },
      { label: '✅ 輸出 Analysis-ready BAM!', phase: 4, wait: 400 },
    ];
    let i = 0;
    const runNext = () => {
      if (i >= phases.length) {
        if (finalBamRef.current) finalBamRef.current.style.boxShadow = '0 0 0 2px rgba(76,195,138,0.4)';
        return;
      }
      const p = phases[i];
      setBamPhase(p.label);
      if (p.phase === 1 && rawBamRef.current) rawBamRef.current.style.boxShadow = '0 0 0 2px rgba(77,163,255,0.4)';
      i++;
      setTimeout(runNext, p.wait);
    };
    const t = setTimeout(runNext, 300);
    return () => clearTimeout(t);
  }, []);

  const runAutoCalibrate = () => {
    if (isCalibrated) return;
    let bias = currentBias;
    let targetBias = -bias;
    let steps = 30;
    let step = 0;
    const timer = setInterval(() => {
      if (step >= steps) {
        clearInterval(timer);
        setIsCalibrated(true);
        return;
      }
      bias += targetBias / steps;
      setCurrentBias(bias);
      step++;
    }, 50);
  };

  return (
    <div className="bqsr-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="bqsr-left flex flex-col gap-4">
        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>品質分佈圖 (Empirical vs Reported Q-score)</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>校正前 vs 校正後</span>
          </div>
          <div className="relative overflow-auto" style={{ height: '300px' }}>
            <div ref={idealLineRef} className="absolute" style={{ left: paddingLeft, top: paddingTop, width: plotInnerW, height: plotInnerH }} />
            <div ref={beforePointsRef} className="absolute" style={{ left: 0, top: 0, width: plotWidth, height: plotHeight }} />
            <div ref={afterPointsRef} className="absolute" style={{ left: 0, top: 0, width: plotWidth, height: plotHeight }} />
            <div className="absolute flex flex-col justify-between text-[9px]" style={{ left: 6, top: paddingTop, height: plotInnerH, color: '#9fb0c3' }}>
              {[0, 10, 20, 30, 40, 50].map((q) => <span key={q} className="transform -translate-y-1/2">Q{q}</span>)}
            </div>
            <div className="absolute flex justify-between text-[9px]" style={{ left: paddingLeft, top: paddingTop + plotInnerH + 6, width: plotInnerW, color: '#9fb0c3' }}>
              {[0, 10, 20, 30, 40, 50].map((c) => <span key={c}>{c}</span>)}
            </div>
            <div className="absolute flex items-center justify-center text-[9px]" style={{ left: 0, top: paddingTop + plotInnerH / 2 - 8, width: 44, color: '#9fb0c3' }}>
              <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>Q-score</span>
            </div>
          </div>
        </div>

        <div className="bqsr-panel rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>已知變異點排除 (dbSNP)</h3>
            <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>Known Variants</span>
          </div>
          <p className="text-[11px] mb-2" style={{ color: '#9fb0c3' }}>dbSNP 已知變異位點會從錯誤計算中排除，避免將真實變異誤判為測序錯誤：</p>
          <div className="flex flex-wrap gap-[2px] bg-[#080c14] border rounded-lg p-2" ref={genomeTrackRef} style={{ borderColor: '#1e2a38' }} />
          <div className="flex flex-wrap gap-3 text-[10px] mt-2" style={{ color: '#9fb0c3' }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#4cc38a' }} /> 參考鹼基</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#ff6b6b' }} /> 已知變異 (dbSNP)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#666' }} /> 校正錯誤</span>
          </div>
        </div>

        <div className="bqsr-summary flex gap-3">
          <div className="summary-stat flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>Reported Q平均</span>
            <span className="stat-value text-[16px] font-bold font-mono" style={{ color: '#e8eef5' }}>{avgReported.toFixed(1)} (Q{Math.round(avgReported)})</span>
            <span className="stat-change text-[10px] font-bold" style={{ color: currentBias > 0 ? '#4cc38a' : '#ff6b6b' }}>
              {currentBias !== 0 ? `${currentBias > 0 ? '▲' : '▼'} ${Math.abs(currentBias).toFixed(1)}` : ''}
            </span>
          </div>
          <div className="summary-stat flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>Empirical Q平均</span>
            <span className="stat-value text-[16px] font-bold font-mono" style={{ color: '#e8eef5' }}>{avgEmpiricalBefore.toFixed(1)} (Q{Math.round(avgEmpiricalBefore)})</span>
            <span className="stat-change text-[10px] font-bold" style={{ color: empiricalDiff > 0 ? '#4cc38a' : '#ff6b6b' }}>
              {empiricalDiff !== 0 ? `${empiricalDiff > 0 ? '▲' : '▼'} ${Math.abs(empiricalDiff).toFixed(1)}` : ''}
            </span>
          </div>
          <div className="summary-stat flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>校正後差距</span>
            <span className="stat-value text-[16px] font-bold font-mono" ref={gapStatRef} style={{ color: '#4cc38a' }}>—</span>
          </div>
        </div>
      </div>

      <div className="bqsr-right flex flex-col gap-4">
        <div className="bqsr-file-flow flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="bqsr-file-box flex flex-col items-center p-4 flex-1 rounded-xl" ref={rawBamRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📦</div>
            <div className="file-name text-[14px] font-bold text-center">sample.dedup.bam</div>
            <div className="file-type text-[11px]" style={{ color: '#9fb0c3' }}>Deduplicated BAM</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl font-bold" style={{ color: '#ffb84d' }}>→</div>
            <div className="text-3xl animate-pulse">⚖️</div>
          </div>
          <div className="bqsr-file-box flex flex-col items-center p-4 flex-1 rounded-xl" ref={finalBamRef} style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📦</div>
            <div className="file-name text-[14px] font-bold text-center">sample.recal.bam</div>
            <div className="file-type text-[11px]" style={{ color: '#4cc38a' }}>Analysis-ready BAM</div>
          </div>
        </div>

        <div className="bqsr-balancer flex flex-col gap-3 p-5 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#ffb84d' }}>校正滑桿 (BaseRecalibrator)</h3>
          <p className="text-[11px]" style={{ color: '#9fb0c3' }}>拖動滑桿調整系統偏差，使品質曲線回歸理想校準線 (45°)</p>
          <div className="flex items-center justify-between text-[12px] mb-1">
            <span>系統偏差因子:</span>
            <span className="font-mono font-bold" style={{ color: '#ffb84d' }}>{currentBias.toFixed(1)}</span>
          </div>
          <input
            type="range"
            className="w-full h-2 appearance-none bg-[#0f1520] rounded-full cursor-pointer"
            min="-5"
            max="5"
            value={currentBias}
            step="0.1"
            onChange={(e) => setCurrentBias(parseFloat(e.target.value))}
          />
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="calibration-label" style={{ color: '#9fb0c3' }}>校準進度</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden mb-1" style={{ backgroundColor: '#0f1520' }}>
              <div ref={calFillRef} className="h-full rounded-full transition-all duration-300" style={{ backgroundColor: '#4cc38a', width: '0%' }} />
            </div>
            <div ref={calTextRef} className="text-[11px]" style={{ color: '#9fb0c3' }}>等待校準...</div>
          </div>
          <div className="text-[11px] p-2.5 rounded-lg" style={{ backgroundColor: '#0f1520', color: '#9fb0c3' }}>
            <small>提示：Reported Q 反映儀器原始判斷，Empirical Q 反映實際錯誤率。完美校準時兩者一致。</small>
          </div>
          <button
            className="w-full py-3 rounded-lg font-bold text-[14px]"
            style={{ backgroundColor: isCalibrated ? '#4cc38a' : '#ffb84d', color: '#0f1520' }}
            onClick={runAutoCalibrate}
          >
            {isCalibrated ? '✅ 已校準完成' : '自動校準'}
          </button>
        </div>

        <div className="text-[12px]" style={{ color: '#9fb0c3' }}>{bamPhase}</div>
      </div>
    </div>
  );
};