import React, { useEffect, useRef } from 'react';
import { BASE_COLORS, hexToRgb } from '../../hooks/useUtils';

interface BclRawVisualizationProps {
  onComplete?: () => void;
}

export const BclRawVisualization: React.FC<BclRawVisualizationProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const channels = [
      { base: 'A', label: 'Channel1: Green (A)', color: BASE_COLORS.A },
      { base: 'C', label: 'Channel2: Blue (C)', color: BASE_COLORS.C },
      { base: 'G', label: 'Channel3: Yellow (G)', color: BASE_COLORS.G },
      { base: 'T', label: 'Channel4: Red (T)', color: BASE_COLORS.T },
    ];

    const cycles = 10;
    const tilesPerCycle = 14;

    const opticalMatrix = containerRef.current;
    if (!opticalMatrix) return;

    channels.forEach((ch) => {
      const channelEl = document.createElement('div');
      channelEl.className = 'matrix-channel-raw';
      channelEl.innerHTML = `
        <div class="channel-header-raw flex items-center justify-between px-2.5 py-1.5 border-b" style="background:#0f1520;border-color:#1e2a38;font-size:11px;font-weight:700;">
          <div class="channel-base flex items-center gap-1.5">
            <span class="base-dot w-2.5 h-2.5 rounded-full" style="background:${ch.color};box-shadow:0 0 6px ${ch.color}"></span>
            <span class="channel-label-raw font-mono tracking-wide">${ch.label}</span>
          </div>
        </div>
        <div class="matrix-grid-raw flex-1 grid gap-0.5 p-2" style="grid-template-columns:repeat(14,1fr);grid-template-rows:repeat(8,1fr);" id="raw-grid-${ch.base}"></div>
      `;
      opticalMatrix.appendChild(channelEl);

      const grid = channelEl.querySelector(`#raw-grid-${ch.base}`);
      if (!grid) return;

      for (let cycle = 0; cycle < cycles; cycle++) {
        for (let tile = 0; tile < tilesPerCycle; tile++) {
          const cell = document.createElement('div');
          cell.className = 'matrix-cell-raw rounded';
          const intensity = Math.random();
          const [r, g, b] = hexToRgb(ch.color);
          cell.style.background = `rgba(${r},${g},${b},${0.1 + intensity * 0.85})`;
          cell.dataset.intensity = intensity.toFixed(2);
          cell.dataset.cycle = cycle.toString();
          cell.dataset.tile = tile.toString();
          grid.appendChild(cell);
        }
      }
    });

    const animateRawIntensity = () => {
      const grids = opticalMatrix.querySelectorAll('.matrix-grid-raw');
      let frame = 0;

      const animate = () => {
        if (!isPlayingRef.current) return;
        grids.forEach((grid, chIdx) => {
          const cells = grid.querySelectorAll('.matrix-cell-raw');
          cells.forEach((cell) => {
            const el = cell as HTMLElement;
            const baseIntensity = parseFloat(el.dataset.intensity || '0');
            const noise = (Math.random() - 0.5) * 0.15;
            const intensity = Math.max(0, Math.min(1, baseIntensity + noise));
            const channel = ['A', 'C', 'G', 'T'][chIdx];
            const color = BASE_COLORS[channel as keyof typeof BASE_COLORS];
            const [r, g, b] = hexToRgb(color);
            el.style.background = `rgba(${r},${g},${b},${0.1 + intensity * 0.85})`;
          });
        });
        frame++;
        if (frame < 120) requestAnimationFrame(animate);
        else setTimeout(animate, 2000);
      };
      animate();
    };

    animateRawIntensity();

    return () => { isPlayingRef.current = false; };
  }, []);

  return (
    <div className="bcl-raw-visual grid gap-6 h-[calc(100vh-13rem)] min-h-[600px]" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Signal Panel */}
      <div className="signal-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
        <div className="signal-header flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: '#3b4b5f' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>原始螢光強度矩陣</h3>
          <span className="signal-badge text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520', borderColor: '#3b4b5f', borderWidth: '1px' }}>
            未解碼 · 僅光強度
          </span>
        </div>
        <div className="signal-content flex-1 overflow-hidden flex flex-col gap-3">
          <div className="optical-matrix-raw flex-1 flex flex-col gap-2.5 overflow-hidden" id="optical-matrix-raw" ref={containerRef} />
        </div>
      </div>

      {/* Info Panel */}
      <div className="info-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
        <div className="info-header mb-4 pb-3 border-b" style={{ borderColor: '#3b4b5f' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#ffb84d' }}>檔案處理</h3>
        </div>
        <div className="info-content flex-1 overflow-auto flex flex-col gap-4">
          <div className="conversion-pipeline flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pipeline-step flex items-start gap-2.5 p-3 rounded-lg transition-all" style={{ backgroundColor: '#16202c', borderColor: '#2e4154', borderWidth: '1px' }}>
                <div className="step-badge flex items-center justify-center w-6 h-6 min-w-6 rounded-full text-[11px] font-extrabold text-[#080c14]" style={{ backgroundColor: '#4da3ff' }}>{i}</div>
                <div className="step-body flex-1">
                  <strong className="block text-[12px] mb-0.5" style={{ color: '#e8eef5' }}>
                    {i === 1 ? '輸入：BCL 原始光學訊號' : i === 2 ? 'Basecalling 演算法判斷鹼基' : '輸出：BCL 檔案'}
                  </strong>
                  <p className="text-[11px] leading-[1.5]" style={{ color: '#c6d3e3' }}>
                    {i === 1 ? '每個 cluster 在每個 cycle 的四通道螢光強度值（如：紅: 10, 綠: 950, 黃: 15, 藍: 20）' : i === 2 ? '比較四通道相對強度，最強者即為判讀結果，輸出對應鹼基（A/T/C/G）' : '將鹼基（T）、品質分數壓縮寫入成 1 個 Byte 的二進位檔'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};