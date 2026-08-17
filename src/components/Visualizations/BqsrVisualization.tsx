import React, { useState } from 'react';
import {
  ArrowRight,
  Gauge,
  ScanSearch,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

interface BqsrVisualizationProps {
  onComplete?: () => void;
}

type StepKey = 'step1' | 'step2' | 'step3';

// ---------- 模擬數據模型 (15 bp 比對序列) ----------
const referenceSeq: string[] = ['A', 'C', 'G', 'T', 'A', 'C', 'G', 'T', 'G', 'G', 'C', 'T', 'A', 'A', 'C'];
const readSeq: string[] = ['A', 'C', 'G', 'T', 'C', 'C', 'G', 'T', 'G', 'G', 'C', 'C', 'A', 'A', 'C'];

// 0-indexed 不匹配位置；顯示上以 1-indexed (Pos) 呈現
// index 4  -> Pos 5 : Read 'C' vs Ref 'A' => 無 dbSNP，屬定序儀器偏誤
// index 11 -> Pos 12: Read 'C' vs Ref 'T' => dbSNP rs12345 => 真實生物變異
const MISMATCH_INDICES: number[] = [4, 11];

function displayPos(index: number): number {
  return index + 1;
}

interface StepTheme {
  ring: string;
  chip: string;
  title: string;
  tagColor: string;
  iconBg: string;
}

const THEME_ROWS: Record<StepKey, StepTheme> = {
  step1: {
    ring: 'ring-red-500',
    chip: 'bg-red-500/15 text-red-300 border-red-500/40',
    title: 'text-red-300',
    tagColor: 'text-red-300',
    iconBg: 'bg-red-500/15 text-red-300',
  },
  step2: {
    ring: 'ring-emerald-500',
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    title: 'text-emerald-300',
    tagColor: 'text-emerald-300',
    iconBg: 'bg-emerald-500/15 text-emerald-300',
  },
  step3: {
    ring: 'ring-blue-500',
    chip: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    title: 'text-blue-300',
    tagColor: 'text-blue-300',
    iconBg: 'bg-blue-500/15 text-blue-300',
  },
};

const BqsrVisualization: React.FC<BqsrVisualizationProps> = () => {
  const [activeStep, setActiveStep] = useState<StepKey>('step1');
  const [showIntro, setShowIntro] = useState(true);
  const [showTips, setShowTips] = useState(true);

  const selectStep = (step: StepKey) => {
    setActiveStep(step);
  };

  // ---------- Card 1：發現所有 Mismatch ----------
  const renderStep1 = () => (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div className="flex flex-col gap-2 rounded-lg bg-slate-900 border border-slate-700 p-3 font-mono text-xs min-w-[340px]">
          <div className="flex items-center gap-[2px]">
            <span className="w-9 shrink-0 text-right pr-1.5 text-slate-400 select-none">Ref</span>
            {referenceSeq.map((base, i) => (
              <span
                key={i}
                className={
                  MISMATCH_INDICES.includes(i)
                    ? 'inline-block w-5 text-center text-slate-300'
                    : 'inline-block w-5 text-center text-slate-200'
                }
              >
                {base}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-[2px]">
            <span className="w-9 shrink-0 text-right pr-1.5 text-slate-400 select-none">Read</span>
            {readSeq.map((base, i) => (
              <span
                key={i}
                className={
                  MISMATCH_INDICES.includes(i)
                    ? 'inline-block w-5 text-center bg-red-950 text-red-400 font-bold border border-red-800'
                    : 'inline-block w-5 text-center text-slate-200'
                }
              >
                {base}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] rounded-lg px-2.5 py-1.5 border bg-slate-900 border-red-900/60 text-red-300">
        <span className="text-[13px]">⚠️</span>
        <span>偵測到 2 處不匹配 (Pos {displayPos(MISMATCH_INDICES[0])}, Pos {displayPos(MISMATCH_INDICES[1])})</span>
      </div>
    </div>
  );

  // ---------- Card 2：扣除 dbSNP 真實變異 ----------
  const renderStep2 = () => (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg bg-slate-900 border border-slate-700 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-xs text-slate-200">
            Pos {displayPos(MISMATCH_INDICES[0])} <span className="text-red-400 font-bold">[C]</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-950/50 border-red-800/70 text-red-300">無紀錄</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] text-orange-300">留存為機器錯誤 (Mismatch 統計用)</span>
        </div>
      </div>

      <div className="rounded-lg bg-slate-900 border border-slate-700 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-xs text-slate-200">
            Pos {displayPos(MISMATCH_INDICES[1])} <span className="text-red-400 font-bold">[C]</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-emerald-950/50 border-emerald-500/60 text-emerald-300">
            <ShieldCheck className="w-3 h-3" /> Masked (rs12345)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] text-emerald-300">已知變異遮蔽，排除於錯誤計算</span>
        </div>
      </div>

      <div className="text-[10px] px-1 text-slate-400">
        比對 dbSNP 資料庫後，僅 Pos 12 有紀錄並戴護盾保護，Pos 5 無紀錄則留作機器錯誤。
      </div>
    </div>
  );

  // ---------- Card 3：重寫 Q-Score ----------
  const renderStep3 = () => (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg bg-slate-900 border border-slate-700 p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-mono text-xs text-slate-200">Pos {displayPos(MISMATCH_INDICES[0])}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">機器偏誤</span>
        </div>
        <div className="font-mono text-sm flex items-center gap-1.5">
          <span className="text-slate-300">Q30</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-amber-300 font-bold">Q20</span>
          <span className="text-[10px] font-sans rounded px-1.5 py-0.5 bg-amber-950/60 border border-amber-600/60 text-amber-300">已修正下調</span>
        </div>
      </div>

      <div className="rounded-lg bg-slate-900 border border-slate-700 p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-mono text-xs text-slate-200">Pos {displayPos(MISMATCH_INDICES[1])}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/50 text-emerald-300">真實變異</span>
        </div>
        <div className="font-mono text-sm flex items-center gap-1.5">
          <span className="text-emerald-300 font-bold">Q30</span>
          <span className="text-[10px] font-sans rounded px-1.5 py-0.5 bg-emerald-950/50 border border-emerald-500/50 text-emerald-300">維持高品質</span>
        </div>
      </div>

      <div className="rounded-lg bg-slate-900 border border-slate-700 p-2.5">
        <div className="text-[10px] text-slate-400 mb-1">BAM 標籤結果</div>
        <code className="font-mono text-[11px] text-blue-300">QUAL: 20 &nbsp;|&nbsp; OQ:Z:30</code>
      </div>
    </div>
  );

  const microVisual: Record<StepKey, () => React.ReactNode> = {
    step1: renderStep1,
    step2: renderStep2,
    step3: renderStep3,
  };

  const cards: Array<{
    key: StepKey;
    tag: string;
    title: string;
    desc: string;
    Icon: React.ElementType;
  }> = [
    {
      key: 'step1',
      tag: 'Step 01 · 序列比對',
      title: '找出所有 Mismatch',
      desc: '將 Read 與 Reference 比對，盤點出所有與參考序列不一樣的鹼基位置（此 Read 發現 2 處差異）。',
      Icon: ScanSearch,
    },
    {
      key: 'step2',
      tag: 'Step 02 · 生物過濾',
      title: '扣除 dbSNP 真實變異',
      desc: '比對 dbSNP 資料庫，已知變異戴上護盾遮蔽（Mask），未紀錄者則留作機器錯誤統計。',
      Icon: ShieldCheck,
    },
    {
      key: 'step3',
      tag: 'Step 03 · 統計修復',
      title: '歸因偏誤並重寫 Q-Score',
      desc: '將未遮蔽的 Mismatch 歸咎於機器系統性偏誤並校正 Q-Score，同時保留真正的生物學變異。',
      Icon: Wrench,
    },
  ];

  const detailContent: Record<StepKey, { title: string; command: string; body: string[] }> = {
    step1: {
      title: '步驟 01 詳解：比對演算法如何發現 Mismatch',
      command: 'bwa mem hg38.fa sample_R1.fq sample_R2.fq > sample.sam',
      body: [
        '讀取比對結果：讀取 SAM/BAM 檔，取得 Read 與 Reference 的對齊資訊。',
        '標記差異：解析比對區塊，當 Read 鹼基與 Reference 不一致時，即記錄為一個 Mismatch。',
        '注意此階段僅客觀統計所有差異，不做性質歸因；是否為「機器誤差」或「真實變異」，留待下一步配合 dbSNP 釐清。',
      ],
    },
    step2: {
      title: '步驟 02 詳解：GATK 如何使用 --known-sites 進行變異遮蔽',
      command: 'gatk BaseRecalibrator --known-sites dbsnp.vcf --known-sites 1000G_phase1.indels.hg38.vcf',
      body: [
        '導入資料庫：載入 dbSNP 與 1000 Genomes 等已知真實變異資料庫。',
        '位點遮蔽：發現已知變異的位置（如 Pos 12）均會被 Masking，排除於錯誤統計之外，避免真實突變導致品質分數被誤下調。',
        '模型建立：未存於已知資料庫的 Mismatch（如 Pos 5）則歸咎於潛在系統性偏誤，納入經驗模型作為品質校正依據。',
      ],
    },
    step3: {
      title: '步驟 03 詳解：BaseRecalibrator 計數模型與 ApplyBQSR 寫入 BAM',
      command: 'gatk ApplyBQSR --bqsr-recal-file recal.table -I sample.bam -O recal.bam',
      body: [
        '建立模型：BaseRecalibrator 會看讀長位置、前後鹼基與原始分數，把情況類似的鹼基歸為同一組，統計出這組「實際上的出錯率」。',
        '校正品質：ApplyBQSR 拿模型來修正分數。如果機器當初寫 Q30 但實際出錯率很高，就會被下調分數（例如 Pos 5 降到 Q20）。',
        '校正後的資料以 OQ Tag（Original Quality, OQ:Z）寫入 BAM，保留原始品質分數以便追溯；真正生物變異（如 Pos 12）原保留高分品質，不會被錯誤地懲罰。',
      ],
    },
  };

  return (
    <div className="bqsr-visual flex flex-col gap-5">
      {/* 步驟解說框：校正目的 + 輸出檔案 */}
      {showIntro && (
        <div className="intro-dialog shrink-0 rounded-2xl border p-4 animate-fade-up bg-[#232f3e]" style={{ borderColor: '#38bdf8' }}>
          <div className="flex items-start gap-3">
            <div className="dialog-body flex-1">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1.5 text-[15px] font-bold tracking-wide transition-colors"
                  style={{ color: '#38bdf8' }}
                  onClick={() => setShowTips((v) => !v)}
                >
                  <span className="dialog-chevron inline-block transition-transform" style={{ transform: showTips ? 'rotate(90deg)' : 'none' }}>▸</span>
                  🧪 步驟解說 · BQSR 品質校正
                </button>
                <button
                  className="dialog-close flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold transition-colors shrink-0"
                  style={{ color: '#9fb0c3', backgroundColor: '#141d2e', borderColor: '#263247', borderWidth: '1px' }}
                  onClick={() => setShowIntro(false)}
                  aria-label="關閉解說"
                >
                  ✕
                </button>
              </div>
              {showTips && (
                <div className="dialog-tips mt-2.5 pt-2.5 border-t overflow-y-auto pr-1" style={{ borderColor: '#263247', maxHeight: '170px' }}>
                  <ul className="text-[12px] leading-[1.8] flex flex-col gap-2" style={{ color: '#c6d3e3' }}>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded text-[9px] font-black flex items-center justify-center" style={{ backgroundColor: '#38bdf8', color: '#06222b' }}>1</span>
                      <span><strong style={{ color: '#e8eef5' }}>校正目的：</strong>傳入 dbSNP 資料庫，告訴 GATK：『只要在這個資料庫裡出現過的位置，都是人類正常的變異，請不要把它當成測序儀器壞掉產生的錯誤！』</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded text-[9px] font-black flex items-center justify-center" style={{ backgroundColor: '#38bdf8', color: '#06222b' }}>2</span>
                      <span><strong style={{ color: '#e8eef5' }}>輸出檔案：</strong>完成標記與 quality score 重寫，輸出最終 Analysis-ready BAM 檔。</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 頂端標題 */}
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold" style={{ color: '#4da3ff' }}>
          步驟解說．BQSR 品質校正
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#9fb0c3', backgroundColor: '#0f1520' }}>
          GATK Best Practices
        </span>
      </div>

      {/* 三張卡片流水線 */}
      <div className="flex flex-col md:flex-row md:items-stretch gap-4">
        {cards.map((card, idx) => {
          const theme = THEME_ROWS[card.key];
          const isActive = activeStep === card.key;
          const Icon = card.Icon;
          const renderBody = microVisual[card.key];
          return (
            <React.Fragment key={card.key}>
              <div
                onClick={() => selectStep(card.key)}
                className={`flex-1 min-w-0 rounded-2xl border p-4 flex flex-col gap-3 cursor-pointer transition-all duration-300 hover:shadow-md bg-[#232f3e] ${
                  isActive ? `ring-2 ${theme.ring}` : 'border-[#3b4b5f]'
                }`}
                style={{ borderColor: isActive ? undefined : '#3b4b5f' }}
              >
                {/* 頂部標籤 */}
                <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.chip}`}>
                  {card.tag}
                </span>

                {/* 標題 */}
                <div className={`flex items-center gap-2 text-[14px] font-bold ${theme.title}`}>
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg ${theme.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  {card.title}
                </div>

                {/* 說明文案 */}
                <p className="text-[12px] leading-relaxed" style={{ color: '#9fb0c3' }}>
                  {card.desc}
                </p>

                {/* 底端視覺微圖示 */}
                <div className="mt-auto">{renderBody()}</div>
              </div>

              {/* 桌面端卡片間流水箭頭 */}
              {idx < cards.length - 1 && (
                <div className="hidden md:flex items-center justify-center self-center">
                  <ArrowRight className="w-6 h-6 text-slate-500 shrink-0" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 步驟詳細解說區 */}
      <div className="rounded-2xl border p-5 bg-[#232f3e]" style={{ borderColor: '#3b4b5f' }}>
        <div className="flex flex-col gap-1 mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full self-start border bg-blue-500/15 text-blue-300 border-blue-500/40">
            步驟詳細解說區
          </span>
          <h4 className="text-[15px] font-bold text-blue-300">{detailContent[activeStep].title}</h4>
        </div>

        <div className="mb-3 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 font-mono text-[11px] text-blue-300 overflow-x-auto">
          <code>{detailContent[activeStep].command}</code>
        </div>

        <ul className="flex flex-col gap-2">
          {detailContent[activeStep].body.map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: '#9fb0c3' }}>
              <Gauge className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export { BqsrVisualization };