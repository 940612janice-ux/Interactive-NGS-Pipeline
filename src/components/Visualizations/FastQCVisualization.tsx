import React, { useEffect, useRef, useState } from 'react';

interface FastQCVisualizationProps {
  onComplete?: () => void;
}

export const FastQCVisualization: React.FC<FastQCVisualizationProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(true);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [stats, setStats] = useState({
    reads: '—',
    quality: '—',
    adapter: '—',
    readsChange: '',
    qualityChange: '',
    adapterChange: '',
  });

  const fastqcStepsData = [
    { icon: '📊', label: 'Per-base quality', color: '#4da3ff' },
    { icon: '🔗', label: 'Adapter content', color: '#ff6b6b' },
    { icon: '🧬', label: 'GC content', color: '#4cc38a' },
    { icon: '📋', label: 'Sequence duplication', color: '#ffb84d' },
    { icon: '⚠️', label: 'Overrepresented seq', color: '#ff6b6b' },
    { icon: '✅', label: 'Report generated', color: '#4cc38a' },
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const totalPositions = 50;
    const qualityData: Array<{ position: number; q: number; isLow: boolean }> = [];
    for (let pos = 0; pos < totalPositions; pos++) {
      const baseQ = pos < 5 ? 25 + Math.random() * 10 :
                    pos < 15 ? 30 + Math.random() * 8 :
                    pos < 35 ? 28 + Math.random() * 7 :
                    20 + Math.random() * 10 - (pos - 35) * 0.3;
      const q = Math.max(5, Math.min(40, baseQ));
      qualityData.push({
        position: pos + 1,
        q: Math.round(q * 10) / 10,
        isLow: q < 20,
      });
    }

    const meanQuality = qualityData.map(d => {
      const mean = d.q + (Math.random() - 0.5) * 3;
      return Math.max(5, Math.min(40, Math.round(mean * 10) / 10));
    });

    const adapterPositions = 20;
    const adapterBefore: number[] = [];
    const adapterAfter: number[] = [];
    for (let i = 0; i < adapterPositions; i++) {
      const before = i < 5 ? 5 + Math.random() * 15 :
                     i < 10 ? 3 + Math.random() * 10 :
                     Math.random() * 3;
      const after = i < 3 ? 1 + Math.random() * 3 :
                    Math.random() * 1;
      adapterBefore.push(Math.round(before * 10) / 10);
      adapterAfter.push(Math.round(after * 10) / 10);
    }

    const qLines = containerRef.current.querySelector('#q-lines');
    const qMean = containerRef.current.querySelector('#q-mean');
    const qRedZone = containerRef.current.querySelector('#q-red-zone');
    const qThreshold = containerRef.current.querySelector('#q-threshold');
    const adapterBars = containerRef.current.querySelector('#adapter-bars');
    const fastqcSteps = containerRef.current.querySelector('#fastqc-steps');
    const fastqcScanner = containerRef.current.querySelector('#fastqc-scanner');
    const progressFill = containerRef.current.querySelector('#fastqc-progress-fill');
    const progressLabel = containerRef.current.querySelector('#fastqc-progress-label');

    const renderQualityChart = () => {
      if (!qLines || !qMean || !qRedZone || !qThreshold) return;

      qLines.innerHTML = '';
      qualityData.forEach((d, i) => {
        const line = document.createElement('div');
        line.className = 'q-line-point absolute w-[2px] rounded transition-all';
        const yPos = 100 - (d.q / 40) * 100;
        line.style.bottom = `${yPos}%`;
        line.style.left = `${(i / (totalPositions - 1)) * 100}%`;
        line.style.background = d.isLow ? '#ff6b6b' : '#4da3ff';
        line.style.boxShadow = d.isLow ? '0 0 6px #ff6b6b' : '0 0 4px #4da3ff';
        qLines.appendChild(line);
      });

      qMean.innerHTML = '';
      meanQuality.forEach((q, i) => {
        const point = document.createElement('div');
        point.className = 'q-mean-point absolute w-[3px] h-[3px] rounded-full';
        point.style.background = '#ffb84d';
        point.style.boxShadow = '0 0 4px #ffb84d';
        const yPos = 100 - (q / 40) * 100;
        point.style.bottom = `${yPos}%`;
        point.style.left = `${(i / (totalPositions - 1)) * 100}%`;
        qMean.appendChild(point);
      });

      const lowStart = qualityData.findIndex(d => d.isLow);
      const lowEnd = qualityData.reduce((last, d, i) => d.isLow ? i : last, -1);
      if (lowStart >= 0) {
        (qRedZone as HTMLElement).style.display = 'block';
        (qRedZone as HTMLElement).style.left = `${(lowStart / (totalPositions - 1)) * 100}%`;
        (qRedZone as HTMLElement).style.width = `${((lowEnd - lowStart + 1) / (totalPositions - 1)) * 100}%`;
      } else {
        (qRedZone as HTMLElement).style.display = 'none';
      }

      const q20Y = 100 - (20 / 40) * 100;
      (qThreshold as HTMLElement).style.bottom = `${q20Y}%`;
      (qThreshold as HTMLElement).style.display = 'block';
    };

    const renderAdapterChart = () => {
      if (!adapterBars) return;
      adapterBars.innerHTML = '';
      const maxBars = 10;
      const step = Math.floor(adapterPositions / maxBars);

      for (let i = 0; i < maxBars; i++) {
        const idx = i * step;
        if (idx >= adapterPositions) break;
        const row = document.createElement('div');
        row.className = 'adapter-row flex items-end gap-1 h-20';

        const beforeBar = document.createElement('div');
        beforeBar.className = 'adapter-bar before flex-1 rounded-t transition-all';
        beforeBar.style.background = 'rgba(255, 107, 107, 0.7)';
        beforeBar.style.height = `${Math.max(2, adapterBefore[idx] * 3)}px`;

        const afterBar = document.createElement('div');
        afterBar.className = 'adapter-bar after flex-1 rounded-t transition-all';
        afterBar.style.background = 'rgba(76, 195, 138, 0.7)';
        afterBar.style.height = `${Math.max(2, adapterAfter[idx] * 3)}px`;

        row.appendChild(beforeBar);
        row.appendChild(afterBar);
        adapterBars.appendChild(row);
      }
    };

    const updateStats = () => {
      const totalReads = 24500000 + Math.floor(Math.random() * 100000);
      const trimmedReads = totalReads - Math.floor(totalReads * (0.02 + Math.random() * 0.05));
      const avgQBefore = (28 + Math.random() * 3).toFixed(1);
      const avgQAfter = (32 + Math.random() * 4).toFixed(1);
      const adapterBeforeVal = (8.5 + Math.random() * 3).toFixed(1);
      const adapterAfterVal = (1.2 + Math.random() * 1.5).toFixed(1);

      setStats({
        reads: totalReads.toLocaleString(),
        quality: avgQAfter,
        adapter: adapterAfterVal + '%',
        readsChange: `▼ ${((totalReads - trimmedReads) / totalReads * 100).toFixed(1)}%`,
        qualityChange: `▲ +${(parseFloat(avgQAfter) - parseFloat(avgQBefore)).toFixed(1)}`,
        adapterChange: `▼ ${adapterBeforeVal}% → ${adapterAfterVal}%`,
      });
    };

    const runFastQCAnimation = () => {
      if (!isPlayingRef.current) return;

      if (currentStep < fastqcStepsData.length) {
        const step = fastqcStepsData[currentStep];
        if (fastqcSteps) {
          const stepEl = document.createElement('div');
          stepEl.className = 'fastqc-step flex items-center gap-2 p-2 rounded-l-[4px] border-l-4 transition-all';
          stepEl.style.borderLeftColor = step.color;
          stepEl.innerHTML = `<span class="step-icon">${step.icon}</span><span class="step-label text-[11px]">${step.label}</span>`;
          fastqcSteps.appendChild(stepEl);
        }

        if (fastqcScanner) {
          (fastqcScanner as HTMLElement).style.top = `${20 + currentStep * 12}%`;
          (fastqcScanner as HTMLElement).style.opacity = '1';
        }

        const newProgress = ((currentStep + 1) / fastqcStepsData.length) * 100;
        setProgress(newProgress);
        if (progressFill) (progressFill as HTMLElement).style.width = `${newProgress}%`;
        if (progressLabel) progressLabel.textContent = `分析中: ${step.label}...`;

        setCurrentStep(currentStep + 1);
        setTimeout(runFastQCAnimation, 800);
      } else {
        setProgress(100);
        if (progressFill) (progressFill as HTMLElement).style.width = '100%';
        if (progressLabel) progressLabel.textContent = '✅ FastQC 報告完成';
        if (fastqcScanner) (fastqcScanner as HTMLElement).style.opacity = '0';
      }
    };

    renderQualityChart();
    renderAdapterChart();
    updateStats();

    setTimeout(runFastQCAnimation, 500);

    return () => { isPlayingRef.current = false; };
  }, [currentStep, progress]);

  return (
    <div className="fastqc-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }} ref={containerRef}>
      {/* Left Panel - Charts */}
      <div className="fastqc-left flex flex-col gap-4">
        <div className="fastqc-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Per-Base Quality Score</h3>
            <span className="fastqc-badge text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520', borderColor: '#3b4b5f', borderWidth: '1px' }}>
              Phred Q
            </span>
          </div>
          <div className="quality-chart flex-1 relative" id="quality-chart">
            <div className="chart-area relative h-full" id="chart-area" style={{ backgroundColor: '#080c14', borderColor: '#1e2a38', borderWidth: '1px', borderRadius: '8px' }}>
              <div className="q-threshold-line absolute left-0 right-0 h-[1px] bg-dashed" id="q-threshold" style={{ borderTop: '1px dashed #ffb84d', backgroundColor: 'transparent' }} />
              <div className="q-red-zone absolute top-0 bottom-0 bg-red-500/10 hidden" id="q-red-zone" />
              <div className="q-lines-container absolute inset-0" id="q-lines" />
              <div className="q-mean-line absolute inset-0" id="q-mean" />
            </div>
            <div className="chart-axis-x flex justify-between mt-2 text-[10px]" style={{ color: '#9fb0c3' }}>
              <span>Position (bp)</span>
              <span>1</span>
              <span>25</span>
              <span>50</span>
            </div>
            <div className="chart-axis-y flex flex-col justify-between h-64 text-[10px]" style={{ color: '#9fb0c3' }}>
              <span>Q40</span><span>Q30</span><span>Q20</span><span>Q10</span>
            </div>
          </div>
        </div>

        <div className="fastqc-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Adapter Content</h3>
            <span className="fastqc-badge text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520', borderColor: '#3b4b5f', borderWidth: '1px' }}>
              Before / After
            </span>
          </div>
          <div className="adapter-chart flex-1" id="adapter-chart">
            <div className="adapter-bars flex items-end justify-around h-full gap-1 p-2" id="adapter-bars" />
          </div>
        </div>

        <div className="fastqc-summary flex gap-3">
          {[
            { label: 'Total Reads', value: stats.reads, change: stats.readsChange, changeClass: 'stat-down' },
            { label: 'Avg Quality', value: stats.quality, change: stats.qualityChange, changeClass: 'stat-up' },
            { label: 'Adapter %', value: stats.adapter, change: stats.adapterChange, changeClass: 'stat-down' },
          ].map((stat, i) => (
            <div key={i} className="summary-stat flex-1 flex flex-col items-center gap-1 p-3 rounded-xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <span className="stat-label text-[11px]" style={{ color: '#9fb0c3' }}>{stat.label}</span>
              <span className="stat-value text-[18px] font-bold font-mono" style={{ color: '#e8eef5' }}>{stat.value}</span>
              <span className={`stat-change text-[10px] font-bold ${stat.changeClass}`} style={{ color: stat.changeClass === 'stat-up' ? '#4cc38a' : '#ff6b6b' }}>
                {stat.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Animation */}
      <div className="fastqc-right flex flex-col gap-4">
        <div className="fastqc-file-panel flex flex-col items-center p-5 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="fastqc-file-icon text-6xl mb-2">📄</div>
          <div className="fastqc-file-name text-[16px] font-bold">sample_R1.fastq</div>
          <div className="fastqc-file-type text-[12px]" style={{ color: '#9fb0c3' }}>Raw FASTQ · gzip</div>
        </div>

        <div className="fastqc-animation flex-1 relative overflow-hidden rounded-2xl" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
          <div className="fastqc-scanner absolute left-4 right-4 h-[2px] transition-all duration-500" id="fastqc-scanner" style={{ background: 'linear-gradient(90deg, transparent, #4da3ff, transparent)', boxShadow: '0 0 8px #4da3ff', top: '20%', opacity: 0 }} />
          <div className="fastqc-steps flex flex-col gap-1.5 p-4 overflow-auto" id="fastqc-steps" style={{ height: '100%' }} />
        </div>

        <div className="fastqc-progress p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" id="fastqc-progress-fill" style={{ backgroundColor: '#4da3ff', width: `${progress}%` }} />
          </div>
          <div className="progress-label text-center text-[12px]" id="fastqc-progress-label" style={{ color: '#c6d3e3' }}>
            {progress === 100 ? '✅ FastQC 報告完成' : '等待分析...'}
          </div>
        </div>
      </div>
    </div>
  );
};