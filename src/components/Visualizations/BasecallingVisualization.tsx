import React, { useEffect, useMemo, useState } from 'react';
import { BASE_COLORS, BaseKey, generateRandomSequence } from '../../hooks/useUtils';

interface BasecallingVisualizationProps {
  onComplete?: () => void;
}

// BCL 位元編碼規則（與 Illumina BCL 格式一致）：
//   1 Byte = [前 6 bits：Phred Q-score] + [後 2 bits：鹼基代碼]
//   鹼基代碼：A = 00 | C = 01 | G = 10 | T = 11
const BASE_CODE: Record<BaseKey, number> = { A: 0, C: 1, G: 2, T: 3 };

const NUM_CLUSTERS = 4; // 模擬 4 個 cluster（螢光點）
const NUM_CYCLES = 18;  // 每條 read 讀 18 個 cycle（鹼基）

// FASTQ 第一行（模擬 Illumina 標頭格式）
const FASTQ_HEADER = '@SIMULATED_RUN:1:1101:1000:1000 1:N:0:0';

export const BasecallingVisualization: React.FC<BasecallingVisualizationProps> = () => {
  // 每個 cluster 預先產生一條「隱藏的 DNA 序列」與對應品質分數
  const sequences = useMemo(
    () =>
      Array.from({ length: NUM_CLUSTERS }, () => generateRandomSequence(NUM_CYCLES).split('') as BaseKey[]),
    [],
  );
  const qualities = useMemo(
    () =>
      Array.from({ length: NUM_CLUSTERS }, () =>
        Array.from({ length: NUM_CYCLES }, () => 28 + Math.floor(Math.random() * 13)),
      ),
    [],
  );

  // 目前模擬選取的 cluster 與 cycle
  const [clusterIdx, setClusterIdx] = useState(0);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  // 自動播放：每隔一段時間自動前進一個 cycle，模擬定序儀依序讀鹼基
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setCycleIdx((c) => (c + 1) % NUM_CYCLES), 1500);
    return () => clearInterval(id);
  }, [playing]);

  // 切換 cluster 時，重新從 Cycle 1 開始解碼
  const selectCluster = (i: number) => {
    setClusterIdx(i);
    setCycleIdx(0);
    setPlaying(true);
  };

  // ---- 目前正在解碼的 1 Byte ----
  const base = sequences[clusterIdx][cycleIdx]; // 判讀鹼基（後 2 bits）
  const qscore = qualities[clusterIdx][cycleIdx]; // Phred Q-score（前 6 bits）
  const byte = (qscore << 2) | BASE_CODE[base]; // 組回 1 Byte
  const hexStr = `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`; // 十六進位表示
  const binStr = byte.toString(2).padStart(8, '0'); // 二進位 8 bits
  const qBits = binStr.slice(0, 6); // 前 6 bits（Q-score 區）
  const baseBits = binStr.slice(6); // 後 2 bits（Base 區）
  const asciiCode = qscore + 33; // Phred + 33 = ASCII 編碼
  const asciiChar = String.fromCharCode(asciiCode); // 對應的品質字元

  // 已解碼前段（供 FASTQ 終端機顯示）
  const decodedSeq = sequences[clusterIdx].slice(0, cycleIdx + 1);
  const decodedQual = qualities[clusterIdx].slice(0, cycleIdx + 1).map((q) => String.fromCharCode(q + 33));
  const pending = NUM_CYCLES - (cycleIdx + 1); // 尚未解碼的長度

  // 8 個 bit 拆成方格（前 6 個 = Q-Score 區、後 2 個 = Base 區）
  const bitBoxes = binStr.split('').map((b, i) => (
    <span
      key={i}
      className="w-5 h-7 flex items-center justify-center font-mono text-[13px] font-bold rounded"
      style={
        i < 6
          ? { backgroundColor: 'rgba(77,163,255,0.18)', color: '#4da3ff', border: '1px solid rgba(77,163,255,0.4)', marginRight: i === 5 ? 6 : 0 }
          : { backgroundColor: BASE_COLORS[base], color: '#080c14', boxShadow: `0 0 8px ${BASE_COLORS[base]}` }
      }
    >
      {b}
    </span>
  ));

  // FASTQ 終端機：鹼基行（綠字、目前解碼的鹼基高亮）
  const seqSpans = decodedSeq.map((b, i) => {
    const isCurrent = i === cycleIdx;
    return (
      <span
        key={i}
        style={
          isCurrent
            ? { backgroundColor: '#4cc38a', color: '#080c14', fontWeight: 800, borderRadius: 4, padding: '0 4px', boxShadow: '0 0 10px rgba(76,195,138,0.6)' }
            : { color: '#4cc38a' }
        }
      >
        {b}
      </span>
    );
  });

  // FASTQ 終端機：品質行（黃字、目前轉換的 ASCII 字元高亮）
  const qualSpans = decodedQual.map((ch, i) => {
    const isCurrent = i === cycleIdx;
    return (
      <span
        key={i}
        style={
          isCurrent
            ? { backgroundColor: '#ffb84d', color: '#080c14', fontWeight: 800, borderRadius: 4, padding: '0 4px', boxShadow: '0 0 10px rgba(255,184,77,0.6)' }
            : { color: '#ffb84d' }
        }
      >
        {ch}
      </span>
    );
  });

  // 尚未解碼的位置以淡色「·」佔位
  const pendingDots = Array.from({ length: pending }, (_, i) => (
    <span key={`p${i}`} style={{ color: '#33445a' }}>
      ·
    </span>
  ));

  // 卡片 3：FASTQ 4 行欄位對照表
  const fastqLines = [
    { n: 'L1', name: 'Header', color: '#9fb0c3', desc: '機台 / 樣本 / 讀段資訊（固定）' },
    { n: 'L2', name: 'Sequence', color: '#4cc38a', desc: `寫入鹼基「${base}」→ 第 ${cycleIdx + 1} 位` },
    { n: 'L3', name: 'Option', color: '#9fb0c3', desc: '「+」分隔行' },
    { n: 'L4', name: 'Quality', color: '#ffb84d', desc: `寫入字元「${asciiChar}」→ 第 ${cycleIdx + 1} 位` },
  ];

  return (
    <div className="basecalling-visual flex flex-col gap-4 h-[calc(100vh-13rem)] min-h-[640px] min-w-0">
      {/* ===== 1. 頂部狀態標題列 ===== */}
      <div className="shrink-0 rounded-2xl border px-5 py-3.5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 標題 */}
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full animate-blink" style={{ background: '#4cc38a', boxShadow: '0 0 8px #4cc38a' }} />
            <h3 className="text-[17px] font-bold tracking-wide" style={{ color: '#4da3ff' }}>
              光訊號解碼實況 <span style={{ color: '#ffb84d' }}>(BCL ➔ FASTQ Conversion)</span>
            </h3>
          </div>

          {/* 模擬切換器：Cluster 選取 + Cycle 控制 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Cluster 切換器 */}
            <div className="flex items-center gap-1.5 rounded-full p-1" style={{ backgroundColor: '#0f1520', border: '1px solid #1e2a38' }}>
              <span className="px-2 text-[11px] font-bold" style={{ color: '#9fb0c3' }}>Cluster</span>
              {sequences.map((_, i) => (
                <button
                  key={i}
                  onClick={() => selectCluster(i)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono transition-colors"
                  style={i === clusterIdx ? { backgroundColor: '#4da3ff', color: '#080c14' } : { color: '#9fb0c3' }}
                >
                  #{i + 1}
                </button>
              ))}
            </div>
            {/* Cycle 控制 */}
            <div className="flex items-center gap-1.5 rounded-full p-1" style={{ backgroundColor: '#0f1520', border: '1px solid #1e2a38' }}>
              <button
                onClick={() => setCycleIdx((c) => (c - 1 + NUM_CYCLES) % NUM_CYCLES)}
                className="w-6 h-6 rounded-full text-[12px] font-bold transition-colors"
                style={{ color: '#ffb84d' }}
                aria-label="上一個 cycle"
              >
                ◀
              </button>
              <span className="px-1.5 text-[11px] font-bold font-mono" style={{ color: '#ffb84d' }}>
                Cycle {cycleIdx + 1} / {NUM_CYCLES}
              </span>
              <button
                onClick={() => setCycleIdx((c) => (c + 1) % NUM_CYCLES)}
                className="w-6 h-6 rounded-full text-[12px] font-bold transition-colors"
                style={{ color: '#ffb84d' }}
                aria-label="下一個 cycle"
              >
                ▶
              </button>
              <button
                onClick={() => setPlaying((v) => !v)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors"
                style={{ color: '#080c14', backgroundColor: playing ? '#4cc38a' : '#ffb84d' }}
              >
                {playing ? '❚❚' : '▶'}
              </button>
            </div>
            <span className="text-[11px] font-mono font-bold" style={{ color: '#9fb0c3' }}>
              目前模擬 Cluster #{clusterIdx + 1}, Cycle {cycleIdx + 1}
            </span>
          </div>
        </div>
      </div>

      {/* ===== 2. 三階段數據轉換卡片（BCL → 解碼 → FASTQ 欄位） ===== */}
      <div className="shrink-0 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] grid-cols-1">
        {/* 卡片 1：原始 BCL 位元 */}
        <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ backgroundColor: '#16202c', borderColor: '#2e4154' }}>
          <div className="text-[12px] font-bold tracking-wide" style={{ color: '#4da3ff' }}>
            1. 解碼原始 BCL 位元 <span className="opacity-70">(Binary 1-Byte)</span>
          </div>
          {/* 十六進位 + 二進位 */}
          <div className="rounded-lg py-2 text-center" style={{ backgroundColor: '#0f1520', border: '1px solid #1e2a38' }}>
            <div className="text-[10px] mb-0.5" style={{ color: '#9fb0c3' }}>從 BCL 檔案讀出 1 Byte</div>
            <div className="font-mono text-[26px] font-extrabold leading-none" style={{ color: '#ffb84d' }}>{hexStr}</div>
          </div>
          {/* 8 bits 視覺化：前 6 bits Q 區 + 後 2 bits Base 區 */}
          <div className="flex items-center justify-center gap-0.5">{bitBoxes}</div>
          {/* 圖例 */}
          <div className="flex flex-col gap-1 text-[10px]" style={{ color: '#9fb0c3' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#4da3ff' }} />
              <span>前 6 bits：Q-Score 區 (bit 7~2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BASE_COLORS[base] }} />
              <span>後 2 bits：Base 區 (bit 1~0)</span>
            </div>
          </div>
        </div>

        {/* 箭頭（桌面 ➔ / 手機 ↓） */}
        <div className="flex items-center justify-center text-[24px] font-bold" style={{ color: '#ffb84d' }}>
          <span className="md:hidden">↓</span>
          <span className="hidden md:inline">➔</span>
        </div>

        {/* 卡片 2：解碼與 Quality 轉換 */}
        <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ backgroundColor: '#16202c', borderColor: '#2e4154' }}>
          <div className="text-[12px] font-bold tracking-wide" style={{ color: '#4da3ff' }}>
            2. 解碼與 Quality 轉換 <span className="opacity-70">(Decoding)</span>
          </div>
          {/* 判讀鹼基 */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: '#0f1520', border: '1px solid #1e2a38' }}>
            <span className="text-[11px]" style={{ color: '#9fb0c3' }}>判讀鹼基</span>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-md text-[20px] font-extrabold font-mono leading-none"
                style={{ backgroundColor: BASE_COLORS[base], color: '#080c14', boxShadow: `0 0 10px ${BASE_COLORS[base]}` }}
              >
                {base}
              </span>
              <span className="text-[10px] font-mono" style={{ color: '#9fb0c3' }}>對應 bit 「{baseBits}」</span>
            </div>
          </div>
          {/* 品質分數 */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: '#0f1520', border: '1px solid #1e2a38' }}>
            <span className="text-[11px]" style={{ color: '#9fb0c3' }}>品質分數 Q-score</span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[16px] font-extrabold font-mono leading-none" style={{ backgroundColor: '#4da3ff', color: '#080c14' }}>
                Q{qscore}
              </span>
              <span className="text-[10px] font-mono" style={{ color: '#9fb0c3' }}>對應 bit 「{qBits}」</span>
            </div>
          </div>
          {/* ASCII 轉換 */}
          <div className="rounded-lg py-2 text-center" style={{ backgroundColor: '#0f1520', border: '1px solid #1e2a38' }}>
            <div className="text-[10px] mb-1" style={{ color: '#9fb0c3' }}>Phred + 33 → ASCII 品質字元</div>
            <div className="font-mono text-[15px] font-bold" style={{ color: '#4cc38a' }}>
              Q{qscore} + 33 = {asciiCode} &nbsp;(ASCII 字元 :{' '}
              <span
                className="inline-flex w-7 h-7 items-center justify-center rounded align-middle"
                style={{ backgroundColor: 'rgba(76,195,138,0.2)', border: '1px solid #4cc38a', color: '#4cc38a' }}
              >
                {asciiChar}
              </span>
              )
            </div>
          </div>
        </div>

        {/* 箭頭（桌面 ➔ / 手機 ↓） */}
        <div className="flex items-center justify-center text-[24px] font-bold" style={{ color: '#ffb84d' }}>
          <span className="md:hidden">↓</span>
          <span className="hidden md:inline">➔</span>
        </div>

        {/* 卡片 3：封裝至 FASTQ 欄位對照 */}
        <div className="rounded-2xl border p-4 flex flex-col gap-2" style={{ backgroundColor: '#16202c', borderColor: '#2e4154' }}>
          <div className="text-[12px] font-bold tracking-wide mb-1" style={{ color: '#4da3ff' }}>
            3. 封裝至 FASTQ <span className="opacity-70">(FASTQ Line Mapping)</span>
          </div>
          {fastqLines.map((line) => (
            <div
              key={line.n}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{ backgroundColor: '#0f1520', border: '1px solid #1e2a38' }}
            >
              <span className="w-6 shrink-0 text-[9px] font-bold text-center font-mono" style={{ color: '#5b6b80' }}>{line.n}</span>
              <span className="text-[10px] font-bold shrink-0" style={{ color: line.color }}>{line.name}</span>
              <span className="text-[9px] font-mono truncate flex-1 text-right" style={{ color: '#9fb0c3' }}>{line.desc}</span>
            </div>
          ))}
          <div className="text-[9px] leading-[1.6] mt-0.5" style={{ color: '#7d8ea3' }}>
            提示：鹼基寫入第 2 行、品質字元寫入第 4 行，且兩者位數永遠對齊。
          </div>
        </div>
      </div>

      {/* 管道與終端機之間的連接指示 */}
      <div className="shrink-0 flex items-center justify-center gap-2 text-[11px] font-mono" style={{ color: '#9fb0c3' }}>
        <span className="text-[16px]" style={{ color: '#4cc38a' }}>⇣</span>
        每解碼 1 Byte → 把鹼基與品質字元寫入 FASTQ 對應位置
      </div>

      {/* ===== 3. FASTQ 即時組合終端機 ===== */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38' }}>
        {/* 終端機標題列 */}
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ backgroundColor: '#0c1220', borderColor: '#1e2a38' }}>
          <div className="flex items-center gap-2">
            <span className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff6b6b' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffb84d' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#4cc38a' }} />
            </span>
            <span className="text-[11px] font-mono font-bold ml-2" style={{ color: '#9fb0c3' }}>
              SIMULATED_RUN_R1.fastq — 即時組合輸出
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold flex items-center gap-1" style={{ color: '#ff6b6b' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-blink" style={{ background: '#ff6b6b' }} /> REC
          </span>
        </div>

        {/* 終端機內容（黑底 + 語法高亮） */}
        <div
          className="flex-1 min-h-0 overflow-auto px-4 py-3 font-mono text-[13px] leading-[2] whitespace-nowrap"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          {/* Line 1：Header（灰字） */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold w-6 shrink-0" style={{ color: '#5b6b80' }}>1</span>
            <span style={{ color: '#9fb0c3' }}>{FASTQ_HEADER}</span>
            <span className="text-[10px] shrink-0" style={{ color: '#5b6b80' }}>Header</span>
          </div>
          {/* Line 2：Sequence（綠字、目前解碼的鹼基高亮） */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold w-6 shrink-0" style={{ color: '#5b6b80' }}>2</span>
            <span className="flex items-center gap-x-2">
              {seqSpans}
              {pendingDots}
              <span className="animate-blink" style={{ color: '#4cc38a' }}>▍</span>
            </span>
            <span className="text-[10px] shrink-0" style={{ color: '#5b6b80' }}>Sequence</span>
          </div>
          {/* Line 3：Option（灰字） */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold w-6 shrink-0" style={{ color: '#5b6b80' }}>3</span>
            <span style={{ color: '#9fb0c3' }}>+</span>
            <span className="text-[10px] shrink-0" style={{ color: '#5b6b80' }}>Option</span>
          </div>
          {/* Line 4：Quality（黃字、目前轉換的 ASCII 字元高亮） */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold w-6 shrink-0" style={{ color: '#5b6b80' }}>4</span>
            <span className="flex items-center gap-x-2">
              {qualSpans}
              {pendingDots}
            </span>
            <span className="text-[10px] shrink-0" style={{ color: '#5b6b80' }}>Quality</span>
          </div>
        </div>
      </div>
    </div>
  );
};
