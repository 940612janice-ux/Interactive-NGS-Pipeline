import { WorkflowStage, Patient, Sample, BaseColors } from '../types';

export const STAGE_COLORS = ['#ff6b6b', '#4da3ff', '#7a6bff', '#ffb84d', '#4cc38a'];

export const WORKFLOW: WorkflowStage[] = [
  {
    title: 'Data Basecalling & Demultiplexing',
    zh: '數據下機與拆碼',
    steps: [
      {
        name: 'BCL 原始資料',
        en: 'Sequencer Raw BCL',
        icon: 'blc.png',
        desc: '序列儀完成定序後產生的原始光學訊號資料。每個 cycle 產生四張螢光影像（A/C/G/T 四色通道），經過影像分析與壓縮儲存為 BCL 二進位格式。此階段尚未進行鹼基判讀，只有純粹的光訊號強度矩陣。',
        bullets: ['Illumina 定序儀原始輸出格式', '每 cycle 4 個通道（Red/Green 兩雷射激發）', '儲存螢光強度而非鹼基文字', '二進位壓縮，需經 Basecalling 解碼'],
        input: 'Sequencer 原始影像訊號',
        output: 'BCL 檔',
        visualType: 'bcl-raw',
      },
      {
        name: 'Basecalling (bcl2fastq)',
        en: 'BCL → FASTQ Basecalling',
        icon: 'fastq.png',
        desc: '使用 bcl2fastq 將 BCL 二進位光訊號轉換為標準 FASTQ 格式。軟體分析每個 cluster 在四個通道的螢光強度，判讀出對應鹼基（A/T/C/G），並計算 Phred Quality Score。此過程將類比光訊號數位化為離散的鹼基序列。',
        bullets: ['四通道螢光強度比較 → 判讀鹼基', 'Phred Q-score 品質值計算', '輸出標準 FASTQ 四行格式', '可設定 adapter trimming / quality masking'],
        input: 'BCL 檔',
        output: 'Raw FASTQ',
        visualType: 'basecalling',
      },
      {
        name: 'Demultiplexing',
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
    zh: '前處理',
    steps: [
      {
        name: 'FastQC 品質檢測',
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
        en: 'fastp / Trimmomatic',
        icon: 'fastq.png',
        desc: '使用 fastp 或 Trimmomatic 裁切 low-quality 鹼基與 adaptor 序列，並過濾過短或品質過差的 reads，得到乾淨的 FASTQ。',
        bullets: ['Adaptor trimming', 'Sliding-window quality trim', '去重複 / poly-G 過濾'],
        input: 'Raw FASTQ',
        output: '乾淨的 FASTQ (Clean FASTQ)',
        visualType: 'trimming',
      },
      {
        name: '序列比對',
        en: 'Alignment (hg38 / GRCh38)',
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
    zh: '變異檢測 (Somatic Mutect2)',
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
        name: 'Germline Filtering',
        en: 'gnomAD 擋天生遺傳變異',
        icon: 'vcf_variant.png',
        desc: '結合 gnomAD 族群頻率資料，過濾掉人群中常見的天生遺傳變異（germline variants），保留真正的體細胞突變。',
        bullets: ['使用 gnomAD 族群 allele frequency', '設定 population VCFs 於 Mutect2', '擋掉常見 polymorphism'],
        input: 'Raw VCF',
        output: 'Germline-filtered VCF',
        visualType: 'gnomad',
      },
      {
        name: 'Panel of Normals',
        en: 'PoN 擋平台技術雜訊',
        icon: 'vcf_variant.png',
        desc: '結合 Panel of Normals（由大量正常樣本建立的背景變異）消除平台與實驗技術造成的系統性雜訊，降低假陽性。',
        bullets: ['以正常樣本建立 PoN', '去除 sequencing 技術誤差', '提高變異偵測專一性'],
        input: 'Raw VCF + PoN',
        output: 'Raw VCF (過濾後)',
        visualType: 'pon',
      },
    ],
  },
  {
    title: 'Filtering',
    zh: '過濾',
    steps: [
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
  { name: '王明宏', age: 58, cancer: '肺癌', cancerEn: 'Lung Cancer', color: '#ff6b6b' },
  { name: '林美玲', age: 45, cancer: '乳癌', cancerEn: 'Breast Cancer', color: '#ff8fb1' },
  { name: '陳志強', age: 62, cancer: '大腸直腸癌', cancerEn: 'Colorectal Cancer', color: '#ffb84d' },
  { name: '許雅婷', age: 50, cancer: '胃癌', cancerEn: 'Gastric Cancer', color: '#4cc38a' },
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
  '今晚接到緊急案件：四位患者的腫瘤樣本剛下機，BCL 原始資料堆積如山。身為基因偵探，你的任務是追蹤每一條讀段的去向，從模糊的光訊號中，拼湯出致病突變的真相。',
  '實驗室傳來訊息：定序儀剛跑完，BCL 檔案等待處理。每個 cluster 閃爍的螢光藏著生命密碼，而我們要做的，就是把這些訊號「翻譯」成可讀的基因序列，再一層層剝開變異的面紗。',
  '新案件進場：四份檢體混雜在同一 flow cell，索引標籤是唯一線索。你需要像整理證物一樣，將每條 reads 精準歸屬，不漏掉任何一個潛在突變。',
  '品質關卡啟動：Raw FASTQ 猶如未經鑑定的證詞，FastQC 將為你揭示每個鹼基的可信度。接著拿起品質剪刀與接頭刮刀，修剪雜訊，只留乾淨證據。',
  '比對階段：將乾淨的 reads 如拼圖般貼回 hg38 參考基因組。BWA-MET 精準定位，SAMtools 整理順序，Picard 標記重複，BQSR 校正品質——每一步都為最終變異呼叫鋪路。',
  '終局之戰：Mutect2 聽取腫瘤與正常雙重證詞，gnomAD 與 PoN 過濾雜音，FilterMutectCalls 下達最終判決。PASS 標籤背後，是臨床可信的體細胞突變，等待你為患者解讀。',
];