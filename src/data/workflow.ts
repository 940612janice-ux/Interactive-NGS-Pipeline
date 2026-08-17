import { WorkflowStage, Patient, Sample, BaseColors } from '../types';

export const STAGE_COLORS = ['#ff6b6b', '#4da3ff', '#7a6bff', '#ffb84d', '#4cc38a'];

export const WORKFLOW: WorkflowStage[] = [
  {
    title: 'Data Basecalling & Demultiplexing',
    zh: '數據下機與拆碼',
    steps: [
      {
        name: '下機資料檢視',
        en: 'Basecalling → Raw BCL',
        icon: 'blc.png',
        desc: '序列儀完成定序後產生的原始光學訊號資料。每個 cycle 產生四張螢光影像（A/C/G/T 四色通道），經過影像分析與壓縮儲存為 BCL 二進位格式。此階段尚未進行鹼基判讀，只有純粹的光訊號強度矩陣。',
        bullets: ['Illumina 定序儀原始輸出格式', '每 cycle 4 個通道（Red/Green 兩雷射激發）', '儲存螢光強度而非鹼基文字', '二進位壓縮，需經 Basecalling 解碼'],
        input: 'Sequencer 原始影像訊號',
        output: 'BCL 檔',
        visualType: 'bcl-raw',
      },
      {
        name: '數據解碼與轉檔',
        en: 'BCL → FASTQ ',
        icon: 'fastq.png',
        desc: '使用 bcl2fastq 將 BCL 二進位光訊號轉換為標準 FASTQ 格式。軟體分析每個 cluster 在四個通道的螢光強度，判讀出對應鹼基（A/T/C/G），並計算 Phred Quality Score。此過程將類比光訊號數位化為離散的鹼基序列。',
        bullets: ['四通道螢光強度比較 → 判讀鹼基', 'Phred Q-score 品質值計算', '輸出標準 FASTQ 四行格式', '可設定 adapter trimming / quality masking'],
        input: 'BCL 檔',
        output: 'Raw FASTQ',
        visualType: 'basecalling',
      },
      {
        name: '樣本數據拆分',
        en: 'Index-based Demultiplexing',
        icon: 'fastq.png',
        desc: '根據樣本專屬的 Index 序列（Barcode），將混合在同一 flow cell 的多個樣本資料拆分歸檔。Basecalling 階段已解碼出 Index 區段（通常在 Read 1 前 6-8 bp），此步驟比對 Index 並將 reads 分配到對應樣本的 FASTQ 檔案。',
        bullets: ['Index / Barcode 序列比對（允許 1-2 bp mismatch）', '支援雙索引（i5/i7）與單索引', '輸出每個樣本獨立的 FASTQ 檔案', 'Undetermined reads 另存未匹配檔'],
        input: 'Raw FASTQ (混合樣本)',
        output: 'Sample-specific FASTQ',
        visualType: 'demultiplexing',
      },
    ],
  },
  {               
    title: 'Pre-processing',
    zh: '前處理 ( FASTQ → Analysis-ready BAM)',
    steps: [
      {
        name: '數據品質檢測',
        en: 'FASTQ & FastQC',
        icon: 'fastq.png',
        desc: '以 FastQC 產生 raw FASTQ 的品質報告，檢視 per-base 品質分數、GC 含量、adaptor 汙染、duplication 比例等，作為後續處理的依據。',
        bullets: ['Per-base sequence quality', 'Adaptor 偵測', 'GC content / N content 檢查'],
        input: 'Raw FASTQ',
        output: 'FastQC 報告 (HTML)',
        visualType: 'fastqc',
      },
      {
        name: '修剪與過濾',
        en: 'FASTQ → Clean FASTQ',
        icon: 'fastq.png',
        desc: '使用 fastp 或 Trimmomatic 裁切 low-quality 鹼基與 adaptor 序列，並過濾過短或品質過差的 reads，得到乾淨的 FASTQ。',
        bullets: ['Adaptor trimming', 'Sliding-window quality trim', '去重複 / poly-G 過濾'],
        input: 'Raw FASTQ',
        output: '乾淨的 FASTQ (Clean FASTQ)',
        visualType: 'trimming',
      },
      {
        name: '參考基因組比對',
        en: 'Clean FASTQ → Raw BAM',
        icon: 'sam.png',
        desc: '以 BWA-MEM 將乾淨的 FASTQ reads 比對到人類參考基因體 hg38 / GRCh38，產生帶有比對位置與 CIGAR 資訊的 SAM，再轉為 BAM。',
        bullets: ['BWA-MEM 對齊參考基因體', 'SAMtools 排序 (coordinate sort)', '可另加 Read Group 標籤'],
        input: '乾淨的 FASTQ',
        output: 'Raw BAM',
        visualType: 'alignment',
      },
      {
        name: 'Mark Duplicates',
        en: 'GATK Picard',
        icon: 'sam.png',
        desc: '使用 GATK Picard MarkDuplicates 標記 PCR amplification 所造成的重複 reads，修正 PCR 倍率放大偏差，避免影響後續變異偵測。',
        bullets: ['標記 (非移除) 重複 reads', '修正 PCR amplification bias', '輸出 metrics 供 QC 檢視'],
        input: 'Raw BAM',
        output: 'Duplicate-marked BAM',
        visualType: 'mark-duplicates',
      },
      {
        name: 'BQSR 品質校正',
        en: 'GATK BaseRecalibrator + dbSNP',
        icon: 'sam.png',
        desc: '使用 GATK Base Quality Score Recalibration，配合 dbSNP 已知位點建立模型，校正機器產生的系統性 Q 值誤差，輸出 Analysis-ready BAM。',
        bullets: ['BaseRecalibrator 建立 covariation 模型', 'ApplyBQSR 重寫品質分數', '校正系統性 sequencing error'],
        input: 'Duplicate-marked BAM',
        output: 'Analysis-ready BAM',
        visualType: 'bqsr',
      },
    ],
  },
  {
    title: 'Variant Calling',
    zh: '變異檢測 ( Analysis-ready BAM → PASS VCF)',
    steps: [
      {
        name: 'Mutect2 原始呼叫',
        en: 'GATK Mutect2 (Tumor vs Normal)',
        icon: 'vcf_variant.png',
        desc: '以 GATK Mutect2 進行 tumor vs matched normal 的體細胞變異呼叫，透過配對比較去除 germline 訊號，找出腫瘤特有的變異。',
        bullets: ['Tumor + Matched Normal 配對分析', '多樣本 joint calling 支援', '輸出 raw somatic VCF'],
        input: 'Analysis-ready BAM (Tumor & Normal)',
        output: 'Raw VCF',
        visualType: 'mutect2',
      },
      {
        name: 'Contamination Estimation',
        en: '計算交叉污染率',
        icon: 'vcf_filtered_somatic_variant.png',
        desc: '利用 GATK CalculateContamination 估算樣本間的交叉污染率，做為後續過濾的依據，污染過高的樣本結果需特別注意。',
        bullets: ['GetPileupSummaries + CalculateContamination', '評估 cross-sample contamination', '以 contamination 分數輔助過濾'],
        input: 'Raw VCF + BAM',
        output: 'Contamination 分數表',
        visualType: 'contamination',
      },
      {
        name: 'Read Orientation Bias',
        en: '剔除 FFPE / 氧化損傷假突變',
        icon: 'vcf_filtered_somatic_variant.png',
        desc: '學習並過濾 read orientation bias，此類偏差常見於 FFPE 樣本或氧化損傷造成的 C>T / G>A 假突變，是體細胞呼叫的關鍵濾網。',
        bullets: ['檢測 F1R2 方向性偏差', '處理 FFPE 去胺基假突變', 'LearnReadOrientationModel 建立模型'],
        input: 'Raw VCF',
        output: 'Orientation-bias-filtered VCF',
        visualType: 'orientation-bias',
      },
      {
        name: 'FilterMutectCalls',
        en: '整合所有濾網 → PASS VCF',
        icon: 'vcf_filtered_somatic_variant.png',
        desc: 'FilterMutectCalls 整合 germline、PoN、contamination、orientation bias 等所有濾網結果，給予真正的高可信度變異 PASS 標籤。',
        bullets: ['整合全部過濾資訊', '產生 PASS / FAIL 標籤', '輸出 Filtering statistics'],
        input: 'Raw VCF + 各濾網結果',
        output: 'PASS VCF',
        visualType: 'filter-mutect',
      },
    ],
  },
  {
    title: 'Annotation',
    zh: '註釋',
    steps: [
      {
        name: '變異註釋',
        en: 'VEP / ANNOVAR',
        icon: 'vcf_filtered_somatic_variant.png',
        desc: '使用 VEP 或 ANNOVAR 將 PASS VCF 註釋為臨床與蛋白質層級資訊，包含基因名稱、轉錄本效應、胺基酸改變、臨床意義（ClinVar）等。',
        bullets: ['基因與轉錄本註釋 (VEP / ANNOVAR)', '蛋白質影響預測 (SIFT / PolyPhen)', 'ClinVar / COSMIC 臨床資料整合'],
        input: 'PASS VCF',
        output: '註釋後的變異報告',
        visualType: 'annotation',
      },
    ],
  },
];

export const PATIENTS: Patient[] = [
  { name: '王明宏', code: 'PT-20260817-01', age: 58, gender: '男', cancer: '非小細胞肺癌', cancerEn: 'Non-small Cell Lung Cancer', sampleId: 'SMP-LU-009', color: '#ff6b6b' },
  ];

export const BASE_COLORS: BaseColors = {
  A: '#ff6b6b',
  C: '#4cc38a',
  G: '#ffb84d',
  T: '#4da3ff',
};

export const SAMPLES: Sample[] = [
  { id: 'S001', name: 'Sample A', index: 'ATCACG', indexType: 'i7', color: '#ff6b6b' },
  { id: 'S002', name: 'Sample B', index: 'CGATGT', indexType: 'i7', color: '#4da3ff' },
  { id: 'S003', name: 'Sample C', index: 'TTAGGC', indexType: 'i7', color: '#4cc38a' },
  { id: 'S004', name: 'Sample D', index: 'TGACCA', indexType: 'i5', color: '#ffb84d' },
  { id: 'S005', name: 'Sample E', index: 'ACAGTG', indexType: 'i5', color: '#ff8fb1' },
  { id: 'S006', name: 'Sample F', index: 'GCCAAT', indexType: 'i5', color: '#7a6bff' },
];

export const SCENARIOS = [
  '情境任務：體細胞癌症變異分析',
  '你將扮演基因檢測分析師，處理患者的 DNA 定序資料，從理解原始下機檔案的光學訊號處理',
  '再到獲得 FASTQ 檔開始正式處理 NGS pipeline，一路過濾與比對，最終找出可信的致病突變。',
];