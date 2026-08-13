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
  const [noiseFactor, setNoiseFactor] = useState(1.0);
  const [isKnownSitesEnabled, setIsKnownSitesEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('before');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [, setCalibrationAnimating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [tooltipData, setTooltipData] = useState<{ cycle: number; reported: number; empirical: number; cycleIndex: number } | null>(null);
  const [bamPhase, setBamPhase] = useState('');

  const beforePointsRef = useRef<HTMLDivElement>(null);
  const afterPointsRef = useRef<HTMLDivElement>(null);
  const idealLineRef = useRef<HTMLDivElement>(null);
  const calFillRef = useRef<HTMLDivElement>(null);
  const calTextRef = useRef<HTMLDivElement>(null);
  const gapStatRef = useRef<HTMLSpanElement>(null);
  const rawBamRef = useRef<HTMLDivElement>(null);
  const finalBamRef = useRef<HTMLDivElement>(null);
  const genomeTrackRef = useRef<HTMLDivElement>(null);
  const sequenceDivRef = useRef<HTMLDivElement>(null);
  const cycleChartRef = useRef<HTMLDivElement>(null);
  const contextChartRef = useRef<HTMLDivElement>(null);
  const alignmentDivRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const beforeBtnRef = useRef<HTMLButtonElement>(null);
  const cycleBtnRef = useRef<HTMLButtonElement>(null);
  const contextBtnRef = useRef<HTMLButtonElement>(null);

  const cycles = 50;
  const qcData: Array<{ cycle: number; reported: number; empirical: number }> = [];
  for (let c = 0; c < cycles; c++) {
    const reportedQ = 25 + Math.sin(c * 0.3) * 4 + (c < 10 ? -3 : c > 40 ? -2 : 0);
    const systematicBias = reportedQ - 3 - Math.sin(c * 0.2) * 2;
    const empiricalQ = Math.max(5, systematicBias + (Math.random() - 0.5) * 2);
    qcData.push({ cycle: c + 1, reported: reportedQ, empirical: empiricalQ });
  }

  const adjustedData = qcData.map((d) => ({
    ...d,
    empirical: Math.max(5, d.empirical * (1 + (noiseFactor - 1) * 0.6)),
  }));

  const recalibratedData = adjustedData.map((d) => {
    let recalibratedEmpirical = d.empirical - noiseFactor * 2;
    recalibratedEmpirical = Math.max(5, Math.min(50, recalibratedEmpirical));
    return { ...d, recalibratedEmpirical };
  });

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

  const avgReported = qcData.reduce((s, d) => s + d.reported, 0) / qcData.length;
  const avgEmpirical = recalibratedData.reduce((s, d) => s + d.recalibratedEmpirical, 0) / recalibratedData.length;
  const gapAfter = Math.abs(avgReported - avgEmpirical);
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
    // During BQSR animation, empirical Q smoothly interpolates back toward the 45° ideal line (empirical ≈ reported)
    const t = calibrationProgress;
    adjustedData.forEach((d) => {
      const idealAlignEmpirical = d.empirical + (d.reported - d.empirical) * t;

      const beforeEl = document.createElement('div');
      beforeEl.className = 'absolute w-[3px] h-[3px] rounded-full cursor-pointer';
      beforeEl.style.background = '#ff6b6b';
      beforeEl.style.boxShadow = '0 0 3px rgba(255,107,107,0.6)';
      beforeEl.style.left = `${paddingLeft + xToPixel(d.cycle)}px`;
      beforeEl.style.top = `${yToPixel(d.reported) + paddingTop}px`;
      beforeEl.title = `Cycle ${d.cycle}: Reported=${d.reported.toFixed(1)}`;
      beforeEl.addEventListener('mouseenter', () => {
        setTooltipData({ cycle: d.cycle, reported: d.reported, empirical: d.empirical, cycleIndex: d.cycle });
      });
      beforeEl.addEventListener('mouseleave', () => {
        setTooltipData(null);
      });
      beforePoints.appendChild(beforeEl);

      const afterEl = document.createElement('div');
      afterEl.className = 'absolute w-[3px] h-[3px] rounded-full cursor-pointer';
      afterEl.style.background = '#4cc38a';
      afterEl.style.boxShadow = '0 0 3px rgba(76,195,138,0.6)';
      afterEl.style.left = `${paddingLeft + xToPixel(d.cycle)}px`;
      afterEl.style.top = `${yToPixel(idealAlignEmpirical) + paddingTop}px`;
      afterEl.title = `Cycle ${d.cycle}: Empirical=${idealAlignEmpirical.toFixed(1)} (recalibrated)`;
      afterEl.addEventListener('mouseenter', () => {
        setTooltipData({ cycle: d.cycle, reported: d.reported, empirical: idealAlignEmpirical, cycleIndex: d.cycle });
      });
      afterEl.addEventListener('mouseleave', () => {
        setTooltipData(null);
      });
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
      cell.style.flex = '1 1 0';
      cell.style.minWidth = '0';
      cell.style.height = '22px';
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

  const renderDNASeq = () => {
    if (!sequenceDivRef.current) return;
    sequenceDivRef.current.innerHTML = '';
    const seq = REF_BASES;
    for (let i = 0; i < seq.length; i++) {
      const cell = document.createElement('div');
      cell.className = 'flex items-center justify-center font-mono text-[10px]';
      cell.style.cssText = 'flex:1 1 0;min-width:0;height:24px;background:#0a0f18;color:#9fb0c3;font-weight:700';
      cell.textContent = seq[i];
      if (DBSNP_SITES.includes(i)) {
        cell.style.background = isKnownSitesEnabled ? 'rgba(255,192,0,0.55)' : 'rgba(77,163,255,0.15)';
        cell.style.color = isKnownSitesEnabled ? '#FFD54F' : '#4da3ff';
        cell.style.border = isKnownSitesEnabled ? '1px solid #FFA000' : '1px solid #4da3ff';
        cell.style.boxShadow = isKnownSitesEnabled ? '0 0 6px rgba(255,192,0,0.6)' : 'none';
        cell.title = `已知變異: chr1:${REF_START + i}`;
      }
      sequenceDivRef.current.appendChild(cell);
    }
  };

  const renderReadAlignment = () => {
    if (!alignmentDivRef.current) return;
    alignmentDivRef.current.innerHTML = '';
    // simulate 3 overlapping reads
    for (let r = 0; r < 3; r++) {
      const readRow = document.createElement('div');
      readRow.className = 'flex flex-nowrap gap-[2px] mb-[2px]';
      readRow.style.cssText = 'width:100%';
      for (let i = 0; i < REF_LENGTH; i++) {
        if (i < r * 10 || i >= r * 10 + 25) continue; // read spans a 25bp window
        const cell = document.createElement('div');
        cell.className = 'flex items-center justify-center font-mono text-[10px]';
        cell.style.cssText = 'flex:1 1 0;min-width:0;height:22px;background:#0a0f18;color:#4da3ff;font-weight:700';
        if (DBSNP_SITES.includes(i)) {
          // a read with the true biological variant: A -> T
          const variant = REF_BASES[i] === 'A' ? 'T' : REF_BASES[i] === 'T' ? 'A' : REF_BASES[i] === 'G' ? 'C' : 'G';
          cell.textContent = isKnownSitesEnabled ? REF_BASES[i] : variant;
          cell.style.background = isKnownSitesEnabled ? 'rgba(255,192,0,0.55)' : '#ff6b6b';
          cell.style.color = isKnownSitesEnabled ? '#FFD54F' : '#fff';
          cell.style.border = isKnownSitesEnabled ? '1px solid #FFA000' : '1px solid #ff6b6b';
          cell.title = isKnownSitesEnabled
            ? `已排除已知變異 (${REF_BASES[i]} 保留為參考)`
            : `真實突變 ${REF_BASES[i]} → ${variant} 會被誤判為儀器錯誤`;
        } else {
          cell.textContent = REF_BASES[i];
        }
        readRow.appendChild(cell);
      }
      alignmentDivRef.current.appendChild(readRow);
    }
  };

  const renderCycleChart = () => {
    if (!cycleChartRef.current) return;
    cycleChartRef.current.innerHTML = '';
    cycleChartRef.current.style.cssText = 'position:relative;width:100%;';
    const errorRateData: Array<{ cycle: number; rate: number }> = [];
    for (let c = 0; c < 150; c++) {
      const baseRate = 3 + (150 - c) * 0.01;
      const errorRate = Math.max(0.5, baseRate + (Math.random() - 0.5) * 1.5);
      errorRateData.push({ cycle: c + 1, rate: errorRate });
    }
    const maxRate = Math.max(...errorRateData.map((d) => d.rate)) * 1.1;
    const width = 480;
    const height = 200;
    const padding = 20;

    const bg = document.createElement('div');
    bg.style.cssText = `width:${width}px;height:${height}px;background:#080c14;border-radius:6px;position:relative;overflow:hidden;`;

    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * (height - padding * 2);
      const lbl = document.createElement('div');
      lbl.className = 'absolute text-[9px]';
      lbl.style.cssText = `position:absolute;left:4px;top:${y - 6}px;color:#9fb0c3;`;
      lbl.textContent = `${Math.round(maxRate - (i / 5) * maxRate).toFixed(1)}%`;
      bg.appendChild(lbl);
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.style.cssText = 'position:absolute;top:0;left:0;';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const points = errorRateData.map((d, i) => {
      const x = padding + (i / (150 - 1)) * (width - padding * 2);
      const y = padding + (1 - (d.rate / maxRate)) * (height - padding * 2);
      return `${x},${y}`;
    });
    path.setAttribute('d', `M${points.join(' L')}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#ff6b6b');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
    bg.appendChild(svg);

    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * (width - padding * 2);
      const lbl = document.createElement('div');
      lbl.className = 'absolute text-[9px]';
      lbl.style.cssText = `position:absolute;left:${x - 10}px;top:${height - padding + 6}px;color:#9fb0c3;width:20px;text-align:center;`;
      lbl.textContent = `${i * 10 + 1}`;
      bg.appendChild(lbl);
    }

    const xAxisLabel = document.createElement('div');
    xAxisLabel.style.cssText = 'position:absolute;left:0;right:0;text-align:center;top:190px;color:#9fb0c3;font-size:8px;';
    xAxisLabel.textContent = 'Read Position (Cycle, 1-150 bp)';
    bg.appendChild(xAxisLabel);

    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;justify-content:center;margin-top:4px;gap:4px;align-items:center;';
    const legendLine = document.createElement('div');
    legendLine.style.cssText = 'display:inline-block;width:20px;height:3px;background:#ff6b6b;border-radius:2px;';
    const legendLabel = document.createElement('span');
    legendLabel.style.cssText = 'font-size:9px;color:#9fb0c3;';
    legendLabel.textContent = '讀長越後面 (3\' 端) 品質下降';
    legend.appendChild(legendLine);
    legend.appendChild(legendLabel);
    bg.appendChild(legend);

    cycleChartRef.current.appendChild(bg);
  };

  const renderContextChart = () => {
    if (!contextChartRef.current) return;
    contextChartRef.current.innerHTML = '';
    contextChartRef.current.style.cssText = 'position:relative;width:100%;';
    const contextData = [
      { pos: 0, rate: 0.1 }, { pos: 10, rate: 0.2 }, { pos: 20, rate: 0.4 },
      { pos: 30, rate: 0.7 }, { pos: 40, rate: 1.0 }, { pos: 50, rate: 1.5 },
      { pos: 60, rate: 2.1 }, { pos: 70, rate: 2.5 }, { pos: 80, rate: 2.9 },
      { pos: 90, rate: 3.2 }, { pos: 100, rate: 3.5 }, { pos: 110, rate: 3.8 },
      { pos: 120, rate: 4.0 }, { pos: 130, rate: 4.1 }, { pos: 140, rate: 4.0 },
      { pos: 150, rate: 3.8 },
    ];
    const maxRate = 4.5;
    const w = 480;
    const h = 200;
    const p = 20;
    const bg = document.createElement('div');
    bg.style.cssText = `width:${w}px;height:${h}px;background:#080c14;border-radius:6px;position:relative;overflow:hidden;`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.style.cssText = 'position:absolute;top:0;left:0;';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const points = contextData.map((d, i) => {
      const x = p + (i / (contextData.length - 1)) * (w - p * 2);
      const y = p + (1 - d.rate / maxRate) * (h - p * 2);
      return `${x},${y}`;
    });
    path.setAttribute('d', `M${points.join(' L')}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#ffb84d');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
    bg.appendChild(svg);
    const yAxisLabel = document.createElement('div');
    yAxisLabel.style.cssText = 'position:absolute;top:90px;left:4px;color:#9fb0c3;font-size:8px;transform:rotate(-90deg);transform-origin:0 0;white-space:nowrap;';
    yAxisLabel.textContent = '錯誤率 (%)';
    bg.appendChild(yAxisLabel);
    const xAxisLabel = document.createElement('div');
    xAxisLabel.style.cssText = 'position:absolute;left:0;right:0;text-align:center;top:190px;color:#9fb0c3;font-size:8px;';
    xAxisLabel.textContent = '鹼基位置 (bp)';
    bg.appendChild(xAxisLabel);
    contextChartRef.current.appendChild(bg);
  };

  useEffect(() => {
    renderAxes();
    renderPoints();
    renderGenomeTrack();
    renderDNASeq();
    renderReadAlignment();
    renderCycleChart();
    renderContextChart();
  }, [noiseFactor, calibrationProgress, isKnownSitesEnabled]);

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

  const handleRunBQSR = () => {
    if (isCalibrating) return;
    setCalibrationAnimating(true);
    setCalibrationProgress(0);
    setIsCalibrating(true);
    let animStep = 0;
    const totalSteps = 20; // 20 steps * 50ms = 1000ms (1 second)
    const interval = setInterval(() => {
      animStep++;
      if (animStep >= totalSteps) {
        clearInterval(interval);
        setCalibrationAnimating(false);
        setCalibrationProgress(1);
        setIsCalibrating(false);
        setCalibrationComplete(true);
        setTimeout(() => setCalibrationComplete(false), 3000);
      }
      setCalibrationProgress(animStep / totalSteps);
    }, 50);
  };

  return (
    <div className="bqsr-visual flex flex-col gap-4 h-[calc(100vh-13rem)] min-h-[600px]">
      {/* Card 1: 儀器偏差模擬與點陣圖 */}
      <div className="bqsr-card rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', maxWidth: '100%' }}>
        <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>品質分佈圖 (Empirical vs Reported Q-score)</h3>
          <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>校正前 vs 校正後</span>
        </div>
        <div className="mb-2">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="calibration-label" style={{ color: '#9fb0c3' }}>儀器老化與信號噪音度 (Signal Noise Factor)</span>
            <span className="font-mono font-bold" style={{ color: '#ffb84d' }}>{noiseFactor.toFixed(1)}</span>
          </div>
          <input
            type="range"
            ref={sliderRef}
            className="w-full h-2 appearance-none bg-[#0f1520] rounded-full cursor-pointer"
            min="0"
            max="2"
            step="0.1"
            value={noiseFactor}
            onChange={(e) => setNoiseFactor(parseFloat(e.target.value))}
          />
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
          {tooltipData && (
            <div className="absolute p-3 rounded-lg text-[11px] pointer-events-none" style={{
              left: `${paddingLeft + xToPixel(tooltipData.cycle) + 15}px`,
              top: `${yToPixel(tooltipData.reported) + paddingTop - 10}px`,
              backgroundColor: 'rgba(0,0,0,0.85)',
              border: '1px solid #4da3ff',
              color: '#fff',
              zIndex: 20,
              fontFamily: 'monospace',
              minWidth: '180px',
            }}>
              <div>Reported Q-score: {tooltipData.reported.toFixed(1)} (機器宣稱錯誤率 1/10^{tooltipData.reported/10})</div>
              <div>Empirical Q-score: {tooltipData.empirical.toFixed(1)} (實測錯誤率 1/10^{tooltipData.empirical/10})</div>
              <div style={{ marginTop: '4px', color: '#ff6b6b' }}>⚠️ 說明：機器過度自信，實測錯誤率比預估高出 {Math.abs(tooltipData.empirical - tooltipData.reported).toFixed(1)} 倍！</div>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: 已知變異點遮罩 */}
      <div className="bqsr-card rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', maxWidth: '100%' }}>
        <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>已知變異點遮罩 (Known Sites Filter)</h3>
          <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>Known Variants</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={isKnownSitesEnabled}
              onChange={(e) => setIsKnownSitesEnabled(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span>啟用 Known Sites 遮罩 (dbSNP + 1000G Indels)</span>
          </label>
        </div>
        <p className="text-[11px] mb-2" style={{ color: '#9fb0c3' }}>dbSNP 已知變異位點會從錯誤計算中排除，避免將真實變異誤判為測序錯誤：</p>
        <div className="relative mb-2">
          <div className="text-[9px] font-bold mb-1" style={{ color: '#4da3ff' }}>參考序列 (Reference)</div>
          <div className="flex flex-nowrap gap-[2px] bg-[#080c14] border rounded-lg p-1.5" ref={genomeTrackRef} style={{ borderColor: '#1e2a38' }} />
          <div className="text-[9px] font-bold mt-2 mb-1" style={{ color: '#4da3ff' }}>Read 比對軌道 (Read Alignment) — 突變 A→T 位置高亮</div>
          <div className="flex flex-nowrap gap-[2px] bg-[#080c14] border rounded-lg p-1.5" ref={alignmentDivRef} style={{ borderColor: '#1e2a38' }} />
          <div className="flex flex-nowrap gap-[2px] bg-[#080c14] border rounded-lg p-1.5 mt-2" ref={sequenceDivRef} style={{ borderColor: '#1e2a38' }} />
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] mt-2" style={{ color: '#9fb0c3' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#4cc38a' }} /> 參考鹼基</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,192,0,0.5)', border: '1px solid #FFA000' }} /> 已知變異 (dbSNP/1000G)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#4da3ff' }} /> Read 鹼基</span>
        </div>
        {isKnownSitesEnabled && (
          <div className="absolute text-[10px] font-bold p-1.5 rounded-lg" style={{
            backgroundColor: 'rgba(255,192,0,0.3)', color: '#FFA000', right: 12, top: 56, zIndex: 10,
          }}>
            已排除已知變異點 (Known Variant Excluded)
          </div>
        )}
        {!isKnownSitesEnabled && (
          <div className="text-[10px] font-bold p-2 rounded-lg mt-2" style={{ backgroundColor: 'rgba(255,107,107,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)' }}>
            ⚠️ 未排除已知變異！真實生物突變會被誤判為儀器讀取錯誤！
          </div>
        )}
    </div>

      {/* Card 3: BQSR 校正效果與多維度比較 */}
      <div className="bqsr-card rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', maxWidth: '100%' }}>
        <div className="bqsr-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>BQSR 校正效果與多維度比較</h3>
          <span className="bqsr-badge text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>Before / After</span>
        </div>
        <div className="flex gap-2 mb-2 flex-wrap">
          <button
            ref={beforeBtnRef}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-all duration-300 cursor-pointer ${activeTab === 'before' ? 'bg-blue-600 text-white' : 'bg-[#0f1520] text-[#9fb0c3]'}`}
            onClick={() => setActiveTab('before')}
          >
            校前/校後對比 (Before/After)
          </button>
          <button
            ref={cycleBtnRef}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-all duration-300 cursor-pointer ${activeTab === 'cycle' ? 'bg-blue-600 text-white' : 'bg-[#0f1520] text-[#9fb0c3]'}`}
            onClick={() => setActiveTab('cycle')}
          >
            讀長位置 (Cycle)
          </button>
          <button
            ref={contextBtnRef}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-all duration-300 cursor-pointer ${activeTab === 'context' ? 'bg-blue-600 text-white' : 'bg-[#0f1520] text-[#9fb0c3]'}`}
            onClick={() => setActiveTab('context')}
          >
            前後鹼基 (Context)
          </button>
        </div>

        {activeTab === 'before' && (
          <div className="relative overflow-auto" style={{ height: '200px' }}>
            <div className="grid grid-cols-2 gap-2 text-[10px]" style={{ fontFamily: 'monospace' }}>
              {qcData.map((d, i) => (
                <div key={i} className="bg-[#0f1520] p-2 rounded">
                  <div className="text-[#9fb0c3]">Cycle {d.cycle}</div>
                  <div className="text-[#ff6b6b]">Reported: {d.reported.toFixed(1)}</div>
                  <div className="text-[#4cc38a]">Empirical: {adjustedData[i].empirical.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cycle' && (
          <div className="relative overflow-auto" style={{ height: '200px' }}>
            <div ref={cycleChartRef} className="w-full" />
            <div className="text-[10px] mt-2" style={{ color: '#9fb0c3' }}>讀長後面（3' 端）品質下降趨勢 — 折線圖展示錯誤率變化</div>
          </div>
        )}

        {activeTab === 'context' && (
          <div className="relative overflow-auto" style={{ height: '200px' }}>
            <div ref={contextChartRef} className="w-full" />
            <div className="text-[10px] mt-2" style={{ color: '#9fb0c3' }}>序列上下文（Context）錯誤率變化 — 展示不同背景下的品質關係</div>
          </div>
        )}

        <div className="mt-3">
          <button
            className="w-full py-3 rounded-lg font-bold text-[14px] transition-all duration-300 cursor-pointer"
            style={{ backgroundColor: isCalibrating ? '#4cc38a' : '#ffb84d', color: '#0f1520' }}
            onClick={handleRunBQSR}
          >
            {isCalibrating ? '🔄 校準中...' : '⚡ 執行 GATK BQSR 自動校正'}
          </button>
          {calibrationComplete && (
            <div className="mt-2 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(76,195,138,0.2)', border: '1px solid #4cc38a' }}>
                <span className="text-[16px]">🎉</span>
                <span className="text-[12px] font-bold" style={{ color: '#4cc38a' }}>校正完成！貼合度 98.5%</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 text-[11px]" style={{ color: '#9fb0c3' }}>{bamPhase}</div>
      </div>
    </div>
  );
};