import React, { useMemo, useState } from 'react';

interface AnnotationVisualizationProps {
  onComplete?: () => void;
}

type Impact = 'HIGH' | 'MODERATE' | 'LOW';
type ClinVar = 'Pathogenic' | 'Likely Pathogenic' | 'VUS' | 'Benign';

interface Variant {
  id: string;
  gene: string;
  hgvs_c: string;
  hgvs_p: string;
  chrom: string;
  pos: string;
  ref: string;
  alt: string;
  vaf: number;
  dp: number;
  ad_alt: number;
  gnomad_af: number;
  impact: Impact;
  clinvar: ClinVar;
  artifact_bias: boolean;
  tlod: number;
  contamination: number;
  cosmic: string;
}

const VARIANTS: Variant[] = [
  { id: 'VAR001', gene: 'BRAF', hgvs_c: 'c.1799T>A', hgvs_p: 'p.Val600Glu', chrom: 'chr7', pos: '140753336', ref: 'C', alt: 'A', vaf: 0.38, dp: 214, ad_alt: 81, gnomad_af: 0.0000, impact: 'HIGH', clinvar: 'Pathogenic', artifact_bias: false, tlod: 24.6, contamination: 0.012, cosmic: 'COSM476' },
  { id: 'VAR002', gene: 'KRAS', hgvs_c: 'c.35G>T', hgvs_p: 'p.Gly12Val', chrom: 'chr12', pos: '25245350', ref: 'C', alt: 'A', vaf: 0.31, dp: 186, ad_alt: 58, gnomad_af: 0.0000, impact: 'HIGH', clinvar: 'Pathogenic', artifact_bias: false, tlod: 19.8, contamination: 0.008, cosmic: 'COSM521' },
  { id: 'VAR003', gene: 'TP53', hgvs_c: 'c.659A>G', hgvs_p: 'p.Tyr220Cys', chrom: 'chr17', pos: '7673802', ref: 'T', alt: 'C', vaf: 0.22, dp: 141, ad_alt: 31, gnomad_af: 0.0000, impact: 'HIGH', clinvar: 'Pathogenic', artifact_bias: false, tlod: 16.2, contamination: 0.015, cosmic: 'COSM10662' },
  { id: 'VAR004', gene: 'EGFR', hgvs_c: 'c.2573T>G', hgvs_p: 'p.Leu858Arg', chrom: 'chr7', pos: '55242415', ref: 'A', alt: 'C', vaf: 0.16, dp: 322, ad_alt: 52, gnomad_af: 0.0000, impact: 'MODERATE', clinvar: 'Pathogenic', artifact_bias: false, tlod: 14.7, contamination: 0.009, cosmic: 'COSM6224' },
  { id: 'VAR005', gene: 'MUC16', hgvs_c: 'c.3106C>T', hgvs_p: 'p.Leu1036Phe', chrom: 'chr19', pos: '8965794', ref: 'G', alt: 'A', vaf: 0.08, dp: 97, ad_alt: 8, gnomad_af: 0.0002, impact: 'MODERATE', clinvar: 'VUS', artifact_bias: false, tlod: 8.1, contamination: 0.011, cosmic: '—' },
  { id: 'VAR006', gene: 'BRCA2', hgvs_c: 'c.5946delT', hgvs_p: 'p.Ser1982fs', chrom: 'chr13', pos: '32340310', ref: 'A', alt: 'del', vaf: 0.13, dp: 93, ad_alt: 12, gnomad_af: 0.0007, impact: 'HIGH', clinvar: 'Likely Pathogenic', artifact_bias: false, tlod: 9.8, contamination: 0.013, cosmic: 'COSM28669' },
  { id: 'VAR007', gene: 'PIK3CA', hgvs_c: 'c.3140A>G', hgvs_p: 'p.His1047Arg', chrom: 'chr3', pos: '178936091', ref: 'T', alt: 'C', vaf: 0.05, dp: 43, ad_alt: 2, gnomad_af: 0.0000, impact: 'MODERATE', clinvar: 'Pathogenic', artifact_bias: false, tlod: 3.9, contamination: 0.010, cosmic: 'COSM775' },
  { id: 'VAR008', gene: 'EGFR', hgvs_c: 'c.2369C>T', hgvs_p: 'p.Thr790Met', chrom: 'chr7', pos: '55249071', ref: 'G', alt: 'A', vaf: 0.04, dp: 37, ad_alt: 1, gnomad_af: 0.0000, impact: 'MODERATE', clinvar: 'Pathogenic', artifact_bias: true, tlod: 4.6, contamination: 0.009, cosmic: 'COSM6240' },
  { id: 'VAR009', gene: 'KRAS', hgvs_c: 'c.34G>C', hgvs_p: 'p.Gly12Arg', chrom: 'chr12', pos: '25245351', ref: 'C', alt: 'G', vaf: 0.03, dp: 28, ad_alt: 1, gnomad_af: 0.0000, impact: 'HIGH', clinvar: 'VUS', artifact_bias: true, tlod: 3.1, contamination: 0.031, cosmic: 'COSM519' },
  { id: 'VAR010', gene: 'TP53', hgvs_c: 'c.844C>T', hgvs_p: 'p.Arg282Trp', chrom: 'chr17', pos: '7674215', ref: 'G', alt: 'A', vaf: 0.48, dp: 305, ad_alt: 146, gnomad_af: 0.0042, impact: 'MODERATE', clinvar: 'Pathogenic', artifact_bias: false, tlod: 7.8, contamination: 0.017, cosmic: 'COSM10704' },
  { id: 'VAR011', gene: 'MUC16', hgvs_c: 'c.1234G>A', hgvs_p: 'p.Glu412Lys', chrom: 'chr19', pos: '8970502', ref: 'C', alt: 'T', vaf: 0.26, dp: 152, ad_alt: 40, gnomad_af: 0.0028, impact: 'MODERATE', clinvar: 'VUS', artifact_bias: false, tlod: 11.4, contamination: 0.012, cosmic: '—' },
  { id: 'VAR012', gene: 'BRAF', hgvs_c: 'c.1780G>A', hgvs_p: 'p.Asp594Asn', chrom: 'chr7', pos: '140453154', ref: 'C', alt: 'T', vaf: 0.18, dp: 68, ad_alt: 12, gnomad_af: 0.018, impact: 'MODERATE', clinvar: 'Benign', artifact_bias: false, tlod: 7.3, contamination: 0.014, cosmic: '—' },
  { id: 'VAR013', gene: 'ALK', hgvs_c: 'c.3600C>T', hgvs_p: 'p.Ser1200=', chrom: 'chr2', pos: '29417086', ref: 'G', alt: 'A', vaf: 0.06, dp: 76, ad_alt: 5, gnomad_af: 0.0000, impact: 'LOW', clinvar: 'VUS', artifact_bias: false, tlod: 7.6, contamination: 0.008, cosmic: '—' },
  { id: 'VAR014', gene: 'ROS1', hgvs_c: 'c.415G>A', hgvs_p: 'p.Ala139Thr', chrom: 'chr6', pos: '117602070', ref: 'C', alt: 'T', vaf: 0.02, dp: 21, ad_alt: 1, gnomad_af: 0.0001, impact: 'MODERATE', clinvar: 'VUS', artifact_bias: true, tlod: 3.3, contamination: 0.011, cosmic: '—' },
];

const PANEL_MB = 1.2;

const IMPACT_COLORS: Record<Impact, string> = { HIGH: '#ff6b6b', MODERATE: '#ffb84d', LOW: '#4da3ff' };
const CLINVAR_COLORS: Record<ClinVar, string> = { Pathogenic: '#ff6b6b', 'Likely Pathogenic': '#ff8fb1', VUS: '#ffb84d', Benign: '#4cc38a' };

interface FilterState {
  minVaf: number;
  minDp: number;
  maxGnomad: number;
  minTlod: number;
  excludeBias: boolean;
}

interface VariantJudge {
  variant: Variant;
  pass: boolean;
  reasons: string[];
}

const evaluate = (v: Variant, f: FilterState): VariantJudge => {
  const reasons: string[] = [];
  if (v.vaf < f.minVaf) reasons.push(`VAF ${(v.vaf * 100).toFixed(1)}% < ${f.minVaf}%`);
  if (v.dp < f.minDp) reasons.push(`Depth ${v.dp}x < ${f.minDp}x`);
  if (v.gnomad_af > f.maxGnomad) reasons.push(`gnomAD AF ${(v.gnomad_af * 100).toFixed(2)}% > ${(f.maxGnomad * 100).toFixed(2)}%`);
  if (v.tlod < f.minTlod) reasons.push(`TLOD ${v.tlod.toFixed(1)} < ${f.minTlod}`);
  if (v.artifact_bias && f.excludeBias) reasons.push('Read orientation bias (FFPE 假突變)');
  return { variant: v, pass: reasons.length === 0, reasons };
};

const PanelHeader: React.FC<{ label: string; zh: string; color: string }> = ({ label, zh, color }) => (
  <div className="flex items-center justify-between px-1">
    <span className="text-[11px] font-bold tracking-[0.18em]" style={{ color }}>
      {label} <span className="font-normal" style={{ color: '#9fb0c3' }}>· {zh}</span>
    </span>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
  </div>
);

const ParamHint: React.FC<{ text: string }> = ({ text }) => (
  <span className="group relative inline-flex ml-1.5">
    <svg className="cursor-help" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9fb0c3" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    <span
      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-[240px] -translate-x-1/2 rounded-lg border px-3 py-2 text-[10px] leading-relaxed opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      style={{ backgroundColor: '#0f1520', borderColor: '#3b4b5f', color: '#c6d3e3' }}
    >
      {text}
    </span>
  </span>
);

interface SliderRowProps {
  label: string;
  en: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  color: string;
  format: (n: number) => string;
  onChange: (n: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, en, hint, min, max, step, value, color, format, onChange }) => (
  <div className="rounded-xl border px-3 py-2.5" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38' }}>
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-[12px] font-bold" style={{ color: '#e8eef5' }}>{label}</span>
      <span className="text-[10px] hidden sm:inline" style={{ color: '#5b6b7c' }}>{en}</span>
      <ParamHint text={hint} />
      <span className="ml-auto font-mono text-[12px] font-bold" style={{ color }}>{format(value)}</span>
    </div>
    <input
      type="range"
      className="ob-threshold-slider w-full"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ accentColor: color }}
    />
  </div>
);

const KpiCard: React.FC<{ label: string; value: string; unit?: string; color: string; sub?: string }> = ({ label, value, unit, color, sub }) => (
  <div className="flex-1 min-w-[100px] flex flex-col p-2.5 rounded-xl transition-shadow" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', borderWidth: '1px' }}>
    <span className="text-[10px] whitespace-nowrap" style={{ color: '#9fb0c3' }}>{label}</span>
    <span className="font-mono text-[19px] font-bold leading-tight" style={{ color, textShadow: `0 0 14px ${color}44` }}>
      {value}
      {unit && <span className="text-[10px] font-normal ml-0.5" style={{ color: '#9fb0c3' }}>{unit}</span>}
    </span>
    {sub && <span className="text-[9px] whitespace-nowrap" style={{ color: '#5b6b7c' }}>{sub}</span>}
  </div>
);

const FilterControls: React.FC<{
  filters: FilterState;
  passCount: number;
  filteredCount: number;
  onChange: (f: FilterState) => void;
}> = ({ filters, passCount, filteredCount, onChange }) => {
  const total = VARIANTS.length;
  return (
    <div className="flex flex-col gap-2.5">
      <PanelHeader label="MUTECT2 FILTER SIMULATOR" zh="參數過濾模擬器" color="#ffb84d" />
      <SliderRow
        label="最小 VAF"
        en="Min VAF"
        hint="Variant Allele Frequency — 變異等位基因頻率。腫瘤中帶此變異的讀段比例，過低會被定序雜訊掩蓋而誤判，通常 Somatic 低頻變異需特別小心。"
        min={1} max={20} step={1} value={Math.round(filters.minVaf * 100)} color="#4cc38a"
        format={(n) => `${n}%`}
        onChange={(n) => onChange({ ...filters, minVaf: n / 100 })}
      />
      <SliderRow
        label="最小深度"
        en="Min DP"
        hint="Read Depth — 該位點覆蓋的總讀段數（參考 + 變異）。深度不足時，即使變異頻率正確也難以信賴，越多 reads 越能壓縮抽樣誤差。"
        min={10} max={100} step={5} value={filters.minDp} color="#4da3ff"
        format={(n) => `${n}x`}
        onChange={(n) => onChange({ ...filters, minDp: n })}
      />
      <SliderRow
        label="最大 gnomAD AF"
        en="Max Population AF"
        hint="Population Allele Frequency — 此變異在人族群中的出現頻率。頻率過高代表常見基因多型性（多半為 germline 遺傳變異），應從體細胞候選中排除。"
        min={0.0001} max={0.01} step={0.0001} value={filters.maxGnomad} color="#7a6bff"
        format={(n) => `${(n * 100).toFixed(2)}%`}
        onChange={(n) => onChange({ ...filters, maxGnomad: n })}
      />
      <SliderRow
        label="最小 TLOD"
        en="Min TLOD"
        hint="Tumor Log-Odds Score — Mutect2 計算的腫瘤資料邊際對數勝算分數，代表此位點有腫瘤突變的證據強度。分數越高越可能是真實體細胞突變。"
        min={3} max={15} step={0.1} value={filters.minTlod} color="#ff6b6b"
        format={(n) => n.toFixed(1)}
        onChange={(n) => onChange({ ...filters, minTlod: n })}
      />
      <div className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38' }}>
        <span className="text-[12px] font-bold" style={{ color: '#e8eef5' }}>排除 Read Orientation Bias</span>
        <ParamHint text="Exclude Read Orientation Bias — 排除 FFPE / 氧化損傷造成的單鏈方向性假突變（G>T / C>T 單鏈偏移）。啟用後，帶有 artifact 標記的變異將被過濾。" />
        <button
          onClick={() => onChange({ ...filters, excludeBias: !filters.excludeBias })}
          className="ml-auto relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0"
          style={{ backgroundColor: filters.excludeBias ? '#4cc38a' : '#3b4b5f', boxShadow: filters.excludeBias ? '0 0 10px rgba(76,195,138,0.5)' : 'none' }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300"
            style={{ left: filters.excludeBias ? 22 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
          />
        </button>
      </div>

      <div className="rounded-xl border p-2.5" style={{ backgroundColor: '#1b2430', borderColor: '#2c3a4b' }}>
        <div className="text-[10px] font-bold tracking-wider mb-1.5" style={{ color: '#9fb0c3' }}>SUMMARY · 即時統計</div>
        <div className="flex flex-wrap gap-2">
          <KpiCard label="總變異數" value={`${total}`} color="#4da3ff" sub="Total Variants" />
          <KpiCard label="通過 PASS" value={`${passCount}`} color="#4cc38a" sub="Passed" />
          <KpiCard label="被濾除" value={`${filteredCount}`} color="#ff6b6b" sub="Filtered" />
          <KpiCard label="TMB 估計" value={`${(passCount / PANEL_MB).toFixed(1)}`} unit="/Mb" color="#ffb84d" sub={`1.2 Mb panel · ${((passCount / total) * 100).toFixed(0)}% pass`} />
        </div>
      </div>
    </div>
  );
};

const ScatterPlot: React.FC<{ judges: VariantJudge[]; filters: FilterState }> = ({ judges, filters }) => {
  const W = 360;
  const H = 240;
  const PAD_L = 12;
  const PAD_R = 6;
  const PAD_T = 16;
  const PAD_B = 26;
  const MAX_DP = 330;
  const MAX_VAF = 50;
  const [tip, setTip] = useState<{ x: number; y: number; j: VariantJudge } | null>(null);

  const px = (dp: number) => PAD_L + (dp / MAX_DP) * (W - PAD_L - PAD_R);
  const py = (vafPct: number) => H - PAD_B - (vafPct / MAX_VAF) * (H - PAD_T - PAD_B);
  const xDp = px(filters.minDp);
  const yVaf = py(filters.minVaf * 100);

  const gridH = [10, 20, 30, 40, 50];
  const gridV = [100, 200, 300];

  return (
    <div className="relative shrink-0">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {gridH.map((g) => (
          <g key={g}>
            <line x1={PAD_L} y1={py(g)} x2={W - PAD_R} y2={py(g)} stroke="rgba(59,75,95,0.35)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={W - PAD_R - 2} y={py(g) + 3} textAnchor="end" fontSize="8" fill="#5b6b7c" fontFamily="monospace">{g}%</text>
          </g>
        ))}
        {gridV.map((g) => (
          <g key={g}>
            <line x1={px(g)} y1={PAD_T} x2={px(g)} y2={H - PAD_B} stroke="rgba(59,75,95,0.35)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={px(g)} y={H - PAD_B + 12} textAnchor="middle" fontSize="8" fill="#5b6b7c" fontFamily="monospace">{g}</text>
          </g>
        ))}

        <rect x={PAD_L} y={yVaf} width={W - PAD_L - PAD_R} height={H - PAD_B - yVaf} fill="rgba(255,107,107,0.06)" />
        <rect x={PAD_L} y={PAD_T} width={xDp - PAD_L} height={H - PAD_T - PAD_B} fill="rgba(255,107,107,0.06)" />
        <line x1={xDp} y1={PAD_T} x2={xDp} y2={H - PAD_B} stroke="#ff6b6b" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.75" />
        <line x1={PAD_L} y1={yVaf} x2={W - PAD_R} y2={yVaf} stroke="#ff6b6b" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.75" />

        {judges.map((j) => {
          const x = px(j.variant.dp);
          const y = py(j.variant.vaf * 100);
          const color = j.pass ? '#4cc38a' : '#ff6b6b';
          return (
            <g
              key={j.variant.id}
              style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.45s cubic-bezier(0.34,1.3,0.5,1)' }}
              onMouseEnter={() => setTip({ x, y, j })}
              onMouseLeave={() => setTip(null)}
              className="cursor-pointer"
            >
              <circle r={j.pass ? 5.5 : 5} fill={color} opacity={0.9} stroke="#0f1520" strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
              {j.pass && <circle r="9" fill="none" stroke={color} strokeWidth="0.6" opacity="0.5" />}
            </g>
          );
        })}

        <text x={PAD_L + 1} y={H - 8} fontSize="8" fill="#9fb0c3" fontFamily="monospace">Read Depth (DP)</text>
        <text x={PAD_L + 1} y={10} fontSize="8" fill="#9fb0c3" fontFamily="monospace">VAF (%)</text>
      </svg>

      {tip && (
        <div
          className="absolute z-30 pointer-events-none rounded-lg border px-3 py-2 text-[10px] leading-relaxed animate-fade-in"
          style={{
            backgroundColor: '#0f1520',
            borderColor: tip.j.pass ? 'rgba(76,195,138,0.5)' : 'rgba(255,107,107,0.5)',
            color: '#c6d3e3',
            boxShadow: `0 0 16px ${tip.j.pass ? 'rgba(76,195,138,0.25)' : 'rgba(255,107,107,0.25)'}`,
            left: `${(tip.x / W) * 100}%`,
            top: `${(tip.y / H) * 100}%`,
            transform: `translate(${tip.x / W > 0.7 ? 'calc(-100% - 12px)' : '12px'}, calc(-100% - 10px))`,
            minWidth: 190,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: '#e8eef5' }}>{tip.j.variant.gene} · {tip.j.variant.hgvs_p}</span>
            <span className="ml-auto font-mono font-bold" style={{ color: tip.j.pass ? '#4cc38a' : '#ff6b6b' }}>{tip.j.pass ? 'PASS' : 'FILTERED'}</span>
          </div>
          <div className="font-mono">VAF {tip.j.variant.vaf.toFixed(3)} · DP {tip.j.variant.dp}x</div>
          {!tip.j.pass && (
            <div className="mt-1 pt-1 border-t" style={{ borderColor: '#2c3a4b', color: '#ff8fb1' }}>
              原因：{tip.j.reasons.join(' · ') || '—'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ImpactBarChart: React.FC<{ judges: VariantJudge[] }> = ({ judges }) => {
  const impacts: Impact[] = ['HIGH', 'MODERATE', 'LOW'];
  const counts = impacts.map((imp) => {
    const group = judges.filter((j) => j.variant.impact === imp);
    return { impact: imp, pass: group.filter((j) => j.pass).length, filtered: group.filter((j) => !j.pass).length };
  });
  const maxVal = Math.max(1, ...counts.flatMap((c) => [c.pass, c.filtered]));
  const BAR_H = 150;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end justify-around gap-2 flex-1 min-h-0">
        {counts.map((c) => (
          <div key={c.impact} className="flex flex-col items-center justify-end h-full gap-1.5">
            <div className="flex items-end gap-1.5 flex-1" style={{ height: BAR_H }}>
              <div className="flex flex-col items-center justify-end w-[30px] h-full">
                {c.pass > 0 && <span className="font-mono text-[9px] mb-0.5" style={{ color: '#4cc38a' }}>{c.pass}</span>}
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{ height: `${(c.pass / maxVal) * 100}%`, background: 'linear-gradient(180deg,#4cc38a,#2f8f62)', boxShadow: c.pass > 0 ? '0 0 10px rgba(76,195,138,0.45)' : 'none', minHeight: c.pass > 0 ? 3 : 0 }}
                />
                <span className="text-[8px] mt-1" style={{ color: '#5b6b7c' }}>PASS</span>
              </div>
              <div className="flex flex-col items-center justify-end w-[30px] h-full">
                {c.filtered > 0 && <span className="font-mono text-[9px] mb-0.5" style={{ color: '#ff6b6b' }}>{c.filtered}</span>}
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{ height: `${(c.filtered / maxVal) * 100}%`, background: 'linear-gradient(180deg,#ff6b6b,#c23838)', boxShadow: c.filtered > 0 ? '0 0 10px rgba(255,107,107,0.4)' : 'none', minHeight: c.filtered > 0 ? 3 : 0 }}
                />
                <span className="text-[8px] mt-1" style={{ color: '#5b6b7c' }}>FILT</span>
              </div>
            </div>
            <span className="text-[10px] font-bold" style={{ color: IMPACT_COLORS[c.impact] }}>{c.impact}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const VariantTable: React.FC<{ judges: VariantJudge[]; onSelect: (v: Variant) => void }> = ({ judges, onSelect }) => (
  <div className="flex flex-col min-h-0">
    <div className="grid gap-2 px-3 pb-1.5 text-[9px] font-bold tracking-wider" style={{ gridTemplateColumns: '86px 1fr 56px 52px 62px 64px 96px 72px', color: '#5b6b7c' }}>
      <span>GENE</span>
      <span>HGVS.p</span>
      <span className="text-right">VAF</span>
      <span className="text-right">DEPTH</span>
      <span className="text-right">gnomAD</span>
      <span className="text-right">IMPACT</span>
      <span>CLINVAR</span>
      <span className="text-right">STATUS</span>
    </div>
    <div className="flex flex-col gap-1 overflow-y-auto pr-1 min-h-0">
      {judges.map((j) => (
        <button
          key={j.variant.id}
          onClick={() => onSelect(j.variant)}
          className="grid items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-left transition-all hover:scale-[1.01]"
          style={{
            gridTemplateColumns: '86px 1fr 56px 52px 62px 64px 96px 72px',
            backgroundColor: j.pass ? 'rgba(76,195,138,0.05)' : 'rgba(255,107,107,0.04)',
            border: '1px solid ' + (j.pass ? 'rgba(76,195,138,0.18)' : 'rgba(255,107,107,0.18)'),
          }}
        >
          <span className="font-bold" style={{ color: '#e8eef5' }}>{j.variant.gene}</span>
          <span className="font-mono truncate" style={{ color: '#c6d3e3' }}>{j.variant.hgvs_p}</span>
          <span className="text-right font-mono" style={{ color: '#9fb0c3' }}>{(j.variant.vaf * 100).toFixed(1)}%</span>
          <span className="text-right font-mono" style={{ color: '#9fb0c3' }}>{j.variant.dp}x</span>
          <span className="text-right font-mono" style={{ color: j.variant.gnomad_af > 0.001 ? '#ffb84d' : '#9fb0c3' }}>{j.variant.gnomad_af.toFixed(4)}</span>
          <span className="text-right font-bold" style={{ color: IMPACT_COLORS[j.variant.impact] }}>{j.variant.impact}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-center w-fit" style={{ color: CLINVAR_COLORS[j.variant.clinvar], backgroundColor: `${CLINVAR_COLORS[j.variant.clinvar]}1a`, border: `1px solid ${CLINVAR_COLORS[j.variant.clinvar]}44` }}>
            {j.variant.clinvar}
          </span>
          <span
            className="text-right font-mono font-bold"
            style={{ color: j.pass ? '#4cc38a' : '#ff6b6b', textShadow: j.pass ? '0 0 8px rgba(76,195,138,0.5)' : '0 0 8px rgba(255,107,107,0.4)' }}
          >
            {j.pass ? 'PASS ▼' : 'FILTERED ▼'}
          </span>
        </button>
      ))}
    </div>
  </div>
);

const Row: React.FC<{ k: string; v: string; color?: string }> = ({ k, v, color = '#c6d3e3' }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[10px]" style={{ color: '#9fb0c3' }}>{k}</span>
    <span className="font-mono text-[11px] font-bold" style={{ color }}>{v}</span>
  </div>
);

const QcChip: React.FC<{ ok: boolean; pass: string; fail: string }> = ({ ok, pass, fail }) => (
  <span
    className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
    style={{ color: ok ? '#4cc38a' : '#ff6b6b', backgroundColor: ok ? 'rgba(76,195,138,0.12)' : 'rgba(255,107,107,0.12)', border: `1px solid ${ok ? 'rgba(76,195,138,0.4)' : 'rgba(255,107,107,0.4)'}` }}
  >
    {ok ? pass : fail}
  </span>
);

const VariantDetailDrawer: React.FC<{ judge: VariantJudge | null; onClose: () => void }> = ({ judge, onClose }) => {
  if (!judge) return null;
  const v = judge.variant;
  const refCount = v.dp - v.ad_alt;
  const contamOk = v.contamination <= 0.02;
  const tlodOk = v.tlod >= 6.3;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-overlay-in" style={{ backgroundColor: 'rgba(4,8,14,0.72)' }} onClick={onClose} />
      <aside
        className="absolute right-0 top-0 bottom-0 w-[400px] max-w-[92vw] overflow-y-auto animate-slide-in"
        style={{ backgroundColor: '#16202e', borderLeft: '1px solid #3b4b5f', boxShadow: '-12px 0 40px rgba(0,0,0,0.55)' }}
      >
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-bold" style={{ color: '#e8eef5' }}>{v.gene}</h3>
                <span className="text-[11px] text-center font-bold px-2 py-0.5 rounded-full" style={{ color: judge.pass ? '#4cc38a' : '#ff6b6b', backgroundColor: judge.pass ? 'rgba(76,195,138,0.12)' : 'rgba(255,107,107,0.12)', border: `1px solid ${judge.pass ? 'rgba(76,195,138,0.45)' : 'rgba(255,107,107,0.45)'}` }}>
                  {judge.pass ? 'PASS' : 'FILTERED'}
                </span>
              </div>
              <div className="font-mono text-[13px] mt-1" style={{ color: '#ffb84d' }}>{v.hgvs_p}</div>
              <div className="font-mono text-[11px]" style={{ color: '#9fb0c3' }}>{v.hgvs_c}</div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg shrink-0 transition-colors hover:bg-white/10" style={{ color: '#9fb0c3' }} aria-label="close">
              ✕
            </button>
          </div>

          <section className="rounded-xl border p-3" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38' }}>
            <div className="text-[10px] font-bold tracking-wider mb-1" style={{ color: '#4da3ff' }}>HGVS 與基因體座標</div>
            <Row k="Chrom / POS" v={`${v.chrom}:${v.pos}`} />
            <Row k="REF → ALT" v={`${v.ref} → ${v.alt}`} />
            <Row k="Variant ID" v={v.id} />
            <Row k="順變異數位標記" v={judge.pass ? 'Passed Mutect2 filters' : 'Failed Mutect2 filters'} color={judge.pass ? '#4cc38a' : '#ff6b6b'} />
          </section>

          <section className="rounded-xl border p-3" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38' }}>
            <div className="text-[10px] font-bold tracking-wider mb-2" style={{ color: '#4da3ff' }}>Read Support · 讀段支援</div>
            <div className="flex h-8 overflow-hidden rounded-lg mb-2">
              <div className="flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-500" style={{ width: `${(refCount / v.dp) * 100}%`, background: 'linear-gradient(90deg,#2f6fce,#4da3ff)', color: '#fff' }}>
                {refCount}
              </div>
              <div className="flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-500" style={{ width: `${(v.ad_alt / v.dp) * 100}%`, background: 'linear-gradient(90deg,#c23838,#ff8fb1)', color: '#fff' }}>
                {v.ad_alt}
              </div>
            </div>
            <div className="flex justify-between text-[9px] font-mono" style={{ color: '#9fb0c3' }}>
              <span style={{ color: '#4da3ff' }}>REF {refCount} reads</span>
              <span style={{ color: '#ff8fb1' }}>ALT {v.ad_alt} reads</span>
              <span>DP {v.dp}x</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px]" style={{ color: '#9fb0c3' }}>等位基因頻率 VAF</span>
              <span className="font-mono text-[14px] font-bold" style={{ color: '#4cc38a', textShadow: '0 0 10px rgba(76,195,138,0.45)' }}>{(v.vaf * 100).toFixed(2)}%</span>
            </div>
          </section>

          <section className="rounded-xl border p-3" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38' }}>
            <div className="text-[10px] font-bold tracking-wider mb-1" style={{ color: '#ffb84d' }}>Mutect2 品質分數</div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px]" style={{ color: '#9fb0c3' }}>TLOD <span className="text-[9px]">(置信分數)</span></span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[12px] font-bold" style={{ color: tlodOk ? '#4cc38a' : '#ff6b6b' }}>{v.tlod.toFixed(1)}</span>
                <QcChip ok={tlodOk} pass="≥6.3 ✓" fail="<6.3 ✗" />
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px]" style={{ color: '#9fb0c3' }}>Contamination 檢查</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[12px] font-bold" style={{ color: contamOk ? '#4cc38a' : '#ff6b6b' }}>{(v.contamination * 100).toFixed(3)}%</span>
                <QcChip ok={contamOk} pass="≤2% ✓" fail=">2% ✗" />
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px]" style={{ color: '#9fb0c3' }}>Read Bias 標記</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[12px] font-bold" style={{ color: v.artifact_bias ? '#ff6b6b' : '#4cc38a' }}>{v.artifact_bias ? 'flagged' : 'none'}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-3" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38' }}>
            <div className="text-[10px] font-bold tracking-wider mb-2" style={{ color: '#7a6bff' }}>臨床判讀</div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px]" style={{ color: '#9fb0c3' }}>ClinVar</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ color: CLINVAR_COLORS[v.clinvar], backgroundColor: `${CLINVAR_COLORS[v.clinvar]}1a`, border: `1px solid ${CLINVAR_COLORS[v.clinvar]}44` }}>{v.clinvar}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px]" style={{ color: '#9fb0c3' }}>COSMIC ID</span>
              <span className="font-mono text-[11px] font-bold" style={{ color: v.cosmic === '—' ? '#5b6b7c' : '#4da3ff' }}>{v.cosmic === '—' ? '未收錄' : v.cosmic}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px]" style={{ color: '#9fb0c3' }}>蛋白影響</span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ color: IMPACT_COLORS[v.impact], backgroundColor: `${IMPACT_COLORS[v.impact]}1a`, border: `1px solid ${IMPACT_COLORS[v.impact]}44` }}>{v.impact}</span>
            </div>
          </section>

          {!judge.pass && (
            <section className="rounded-xl border p-3" style={{ backgroundColor: 'rgba(255,107,107,0.06)', borderColor: 'rgba(255,107,107,0.4)' }}>
              <div className="text-[10px] font-bold tracking-wider mb-1.5" style={{ color: '#ff6b6b' }}>過濾失敗原因</div>
              <div className="flex flex-col gap-1">
                {judge.reasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: '#ff8fb1' }}>
                    <span style={{ color: '#ff6b6b' }}>✗</span> {r}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
};

const DEFAULT_FILTERS: FilterState = { minVaf: 0.05, minDp: 30, maxGnomad: 0.001, minTlod: 6.3, excludeBias: true };

export const AnnotationVisualization: React.FC<AnnotationVisualizationProps> = () => {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Variant | null>(null);

  const judges = useMemo(() => VARIANTS.map((v) => evaluate(v, filters)), [filters]);
  const passCount = judges.filter((j) => j.pass).length;
  const filteredCount = judges.length - passCount;
  const selectedJudge = useMemo(() => (selected ? evaluate(selected, filters) : null), [selected, filters]);

  return (
    <div className="annotation-visual flex flex-col gap-3 h-[calc(100vh-13rem)] min-h-[680px]">
      <div
        className="relative overflow-hidden rounded-2xl border px-5 py-3.5 flex items-center justify-between shrink-0"
        style={{ background: 'linear-gradient(90deg, rgba(77,163,255,0.16), rgba(15,21,32,0.4) 45%, rgba(122,107,255,0.14))', borderColor: '#2c3a4b' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #4da3ff, transparent)' }} />
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[14px] font-bold shrink-0"
            style={{ color: '#0f1520', background: 'linear-gradient(135deg,#4da3ff,#7a6bff)', boxShadow: '0 0 14px rgba(77,163,255,0.5)' }}
          >
            5
          </span>
          <h2 className="text-[17px] font-bold whitespace-nowrap" style={{ color: '#e8eef5' }}>Funcotator 變異註釋</h2>
          <span className="text-[15px] shrink-0" style={{ color: '#3b4b5f' }}>|</span>
          <span className="text-[14px] font-bold whitespace-nowrap" style={{ color: '#ffb84d' }}>最後一步：註釋後變異報告 — 互動篩選與臨床判讀</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 ml-3 shrink-0">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: '#9fb0c3', backgroundColor: 'rgba(15,21,32,0.7)', border: '1px solid #2c3a4b' }}>
            GATK Funcotator · VEP · ANNOVAR
          </span>
        </div>
      </div>

      <div className="grid flex-1 gap-3 min-h-0" style={{ gridTemplateColumns: 'minmax(250px,290px) minmax(0,1fr)' }}>
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
          <FilterControls filters={filters} passCount={passCount} filteredCount={filteredCount} onChange={setFilters} />
          <div className="rounded-xl border p-2.5 shrink-0" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38' }}>
            <div className="text-[9px] font-bold tracking-wider mb-1.5" style={{ color: '#9fb0c3' }}>FILTER 判讀圖例</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono">
              <span style={{ color: '#4cc38a' }}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: '#4cc38a' }} />PASS</span>
              <span style={{ color: '#ff6b6b' }}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: '#ff6b6b' }} />FILTERED</span>
              <span style={{ color: '#ffb84d' }}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: '#ffb84d' }} />高族群頻率</span>
              <span style={{ color: '#ff8fb1' }}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: '#ff8fb1' }} />FFPE 假突變</span>
            </div>
          </div>
          <div className="rounded-xl border p-3 text-[10px] leading-relaxed shrink-0" style={{ backgroundColor: '#0f1520', borderColor: '#1e2a38', color: '#9fb0c3' }}>
            左側模擬器中調整 VAF / Depth / gnomAD / TLOD / Read Bias 五個 Mutect2 過濾參數，下方繪圖與表格將即時以 <span style={{ color: '#4cc38a' }}>PASS</span> / <span style={{ color: '#ff6b6b' }}>FILTERED</span> 重新判讀所有已註釋變異。
          </div>
        </div>

        <div className="flex flex-col gap-3 min-h-0">
          <div className="grid gap-3 shrink-0" style={{ gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)' }}>
            <div className="rounded-2xl border p-3" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
              <PanelHeader label="MAF SCATTER" zh="VAF vs 深度散佈圖" color="#4cc38a" />
              <ScatterPlot judges={judges} filters={filters} />
              <div className="flex justify-center gap-4 text-[9px] font-mono mt-1">
                <span style={{ color: '#4cc38a' }}><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: '#4cc38a', boxShadow: '0 0 6px #4cc38a' }} />PASS</span>
                <span style={{ color: '#ff6b6b' }}><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: '#ff6b6b', boxShadow: '0 0 6px #ff6b6b' }} />FILTERED</span>
                <span style={{ color: '#9fb0c3' }}>懸停檢視變異細節</span>
              </div>
            </div>
            <div className="rounded-2xl border p-3 flex flex-col" style={{ backgroundColor: '#2c3a4b', borderColor: '#3b4b5f' }}>
              <PanelHeader label="IMPACT CLASSIFICATION" zh="影響分類長條圖" color="#ffb84d" />
              <div className="flex-1 min-h-0">
                <ImpactBarChart judges={judges} />
              </div>
              <div className="flex justify-center gap-4 text-[9px] font-mono mt-1">
                <span style={{ color: '#4cc38a' }}>■ PASS</span>
                <span style={{ color: '#ff6b6b' }}>■ FILTERED</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-3 flex flex-col flex-1 min-h-0" style={{ backgroundColor: '#1b2430', borderColor: '#2c3a4b' }}>
            <PanelHeader label="VARIANT EXPLORER" zh="變異瀏覽器" color="#4da3ff" />
            <VariantTable judges={judges} onSelect={setSelected} />
            <div className="text-[10px] text-center pt-1.5 shrink-0" style={{ color: '#5b6b7c' }}>點擊任一列開啟詳細判讀卡</div>
          </div>
        </div>
      </div>

      <VariantDetailDrawer judge={selectedJudge} onClose={() => setSelected(null)} />
    </div>
  );
};