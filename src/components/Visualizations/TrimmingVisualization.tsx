import React, { useEffect, useRef, useState } from 'react';

interface TrimmingVisualizationProps {
  onComplete?: () => void;
}

export const TrimmingVisualization: React.FC<TrimmingVisualizationProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(true);
  const [qThreshold, setQThreshold] = useState(20);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    reads: '—',
    quality: '—',
    adapter: '—',
    readsChange: '',
    qualityChange: '',
    adapterChange: '',
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const totalPositions = 50;
    const qualityDataTrimmed: Array<{ position: number; q: number; isLow: boolean }> = [];
    for (let pos = 0; pos < totalPositions; pos++) {
      let baseQ;
      if (pos < 5) baseQ = 25 + Math.random() * 10;
      else if (pos < 15) baseQ = 30 + Math.random() * 8;
      else if (pos < 35) baseQ = 28 + Math.random() * 7;
      else baseQ = 20 + Math.random() * 10 - (pos - 35) * 0.3;

      if (pos > 40) {
        baseQ = Math.max(baseQ, qThreshold + 2);
      }

      const q = Math.max(5, Math.min(40, baseQ));
      qualityDataTrimmed.push({
        position: pos + 1,
        q: Math.round(q * 10) / 10,
        isLow: q < 20,
      });
    }

    const meanQualityTrimmed = qualityDataTrimmed.map(d => {
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

    const renderCharts = () => {
      const qLines = containerRef.current?.querySelector('#trim-q-lines');
      const qMean = containerRef.current?.querySelector('#trim-q-mean');
      const qRedZone = containerRef.current?.querySelector('#trim-q-red-zone');
      const qThresholdLine = containerRef.current?.querySelector('#trim-q-threshold');
      const adapterBars = containerRef.current?.querySelector('#trim-adapter-bars');

      if (qLines) {
        qLines.innerHTML = '';
        qualityDataTrimmed.forEach((d, i) => {
          const line = document.createElement('div');
          line.className = 'q-line-point absolute w-[2px] rounded transition-all';
          const yPos = 100 - (d.q / 40) * 100;
          line.style.bottom = `${yPos}%`;
          line.style.left = `${(i / (totalPositions - 1)) * 100}%`;
          line.style.background = d.isLow ? '#ff6b6b' : '#4da3ff';
          line.style.boxShadow = d.isLow ? '0 0 6px #ff6b6b' : '0 0 4px #4da3ff';
          qLines.appendChild(line);
        });
      }

      if (qMean) {
        qMean.innerHTML = '';
        meanQualityTrimmed.forEach((q, i) => {
          const point = document.createElement('div');
          point.className = 'q-mean-point absolute w-[3px] h-[3px] rounded-full';
          point.style.background = '#ffb84d';
          point.style.boxShadow = '0 0 4px #ffb84d';
          const yPos = 100 - (q / 40) * 100;
          point.style.bottom = `${yPos}%`;
          point.style.left = `${(i / (totalPositions - 1)) * 100}%`;
          qMean.appendChild(point);
        });
      }

      if (qRedZone) {
        const lowStart = qualityDataTrimmed.findIndex(d => d.isLow);
        const lowEnd = qualityDataTrimmed.reduce((last, d, i) => d.isLow ? i : last, -1);
        if (lowStart >= 0) {
          (qRedZone as HTMLElement).style.display = 'block';
          (qRedZone as HTMLElement).style.left = `${(lowStart / (totalPositions - 1)) * 100}%`;
          (qRedZone as HTMLElement).style.width = `${((lowEnd - lowStart + 1) / (totalPositions - 1)) * 100}%`;
        } else {
          (qRedZone as HTMLElement).style.display = 'none';
        }
      }

      if (qThresholdLine) {
        const qThresholdY = 100 - (qThreshold / 40) * 100;
        (qThresholdLine as HTMLElement).style.bottom = `${qThresholdY}%`;
        (qThresholdLine as HTMLElement).style.display = 'block';
      }

      if (adapterBars) {
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
        reads: trimmedReads.toLocaleString(),
        quality: avgQAfter,
        adapter: adapterAfterVal + '%',
        readsChange: `▼ ${((totalReads - trimmedReads) / totalReads * 100).toFixed(1)}%`,
        qualityChange: `▲ +${(parseFloat(avgQAfter) - parseFloat(avgQBefore)).toFixed(1)}`,
        adapterChange: `▼ ${adapterBeforeVal}% → ${adapterAfterVal}%`,
      });
    };

    const handleThresholdChange = (e: Event) => {
      const newThreshold = parseInt((e.target as HTMLInputElement).value);
      setQThreshold(newThreshold);
      renderCharts();
    };

    renderCharts();
    updateStats();

    const slider = containerRef.current?.querySelector('#q-threshold-slider') as HTMLInputElement;
    slider?.addEventListener('input', handleThresholdChange);

    return () => {
      isPlayingRef.current = false;
      slider?.removeEventListener('input', handleThresholdChange);
    };
  }, [qThreshold]);

  const handleStartTrim = () => {
    setProgress(0);
    const trimProgressFill = containerRef.current?.querySelector('#trim-progress-fill');
    const trimProgressLabel = containerRef.current?.querySelector('#trim-progress-label');
    const trimScissors = containerRef.current?.querySelector('#trim-scissors');
    const rawFile = containerRef.current?.querySelector('#trim-raw-file');
    const cleanFile = containerRef.current?.querySelector('#trim-clean-file');

    if (trimScissors) (trimScissors as HTMLElement).style.animation = 'shake 0.5s ease 3';
    if (rawFile) (rawFile as HTMLElement).classList.add('highlight');
    if (cleanFile) (cleanFile as HTMLElement).classList.add('highlight');

    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setProgress(p);
      if (trimProgressFill) (trimProgressFill as HTMLElement).style.width = `${p}%`;
      if (trimProgressLabel) trimProgressLabel.textContent = `修剪中... ${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        if (trimProgressLabel) trimProgressLabel.textContent = '✓ 修剪完成！';
        if (trimScissors) (trimScissors as HTMLElement).style.animation = '';
        if (rawFile) (rawFile as HTMLElement).classList.remove('highlight');
        if (cleanFile) (cleanFile as HTMLElement).classList.remove('highlight');
        setTimeout(() => onComplete?.(), 1000);
      }
    }, 200);
  };

  return (
    <div className="trimming-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }} ref={containerRef}>
      {/* Left Panel - Charts */}
      <div className="trimming-left flex flex-col gap-4">
        <div className="fastqc-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
          <div className="fastqc-panel-header flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: '#3b4b5f' }}>
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Per-Base Quality (Trimmed)</h3>
            <span className="fastqc-badge text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520', borderColor: '#3b4b5f', borderWidth: '1px' }}>
              After Trimming
            </span>
          </div>
          <div className="quality-chart flex-1 relative" id="trim-quality-chart">
            <div className="chart-area relative h-full" id="trim-chart-area" style={{ backgroundColor: '#080c14', borderColor: '#1e2a38', borderWidth: '1px', borderRadius: '8px' }}>
              <div className="q-threshold-line absolute left-0 right-0 h-[1px] bg-dashed" id="trim-q-threshold" style={{ borderTop: '1px dashed #ffb84d', backgroundColor: 'transparent' }} />
              <div className="q-red-zone absolute top-0 bottom-0 bg-red-500/10 hidden" id="trim-q-red-zone" />
              <div className="q-lines-container absolute inset-0" id="trim-q-lines" />
              <div className="q-mean-line absolute inset-0" id="trim-q-mean" />
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
            <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Adapter Content (Trimmed)</h3>
            <span className="fastqc-badge text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520', borderColor: '#3b4b5f', borderWidth: '1px' }}>
              After Trimming
            </span>
          </div>
          <div className="adapter-chart flex-1" id="trim-adapter-chart">
            <div className="adapter-bars flex items-end justify-around h-full gap-1 p-2" id="trim-adapter-bars" />
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

      {/* Right Panel - Tools */}
      <div className="trimming-right flex flex-col gap-4">
        <div className="trimming-file-flow flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="trim-file-box flex flex-col items-center p-4 flex-1 rounded-xl transition-all" id="trim-raw-file" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📄</div>
            <div className="file-name text-[14px] font-bold text-center">sample_R1.fastq</div>
            <div className="file-type text-[11px]" style={{ color: '#9fb0c3' }}>Raw FASTQ</div>
          </div>
          <div className="trim-arrow-container flex flex-col items-center gap-1">
            <div className="trim-arrow text-2xl font-bold" style={{ color: '#ffb84d' }}>→</div>
            <div className="trim-scissors-icon text-3xl animate-bounce" id="trim-scissors">✂️</div>
          </div>
          <div className="trim-file-box flex flex-col items-center p-4 flex-1 rounded-xl transition-all" id="trim-clean-file" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="file-icon text-4xl mb-2">📄</div>
            <div className="file-name text-[14px] font-bold text-center">sample_R1.clean.fastq</div>
            <div className="file-type text-[11px]" style={{ color: '#4cc38a' }}>Clean FASTQ</div>
          </div>
        </div>

        <div className="trimming-tools p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <h4 className="text-[14px] font-bold mb-3" style={{ color: '#ffb84d' }}>修剪工具</h4>
          <div className="tool-row mb-3">
            <div className="tool-item flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all" id="q-threshold-tool" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <span className="tool-icon text-2xl">🔪</span>
              <div>
                <span className="tool-label block font-medium text-[13px]">品質修剪</span>
                <span className="tool-desc text-[11px]" style={{ color: '#9fb0c3' }}>低質量 Q 值修剪</span>
              </div>
            </div>
          </div>
          <div className="tool-row">
            <div className="tool-item flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all" id="adapter-scraper-tool" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <span className="tool-icon text-2xl">🧹</span>
              <div>
                <span className="tool-label block font-medium text-[13px]">Adapter 去除</span>
                <span className="tool-desc text-[11px]" style={{ color: '#9fb0c3' }}>清除讀序開頭</span>
              </div>
            </div>
          </div>
        </div>

        <div className="trimming-slider-container p-4 rounded-2xl" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <label className="slider-label block mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium">Q 值閾值</span>
            <span id="q-threshold-value" className="text-[16px] font-bold font-mono" style={{ color: '#ffb84d' }}>{qThreshold}</span>
          </label>
          <input
            type="range"
            className="q-threshold-slider w-full h-2 appearance-none bg-[#0f1520] rounded-full cursor-pointer"
            id="q-threshold-slider"
            min="10"
            max="35"
            value={qThreshold}
            step="1"
            onChange={(e) => setQThreshold(parseInt(e.target.value))}
          />
          <div className="slider-info mt-2 text-center text-[11px]" style={{ color: '#9fb0c3' }}>
            <span>{`低品質尾部將被裁切 (Q < ${qThreshold})`}</span>
          </div>
        </div>

        <div className="trimming-progress p-4 rounded-2xl flex-1 flex flex-col justify-center" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f', borderWidth: '1px' }}>
          <div className="progress-bar h-3 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#0f1520' }}>
            <div className="progress-fill h-full rounded-full transition-all duration-500" id="trim-progress-fill" style={{ backgroundColor: '#4cc38a', width: `${progress}%` }} />
          </div>
          <div className="progress-label text-center text-[13px] font-medium" id="trim-progress-label" style={{ color: '#c6d3e3' }}>
            {progress === 0 ? '準備修剪...' : progress === 100 ? '✓ 修剪完成！' : `修剪中... ${progress}%`}
          </div>
          {progress === 0 && (
            <button
              onClick={handleStartTrim}
              className="mt-4 w-full py-3 rounded-lg font-bold text-[14px] transition-all"
              style={{ backgroundColor: '#4cc38a', color: '#0f1520' }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
            >
              開始修剪
            </button>
          )}
        </div>
      </div>
    </div>
  );
};