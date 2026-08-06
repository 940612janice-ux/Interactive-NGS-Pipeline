import React, { useEffect, useRef } from 'react';
import { BASE_COLORS, hexToRgb, generateRandomSequence, generateQualityScores } from '../../hooks/useUtils';

interface BasecallingVisualizationProps {
  onComplete?: () => void;
}

export const BasecallingVisualization: React.FC<BasecallingVisualizationProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const channels = [
      { base: 'A', label: 'Ch1: Red (A/T)', color: BASE_COLORS.A },
      { base: 'C', label: 'Ch2: Green (C/G)', color: BASE_COLORS.C },
      { base: 'G', label: 'Ch3: Yellow', color: BASE_COLORS.G },
      { base: 'T', label: 'Ch4: Blue (Ref)', color: BASE_COLORS.T },
    ];

    const totalCycles = 6;
    const tilesPerCycle = 10;

    const cycleData: Array<{ base: string; intensities: Record<string, number>; qscore: number }[]> = [];
    for (let c = 0; c < totalCycles; c++) {
      const clusters = [];
      const numClusters = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numClusters; i++) {
        const base = ['A', 'C', 'G', 'T'][Math.floor(Math.random() * 4)];
        const intensities = { A: 0.05, C: 0.05, G: 0.05, T: 0.05 };
        intensities[base as keyof typeof intensities] = 0.6 + Math.random() * 0.4;
        const secondHighest = Math.max(...Object.values(intensities).filter(v => v !== intensities[base as keyof typeof intensities]));
        clusters.push({ base, intensities, qscore: Math.round(-10 * Math.log10(secondHighest / intensities[base as keyof typeof intensities])) });
      }
      cycleData.push(clusters);
    }

    const decodingAnimation = containerRef.current.querySelector('#decoding-animation');
    if (!decodingAnimation) return;

    decodingAnimation.innerHTML = `
      <div class="decoding-stages flex gap-3 flex-1 min-h-0">
        <div class="decoding-stage flex-1 flex flex-col gap-2 p-2.5 overflow-hidden" style="background:#080c14;border:1px solid #1e2a38;border-radius:8px;">
          <div class="stage-title text-center pb-1.5 border-b text-[11px] font-bold" style="color:#4da3ff;border-color:#1e2a38;">輸入：四通道光強度矩陣</div>
          <div class="optical-matrix flex-1 flex flex-col gap-1.5 overflow-hidden" id="optical-matrix"></div>
          <p class="stage-desc text-center text-[10px] mt-auto" style="color:#9fb0c3;">每個 cluster 一組 4 值 (R,G,Y,B)</p>
        </div>
        <div class="decoding-arrow flex items-center justify-center text-[18px] font-bold flex-shrink-0 px-1" style="color:#ffb84d;">⟶</div>
        <div class="decoding-stage flex-1 flex flex-col gap-2 p-2.5 overflow-hidden" style="background:#080c14;border:1px solid #1e2a38;border-radius:8px;">
          <div class="stage-title text-center pb-1.5 border-b text-[11px] font-bold" style="color:#4da3ff;border-color:#1e2a38;">演算法：比較四通道相對強度</div>
          <div class="algorithm-viz flex-1 flex flex-col gap-1.5 overflow-auto p-1" id="algorithm-viz"></div>
        </div>
        <div class="decoding-arrow flex items-center justify-center text-[18px] font-bold flex-shrink-0 px-1" style="color:#ffb84d;">⟶</div>
        <div class="decoding-stage flex-1 flex flex-col gap-2 p-2.5 overflow-hidden" style="background:#080c14;border:1px solid #1e2a38;border-radius:8px;">
          <div class="stage-title text-center pb-1.5 border-b text-[11px] font-bold" style="color:#4da3ff;border-color:#1e2a38;">輸出：FASTQ 四行格式</div>
          <div class="fastq-output flex-1 overflow-auto p-2 font-mono text-[9px] leading-[1.4] whitespace-pre-wrap break-all" style="background:#080c14;border:1px solid #1e2a38;border-radius:6px;" id="fastq-output"></div>
        </div>
      </div>
    `;

    const opticalMatrix = decodingAnimation.querySelector('#optical-matrix');
    const algorithmViz = decodingAnimation.querySelector('#algorithm-viz');
    const fastqOutput = decodingAnimation.querySelector('#fastq-output');

    channels.forEach((ch) => {
      const channelEl = document.createElement('div');
      channelEl.className = 'matrix-channel flex-1 flex flex-col overflow-hidden';
      channelEl.style.cssText = 'background:#080c14;border:1px solid #1e2a38;border-radius:6px;';
      channelEl.innerHTML = `
        <div class="channel-header flex items-center justify-between px-2 py-1 border-b text-[10px] font-bold" style="background:#0f1520;border-color:#1e2a38;">
          <div class="channel-base flex items-center gap-1">
            <span class="base-dot w-2 h-2 rounded-full" style="background:${ch.color};box-shadow:0 0 6px ${ch.color}"></span>
            <span class="channel-label font-mono tracking-wide">${ch.label}</span>
          </div>
        </div>
        <div class="matrix-grid flex-1 grid gap-0.5 p-1" style="grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(6,1fr);" id="grid-${ch.base}"></div>
      `;
      opticalMatrix?.appendChild(channelEl);

      const grid = channelEl.querySelector(`#grid-${ch.base}`);
      if (!grid) return;

      for (let cycle = 0; cycle < totalCycles; cycle++) {
        for (let tile = 0; tile < tilesPerCycle; tile++) {
          const cell = document.createElement('div');
          cell.className = 'matrix-cell rounded';
          cell.style.transition = 'all 0.3s ease';
          cell.style.position = 'relative';
          const intensity = Math.random() * 0.3;
          const [r, g, b] = hexToRgb(ch.color);
          cell.style.background = `rgba(${r},${g},${b},${0.1 + intensity})`;
          cell.dataset.base = '';
          cell.dataset.intensity = intensity.toFixed(2);
          cell.dataset.cycle = cycle.toString();
          cell.dataset.tile = tile.toString();
          cell.dataset.channel = ch.base;
          grid.appendChild(cell);
        }
      }
    });

    const renderFASTQForCycle = (cycleIdx: number) => {
      const clusters = cycleData[cycleIdx];
      let fastq = '';
      clusters.forEach((d, i) => {
        const seq = d.base + generateRandomSequence(20);
        const qual = generateQualityScores(seq.length);
        fastq += `@CLUSTER_${cycleIdx + 1}_${i + 1} cycle=${cycleIdx + 1}\n`;
        fastq += seq + '\n';
        fastq += '+\n';
        fastq += qual + '\n';
      });
      return fastq;
    };

    const renderFASTQDisplay = (fastq: string) => {
      if (!fastqOutput) return;
      const lines = fastq.split('\n');
      let html = '';
      lines.forEach((line, idx) => {
        const mod = idx % 4;
        let cls = 'fastq-line';
        let formatted = line;
        if (mod === 0) cls += ' fastq-header';
        else if (mod === 1) {
          cls += ' fastq-seq';
          formatted = line.split('').map(b => {
            const baseClass = ['A', 'C', 'G', 'T'].includes(b) ? `fastq-base ${b}` : 'fastq-base';
            return `<span class="${baseClass}">${b}</span>`;
          }).join('');
        } else if (mod === 2) cls += ' fastq-sep';
        else cls += ' fastq-qual';
        html += `<div class="${cls}">${formatted}</div>`;
      });
      fastqOutput.innerHTML = html;
    };

    const renderAlgorithmViz = (data: typeof cycleData[0]) => {
      if (!algorithmViz) return;
      algorithmViz.innerHTML = data.map((d, i) => {
        const maxBase = d.base;
        return `
          <div class="cluster-comparison flex items-center gap-2 p-1.5 rounded text-[10px]" style="background:#0f1520;border-radius:4px;">
            <span class="cluster-id font-mono min-w-[50px] text-[9px]" style="color:#9fb0c3;">Cluster ${i + 1}</span>
            <div class="bars flex gap-1 flex-1 items-end h-8">
              ${Object.entries(d.intensities).map(([b, v]) => `
                <div class="bar-wrapper flex flex-col items-center h-full justify-end">
                  <div class="bar w-full max-w-[20px] rounded-t transition-all" style="height:${v * 100}%;background:${BASE_COLORS[b as keyof typeof BASE_COLORS]};${b === maxBase ? 'box-shadow:0 0 8px ' + BASE_COLORS[b as keyof typeof BASE_COLORS] : ''};min-height:2px;border-radius:2px 2px 0 0;"></div>
                  <span class="bar-label text-[8px] font-bold mt-0.5 font-mono" style="color:${BASE_COLORS[b as keyof typeof BASE_COLORS]}">${b}</span>
                </div>
              `).join('')}
            </div>
            <span class="called-base px-2 py-0.5 rounded text-[12px] font-extrabold font-mono min-w-[24px] text-center" style="background:${BASE_COLORS[maxBase as keyof typeof BASE_COLORS]};color:#080c14;">${maxBase}</span>
          </div>
        `;
      }).join('');
    };

    const decodeCycle = (cycle: number) => {
      if (cycle >= totalCycles || !isPlayingRef.current) return;

      const grids = opticalMatrix?.querySelectorAll('.matrix-grid');
      const channelColors = [BASE_COLORS.A, BASE_COLORS.C, BASE_COLORS.G, BASE_COLORS.T];

      grids?.forEach((grid, chIdx) => {
        const cells = grid.querySelectorAll('.matrix-cell');
        const channel = ['A', 'C', 'G', 'T'][chIdx];
        const channelColor = channelColors[chIdx];

        cells.forEach((cell) => {
          const el = cell as HTMLElement;
          const cellCycle = parseInt(el.dataset.cycle || '0');
          if (cellCycle === cycle) {
            const baseIntensity = 0.5 + Math.random() * 0.5;
            const [r, g, b] = hexToRgb(channelColor);
            el.style.background = `rgba(${r},${g},${b},${baseIntensity})`;
            el.style.transform = 'scale(1.15)';

            setTimeout(() => {
              el.style.transform = 'scale(1)';
              el.classList.add('decoded');
              el.dataset.base = channel;
            }, 150);
          }
        });
      });

      renderAlgorithmViz(cycleData[cycle]);

      setTimeout(() => {
        const fastq = renderFASTQForCycle(cycle);
        renderFASTQDisplay(fastq);
      }, 600);

      setTimeout(() => decodeCycle(cycle + 1), 1200);
    };

    decodeCycle(0);

    return () => { isPlayingRef.current = false; };
  }, []);

  return (
    <div className="basecalling-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Signal Panel */}
      <div className="signal-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
        <div className="signal-header flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: '#3b4b5f' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>光訊號解碼過程</h3>
          <span className="signal-badge text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520', borderColor: '#3b4b5f', borderWidth: '1px' }}>
            Putting It All Together
          </span>
        </div>
        <div className="signal-content flex-1 overflow-hidden flex flex-col gap-3">
          <div className="decoding-animation flex-1 flex flex-col overflow-hidden" id="decoding-animation" ref={containerRef} />
        </div>
      </div>

      {/* Info Panel */}
      <div className="info-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
        <div className="info-header mb-4 pb-3 border-b" style={{ borderColor: '#3b4b5f' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#ffb84d' }}>BCL → Raw FASTQ 轉換流程</h3>
        </div>
        <div className="info-content flex-1 overflow-auto flex flex-col gap-4">
          <div className="conversion-pipeline flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="pipeline-step flex items-start gap-2.5 p-3 rounded-lg transition-all" style={{ backgroundColor: '#16202c', borderColor: '#2e4154', borderWidth: '1px' }}>
                <div className="step-badge flex items-center justify-center w-6 h-6 min-w-6 rounded-full text-[11px] font-extrabold text-[#080c14]" style={{ backgroundColor: '#4da3ff' }}>{i}</div>
                <div className="step-body flex-1">
                  <strong className="block text-[12px] mb-0.5" style={{ color: '#e8eef5' }}>
                    {i === 1 ? '讀取 BCL 二進位檔' : i === 2 ? '背景扣除與去噪' : i === 3 ? '四通道比對 → 判讀鹼基' : '計算 Q-score & 輸出 FASTQ'}
                  </strong>
                  <p className="text-[11px] leading-[1.5]" style={{ color: '#c6d3e3' }}>
                    {i === 1 ? '解壓縮 Run-length encoded 光學訊號，還原每個 cluster 的四通道強度矩陣' : i === 2 ? '去除光学背景雜訊、鄰近 cluster 串擾，強化信號' : i === 3 ? '比較 R/G/Y/B 四通道強度，最強者即為判讀結果' : '最強 vs 次強通道差異 → Phred 品質分數，輸出四行 FASTQ'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="live-conversion p-3.5 rounded-lg" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <h4 className="text-[12px] font-bold mb-2.5" style={{ color: '#4da3ff' }}>即時轉換預覽</h4>
            <div className="conversion-demo flex items-center justify-center gap-3 mb-2.5">
              <div className="file-box px-3.5 py-2">
                <div className="file-icon text-2xl">📦</div>
                <div className="file-label font-medium">BCL</div>
                <div className="file-ext text-[11px] font-mono" style={{ color: '#9fb0c3' }}>.bcl (二進位)</div>
              </div>
              <span className="arrow-symbol text-[18px] font-bold" style={{ color: '#ffb84d' }}>⟶</span>
              <div className="file-box px-3.5 py-2">
                <div className="file-icon text-2xl">📄</div>
                <div className="file-label font-medium">Raw FASTQ</div>
                <div className="file-ext text-[11px] font-mono" style={{ color: '#9fb0c3' }}>.fastq.gz</div>
              </div>
            </div>
            <div className="conversion-log font-mono text-[10px] leading-[1.8] max-h-[120px] overflow-auto" style={{ color: '#9fb0c3' }}>
              <div className="log-line animate-fadeIn">📦 讀取 BCL 檔案... 解壓縮中</div>
              <div className="log-line animate-fadeIn" style={{ animationDelay: '1.5s' }}>🔧 背景扣除... 去噪處理中</div>
              <div className="log-line animate-fadeIn" style={{ animationDelay: '3s' }}>🔬 四通道比對中...</div>
              <div className="log-line animate-fadeIn" style={{ animationDelay: '4.5s' }}>✅ 判讀完成 → 輸出 FASTQ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};