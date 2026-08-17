import React, { useEffect, useRef, useState } from 'react';
import { BASE_COLORS, BaseKey, hexToRgb, generateRandomSequence } from '../../hooks/useUtils';

interface BclRawVisualizationProps {
  onComplete?: () => void;
}

type IntensityMap = Record<BaseKey, number>;

const CHANNELS: BaseKey[] = ['A', 'C', 'G', 'T'];

const CHANNEL_META: Record<BaseKey, { label: string }> = {
  A: { label: 'A · 紅' },
  C: { label: 'C · 綠' },
  G: { label: 'G · 黃' },
  T: { label: 'T · 藍' },
};

export const BclRawVisualization: React.FC<BclRawVisualizationProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const decodeSeqRef = useRef<HTMLDivElement>(null);
  const clusterIdRef = useRef<HTMLSpanElement>(null);
  const isPlayingRef = useRef(true);
  const [showIntro, setShowIntro] = useState(true);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    const NUM_CLUSTERS = 10;
    const NUM_CYCLES = 18;

    // 模擬真實 BCL：每個 cluster 有一條隱藏的 DNA 序列
    const sequences: string[] = [];
    for (let i = 0; i < NUM_CLUSTERS; i++) sequences.push(generateRandomSequence(NUM_CYCLES));

    // 每格 = cluster × cycle，四通道強度（主通道強、其他為雜訊）
    const matrix: IntensityMap[][] = sequences.map((seq) =>
      seq.split('').map((base) => {
        const vals: IntensityMap = { A: 0, C: 0, G: 0, T: 0 };
        CHANNELS.forEach((ch) => {
          if (ch === base) vals[ch] = 0.55 + Math.random() * 0.45;
          else vals[ch] = 0.04 + Math.random() * 0.26;
        });
        return vals;
      }),
    );

    host.innerHTML = `
      <div class="flex flex-col gap-2.5" style="height:100%;min-height:0;">
        <div class="matrix-scroll flex-1 min-h-0 overflow-auto rounded-lg" style="background:#080c14;border:1px solid #1e2a38;">
          <div class="flex items-center justify-between px-3 py-1.5 border-b sticky top-0 z-10" style="background:#0f1520;border-color:#1e2a38;">
            <span class="text-[10px] font-mono font-bold tracking-wider" style="color:#4da3ff;">READ × CYCLE 螢光矩陣</span>
            <span class="text-[9px] font-mono" style="color:#9fb0c3;" id="cycle-indicator">Cycle 1 / ${NUM_CYCLES}</span>
          </div>
          <div class="p-2.5">
            <div id="bcl-matrix"></div>
          </div>
        </div>
        <div class="flex items-center justify-center gap-4 flex-wrap">
          ${CHANNELS.map(
            (ch) => `
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-sm" style="background:${BASE_COLORS[ch]};box-shadow:0 0 5px ${BASE_COLORS[ch]};"></span>
                <span class="text-[12px] font-mono font-bold" style="color:${BASE_COLORS[ch]};">${CHANNEL_META[ch].label}</span>
              </div>`,
          ).join('')}
          <span class="text-[12px] font-mono font-bold" style="color:#c6d3e3;">亮度 ∝ 強度 · 主通道最亮 → 判讀該鹼基</span>
        </div>
      </div>
    `;

    const matrixHost = host.querySelector('#bcl-matrix') as HTMLElement;
    matrixHost.style.display = 'grid';
    matrixHost.style.gridTemplateColumns = `30px repeat(${NUM_CYCLES}, minmax(14px, 1fr))`;
    matrixHost.style.gap = '2px';
    matrixHost.style.alignItems = 'stretch';

    const corner = document.createElement('div');
    corner.textContent = 'Read#';
    corner.style.cssText =
      'display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#5b6b80;font-family:monospace;';
    matrixHost.appendChild(corner);

    for (let c = 0; c < NUM_CYCLES; c++) {
      const th = document.createElement('div');
      th.textContent = `${c + 1}`;
      th.style.cssText =
        'display:flex;align-items:center;justify-content:center;font-size:8px;color:#5b6b80;font-family:monospace;font-weight:700;';
      matrixHost.appendChild(th);
    }

    const buildCell = (r: number, c: number): HTMLElement => {
      const cell = document.createElement('div');
      cell.className = 'bcl-cell';
      cell.dataset.cluster = r.toString();
      cell.dataset.cycle = c.toString();
      cell.style.cssText =
        'position:relative;border-radius:3px;overflow:hidden;aspect-ratio:1/1;background:#0d131d;border:1px solid #111923;cursor:crosshair;transition:box-shadow 0.2s ease, transform 0.15s ease;';

      CHANNELS.forEach((ch) => {
        const q = document.createElement('div');
        const inten = matrix[r][c][ch];
        const [rr, gg, bb] = hexToRgb(BASE_COLORS[ch]);
        q.dataset.channel = ch;
        q.dataset.intensity = inten.toFixed(2);
        q.style.position = 'absolute';
        q.style.inset = '0';
        q.style.mixBlendMode = 'screen';
        q.style.background = `rgba(${rr},${gg},${bb},${0.08 + inten * 0.92})`;
        cell.appendChild(q);
      });

      cell.addEventListener('mouseenter', () => {
        cell.style.transform = 'scale(1.35)';
        cell.style.zIndex = '5';
        handleCellFocus(r, c);
      });
      cell.addEventListener('mousemove', (e) => moveTooltip(e.clientX, e.clientY));
      cell.addEventListener('mouseleave', () => {
        cell.style.transform = 'scale(1)';
        hideTooltip();
        updateDecode(0, -1);
        hovering = false;
        if (cycleIndicator) cycleIndicator.textContent = `Cycle ${activeCycle + 1} / ${NUM_CYCLES}`;
      });
      return cell;
    };

    for (let r = 0; r < NUM_CLUSTERS; r++) {
      const label = document.createElement('div');
      label.textContent = `${r + 1}`;
      label.style.cssText =
        'display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#7d8ea3;font-family:monospace;';
      matrixHost.appendChild(label);
      for (let c = 0; c < NUM_CYCLES; c++) matrixHost.appendChild(buildCell(r, c));
    }

    const cycleIndicator = host.querySelector('#cycle-indicator') as HTMLElement;
    let activeCycle = 0;
    let hovering = false;

    const updateDecode = (clusterIdx: number, hoverCycle: number) => {
      const decodeSeq = decodeSeqRef.current;
      if (!decodeSeq) return;
      const idEl = clusterIdRef.current;
      if (idEl) idEl.textContent = (clusterIdx + 1).toString();
      decodeSeq.innerHTML = sequences[clusterIdx]
        .split('')
        .map((b, i) => {
          const active = i === hoverCycle;
          return `
            <span class="font-mono font-extrabold text-[14px] w-7 h-9 flex items-center justify-center rounded-md transition-all"
              style="color:${BASE_COLORS[b as BaseKey]};
              background:${active ? '#0f1520' : 'transparent'};
              border:1px solid ${active ? '#ffb84d' : 'transparent'};
              box-shadow:${active ? '0 0 8px rgba(255,184,77,0.45)' : 'none'};">${b}</span>`;
        })
        .join('');
    };

    const handleCellFocus = (r: number, c: number) => {
      updateDecode(r, c);
      hovering = true;
      if (cycleIndicator) cycleIndicator.textContent = `Cycle ${c + 1} / ${NUM_CYCLES}`;
      const vals = matrix[r][c];
      const dominant = CHANNELS.reduce((best, ch) => (vals[ch] > vals[best] ? ch : best), CHANNELS[0]);
      const max = vals[dominant];
      const second = Math.max(...CHANNELS.filter((ch) => ch !== dominant).map((ch) => vals[ch]));
      const qscore = Math.max(0, Math.min(40, Math.round(-10 * Math.log10(Math.max(second, 0.001) / max))));
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      tooltip.innerHTML = `
        <div class="text-[10px] font-mono font-bold mb-2" style="text-shadow:-1px 0 #fff,1px 0 #fff,0 -1px #fff,0 1px #fff;color:#020202;">
          Read #${r + 1} · Cycle ${c + 1}
        </div>
        <div class="flex flex-col gap-1 mb-2.5">
          ${CHANNELS.map((ch) => {
            const pct = vals[ch] * 100;
            const isMax = ch === dominant;
            return `
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-mono font-bold w-4" style="color:${BASE_COLORS[ch]};">${ch}</span>
                <div class="flex-1 h-2 rounded-sm overflow-hidden" style="background:#0f1520;">
                  <div class="h-full rounded-sm" style="width:${pct}%;background:${BASE_COLORS[ch]};${isMax ? 'box-shadow:0 0 6px ' + BASE_COLORS[ch] : ''};"></div>
                </div>
                <span class="text-[9px] font-mono font-bold w-8 text-right" style="text-shadow:-1px 0 #fff,1px 0 #fff,0 -1px #fff,0 1px #fff;color:${isMax ? '#ea9e2c' : '#020202'};">${Math.round(vals[ch] * 4095)}</span>
              </div>`;
          }).join('')}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[9px] font-mono" style="text-shadow:-1px 0 #fff,1px 0 #fff,0 -1px #fff,0 1px #fff;color:#020202;">判讀</span>
          <span class="px-2 py-0.5 rounded text-[12px] font-extrabold font-mono" style="background:${BASE_COLORS[dominant]};color:#080c14;">${dominant}</span>
          <span class="text-[9px] font-mono" style="text-shadow:-1px 0 #fff,1px 0 #fff,0 -1px #fff,0 1px #fff;color:#020202;">Q${qscore}</span>
        </div>
      `;
      tooltip.style.display = 'block';
    };

    const moveTooltip = (x: number, y: number) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      const pad = 16;
      const rect = tooltip.getBoundingClientRect();
      let left = x + pad;
      let top = y + pad;
      if (left + rect.width > window.innerWidth) left = x - rect.width - pad;
      if (top + rect.height > window.innerHeight) top = y - rect.height - pad;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    const hideTooltip = () => {
      const tooltip = tooltipRef.current;
      if (tooltip) tooltip.style.display = 'none';
    };

    const cells = host.querySelectorAll('.bcl-cell');
    let frame = 0;

    const animate = () => {
      if (!isPlayingRef.current) return;
      if (cycleIndicator && !hovering) cycleIndicator.textContent = `Cycle ${activeCycle + 1} / ${NUM_CYCLES}`;

      cells.forEach((cell) => {
        const el = cell as HTMLElement;
        const cyc = parseInt(el.dataset.cycle || '0');
        const isActiveCol = cyc === activeCycle;
        el.style.boxShadow = isActiveCol ? '0 0 0 1px rgba(255,184,77,0.55)' : 'none';
        el.querySelectorAll('div[data-channel]').forEach((q) => {
          const qEl = q as HTMLElement;
          const base = parseFloat(qEl.dataset.intensity || '0');
          const noise = (Math.random() - 0.5) * 0.08;
          const inten = Math.max(0, Math.min(1, base + noise));
          const ch = qEl.dataset.channel as BaseKey;
          const [rr, gg, bb] = hexToRgb(BASE_COLORS[ch]);
          qEl.style.background = `rgba(${rr},${gg},${bb},${0.08 + inten * 0.92})`;
        });
      });

      frame++;
      if (frame % 30 === 0) activeCycle = (activeCycle + 1) % NUM_CYCLES;
      requestAnimationFrame(animate);
    };

    updateDecode(0, -1);
    animate();

    return () => {
      isPlayingRef.current = false;
    };
  }, []);

  return (
    <div className="bcl-raw-visual flex flex-col gap-4 h-[calc(100vh-9rem)] min-h-[700px]">
      {/* 解說對話框 */}
      {showIntro && (
        <div className="intro-dialog shrink-0 rounded-2xl border p-4 animate-fade-up" style={{ backgroundColor: '#16202c', borderColor: '#4da3ff' }}>
          <div className="flex items-start gap-3">
            <div className="dialog-body flex-1">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1.5 text-[16px] font-bold tracking-wide transition-colors"
                  style={{ color: '#4da3ff' }}
                  onClick={() => setShowTips((v) => !v)}
                >
                  <span className="dialog-chevron inline-block transition-transform" style={{ transform: showTips ? 'rotate(90deg)' : 'none' }}>▸</span>
                  🧪 基因偵探小助手-讀圖方式
                </button>
                <button
                  className="dialog-close flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold transition-colors"
                  style={{ color: '#9fb0c3', backgroundColor: '#0f1520', borderColor: '#2e4154', borderWidth: '1px' }}
                  onClick={() => setShowIntro(false)}
                  aria-label="關閉解說"
                >
                  ✕
                </button>
              </div>
              {showTips && (
              <div className="dialog-tips mt-2.5 pt-2.5 border-t overflow-y-auto pr-1" style={{ borderColor: '#2e4154', maxHeight: '180px' }}>
                <ul className="text-[12px] leading-[1.8] flex flex-col gap-0.5" style={{ color: '#c6d3e3' }}>
                  <li>• 縱軸：read（每次拍照拍到的一顆螢光點）</li>
                  <li>• 橫軸：cycle（每讀 1 個鹼基就拍 1 次照）</li>
                  <li>• 每格 4 個色塊 = A/C/G/T 四通道強度</li>
                  <li>• 亮的那格顏色，就是該位置判讀出的鹼基</li>
                  <li>• 黃框掃描 = 機器依 cycle 依序拍照</li>
                </ul>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 flex-1 min-h-0" style={{ gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)' }}>
      {/* Signal Panel */}
      <div className="signal-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
        <div className="signal-header flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: '#3b4b5f' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>原始螢光強度矩陣</h3>
          <span className="signal-badge text-[10px] font-bold tracking-wider px-3 py-1 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520', borderColor: '#3b4b5f', borderWidth: '1px' }}>
            未解碼 · 僅光強度
          </span>
        </div>
        <div className="signal-content flex-1 overflow-hidden flex flex-col gap-3">
          <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden" ref={containerRef} />
          {/* 即時解碼列 */}
          <div className="decode-strip shrink-0 rounded-lg px-3 py-2.5" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold font-mono tracking-wide" style={{ color: '#ffb84d' }}>
                即時解碼 : Read #<span id="decode-cluster-id" ref={clusterIdRef}>1</span>
              </span>
            </div>
            <div className="decode-seq flex items-center gap-1 overflow-x-auto pb-1" id="decode-seq" ref={decodeSeqRef} />
          </div>
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
                <div className="step-badge flex items-center justify-center w-6 h-6 min-w-6 rounded-full text-[16px] font-extrabold text-[#080c14]" style={{ backgroundColor: '#4da3ff' }}>{i}</div>
                <div className="step-body flex-1">
                  <strong className="block text-[12px] mb-0.5" style={{ color: '#e8eef5' }}>
                    {i === 1 ? '輸入：BCL 原始光學訊號' : i === 2 ? 'Basecalling 演算法' : '輸出：BCL 檔案(二進位編碼)'}
                  </strong>
                  {i === 1 ? (
                    <div className="mt-1">
                      <p className="text-[12px] leading-[1.5]" style={{ color: '#c6d3e3' }}>例如 : Read #1．Cycle 1</p>
                      <div className="mt-1.5 font-mono text-[12px] leading-[1.8] p-2.5 rounded-md" style={{ backgroundColor: '#080c14', borderColor: '#1e2a38', borderWidth: '1px' }}>
                        <div><span className="font-bold" style={{ color: '#ff6b6b' }}>A</span><span style={{ color: '#9fb0c3' }}> :</span> 2999</div>
                        <div><span className="font-bold" style={{ color: '#4cc38a' }}>C</span><span style={{ color: '#9fb0c3' }}> :</span> 493</div>
                        <div><span className="font-bold" style={{ color: '#ffb84d' }}>G</span><span style={{ color: '#9fb0c3' }}> :</span> 207</div>
                        <div><span className="font-bold" style={{ color: '#4da3ff' }}>T</span><span style={{ color: '#9fb0c3' }}> :</span> 895</div>
                      </div>
                    </div>
                  ) : i === 2 ? (
                    <div className="mt-1">
                      <p className="text-[12px] leading-[1.5]" style={{ color: '#c6d3e3' }}>背景雜訊扣除 (修正螢光強度)、判定鹼基、計算品質分數</p>
                      <p className="text-[12px] leading-[1.5]" style={{ color: '#c6d3e3' }}>〔 判讀結果 : G, Q30 〕</p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <p className="text-[12px] leading-[1.5]" style={{ color: '#c6d3e3' }}>〔鹼基編碼 〕G → 10</p>
                      <p className="text-[12px] leading-[1.5]" style={{ color: '#c6d3e3' }}>〔品質分數編碼〕30 → 011110</p>
                      <p className="text-[12px] leading-[1.5]" style={{ color: '#c6d3e3' }}> 註 : A = 00 | C = 01 | G = 10 | T = 11</p>
                      <p className="text-[12px] leading-[1.5]" style={{ color: '#c6d3e3' }}> 寫入檔案 : 011110 + 10 = 01111010</p>
                      <p className="text-[12px] leading-[1.5]" style={{ color: '#c6d3e3' }}> 使用十六進位壓縮成 1 Byte 存入 → 0x7A</p>
                    </div>
                  )}
                </div>
              </div>                      
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{ position: 'fixed', zIndex: 80, pointerEvents: 'none', display: 'none' }}
        className="rounded-xl border p-3 min-w-[200px]"
      />
    </div>
  );
};
