import React, { useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Dna,
  FileCode,
  Info,
  Lightbulb,
  Lock,
  Play,
  RotateCw,
  Search,
} from 'lucide-react';

interface Mutect2VisualizationProps {
  onComplete?: () => void;
}

type TabKey = 'gnomad' | 'pon';
type StepIndex = 0 | 1 | 2;

interface VcfField {
  text: string;
  kind: 'chr' | 'pos' | 'id' | 'ref' | 'alt' | 'qual' | 'filter' | 'info';
}

interface ExampleConfig {
  key: TabKey;
  tabLabel: string;
  chipEmoji: string;
  gene: string;
  locus: string;
  chr: string;
  position: string;
  scenario: string;
  bam: {
    context: string;
    refBase: string;
    altBase: string;
    tail: string;
    tumorReads: number;
    tumorAltPct: number;
    normalReads: number;
  };
  db: {
    name: string;
    file: string;
    color: string;
    command: string;
    description: string;
    query: { label: string; value: string; hint?: string }[];
  };
  logicTitle: string;
  logic: string[];
  vcfMeta: string;
  vcfBody: VcfField[];
  filterTag: string;
  filterColor: string;
  infoNote: string;
  notes: string[];
}

const STEPS: { title: string; sub: string }[] = [
  { title: 'Read 比對', sub: 'BAM Level' },
  { title: '資料庫比對', sub: 'VCF Lookup' },
  { title: '寫入 Raw VCF', sub: 'Variant Output' },
];

const EXAMPLES: Record<TabKey, ExampleConfig> = {
  gnomad: {
    key: 'gnomad',
    tabLabel: '案例一：gnomAD 人口基因頻率對比 (如:EGFR 基因)',
    chipEmoji: '🧬',
    gene: 'EGFR',
    locus: 'chr7:55,174,014',
    chr: 'chr7',
    position: '55174014',
    scenario:
      'Normal BAM 因抽樣覆蓋深度較低（Sampling Noise）未測出變異，看似腫瘤特有突變。但比對 gnomAD 後證明該變異在人群中頻率極高，實為天生遺傳變異（Germline）。',
    bam: {
      context: 'AGCT',
      refBase: 'C',
      altBase: 'T',
      tail: 'GGC',
      tumorReads: 20,
      tumorAltPct: 0.15,
      normalReads: 10,
    },
    db: {
      name: 'gnomAD',
      file: 'gnomAD.vcf',
      color: '#4da3ff',
      command: '$ bcftools query -r chr7:55174014 gnomAD.vcf',
      description: '族群對偶基因頻率資料庫',
      query: [
        { label: 'ID', value: 'rs2293850', hint: 'dbSNP rs ID' },
        { label: 'REF', value: 'C' },
        { label: 'ALT', value: 'T' },
        { label: 'AF', value: '0.4215', hint: '42.15% 人群變異佔比' },
      ],
    },
    logicTitle: 'Mutect2 判定：深度不足 vs 族群高頻 → Germline！',
    logic: [
      '① Normal BAM 在此位點 ALT = 0%，乍看是「腫瘤特有突變」。',
      '② 但 gnomAD 記錄 AF = 0.4215（高達 42.15% 人類種群帶有此變異）。',
      '③ Normal 未測到僅為深度不足，判定為天生遺傳變異 (Germline)！',
    ],
    vcfMeta: '##FILTER=<ID=germline,Description="Allele is a germline variant per high population AF in gnomAD">',
    vcfBody: [
      { text: 'chr7', kind: 'chr' },
      { text: '55174014', kind: 'pos' },
      { text: 'rs2293850', kind: 'id' },
      { text: 'C', kind: 'ref' },
      { text: 'T', kind: 'alt' },
      { text: '.', kind: 'qual' },
      { text: 'germline', kind: 'filter' },
      { text: 'pop_AF=0.4215', kind: 'info' },
    ],
    filterTag: 'germline',
    filterColor: '#4cc38a',
    infoNote:
      'pop_AF=0.4215：此變異在 gnomAD 中的族群等位基因頻率為 42.15%。超過 40% 幾乎可斷言是常見的人類多型性，絕非罕見的腫瘤驅動突變。',
    notes: [
      '為什麼要查 gnomAD？體細胞突變和遺傳變異的界線，往往要「看人群」才能判斷。若某變異在大量抽樣中佔有一定比例，那它更可能是天生就有的 Germline 變異，而不是腫瘤新產生的突變。',
      '標籤 `germline`：Mutect2 判斷此位點是「遺傳的」，於是寫入 FILTER 欄，後續的 FilterMutectCalls 步驟會評估是否把這個紀錄丟掉。',
      'Sampling Noise（抽樣雜訊）是指覆蓋深度太低導致讀數不足，並非真的「沒有變異」——所以 Normal 測不到 ≠ 不存在，必須靠人群頻率佐證。',
    ],
  },
  pon: {
    key: 'pon',
    tabLabel: '案例二：PoN 平台技術雜訊碰撞 (TP53 基因)',
    chipEmoji: '🔬',
    gene: 'TP53',
    locus: 'chr17:7,577,538',
    chr: 'chr17',
    position: '7577538',
    scenario:
      'Tumor BAM 在 GC 豐富區測出 2% 的微弱變異。比對 PoN 數據庫（由 50 位健康人建立）發現有 18 位健康人也出現一模一樣的微弱訊號，證實為系統性 PCR/定序儀器雜訊（Artifact）。',
    bam: {
      context: 'GCCC',
      refBase: 'G',
      altBase: 'A',
      tail: 'GGG',
      tumorReads: 50,
      tumorAltPct: 0.02,
      normalReads: 10,
    },
    db: {
      name: 'PoN',
      file: 'PoN.vcf',
      color: '#b57edc',
      command: '$ bcftools query -r chr17:7577538 PoN.vcf',
      description: 'Panel of Normals（由 50 位健康人建立的技術雜訊資料庫）',
      query: [
        { label: 'POS', value: '7577538' },
        { label: 'REF', value: 'G' },
        { label: 'ALT', value: 'A' },
        { label: 'PoN_COUNT', value: '18 / 50', hint: '18 位健康人出現過相同訊號' },
      ],
    },
    logicTitle: 'Mutect2 判定：健康人不可能同患癌症 → Artifact！',
    logic: [
      '① Tumor BAM 在此 GC-rich 區僅測到 2% 的微弱 ALT 訊號。',
      '② PoN 統計：50 位健康人中，有 18 位都出現完全相同（同 REF、同 ALT）的訊號。',
      '③ 18 個健康人不可能同時發生相同癌症突變，判定為機器與實驗背景雜訊 (Artifact)！',
    ],
    vcfMeta: '##FILTER=<ID=pon,Description="Allele detected in the panel of normals">',
    vcfBody: [
      { text: 'chr17', kind: 'chr' },
      { text: '7577538', kind: 'pos' },
      { text: '.', kind: 'id' },
      { text: 'G', kind: 'ref' },
      { text: 'A', kind: 'alt' },
      { text: '.', kind: 'qual' },
      { text: 'pon', kind: 'filter' },
      { text: 'PoN_COUNT=18', kind: 'info' },
    ],
    filterTag: 'pon',
    filterColor: '#b57edc',
    infoNote:
      'PoN_COUNT=18 意思：50 位健康人中有 18 位（36%）在相同座標都出現過完全相同的微弱訊號。比例高到不可能是巧合，因此果斷標記為 `pon` 技術雜訊。',
    notes: [
      '為什麼 PoN 抓得到平台雜訊？每一種定序儀與試劑批次都會有「固定會出現的錯誤」——例如 PCR 在 GC-rich 區掉鹼基、光學訊號串擾等。PoN 用 50 位健康人把這些「機器/試劑特有」訊號統計下來；當你的 Tumor 出現完全一樣的訊號，就代表這是系統性 Artifact，而非生物學上的真實突變。',
      '標籤 `pon` 的意思：此位點在 Panel of Normals 中被太多健康人誤報，Mutect2 判定它是技術雜訊，不是真實 Somatic 突變。',
      'GC 豐富（GC-rich）區特別容易在 PCR 擴增時出錯，所以「微弱 ALT 頻率」在低覆蓋或高 GC 區極可能是假訊號，需要 Cross-check PoN。',
    ],
  },
};

function makeReads(prefix: string, total: number, altCount: number) {
  return Array.from({ length: total }, (_, i) => ({
    id: `${prefix}${String(i + 1).padStart(2, '0')}`,
    isAlt: i < altCount,
  }));
}

function RenderField({ field, filterColor }: { field: VcfField; filterColor: string }) {
  const size = 'inline-flex items-center';
  if (field.kind === 'filter') {
    return (
      <motion.span
        key={field.text}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16 }}
        className={`${size} px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-wide`}
        style={{ color: '#0d1117', backgroundColor: filterColor, boxShadow: `0 0 14px ${filterColor}aa` }}
      >
        {field.text}
      </motion.span>
    );
  }
  const colors: Record<VcfField['kind'], string> = {
    chr: '#4da3ff',
    pos: '#9fb0c3',
    id: '#ffb84d',
    ref: '#4cc38a',
    alt: '#ff6b6b',
    qual: '#8892a0',
    filter: '',
    info: '#e8eef5',
  };
  const weight = field.kind === 'ref' || field.kind === 'alt' ? 'font-bold' : '';
  return (
    <span className={`${size} ${weight} font-mono`} style={{ color: colors[field.kind] }}>
      {field.text}
    </span>
  );
}

export const Mutect2Visualization: React.FC<Mutect2VisualizationProps> = ({ onComplete }) => {
  const [tab, setTab] = React.useState<TabKey>('gnomad');
  const [activeStep, setActiveStep] = React.useState<StepIndex>(0);
  const [playing, setPlaying] = React.useState(false);
  const [demoDone, setDemoDone] = React.useState(false);

  const example = EXAMPLES[tab];
  const bam = example.bam;
  const variantIndex = bam.context.length;

  const tumorAltCount = useMemo(
    () => Math.max(1, Math.round(bam.tumorReads * bam.tumorAltPct)),
    [bam.tumorReads, bam.tumorAltPct],
  );
  const tumorReads = useMemo(() => makeReads('T', bam.tumorReads, tumorAltCount), [bam.tumorReads, tumorAltCount]);
  const normalReads = useMemo(() => makeReads('N', bam.normalReads, 0), [bam.normalReads]);

  const refPct = ((1 - bam.tumorAltPct) * 100).toFixed(0);
  const altPct = (bam.tumorAltPct * 100).toFixed(0);
  const MAX_SHOWN = 10;

  const handleTabChange = (k: TabKey) => {
    setTab(k);
    setActiveStep(0);
    setPlaying(false);
    setDemoDone(false);
  };

  const handleStepChange = (i: number) => {
    setActiveStep(i as StepIndex);
    setPlaying(false);
  };

  const startPlay = useCallback(() => {
    setPlaying(true);
    setDemoDone(false);
    setActiveStep(0);
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (activeStep >= 2) {
      const t = setTimeout(() => {
        setPlaying(false);
        setDemoDone(true);
        onComplete?.();
      }, 1800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActiveStep((s) => (s + 1) as StepIndex), 1700);
    return () => clearTimeout(t);
  }, [playing, activeStep, onComplete]);

  const renderPileup = (reads: { id: string; isAlt: boolean }[], track: 'tumor' | 'normal') => {
    const shown = reads.slice(0, MAX_SHOWN);
    const hidden = reads.length - shown.length;
    const seqByRead = (r: { isAlt: boolean }) => `${bam.context}${r.isAlt ? bam.altBase : bam.refBase}${bam.tail}`;

    const tileStyle = (seq: string, idx: number, isAlt: boolean): React.CSSProperties => {
      const base = seq[idx];
      if (track === 'tumor') {
        if (idx === variantIndex && isAlt) {
          return {
            backgroundColor: 'rgba(255,184,77,0.18)',
            color: '#ffb84d',
            border: '1px solid rgba(255,184,77,0.75)',
            boxShadow: '0 0 10px rgba(255,184,77,0.6)',
          };
        }
        if (idx === variantIndex) {
          return { backgroundColor: 'rgba(107,123,140,0.12)', color: '#7d8ba0', border: '1px solid #3b4b5f' };
        }
        return { backgroundColor: base === 'A' ? 'rgba(76,195,138,0.12)' : 'rgba(255,255,255,0.05)', color: '#b3c0d0', border: '1px solid #242f42' };
      }
      if (idx === variantIndex) {
        return {
          backgroundColor: 'rgba(77,163,255,0.2)',
          color: '#4da3ff',
          border: '1px solid rgba(77,163,255,0.65)',
          boxShadow: '0 0 10px rgba(77,163,255,0.45)',
        };
      }
      return { backgroundColor: 'rgba(255,255,255,0.05)', color: '#aeb9cc', border: '1px solid #242f42' };
    };

    return (
      <div className="flex flex-col gap-[3px]">
        <div className="flex items-center gap-0.5 pl-[3.6rem]">
          {Array.from({ length: variantIndex }).map((_, i) => (
            <span key={`empty-${i}`} className="w-6 text-center text-[9px] leading-none text-[#4b5a6d]">
              ·
            </span>
          ))}
          <span
            className="w-6 text-center text-[9px] leading-none"
            style={{ color: track === 'tumor' ? '#ffb84d' : '#4da3ff' }}
          >
            ▼
          </span>
          {Array.from({ length: bam.tail.length }).map((_, i) => (
            <span key={`tail-${i}`} className="w-6 text-center text-[9px] leading-none text-[#4b5a6d]">
              ·
            </span>
          ))}
        </div>
        {shown.map((r) => {
          const seq = seqByRead(r);
          return (
            <div key={r.id} className="flex items-center gap-0.5">
              <span
                className="w-14 shrink-0 text-[9px] font-mono leading-none"
                style={{ color: track === 'tumor' ? '#b38d4d' : '#4a6a8f' }}
              >
                {r.id}
              </span>
              {seq.split('').map((base, idx) => (
                <span
                  key={idx}
                  className="w-6 h-[22px] flex items-center justify-center rounded text-[10px] font-mono"
                  style={tileStyle(seq, idx, r.isAlt)}
                >
                  {base}
                </span>
              ))}
            </div>
          );
        })}
        {hidden > 0 && (
          <div className="flex items-center gap-1 pl-14 text-[9px] font-mono" style={{ color: '#5c6b7a' }}>
            <span>…</span>
            <span>+{hidden} more reads ({reads.filter((r) => r.isAlt).length} ALT / {reads.length - reads.filter((r) => r.isAlt).length} REF)</span>
          </div>
        )}
      </div>
    );
  };

  const renderAlleleBar = (track: 'tumor' | 'normal') => {
    if (track === 'tumor') {
      return (
        <div className="mt-3">
          <div className="flex h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#0f1520', border: '1px solid #1e2a38' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${refPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ backgroundColor: '#3f4b5e' }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${altPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
              style={{ backgroundColor: '#ffb84d', boxShadow: '0 0 12px rgba(255,184,77,0.8)' }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
            <span style={{ color: '#9fb0c3' }}>
              REF {bam.refBase} · {refPct}%
            </span>
            <span style={{ color: '#ffb84d', fontWeight: 700 }}>
              ALT {bam.altBase} · {altPct}%
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-3">
        <div className="flex h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#0f1520', border: '1px solid #1e2a38' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ backgroundColor: '#35698f' }}
          />
        </div>
        <div className="mt-1 text-[10px] font-mono" style={{ color: '#9fb0c3' }}>
          REF {bam.refBase} · 100%&nbsp;&nbsp;<span style={{ color: '#4da3ff' }}>(0% ALT reads)</span>
        </div>
      </div>
    );
  };

  const panelState = (step: StepIndex): 'upcoming' | 'active' | 'done' => {
    if (step === activeStep) return 'active';
    if (step < activeStep) return 'done';
    return 'upcoming';
  };

  const renderPanel = (
    stepIdx: StepIndex,
    icon: React.ReactNode,
    accent: string,
    title: string,
    children: React.ReactNode,
  ) => {
    const state = panelState(stepIdx);
    const locked = state === 'upcoming';
    return (
      <div
        onClick={() => handleStepChange(stepIdx)}
        className="rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-300 cursor-pointer"
        style={{
          backgroundColor: '#121826',
          borderColor: state === 'active' ? accent : '#262d3d',
          boxShadow: state === 'active' ? `0 0 26px ${accent}26` : 'none',
          opacity: locked ? 0.55 : 1,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: accent + '1f', color: accent, border: `1px solid ${accent}44` }}
          >
            {icon}
          </span>
          <div className="flex-1">
            <div className="text-[13px] font-bold" style={{ color: '#e8eef5' }}>
              {title}
            </div>
            <div className="text-[10px]" style={{ color: '#6b7b8c' }}>
              Step {stepIdx + 1}
            </div>
          </div>
          {locked && <Lock size={15} style={{ color: '#5c6b7a' }} />}
          {state === 'done' && <CheckCircle2 size={16} style={{ color: '#4cc38a' }} />}
        </div>
        {locked ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-dashed" style={{ borderColor: '#262d3d' }}>
            <span className="text-[11px]" style={{ color: '#6b7b8c' }}>
              此步驟尚未執行 — 點擊本卡片、切換步驟條或按下「▶ 播放演示」
            </span>
          </div>
        ) : (
          children
        )}
      </div>
    );
  };

  return (
    <div className="mutect2-visual w-full rounded-2xl border p-6 flex flex-col gap-5" style={{ backgroundColor: '#0d1117', borderColor: '#262d3d' }}>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <motion.div
            initial={{ rotate: -8, scale: 0.7, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#4cc38a22', border: '1px solid #4cc38a66' }}
          >
            <Dna size={26} style={{ color: '#4cc38a' }} />
          </motion.div>
          <div className="flex-1 min-w-[220px]">
            <h2 className="text-[17px] font-bold" style={{ color: '#e8eef5' }}>
              GATK Mutect2 原始呼叫 <span className="text-[13px] font-medium" style={{ color: '#6b7b8c' }}>(Initial Somatic Variant Calling) — 檔案層級碰撞教學</span>
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#9fb0c3' }}>
              雙樣本 <span style={{ color: '#ff6b6b' }}>Tumor</span> vs. <span style={{ color: '#4da3ff' }}>Matched Normal</span> 比對 + 背景數據庫 (<span style={{ color: '#4da3ff' }}>gnomAD</span> &amp; <span style={{ color: '#b57edc' }}>PoN</span>) 動態標記機制。
            </p>
          </div>
          <motion.span
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ backgroundColor: 'rgba(255,184,77,0.12)', color: '#ffb84d', border: '1px solid rgba(255,184,77,0.45)', boxShadow: '0 0 14px rgba(255,184,77,0.25)' }}
          >
            階段：Phase 1 - Raw Variant Calling (未過濾變異呼叫)
          </motion.span>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {(Object.keys(EXAMPLES) as TabKey[]).map((k) => {
            const ex = EXAMPLES[k];
            const isActive = tab === k;
            return (
              <button
                key={k}
                onClick={() => handleTabChange(k)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center gap-2"
                style={{
                  backgroundColor: isActive ? '#1c2333' : '#141a26',
                  border: `1px solid ${isActive ? ex.db.color : '#30363d'}`,
                  color: isActive ? '#ffffff' : '#9fb0c3',
                  boxShadow: isActive ? `0 0 16px ${ex.db.color}33` : 'none',
                }}
              >
                <span>{ex.chipEmoji}</span>
                <span>{ex.tabLabel}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: ex.db.color }} />}
              </button>
            );
          })}
        </div>
      </header>

      <div
        className="rounded-xl border p-4 text-[12px] leading-relaxed"
        style={{ backgroundColor: '#121826', borderColor: '#262d3d', color: '#c6d3e3' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider mr-2" style={{ color: example.db.color }}>
          scenario
        </span>
        目標基因座標：<span className="font-mono font-bold" style={{ color: '#ffb84d' }}>{example.locus}</span>（{example.gene}）- {example.scenario}
      </div>

      <div className="step-controller flex flex-wrap items-center gap-2">
        <button
          onClick={playing ? () => setPlaying(false) : startPlay}
          disabled={playing}
          className="px-4 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all"
          style={{
            backgroundColor: playing ? '#2a1a0f' : '#ffb84d',
            color: playing ? '#ffb84d' : '#0d1117',
            border: `1px solid ${playing ? 'rgba(255,184,77,0.6)' : '#ffb84d'}`,
            boxShadow: playing ? 'none' : '0 0 16px rgba(255,184,77,0.4)',
            cursor: playing ? 'not-allowed' : 'pointer',
          }}
        >
          {playing ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full animate-ping" style={{ backgroundColor: '#ffb84d' }} />
              播放中…
            </>
          ) : demoDone ? (
            <>
              <RotateCw size={15} /> 重新播放演示
            </>
          ) : (
            <>
              <Play size={15} /> 播放演示
            </>
          )}
        </button>
        <span className="text-[10px]" style={{ color: '#6b7b8c' }}>步驟切換條：</span>
        {STEPS.map((s, i) => {
          const step = i as StepIndex;
          const state = panelState(step);
          const active = state === 'active';
          const accent = i === 0 ? '#ffb84d' : i === 1 ? example.db.color : example.filterColor;
          return (
            <button
              key={s.title}
              onClick={() => handleStepChange(step)}
              className="px-3 py-2 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all"
              style={{
                backgroundColor: active ? accent + '22' : '#141a26',
                border: `1px solid ${active ? accent : '#30363d'}`,
                color: active ? accent : '#9fb0c3',
              }}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: active ? accent : '#1c2333', color: active ? '#0d1117' : '#9fb0c3' }}
              >
                {i + 1}
              </span>
              {s.title}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="grid gap-4 lg:grid-cols-3 md:grid-cols-1"
        >
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {renderPanel(
              0,
              <Dna size={16} />,
              '#ffb84d',
              'Read 比對 (BAM Level) — IGV 雙軌對齊',
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold" style={{ color: '#ff6b6b' }}>
                      Tumor BAM
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: '#9fb0c3' }}>
                      {example.locus}
                    </span>
                  </div>
                  <div className="rounded-lg p-2" style={{ backgroundColor: '#080c14', border: '1px solid #1e2a38' }}>
                    {renderPileup(tumorReads, 'tumor')}
                  </div>
                  {renderAlleleBar('tumor')}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold" style={{ color: '#4da3ff' }}>
                      Normal BAM (Matched)
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: '#9fb0c3' }}>
                      {example.locus}
                    </span>
                  </div>
                  <div className="rounded-lg p-2" style={{ backgroundColor: '#080c14', border: '1px solid #1e2a38' }}>
                    {renderPileup(normalReads, 'normal')}
                  </div>
                  {renderAlleleBar('normal')}
                </div>
              </div>,
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {renderPanel(
              1,
              <Search size={16} />,
              example.db.color,
              '資料庫碰撞 (VCF Lookup)',
              <div className="flex flex-col gap-3 flex-1">
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#0b0f17', border: '1px solid #1e2a38' }}>
                  <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ backgroundColor: '#151b28', borderBottom: '1px solid #1e2a38' }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff6b6b' }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ffb84d' }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#4cc38a' }} />
                    <span className="ml-2 text-[10px] font-mono" style={{ color: '#6b7b8c' }}>
                      {example.db.file} — {example.db.description}
                    </span>
                  </div>
                  <div className="px-3 py-2 font-mono text-[11px]" style={{ color: '#c6d3e3' }}>
                    <span style={{ color: '#4cc38a' }}>➜</span>{' '}
                    <span style={{ color: '#9fb0c3' }}>{example.db.command}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {activeStep >= 1 && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, x: 40, rotateY: 18 }}
                      animate={{ opacity: 1, x: 0, rotateY: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 140, damping: 16 }}
                      className="rounded-xl border p-3"
                      style={{ backgroundColor: '#0f1520', borderColor: example.db.color + '66' }}
                    >
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: '#1e2a38' }}>
                        <Database size={14} style={{ color: example.db.color }} />
                        <span className="text-[11px] font-bold" style={{ color: example.db.color }}>
                          {example.db.name} 命中紀錄 — {example.locus}
                        </span>
                        <span className="ml-auto text-[10px] font-bold flex items-center gap-1" style={{ color: '#4cc38a' }}>
                          <CheckCircle2 size={12} /> MATCH
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {example.db.query.map((q) => (
                          <div key={q.label} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono" style={{ color: '#6b7b8c' }}>
                              {q.label}
                            </span>
                            <span className="text-[12px] font-mono font-bold" style={{ color: '#ffb84d' }}>
                              {q.value}
                            </span>
                            {q.hint && (
                              <span className="text-[10px]" style={{ color: '#9fb0c3' }}>
                                ({q.hint})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>,
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {renderPanel(
              2,
              <FileCode size={16} />,
              example.filterColor,
              'Mutect2 判定 & Raw VCF 寫入',
              <div className="flex flex-col gap-3 flex-1">
                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: '#151b28', borderColor: example.filterColor + '44' }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#ffb84d' }} />
                    <div>
                      <div className="text-[12px] font-bold mb-1.5" style={{ color: '#ffb84d' }}>
                        {example.logicTitle}
                      </div>
                      {example.logic.map((line, idx) => (
                        <div
                          key={idx}
                          className={`text-[11px] leading-relaxed ${idx === example.logic.length - 1 ? 'font-bold' : ''}`}
                          style={{ color: idx === example.logic.length - 1 ? example.filterColor : '#c6d3e3' }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-lg px-3 py-2 font-mono overflow-x-auto flex-1"
                  style={{ backgroundColor: '#080c14', border: '1px solid #1e2a38' }}
                >
                  <div className="text-[11px] font-bold mb-1.5" style={{ color: '#6b7b8c' }}>
                    $ mutect2 … --germline-resource gnomAD.vcf --panel-of-normals PoN.vcf -O somatic_raw.vcf
                  </div>
                  <div className="text-[10px]" style={{ color: '#5c6b7a' }}>
                    ##fileformat=VCFv4.2
                  </div>
                  <div className="text-[10px] mb-1" style={{ color: '#5c6b7a' }}>
                    {example.vcfMeta}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-2 mt-1" style={{ borderColor: '#1e2a38' }}>
                    {example.vcfBody.map((f) => (
                      <RenderField key={`${f.kind}-${f.text}`} field={f} filterColor={example.filterColor} />
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Info size={13} className="mt-0.5 shrink-0" style={{ color: '#4da3ff' }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: '#9fb0c3' }}>
                    {example.infoNote}
                  </p>
                </div>
              </div>,
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl border p-4"
        style={{ backgroundColor: '#151b28', borderColor: 'rgba(255,213,74,0.35)' }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Lightbulb size={16} style={{ color: '#ffd54a' }} />
          <span className="text-[13px] font-bold" style={{ color: '#ffd54a' }}>
            💡 初學者筆記 — 為什麼會這樣標記 & 這個 VCF Tag 代表什麼
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {example.notes.map((note, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: example.filterColor }} />
              <p className="text-[12px] leading-relaxed" style={{ color: '#c6d3e3' }}>
                {note}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};