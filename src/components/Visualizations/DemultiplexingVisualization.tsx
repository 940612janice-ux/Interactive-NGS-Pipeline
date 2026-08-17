import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { SAMPLES } from '../../data/workflow';
import { BASE_COLORS } from '../../hooks/useUtils';

interface DemultiplexingVisualizationProps {
  onComplete?: () => void;
}

export const DemultiplexingVisualization: React.FC<DemultiplexingVisualizationProps> = ({ onComplete }) => {
  const [sortedCount, setSortedCount] = useState(0);
  const [indexItems, setIndexItems] = useState<Array<{ id: number; seq: string; sampleId: string }>>([]);
  const [binCounts, setBinCounts] = useState<Record<string, number>>({});
  const [gameComplete, setGameComplete] = useState(false);

  const SAMPLES_DEMUX = SAMPLES.slice(0, 4);

  useEffect(() => {
    const reads = [
      { seq: 'ATCACG', match: 'S001', mm: 0 },
      { seq: 'ATCACC', match: 'S001', mm: 1 },
      { seq: 'CGATGT', match: 'S002', mm: 0 },
      { seq: 'CGATGA', match: 'S002', mm: 1 },
      { seq: 'TTAGGC', match: 'S003', mm: 0 },
      { seq: 'TTAGGC', match: 'S003', mm: 0 },
      { seq: 'TGACCA', match: 'S004', mm: 0 },
      { seq: 'TGACCA', match: 'S004', mm: 0 },
    ];

    const items = reads.map((read, i) => ({
      id: i,
      seq: read.seq,
      sampleId: read.match,
    }));
    setIndexItems(items);
    setBinCounts({ S001: 0, S002: 0, S003: 0, S004: 0 });
    setSortedCount(0);
    setGameComplete(false);
  }, []);

  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    e.dataTransfer.setData('text/plain', itemId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, sampleId: string) => {
    e.preventDefault();
    const itemId = parseInt(e.dataTransfer.getData('text/plain'));
    const item = indexItems.find(i => i.id === itemId);
    if (item && item.sampleId === sampleId) {
      setIndexItems(prev => prev.filter(i => i.id !== itemId));
      setBinCounts(prev => ({ ...prev, [sampleId]: (prev[sampleId] || 0) + 1 }));
      const newCount = sortedCount + 1;
      setSortedCount(newCount);
      if (newCount === 8) {
        setTimeout(() => setGameComplete(true), 500);
      }
    }
  };

  const handleComplete = () => {
    onComplete?.();
  };

  const totalItems = 8;
  const progress = (sortedCount / totalItems) * 100;

  return (
    <div className="demultiplexing-visual flex flex-col gap-4 h-[calc(100vh-13rem)] min-h-[600px]">
      <div className="grid gap-6 flex-1 min-h-0" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Signal Panel - Index Decoding */}
      <div className="signal-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
        <div className="signal-header flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: '#3b4b5f' }}>
          <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Index 條碼解碼</h3>
          <span className="signal-badge text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520', borderColor: '#3b4b5f', borderWidth: '1px' }}>
            Read 1 前 6-8 bp
          </span>
        </div>
        <div className="signal-content flex-1 overflow-hidden flex flex-col gap-3">
          <div className="index-region-viz flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Read Structure */}
            <div className="read-structure flex gap-1 p-2.5 rounded-lg" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
              <div className="read-segment index-seg px-3 py-1.5 rounded font-mono text-[10px] font-semibold text-center whitespace-nowrap flex-0" style={{ flexBasis: '100px', backgroundColor: 'rgba(255, 184, 77, 0.15)', borderColor: 'rgba(255, 184, 77, 0.4)', borderWidth: '1px', color: '#ffb84d' }}>
                Index (6-8bp)
              </div>
              <div className="read-segment insert-seg px-3 py-1.5 rounded font-mono text-[10px] font-semibold text-center whitespace-nowrap flex-1" style={{ backgroundColor: 'rgba(77, 163, 255, 0.1)', borderColor: 'rgba(77, 163, 255, 0.3)', borderWidth: '1px', color: '#4da3ff' }}>
                Insert Sequence (rest of read)
              </div>
            </div>

            {/* Index Decoding Display */}
            <div className="index-decoding flex flex-wrap gap-2 p-2.5 overflow-auto" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px', borderRadius: '10px' }}>
              {SAMPLES_DEMUX.map((sample) => (
                <div key={sample.id} className="index-item flex flex-col items-center gap-1 p-2 rounded-lg" style={{ backgroundColor: '#1b2430', borderColor: '#3b4b5f', borderWidth: '1px' }}>
                  <div className="index-sequence font-mono text-[16px] font-bold">
                    {sample.index.split('').map((b, bi) => (
                      <span key={bi} className="inline-block" style={{ color: BASE_COLORS[b as keyof typeof BASE_COLORS] }}>{b}</span>
                    ))}
                  </div>
                  <div className="index-info text-[11px]" style={{ color: '#9fb0c3' }}>{sample.name} — {sample.id}</div>
                </div>
              ))}
            </div>

            {/* Index Matches */}
            <div className="index-matches flex-1 overflow-auto">
              <div className="text-[11px] font-semibold mb-2" style={{ color: '#4da3ff' }}>解碼出的 Reads（拖動到對應樣品桶）</div>
              <div className="index-source-list flex flex-wrap gap-2">
                {indexItems.map((item) => {
                  const sample = SAMPLES_DEMUX.find(s => s.id === item.sampleId);
                  return (
                    <div
                      key={item.id}
                      className="index-source-item flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab"
                      style={{ backgroundColor: '#1b2430', borderColor: sample?.color, borderWidth: '1px' }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                    >
                      <span className="source-index font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ borderColor: sample?.color, borderWidth: '1px', borderStyle: 'solid' }}>
                        {item.seq.split('').map((b, bi) => (
                          <span key={bi} style={{ color: BASE_COLORS[b as keyof typeof BASE_COLORS] }}>{b}</span>
                        ))}
                      </span>
                      <span className="source-match text-[11px]" style={{ color: sample?.color }}>
                        {sample?.name} {item.seq !== sample?.index ? '(1 mismatch)' : '✓'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Panel - Drag & Drop */}
      <div className="game-panel flex flex-col overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
        <div className="game-header flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>Demultiplexing 拆包裹遊戲</h3>
          <div className="game-status flex items-center gap-3 min-w-[200px]">
            <span id="progress-text" className="text-[12px] font-mono" style={{ color: '#e8eef5' }}>
              已分類：{sortedCount} / {totalItems}
            </span>
            <div className="progress-bar flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#0f1520' }}>
              <div className="progress-fill h-full rounded-full transition-all duration-300" style={{ backgroundColor: '#ffb84d', width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="game-content flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Sample Bins */}
          <div className="bins-section flex-1 overflow-auto">
            <div className="bins-header text-[12px] font-semibold mb-2" style={{ color: '#9fb0c3' }}>Sample A ~ D 桶子</div>
            <div className="sample-bins grid grid-cols-2 gap-3" id="sample-bins">
              {SAMPLES_DEMUX.map((sample) => (
                <div
                  key={sample.id}
                  className="sample-bin flex flex-col rounded-xl p-3 transition-all"
                  style={{
                    backgroundColor: '#1b2430',
                    borderColor: binCounts[sample.id] > 0 ? sample.color : '#3b4b5f',
                    borderWidth: binCounts[sample.id] > 0 ? '2px' : '1px',
                    borderStyle: 'solid',
                    boxShadow: binCounts[sample.id] > 0 ? `0 0 0 2px ${sample.color}40` : 'none',
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, sample.id)}
                >
                  <div className="bin-header flex items-center justify-between mb-2">
                    <div className="bin-label flex items-center gap-2">
                      <span className="bin-color w-3 h-3 rounded" style={{ backgroundColor: sample.color }} />
                      <span className="font-medium text-[12px]">{sample.name}</span>
                      <span className="bin-index-tag font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#9fb0c3' }}>
                        {sample.index}
                      </span>
                    </div>
                    <span className="bin-count text-[11px] font-mono" style={{ color: '#9fb0c3' }}>
                      {binCounts[sample.id] || 0} reads
                    </span>
                  </div>
                  <div className="bin-reads flex flex-wrap gap-1 min-h-[40px]" id={`bin-reads-${sample.id}`}>
                    {Array.from({ length: binCounts[sample.id] || 0 }).map((_, i) => (
                      <div key={i} className="sample-read px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: sample.color }}>
                        {sample.index}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Output Files */}
          <div className="conversion-display">
            <div className="conversion-title text-[12px] font-semibold mb-2" style={{ color: '#9fb0c3' }}>輸出檔案</div>
            <div className="conversion-arrow flex gap-2 flex-wrap" id="output-files">
              {binCounts.S001 > 0 && <div className="output-file-item px-2 py-1 rounded text-[11px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}><div className="file-name font-medium" style={{ color: SAMPLES_DEMUX[0].color }}>Sample A</div><div className="file-ext font-mono" style={{ color: '#9fb0c3' }}>S001_R1.fastq.gz</div></div>}
              {binCounts.S002 > 0 && <div className="output-file-item px-2 py-1 rounded text-[11px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}><div className="file-name font-medium" style={{ color: SAMPLES_DEMUX[1].color }}>Sample B</div><div className="file-ext font-mono" style={{ color: '#9fb0c3' }}>S002_R1.fastq.gz</div></div>}
              {binCounts.S003 > 0 && <div className="output-file-item px-2 py-1 rounded text-[11px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}><div className="file-name font-medium" style={{ color: SAMPLES_DEMUX[2].color }}>Sample C</div><div className="file-ext font-mono" style={{ color: '#9fb0c3' }}>S003_R1.fastq.gz</div></div>}
              {binCounts.S004 > 0 && <div className="output-file-item px-2 py-1 rounded text-[11px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}><div className="file-name font-medium" style={{ color: SAMPLES_DEMUX[3].color }}>Sample D</div><div className="file-ext font-mono" style={{ color: '#9fb0c3' }}>S004_R1.fastq.gz</div></div>}
            </div>
          </div>

          {/* Complete */}
          {gameComplete && (
            <div className="game-complete flex items-center gap-3 p-4 rounded-xl animate-fade-up" style={{ backgroundColor: 'rgba(76, 195, 138, 0.1)', borderColor: '#4cc38a', borderWidth: '1px' }}>
              <div className="complete-icon w-10 h-10 flex items-center justify-center rounded-full text-xl" style={{ backgroundColor: '#4cc38a', color: '#0f1520' }}>✓</div>
              <div className="complete-text flex-1 text-left">
                <h4 className="text-[14px] font-bold mb-1" style={{ color: '#4cc38a' }}>Demultiplexing 完成！</h4>
                <p className="text-[13px]" style={{ color: '#c6d3e3' }}>所有 reads 已依 Index 歸檔至對應樣本 FASTQ</p>
              </div>
              <button
                className="complete-btn px-4 py-2 rounded-lg text-[13px] font-bold"
                style={{ backgroundColor: '#4cc38a', color: '#0f1520' }}
                onClick={handleComplete}
              >
                查看下一關卡 (FastQC)
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* 💡 初學者筆記：為何 index 不完全配對仍可歸類 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl border p-4 shrink-0"
        style={{ backgroundColor: '#151b28', borderColor: 'rgba(255,213,74,0.35)' }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Lightbulb size={16} style={{ color: '#ffd54a' }} />
          <span className="text-[13px] font-bold" style={{ color: '#ffd54a' }}>
            💡 初學者筆記 — Mismatch 顯示意義、成因與解決方式
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: '#4cc38a' }} />
            <p className="text-[12px] leading-relaxed" style={{ color: '#c6d3e3' }}>
              <span style={{ color: '#c6d3e3', fontWeight: 700 }}>Mismatch 顯示意義：</span>
              真實數據的處理不會標記，提醒就算未完全配對，也可以正常分類。
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: '#4cc38a' }} />
            <p className="text-[12px] leading-relaxed" style={{ color: '#c6d3e3' }}>
              <span style={{ color: '#c6d3e3', fontWeight: 700 }}>為何出現：</span>
              酵素複製失誤、螢光訊號擷取誤差，或試劑合成瑕疵導致 index 鹼基讀錯。
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: '#4cc38a' }} />
            <p className="text-[12px] leading-relaxed" style={{ color: '#c6d3e3' }}>
              <span style={{ color: '#c6d3e3', fontWeight: 700 }}>如何解決：</span>
              只要樣本間 Index 鹼基差異足夠，就不會誤判，以避免浪費定序數據且能精準歸類。
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};