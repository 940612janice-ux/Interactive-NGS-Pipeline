const STAGE_COLORS = ["#ff6b6b", "#4da3ff", "#7a6bff", "#ffb84d", "#4cc38a"];

const WORKFLOW = [
  {
    title: "Data Basecalling & Demultiplexing",
    zh: "數據下機與拆碼",
    steps: [
      {
        name: "BCL 原始資料",
        en: "Sequencer Raw BCL",
        icon: "blc.png",
        desc: "序列儀完成定序後產生的原始光學訊號資料。每個 cycle 產生四張螢光影像（A/C/G/T 四色通道），經過影像分析與壓縮儲存為 BCL 二進位格式。此階段尚未進行鹼基判讀，只有純粹的光訊號強度矩陣。",
        bullets: ["Illumina 定序儀原始輸出格式", "每 cycle 4 個通道（Red/Green 兩雷射激發）", "儲存螢光強度而非鹼基文字", "二進位壓縮，需經 Basecalling 解碼"],
        input: "Sequencer 原始影像訊號",
        output: "BCL 檔",
        visualType: "bcl-raw",
      },
      {
        name: "Basecalling (bcl2fastq)",
        en: "BCL → FASTQ Basecalling",
        icon: "fastq.png",
        desc: "使用 bcl2fastq 將 BCL 二進位光訊號轉換為標準 FASTQ 格式。軟體分析每個 cluster 在四個通道的螢光強度，判讀出對應鹼基（A/T/C/G），並計算 Phred Quality Score。此過程將類比光訊號數位化為離散的鹼基序列。",
        bullets: ["四通道螢光強度比較 → 判讀鹼基", "Phred Q-score 品質值計算", "輸出標準 FASTQ 四行格式", "可設定 adapter trimming / quality masking"],
        input: "BCL 檔",
        output: "Raw FASTQ",
        visualType: "basecalling",
      },
      {
        name: "Demultiplexing",
        en: "Index-based Demultiplexing",
        icon: "fastq.png",
        desc: "根據樣本專屬的 Index 序列（Barcode），將混合在同一 flow cell 的多個樣本資料拆分歸檔。Basecalling 階段已解碼出 Index 區段（通常在 Read 1 前 6-8 bp），此步驟比對 Index 並將 reads 分配到對應樣本的 FASTQ 檔案。",
        bullets: ["Index / Barcode 序列比對（允許 1-2 bp mismatch）", "支援雙索引（i5/i7）與單索引", "輸出每個樣本獨立的 FASTQ 檔案", "Undetermined reads 另存未匹配檔"],
        input: "Raw FASTQ (混合樣本)",
        output: "Sample-specific FASTQ",
        visualType: "demultiplexing",
      },
    ],
  },
  {
    title: "Pre-processing",
    zh: "前處理",
    steps: [
      {
        name: "FastQC 品質檢測",
        en: "FASTQ & FastQC",
        icon: "fastq.png",
        desc: "以 FastQC 產生 raw FASTQ 的品質報告，檢視 per-base 品質分數、GC 含量、adaptor 汙染、duplication 比例等，作為後續處理的依據。",
        bullets: ["Per-base sequence quality", "Adaptor 偵測", "GC content / N content 檢查"],
        input: "Raw FASTQ",
        output: "FastQC 報告 (HTML)",
        visualType: "fastqc",
      },
      {
        name: "修剪與過濾",
        en: "fastp / Trimmomatic",
        icon: "fastq.png",
        desc: "使用 fastp 或 Trimmomatic 裁切 low-quality 鹼基與 adaptor 序列，並過濾過短或品質過差的 reads，得到乾淨的 FASTQ。",
        bullets: ["Adaptor trimming", "Sliding-window quality trim", "去重複 / poly-G 過濾"],
        input: "Raw FASTQ",
        output: "乾淨的 FASTQ (Clean FASTQ)",
        visualType: "trimming",
      },
      {
        name: "序列比對",
        en: "Alignment (hg38 / GRCh38)",
        icon: "sam.png",
        desc: "以 BWA-MEM 將乾淨的 FASTQ reads 比對到人類參考基因體 hg38 / GRCh38，產生帶有比對位置與 CIGAR 資訊的 SAM，再轉為 BAM。",
        bullets: ["BWA-MEM 對齊參考基因體", "SAMtools 排序 (coordinate sort)", "可另加 Read Group 標籤"],
        input: "乾淨的 FASTQ",
        output: "Raw BAM",
        visualType: "alignment",
      },
      {
        name: "Mark Duplicates",
        en: "GATK Picard",
        icon: "sam.png",
        desc: "使用 GATK Picard MarkDuplicates 標記 PCR amplification 所造成的重複 reads，修正 PCR 倍率放大偏差，避免影響後續變異偵測。",
        bullets: ["標記 (非移除) 重複 reads", "修正 PCR amplification bias", "輸出 metrics 供 QC 檢視"],
        input: "Raw BAM",
        output: "Duplicate-marked BAM",
        visualType: "mark-duplicates",
        },
      {
        name: "BQSR 品質校正",
        en: "GATK BaseRecalibrator + dbSNP",
        icon: "sam.png",
        desc: "使用 GATK Base Quality Score Recalibration，配合 dbSNP 已知位點建立模型，校正機器產生的系統性 Q 值誤差，輸出 Analysis-ready BAM。",
        bullets: ["BaseRecalibrator 建立 covariation 模型", "ApplyBQSR 重寫品質分數", "校正系統性 sequencing error"],
        input: "Duplicate-marked BAM",
        output: "Analysis-ready BAM",
        visualType: "bqsr",
      },
    ],
  },
  {
    title: "Variant Calling",
    zh: "變異檢測 (Somatic Mutect2)",
    steps: [
      {
        name: "Mutect2 原始呼叫",
        en: "GATK Mutect2 (Tumor vs Normal)",
        icon: "vcf_variant.png",
        desc: "以 GATK Mutect2 進行 tumor vs matched normal 的體細胞變異呼叫，透過配對比較去除 germline 訊號，找出腫瘤特有的變異。",
        bullets: ["Tumor + Matched Normal 配對分析", "多樣本 joint calling 支援", "輸出 raw somatic VCF"],
        input: "Analysis-ready BAM (Tumor & Normal)",
        output: "Raw VCF",
        visualType: "mutect2",
      },
      {
        name: "Germline Filtering",
        en: "gnomAD 擋天生遺傳變異",
        icon: "vcf_variant.png",
        desc: "結合 gnomAD 族群頻率資料，過濾掉人群中常見的天生遺傳變異（germline variants），保留真正的體細胞突變。",
        bullets: ["使用 gnomAD 族群 allele frequency", "設定 population VCFs 於 Mutect2", "擋掉常見 polymorphism"],
        input: "Raw VCF",
        output: "Germline-filtered VCF",
        visualType: "gnomad",
      },
      {
        name: "Panel of Normals",
        en: "PoN 擋平台技術雜訊",
        icon: "vcf_variant.png",
        desc: "結合 Panel of Normals（由大量正常樣本建立的背景變異）消除平台與實驗技術造成的系統性雜訊，降低假陽性。",
        bullets: ["以正常樣本建立 PoN", "去除 sequencing 技術誤差", "提高變異偵測專一性"],
        input: "Raw VCF + PoN",
        output: "Raw VCF (過濾後)",
        visualType: "pon",
      },
    ],
  },
  {
    title: "Filtering",
    zh: "過濾",
    steps: [
      {
        name: "Contamination Estimation",
        en: "計算交叉污染率",
        icon: "vcf_filtered_somatic_variant.png",
        desc: "利用 GATK CalculateContamination 估算樣本間的交叉污染率，做為後續過濾的依據，污染過高的樣本結果需特別注意。",
        bullets: ["GetPileupSummaries + CalculateContamination", "評估 cross-sample contamination", "以 contamination 分數輔助過濾"],
        input: "Raw VCF + BAM",
        output: "Contamination 分數表",
        visualType: "contamination",
      },
      {
        name: "Read Orientation Bias",
        en: "剔除 FFPE / 氧化損傷假突變",
        icon: "vcf_filtered_somatic_variant.png",
        desc: "學習並過濾 read orientation bias，此類偏差常見於 FFPE 樣本或氧化損傷造成的 C>T / G>A 假突變，是體細胞呼叫的關鍵濾網。",
        bullets: ["檢測 F1R2 方向性偏差", "處理 FFPE 去胺基假突變", "LearnReadOrientationModel 建立模型"],
        input: "Raw VCF",
        output: "Orientation-bias-filtered VCF",
        visualType: "orientation-bias",
      },
      {
        name: "FilterMutectCalls",
        en: "整合所有濾網 → PASS VCF",
        icon: "vcf_filtered_somatic_variant.png",
        desc: "FilterMutectCalls 整合 germline、PoN、contamination、orientation bias 等所有濾網結果，給予真正的高可信度變異 PASS 標籤。",
        bullets: ["整合全部過濾資訊", "產生 PASS / FAIL 標籤", "輸出 Filtering statistics"],
        input: "Raw VCF + 各濾網結果",
        output: "PASS VCF",
        visualType: "filter-mutect",
      },
    ],
  },
  {
    title: "Annotation",
    zh: "註釋",
    steps: [
      {
        name: "變異註釋",
        en: "VEP / ANNOVAR",
        icon: "vcf_filtered_somatic_variant.png",
        desc: "使用 VEP 或 ANNOVAR 將 PASS VCF 註釋為臨床與蛋白質層級資訊，包含基因名稱、轉錄本效應、胺基酸改變、臨床意義（ClinVar）等。",
        bullets: ["基因與轉錄本註釋 (VEP / ANNOVAR)", "蛋白質影響預測 (SIFT / PolyPhen)", "ClinVar / COSMIC 臨床資料整合"],
        input: "PASS VCF",
        output: "註釋後的變異報告",
        visualType: "annotation",
      },
    ],
  },
];

const PATIENTS = [
  { name: "王明宏", age: 58, cancer: "肺癌", cancerEn: "Lung Cancer", color: "#ff6b6b" },
  { name: "林美玲", age: 45, cancer: "乳癌", cancerEn: "Breast Cancer", color: "#ff8fb1" },
  { name: "陳志強", age: 62, cancer: "大腸直腸癌", cancerEn: "Colorectal Cancer", color: "#ffb84d" },
  { name: "許雅婷", age: 50, cancer: "胃癌", cancerEn: "Gastric Cancer", color: "#4cc38a" },
];

const BASE_COLORS = {
  A: "#ff6b6b",
  C: "#4cc38a",
  G: "#ffb84d",
  T: "#4da3ff",
};

const SAMPLES = [
  { id: "S001", name: "Sample A", index: "ATCACG", indexType: "i7", color: "#ff6b6b" },
  { id: "S002", name: "Sample B", index: "CGATGT", indexType: "i7", color: "#4da3ff" },
  { id: "S003", name: "Sample C", index: "TTAGGC", indexType: "i7", color: "#4cc38a" },
  { id: "S004", name: "Sample D", index: "TGACCA", indexType: "i5", color: "#ffb84d" },
  { id: "S005", name: "Sample E", index: "ACAGTG", indexType: "i5", color: "#ff8fb1" },
  { id: "S006", name: "Sample F", index: "GCCAAT", indexType: "i5", color: "#7a6bff" },
];

function generateRandomSequence(length = 50) {
  const bases = ["A", "C", "G", "T"];
  let seq = "";
  for (let i = 0; i < length; i++) {
    seq += bases[Math.floor(Math.random() * bases.length)];
  }
  return seq;
}

function generateQualityScores(length = 50) {
  let qual = "";
  for (let i = 0; i < length; i++) {
    const q = Math.floor(Math.random() * 15) + 30;
    qual += String.fromCharCode(q + 33);
  }
  return qual;
}

function createBCLRawVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual bcl-raw-visual";
  container.innerHTML = `
    <div class="signal-panel">
      <div class="signal-header">
        <h3>原始螢光強度矩陣</h3>
        <span class="signal-badge">未解碼 · 僅光強度</span>
      </div>
      <div class="signal-content">
        <div class="optical-matrix-raw" id="optical-matrix-raw"></div>
      </div>
    </div>
    <div class="info-panel">
      <div class="info-header">
        <h3>檔案處理</h3>
      </div>
      <div class="info-content">
        <div class="conversion-pipeline">
          <div class="pipeline-step" id="pipeline-step-1">
            <div class="step-badge">1</div>
            <div class="step-body">
              <strong>輸入：BCL 原始光學訊號</strong>
              <p>每個 cluster 在每個 cycle 的四通道螢光強度值（如：紅: 10, 綠: 950, 黃: 15, 藍: 20）</p>
            </div>
          </div>
          <div class="pipeline-arrow">⟶</div>
          <div class="pipeline-step" id="pipeline-step-2">
            <div class="step-badge">2</div>
            <div class="step-body">
              <strong>Basecalling 演算法判斷鹼基</strong>
              <p>比較四通道相對強度，最強者即為判讀結果，輸出對應鹼基（A/T/C/G）</p>
            </div>
          </div>
          <div class="pipeline-arrow">⟶</div>
          <div class="pipeline-step" id="pipeline-step-3">
            <div class="step-badge">3</div>
            <div class="step-body">
              <strong>輸出：BCL 檔案</strong>
              <p>將鹼基（T）、品質分數壓縮寫入成 1 個 Byte 的二進位檔</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  return container;
}

function initBCLRawVisualization(container) {
  const opticalMatrix = container.querySelector("#optical-matrix-raw");
  let isPlaying = true;

  function initRawMatrix() {
    const channels = [
      { base: "A", label: "Channel1: Green (A)", color: BASE_COLORS.A },
      { base: "C", label: "Channel2: Blue (C)", color: BASE_COLORS.C },
      { base: "G", label: "Channel3: Yellow (G)", color: BASE_COLORS.G },
      { base: "T", label: "Channel4: Red (T)", color: BASE_COLORS.T },
    ];

    const cycles = 10;
    const tilesPerCycle = 14;

    channels.forEach((ch, chIdx) => {
      const channelEl = document.createElement("div");
      channelEl.className = "matrix-channel-raw";
      channelEl.innerHTML = `
        <div class="channel-header-raw">
          <div class="channel-base">
            <span class="base-dot ${ch.base}"></span>
            <span class="channel-label-raw">${ch.label}</span>
          </div>
        </div>
        <div class="matrix-grid-raw" id="raw-grid-${ch.base}"></div>
      `;
      opticalMatrix.appendChild(channelEl);

      const grid = channelEl.querySelector(`#raw-grid-${ch.base}`);

      for (let cycle = 0; cycle < cycles; cycle++) {
        for (let tile = 0; tile < tilesPerCycle; tile++) {
          const cell = document.createElement("div");
          cell.className = "matrix-cell-raw";
          const intensity = Math.random();
          cell.style.background = `rgba(${hexToRgb(ch.color).join(",")},${0.1 + intensity * 0.85})`;
          cell.dataset.intensity = intensity.toFixed(2);
          cell.dataset.cycle = cycle;
          cell.dataset.tile = tile;
          grid.appendChild(cell);
        }
      }
    });

    animateRawIntensity();
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  function animateRawIntensity() {
    const grids = opticalMatrix.querySelectorAll(".matrix-grid-raw");
    let frame = 0;

    function animate() {
      if (!isPlaying) return;
      grids.forEach((grid, chIdx) => {
        const cells = grid.querySelectorAll(".matrix-cell-raw");
        cells.forEach((cell) => {
          const baseIntensity = parseFloat(cell.dataset.intensity);
          const noise = (Math.random() - 0.5) * 0.15;
          const intensity = Math.max(0, Math.min(1, baseIntensity + noise));
          const channel = ["A", "C", "G", "T"][chIdx];
          const color = BASE_COLORS[channel];
          cell.style.background = `rgba(${hexToRgb(color).join(",")},${0.1 + intensity * 0.85})`;
        });
      });
      frame++;
      if (frame < 120) requestAnimationFrame(animate);
      else setTimeout(animate, 2000);
    }
    animate();
  }

  initRawMatrix();

  return () => { isPlaying = false; };
}

function createBasecallingVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual basecalling-visual";
  container.innerHTML = `
    <div class="signal-panel">
      <div class="signal-header">
        <h3>光訊號解碼過程</h3>
        <span class="signal-badge">Putting It All Together</span>
      </div>
      <div class="signal-content">
        <div class="decoding-animation" id="decoding-animation"></div>
      </div>
    </div>
    <div class="info-panel">
      <div class="info-header">
        <h3>BCL → Raw FASTQ 轉換流程</h3>
      </div>
      <div class="info-content">
        <div class="conversion-pipeline">
          <div class="pipeline-step" id="pipeline-step-1">
            <div class="step-badge">1</div>
            <div class="step-body">
              <strong>讀取 BCL 二進位檔</strong>
              <p>解壓縮 Run-length encoded 光學訊號，還原每個 cluster 的四通道強度矩陣</p>
            </div>
          </div>
          <div class="pipeline-arrow">⟶</div>
          <div class="pipeline-step" id="pipeline-step-2">
            <div class="step-badge">2</div>
            <div class="step-body">
              <strong>背景扣除與去噪</strong>
              <p>去除光学背景雜訊、鄰近 cluster 串擾，強化信號</p>
            </div>
          </div>
          <div class="pipeline-arrow">⟶</div>
          <div class="pipeline-step" id="pipeline-step-3">
            <div class="step-badge">3</div>
            <div class="step-body">
              <strong>四通道比對 → 判讀鹼基</strong>
              <p>比較 R/G/Y/B 四通道強度，最強者即為判讀結果</p>
            </div>
          </div>
          <div class="pipeline-arrow">⟶</div>
          <div class="pipeline-step" id="pipeline-step-4">
            <div class="step-badge">4</div>
            <div class="step-body">
              <strong>計算 Q-score &amp; 輸出 FASTQ</strong>
              <p>最強 vs 次強通道差異 → Phred 品質分數，輸出四行 FASTQ</p>
            </div>
          </div>
        </div>
        <div class="live-conversion">
          <h4>即時轉換預覽</h4>
          <div class="conversion-demo">
            <div class="file-box" id="bc-file">
              <div class="file-icon">📦</div>
              <div class="file-label">BCL</div>
              <div class="file-ext">.bcl (二進位)</div>
            </div>
            <span class="arrow-symbol" id="conv-arrow">⟶</span>
            <div class="file-box" id="fq-file">
              <div class="file-icon">📄</div>
              <div class="file-label">Raw FASTQ</div>
              <div class="file-ext">.fastq.gz</div>
            </div>
          </div>
          <div class="conversion-log" id="conversion-log"></div>
        </div>
      </div>
    </div>
  `;
  return container;
}

function initBasecallingVisualization(container) {
  const decodingAnimation = container.querySelector("#decoding-animation");
  const convArrow = container.querySelector("#conv-arrow");
  const bcFile = container.querySelector("#bc-file");
  const fqFile = container.querySelector("#fq-file");
  const conversionLog = container.querySelector("#conversion-log");

  const channels = [
    { base: "A", label: "Ch1: Red (A/T)", color: BASE_COLORS.A },
    { base: "C", label: "Ch2: Green (C/G)", color: BASE_COLORS.C },
    { base: "G", label: "Ch3: Yellow", color: BASE_COLORS.G },
    { base: "T", label: "Ch4: Blue (Ref)", color: BASE_COLORS.T },
  ];

  const totalCycles = 6;
  const tilesPerCycle = 10;
  let isPlaying = true;

  // Generate cluster data for each cycle
  const cycleData = [];
  for (let c = 0; c < totalCycles; c++) {
    const clusters = [];
    const numClusters = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numClusters; i++) {
      const base = ["A", "C", "G", "T"][Math.floor(Math.random() * 4)];
      const intensities = { A: 0.05, C: 0.05, G: 0.05, T: 0.05 };
      intensities[base] = 0.6 + Math.random() * 0.4;
      const secondHighest = Math.max(...Object.values(intensities).filter(v => v !== intensities[base]));
      clusters.push({ base, intensities, qscore: Math.round(-10 * Math.log10(secondHighest / intensities[base])) });
    }
    cycleData.push(clusters);
  }

  // Build the decoding animation area with three stages
  decodingAnimation.innerHTML = `
    <div class="decoding-stages">
      <div class="decoding-stage" id="stage-input">
        <div class="stage-title">輸入：四通道光強度矩陣</div>
        <div class="optical-matrix" id="optical-matrix"></div>
        <p class="stage-desc">每個 cluster 一組 4 值 (R,G,Y,B)</p>
      </div>
      <div class="decoding-arrow">⟶</div>
      <div class="decoding-stage" id="stage-process">
        <div class="stage-title">演算法：比較四通道相對強度</div>
        <div class="algorithm-viz" id="algorithm-viz"></div>
      </div>
      <div class="decoding-arrow">⟶</div>
      <div class="decoding-stage" id="stage-output">
        <div class="stage-title">輸出：FASTQ 四行格式</div>
        <div class="fastq-output" id="fastq-output"></div>
      </div>
    </div>
  `;

  const opticalMatrix = decodingAnimation.querySelector("#optical-matrix");
  const algorithmViz = decodingAnimation.querySelector("#algorithm-viz");
  const fastqOutput = decodingAnimation.querySelector("#fastq-output");

  // Build optical matrix
  channels.forEach((ch, chIdx) => {
    const channelEl = document.createElement("div");
    channelEl.className = "matrix-channel";
    channelEl.innerHTML = `
      <div class="channel-header">
        <div class="channel-base">
          <span class="base-dot ${ch.base}"></span>
          <span class="channel-label">${ch.label}</span>
        </div>
      </div>
      <div class="matrix-grid" id="grid-${ch.base}"></div>
    `;
    opticalMatrix.appendChild(channelEl);

    const grid = channelEl.querySelector(`#grid-${ch.base}`);
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      for (let tile = 0; tile < tilesPerCycle; tile++) {
        const cell = document.createElement("div");
        cell.className = "matrix-cell";
        const intensity = Math.random() * 0.3;
        cell.style.background = `rgba(${hexToRgb(ch.color).join(",")},${0.1 + intensity})`;
        cell.dataset.base = "";
        cell.dataset.intensity = intensity.toFixed(2);
        cell.dataset.cycle = cycle;
        cell.dataset.tile = tile;
        cell.dataset.channel = ch.base;
        grid.appendChild(cell);
      }
    }
  });

  function renderFASTQForCycle(cycleIdx) {
    const clusters = cycleData[cycleIdx];
    let fastq = "";
    clusters.forEach((d, i) => {
      const seq = d.base + generateRandomSequence(20);
      const qual = generateQualityScores(seq.length);
      fastq += `@CLUSTER_${cycleIdx + 1}_${i + 1} cycle=${cycleIdx + 1}\n`;
      fastq += seq + "\n";
      fastq += "+\n";
      fastq += qual + "\n";
    });
    return fastq;
  }

  function renderFASTQDisplay(fastq) {
    const lines = fastq.split("\n");
    let html = "";
    lines.forEach((line, idx) => {
      const mod = idx % 4;
      let cls = "fastq-line";
      let formatted = line;
      if (mod === 0) {
        cls += " fastq-header";
      } else if (mod === 1) {
        cls += " fastq-seq";
        formatted = line.split("").map(b => {
          const baseClass = ["A","C","G","T"].includes(b) ? `fastq-base ${b}` : "fastq-base";
          return `<span class="${baseClass}">${b}</span>`;
        }).join("");
      } else if (mod === 2) {
        cls += " fastq-sep";
      } else {
        cls += " fastq-qual";
      }
      html += `<div class="${cls}">${formatted}</div>`;
    });
    fastqOutput.innerHTML = html;
  }

  function renderAlgorithmViz(data) {
    algorithmViz.innerHTML = data.map((d, i) => {
      const maxBase = d.base;
      return `
        <div class="cluster-comparison">
          <span class="cluster-id">Cluster ${i + 1}</span>
          <div class="bars">
            ${Object.entries(d.intensities).map(([b, v]) => `
              <div class="bar-wrapper">
                <div class="bar" style="height:${v * 100}%;background:${BASE_COLORS[b]};${b === maxBase ? 'box-shadow:0 0 8px ' + BASE_COLORS[b] : ''}"></div>
                <span class="bar-label" style="color:${BASE_COLORS[b]}">${b}</span>
              </div>
            `).join("")}
          </div>
          <span class="called-base" style="background:${BASE_COLORS[maxBase]}">${maxBase}</span>
        </div>
      `;
    }).join("");
  }

  // Animate decoding cycle by cycle
  function decodeCycle(cycle) {
    if (cycle >= totalCycles || !isPlaying) return;

    const grids = opticalMatrix.querySelectorAll(".matrix-grid");
    const channelColors = [BASE_COLORS.A, BASE_COLORS.C, BASE_COLORS.G, BASE_COLORS.T];

    grids.forEach((grid, chIdx) => {
      const cells = grid.querySelectorAll(".matrix-cell");
      const channel = ["A", "C", "G", "T"][chIdx];
      const channelColor = channelColors[chIdx];

      cells.forEach((cell) => {
        const cellCycle = parseInt(cell.dataset.cycle);
        if (cellCycle === cycle) {
          const baseIntensity = 0.5 + Math.random() * 0.5;
          cell.style.background = `rgba(${hexToRgb(channelColor).join(",")},${baseIntensity})`;
          cell.style.transform = "scale(1.15)";

          setTimeout(() => {
            cell.style.transform = "scale(1)";
            cell.classList.add("decoded");
            cell.dataset.base = channel;
          }, 150);
        }
      });
    });

    // Update algorithm viz
    renderAlgorithmViz(cycleData[cycle]);

    // Update FASTQ after decoding
    setTimeout(() => {
      const fastq = renderFASTQForCycle(cycle);
      renderFASTQDisplay(fastq);
    }, 600);

    // Update pipeline step
    const step = container.querySelector(`#pipeline-step-${cycle + 1}`);
    if (step) step.classList.add("active");

    currentCycle = cycle + 1;
    setTimeout(() => decodeCycle(currentCycle), 1200);
  }

  let currentCycle = 0;
  decodeCycle(0);

  // Live conversion animation
  const logMessages = [
    "📦 讀取 BCL 檔案... 解壓縮中",
    "🔧 背景扣除... 去噪處理中",
    "🔬 四通道比對中...",
    "✅ 判讀完成 → 輸出 FASTQ",
  ];

  let logIdx = 0;
  const logInterval = setInterval(() => {
    if (logIdx < logMessages.length) {
      conversionLog.innerHTML += `<div class="log-line">${logMessages[logIdx]}</div>`;
      logIdx++;
    } else {
      clearInterval(logInterval);
    }
  }, 1500);

  // Pulse BCL → FASTQ arrow
  let arrowActive = true;
  setInterval(() => {
    if (arrowActive) {
      bcFile.classList.add("highlight");
      fqFile.classList.add("highlight");
    } else {
      bcFile.classList.remove("highlight");
      fqFile.classList.remove("highlight");
    }
    arrowActive = !arrowActive;
  }, 1200);

  return () => { isPlaying = false; };
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function createDemultiplexingVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual demultiplexing-visual";
  container.innerHTML = `
    <div class="signal-panel">
      <div class="signal-header">
        <h3>Index 條碼解碼</h3>
        <span class="signal-badge">Read 1 前 6-8 bp</span>
      </div>
      <div class="signal-content">
        <div class="index-region-viz" id="index-region-viz">
          <div class="read-structure">
            <div class="read-segment index-seg">Index (6-8bp)</div>
            <div class="read-segment insert-seg">Insert Sequence (rest of read)</div>
          </div>
          <div class="index-decoding" id="index-decoding"></div>
          <div class="index-matches" id="index-matches"></div>
        </div>
      </div>
    </div>
    <div class="game-panel">
      <div class="game-header">
        <h3>Demultiplexing 拆包裹遊戲</h3>
        <div class="game-status">
          <span id="progress-text">已分類：0 / 12</span>
          <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
        </div>
      </div>
      <div class="game-content">
        <div class="bins-source">
          <h4>解碼出的 Index 條碼（拖動到對應樣品桶）</h4>
          <div class="index-source-list" id="index-source-list"></div>
        </div>
        <div class="bins-section">
          <div class="bins-header">Sample A ~ D 桶子</div>
          <div class="sample-bins" id="sample-bins"></div>
        </div>
        <div class="conversion-display">
          <div class="conversion-title">輸出檔案</div>
          <div class="conversion-arrow" id="output-files"></div>
        </div>
        <div class="game-complete" id="game-complete">
          <div class="complete-icon">✓</div>
          <div class="complete-text">
            <h4>Demultiplexing 完成！</h4>
            <p>所有 reads 已依 Index 歸檔至對應樣本 FASTQ</p>
          </div>
          <button class="complete-btn" id="complete-btn">查看下一關卡 (FastQC)</button>
        </div>
      </div>
    </div>
  `;
  return container;
}

function initDemultiplexingVisualization(container) {
  const indexDecoding = container.querySelector("#index-decoding");
  const indexMatches = container.querySelector("#index-matches");
  const indexSourceList = container.querySelector("#index-source-list");
  const sampleBins = container.querySelector("#sample-bins");
  const progressText = container.querySelector("#progress-text");
  const progressFill = container.querySelector("#progress-fill");
  const gameComplete = container.querySelector("#game-complete");
  const completeBtn = container.querySelector("#complete-btn");
  const outputFiles = container.querySelector("#output-files");

  const SAMPLES_DEMUX = [
    { id: "S001", name: "Sample A", index: "ATCACG", color: "#ff6b6b" },
    { id: "S002", name: "Sample B", index: "CGATGT", color: "#4da3ff" },
    { id: "S003", name: "Sample C", index: "TTAGGC", color: "#4cc38a" },
    { id: "S004", name: "Sample D", index: "TGACCA", color: "#ffb84d" },
  ];

  let indexItems = [];
  let sortedCount = 0;
  const totalItems = 12;
  let isPlaying = true;

  function initIndexDecoding() {
    indexDecoding.innerHTML = "";
    SAMPLES_DEMUX.forEach((sample) => {
      const item = document.createElement("div");
      item.className = "index-item";
      item.innerHTML = `
        <div class="index-sequence">${sample.index.split("").map(b => `<span class="base-${b}">${b}</span>`).join("")}</div>
        <div class="index-info">${sample.name} — ${sample.id}</div>
      `;
      indexDecoding.appendChild(item);
    });
  }

  function initIndexMatches() {
    indexMatches.innerHTML = "";
    const reads = [
      { seq: "ATCACG", match: "S001", mm: 0 },
      { seq: "CGATGT", match: "S002", mm: 0 },
      { seq: "TTAGGC", match: "S003", mm: 0 },
      { seq: "TGACCA", match: "S004", mm: 0 },
      { seq: "ATCACG", match: "S001", mm: 0 },
      { seq: "CGATGT", match: "S002", mm: 0 },
      { seq: "ATCACC", match: "S001", mm: 1 },
      { seq: "CGATGA", match: "S002", mm: 1 },
      { seq: "TTAGGC", match: "S003", mm: 0 },
      { seq: "TGACCA", match: "S004", mm: 0 },
      { seq: "ATCACG", match: "S001", mm: 0 },
      { seq: "CGATGT", match: "S002", mm: 0 },
    ];

    reads.forEach((read, i) => {
      const sample = SAMPLES_DEMUX.find(s => s.id === read.match);
      const item = document.createElement("div");
      item.className = "index-source-item";
      item.draggable = true;
      item.dataset.index = read.seq;
      item.dataset.sampleId = read.match;
      item.dataset.readId = i;
      item.innerHTML = `
        <span class="source-index" style="border-color:${sample.color}">${read.seq}</span>
        <span class="source-match" style="color:${sample.color}">${sample.name} ${read.mm > 0 ? "(1 mismatch)" : "✓"}</span>
      `;

      item.addEventListener("dragstart", (e) => {
        item.classList.add("dragging");
        e.dataTransfer.setData("text/plain", i);
      });
      item.addEventListener("dragend", () => item.classList.remove("dragging"));
      indexSourceList.appendChild(item);
      indexItems.push(item);
    });
  }

  function initSampleBins() {
    sampleBins.innerHTML = "";
    SAMPLES_DEMUX.forEach((sample) => {
      const bin = document.createElement("div");
      bin.className = "sample-bin";
      bin.dataset.sampleId = sample.id;
      bin.innerHTML = `
        <div class="bin-header">
          <div class="bin-label">
            <span class="bin-color" style="background:${sample.color}"></span>
            ${sample.name}
            <span class="bin-index-tag">${sample.index}</span>
          </div>
          <span class="bin-count">0 reads</span>
        </div>
        <div class="bin-reads" id="bin-reads-${sample.id}"></div>
      `;

      bin.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        bin.classList.add("drag-over");
      });
      bin.addEventListener("dragleave", () => bin.classList.remove("drag-over"));
      bin.addEventListener("drop", (e) => {
        e.preventDefault();
        bin.classList.remove("drag-over");
        const readId = parseInt(e.dataTransfer.getData("text/plain"));
        const item = indexItems[readId];
        if (item && item.dataset.sampleId === sample.id) {
          addReadToBin(sample.id, item);
          item.remove();
          indexItems[readId] = null;
          updateRemaining();
          checkComplete();
        } else if (item) {
          bin.style.animation = "shake 0.4s ease";
          setTimeout(() => bin.style.animation = "", 400);
        }
      });

      sampleBins.appendChild(bin);
    });
  }

  function updateRemaining() {
    const remaining = indexItems.filter(i => i !== null).length;
    progressText.textContent = `待分類項目 ${remaining}`;
    progressFill.style.width = `${((totalItems - remaining) / totalItems) * 100}%`;
  }

  function addReadToBin(sampleId, item) {
    const binReads = document.querySelector(`#bin-reads-${sampleId}`);
    const countEl = document.querySelector(`[data-sample-id="${sampleId}"] .bin-count`);
    const readEl = document.createElement("div");
    readEl.className = "sample-read";
    readEl.innerHTML = `<span class="read-index">${item.dataset.index}</span>`;
    binReads.appendChild(readEl);

    const currentCount = parseInt(countEl.textContent) || 0;
    countEl.textContent = `${currentCount + 1} reads`;

    const bin = document.querySelector(`[data-sample-id="${sampleId}"]`);
    bin.classList.add("filled");
  }

  function checkComplete() {
    const remaining = indexItems.filter(i => i !== null).length;
    if (remaining === 0) {
      setTimeout(() => {
        gameComplete.classList.add("visible");
        outputFiles.innerHTML = SAMPLES_DEMUX.map(s => `
          <div class="output-file-item">
            <div class="file-name">${s.name}</div>
            <div class="file-ext">${s.id}_R1.fastq.gz</div>
          </div>
        `).join("");
      }, 500);
    }
  }

  completeBtn.addEventListener("click", () => {
    showDetail(1, 0, cardsByStage[1][0]);
  });

  initIndexDecoding();
  initIndexMatches();
  initSampleBins();

  return () => { isPlaying = false; };
}

function createFastQCVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual fastqc-visual";
  container.innerHTML = `
    <div class="fastqc-left">
      <div class="fastqc-panel">
        <div class="fastqc-panel-header">
          <h3>Per-Base Quality Score</h3>
          <span class="fastqc-badge">Phred Q</span>
        </div>
        <div class="quality-chart" id="quality-chart">
          <div class="chart-area" id="chart-area">
            <div class="q-threshold-line" id="q-threshold"></div>
            <div class="q-red-zone" id="q-red-zone"></div>
            <div class="q-lines-container" id="q-lines"></div>
            <div class="q-mean-line" id="q-mean"></div>
          </div>
          <div class="chart-axis-x">
            <span>Position (bp)</span>
          </div>
          <div class="chart-axis-y">
            <span>Q40</span>
            <span>Q30</span>
            <span>Q20</span>
            <span>Q10</span>
          </div>
        </div>
      </div>
      <div class="fastqc-panel">
        <div class="fastqc-panel-header">
          <h3>Adapter Content</h3>
          <span class="fastqc-badge">Before / After</span>
        </div>
        <div class="adapter-chart" id="adapter-chart">
          <div class="adapter-bars" id="adapter-bars"></div>
        </div>
      </div>
      <div class="fastqc-summary">
        <div class="summary-stat">
          <span class="stat-label">Total Reads</span>
          <span class="stat-value" id="stat-reads">—</span>
          <span class="stat-change stat-down" id="reads-change"></span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Avg Quality</span>
          <span class="stat-value" id="stat-quality">—</span>
          <span class="stat-change stat-up" id="quality-change"></span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Adapter %</span>
          <span class="stat-value" id="stat-adapter">—</span>
          <span class="stat-change stat-down" id="adapter-change"></span>
        </div>
      </div>
    </div>
    <div class="fastqc-right">
      <div class="fastqc-file-panel">
        <div class="fastqc-file-icon">📄</div>
        <div class="fastqc-file-name">sample_R1.fastq</div>
        <div class="fastqc-file-type">Raw FASTQ · gzip</div>
      </div>
      <div class="fastqc-animation" id="fastqc-animation">
        <div class="fastqc-scanner" id="fastqc-scanner"></div>
        <div class="fastqc-steps" id="fastqc-steps"></div>
      </div>
      <div class="fastqc-progress">
        <div class="progress-bar" id="fastqc-progress-bar">
          <div class="progress-fill" id="fastqc-progress-fill"></div>
        </div>
        <div class="progress-label" id="fastqc-progress-label">等待分析...</div>
      </div>
    </div>
  `;
  return container;
}

function initFastQCVisualization(container) {
  const qualityChart = container.querySelector("#quality-chart");
  const qLines = container.querySelector("#q-lines");
  const qMean = container.querySelector("#q-mean");
  const qRedZone = container.querySelector("#q-red-zone");
  const qThreshold = container.querySelector("#q-threshold");
  const adapterBars = container.querySelector("#adapter-bars");
  const statReads = container.querySelector("#stat-reads");
  const statQuality = container.querySelector("#stat-quality");
  const statAdapter = container.querySelector("#stat-adapter");
  const readsChange = container.querySelector("#reads-change");
  const qualityChange = container.querySelector("#quality-change");
  const adapterChange = container.querySelector("#adapter-change");
  const fastqcScanner = container.querySelector("#fastqc-scanner");
  const fastqcSteps = container.querySelector("#fastqc-steps");
  const progressFill = container.querySelector("#fastqc-progress-fill");
  const progressLabel = container.querySelector("#fastqc-progress-label");

  let isPlaying = true;

  // Generate quality data (per-base Phred scores)
  const totalPositions = 50;
  const qualityData = [];
  for (let pos = 0; pos < totalPositions; pos++) {
    const baseQ = pos < 5 ? 25 + Math.random() * 10 :
                  pos < 15 ? 30 + Math.random() * 8 :
                  pos < 35 ? 28 + Math.random() * 7 :
                  20 + Math.random() * 10 - (pos - 35) * 0.3;
    const q = Math.max(5, Math.min(40, baseQ));
    qualityData.push({
      position: pos + 1,
      q: Math.round(q * 10) / 10,
      isLow: q < 20,
    });
  }

  // Generate mean quality
  const meanQuality = qualityData.map(d => {
    const mean = d.q + (Math.random() - 0.5) * 3;
    return Math.max(5, Math.min(40, Math.round(mean * 10) / 10));
  });

  // Generate adapter content data (before/after trimming)
  const adapterPositions = 20;
  const adapterBefore = [];
  const adapterAfter = [];
  for (let i = 0; i < adapterPositions; i++) {
    const before = i < 5 ? 5 + Math.random() * 15 :
                   i < 10 ? 3 + Math.random() * 10 :
                   Math.random() * 3;
    const after = i < 3 ? 1 + Math.random() * 3 :
                  Math.random() * 1;
    adapterBefore.push(Math.round(before * 10) / 10);
    adapterAfter.push(Math.round(after * 10) / 10);
  }

  // Render quality chart
  function renderQualityChart() {
    qLines.innerHTML = "";
    qualityData.forEach((d, i) => {
      const line = document.createElement("div");
      line.className = "q-line-point";
      const yPos = 100 - (d.q / 40) * 100;
      line.style.bottom = `${yPos}%`;
      line.style.left = `${(i / (totalPositions - 1)) * 100}%`;
      line.style.background = d.isLow ? "#ff6b6b" : "#4da3ff";
      line.style.boxShadow = d.isLow ? "0 0 6px #ff6b6b" : "0 0 4px #4da3ff";
      line.dataset.pos = d.position;
      line.dataset.q = d.q.toFixed(1);
      qLines.appendChild(line);
    });

    // Mean quality line
    qMean.innerHTML = "";
    meanQuality.forEach((q, i) => {
      const point = document.createElement("div");
      point.className = "q-mean-point";
      const yPos = 100 - (q / 40) * 100;
      point.style.bottom = `${yPos}%`;
      point.style.left = `${(i / (totalPositions - 1)) * 100}%`;
      qMean.appendChild(point);
    });

    // Red zone (Q < 20)
    const lowStart = qualityData.findIndex(d => d.isLow);
    const lowEnd = qualityData.reduce((last, d, i) => d.isLow ? i : last, -1);
    if (lowStart >= 0) {
      qRedZone.style.display = "block";
      qRedZone.style.left = `${(lowStart / (totalPositions - 1)) * 100}%`;
      qRedZone.style.width = `${((lowEnd - lowStart + 1) / (totalPositions - 1)) * 100}%`;
    } else {
      qRedZone.style.display = "none";
    }

    // Q20 threshold line
    const q20Y = 100 - (20 / 40) * 100;
    qThreshold.style.bottom = `${q20Y}%`;
    qThreshold.style.display = "block";
  }

  // Render adapter chart
  function renderAdapterChart() {
    adapterBars.innerHTML = "";
    const maxBars = 10;
    const step = Math.floor(adapterPositions / maxBars);

    for (let i = 0; i < maxBars; i++) {
      const idx = i * step;
      if (idx >= adapterPositions) break;
      const row = document.createElement("div");
      row.className = "adapter-row";

      const beforeBar = document.createElement("div");
      beforeBar.className = "adapter-bar before";
      beforeBar.style.height = `${Math.max(2, adapterBefore[idx] * 3)}px`;
      beforeBar.style.background = "rgba(255, 107, 107, 0.7)";
      beforeBar.title = `Before trim: ${adapterBefore[idx].toFixed(1)}%`;

      const afterBar = document.createElement("div");
      afterBar.className = "adapter-bar after";
      afterBar.style.height = `${Math.max(2, adapterAfter[idx] * 3)}px`;
      afterBar.style.background = "rgba(76, 195, 138, 0.7)";
      afterBar.title = `After trim: ${adapterAfter[idx].toFixed(1)}%`;

      row.appendChild(beforeBar);
      row.appendChild(afterBar);
      adapterBars.appendChild(row);
    }
  }

  // Update summary stats
  function updateStats() {
    const totalReads = 24500000 + Math.floor(Math.random() * 100000);
    const trimmedReads = totalReads - Math.floor(totalReads * (0.02 + Math.random() * 0.05));
    const avgQBefore = (28 + Math.random() * 3).toFixed(1);
    const avgQAfter = (32 + Math.random() * 4).toFixed(1);
    const adapterBefore = (8.5 + Math.random() * 3).toFixed(1);
    const adapterAfter = (1.2 + Math.random() * 1.5).toFixed(1);

    statReads.textContent = totalReads.toLocaleString();
    statQuality.textContent = avgQAfter;
    statAdapter.textContent = adapterAfter + "%";

    readsChange.textContent = `▼ ${((totalReads - trimmedReads) / totalReads * 100).toFixed(1)}%`;
    qualityChange.textContent = `▲ +${(avgQAfter - avgQBefore).toFixed(1)}`;
    adapterChange.textContent = `▼ ${adapterBefore}% → ${adapterAfter}%`;
  }

  // FastQC animation steps
  const fastqcStepsData = [
    { icon: "📊", label: "Per-base quality", color: "#4da3ff" },
    { icon: "🔗", label: "Adapter content", color: "#ff6b6b" },
    { icon: "🧬", label: "GC content", color: "#4cc38a" },
    { icon: "📋", label: "Sequence duplication", color: "#ffb84d" },
    { icon: "⚠️", label: "Overrepresented seq", color: "#ff6b6b" },
    { icon: "✅", label: "Report generated", color: "#4cc38a" },
  ];

  let currentStep = 0;
  let progress = 0;

  function runFastQCAnimation() {
    if (!isPlaying) return;

    if (currentStep < fastqcStepsData.length) {
      const step = fastqcStepsData[currentStep];
      const stepEl = document.createElement("div");
      stepEl.className = "fastqc-step";
      stepEl.innerHTML = `<span class="step-icon">${step.icon}</span><span class="step-label">${step.label}</span>`;
      stepEl.style.borderLeftColor = step.color;
      fastqcSteps.appendChild(stepEl);

      // Animate scanner
      fastqcScanner.style.top = `${20 + currentStep * 12}%`;
      fastqcScanner.style.opacity = "1";

      progress = ((currentStep + 1) / fastqcStepsData.length) * 100;
      progressFill.style.width = `${progress}%`;
      progressLabel.textContent = `分析中: ${step.label}...`;

      currentStep++;
      setTimeout(runFastQCAnimation, 800);
    } else {
      progressFill.style.width = "100%";
      progressLabel.textContent = "✅ FastQC 報告完成";
      fastqcScanner.style.opacity = "0";
    }
  }

  // Initial render
  renderQualityChart();
  renderAdapterChart();
  updateStats();

  // Start animation after a short delay
  setTimeout(runFastQCAnimation, 500);

  return () => { isPlaying = false; };
}

function createTrimmingVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual trimming-visual";
  container.innerHTML = `
    <div class="trimming-left">
      <div class="fastqc-panel">
        <div class="fastqc-panel-header">
          <h3>Per-Base Quality (Trimmed)</h3>
          <span class="fastqc-badge">After Trimming</span>
        </div>
        <div class="quality-chart" id="trim-quality-chart">
          <div class="chart-area" id="trim-chart-area">
            <div class="q-threshold-line" id="trim-q-threshold"></div>
            <div class="q-red-zone" id="trim-q-red-zone"></div>
            <div class="q-lines-container" id="trim-q-lines"></div>
            <div class="q-mean-line" id="trim-q-mean"></div>
          </div>
          <div class="chart-axis-x"><span>Position (bp)</span></div>
          <div class="chart-axis-y">
            <span>Q40</span><span>Q30</span><span>Q20</span><span>Q10</span>
          </div>
        </div>
      </div>
      <div class="fastqc-panel">
        <div class="fastqc-panel-header">
          <h3>Adapter Content (Trimmed)</h3>
          <span class="fastqc-badge">After Trimming</span>
        </div>
        <div class="adapter-chart" id="trim-adapter-chart">
          <div class="adapter-bars" id="trim-adapter-bars"></div>
        </div>
      </div>
      <div class="fastqc-summary">
        <div class="summary-stat">
          <span class="stat-label">Total Reads</span>
          <span class="stat-value" id="trim-stat-reads">—</span>
          <span class="stat-change stat-down" id="trim-reads-change"></span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Avg Quality</span>
          <span class="stat-value" id="trim-stat-quality">—</span>
          <span class="stat-change stat-up" id="trim-quality-change"></span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Adapter %</span>
          <span class="stat-value" id="trim-stat-adapter">—</span>
          <span class="stat-change stat-down" id="trim-adapter-change"></span>
        </div>
      </div>
    </div>
    <div class="trimming-right">
      <div class="trimming-file-flow">
        <div class="trim-file-box" id="trim-raw-file">
          <div class="file-icon">📄</div>
          <div class="file-name">sample_R1.fastq</div>
          <div class="file-type">Raw FASTQ</div>
        </div>
        <div class="trim-arrow-container">
          <div class="trim-arrow">→</div>
          <div class="trim-scissors-icon" id="trim-scissors">✂️</div>
        </div>
        <div class="trim-file-box" id="trim-clean-file">
          <div class="file-icon">📄</div>
          <div class="file-name">sample_R1.clean.fastq</div>
          <div class="file-type">Clean FASTQ</div>
        </div>
      </div>
      <div class="trimming-tools">
        <h4>修剪工具</h4>
        <div class="tool-row">
          <div class="tool-item" id="q-threshold-tool">
            <span class="tool-icon">✂️</span>
            <span class="tool-label">品質剪刀</span>
            <span class="tool-desc">拖動 Q 值門檻</span>
          </div>
        </div>
        <div class="tool-row">
          <div class="tool-item" id="adapter-scraper-tool">
            <span class="tool-icon">🧹</span>
            <span class="tool-label">Adapter 刮刀</span>
            <span class="tool-desc">拖動清除接頭</span>
          </div>
        </div>
      </div>
      <div class="trimming-slider-container">
        <label class="slider-label">Q 值門檻: <span id="q-threshold-value">20</span></label>
        <input type="range" class="q-threshold-slider" id="q-threshold-slider" min="10" max="35" value="20" step="1">
        <div class="slider-info">
          <span>低品質尾部將被裁切</span>
        </div>
      </div>
      <div class="trimming-progress">
        <div class="progress-bar" id="trim-progress-bar">
          <div class="progress-fill" id="trim-progress-fill"></div>
        </div>
        <div class="progress-label" id="trim-progress-label">準備修剪...</div>
      </div>
    </div>
  `;
  return container;
}

function initTrimmingVisualization(container) {
  const qLines = container.querySelector("#trim-q-lines");
  const qMean = container.querySelector("#trim-q-mean");
  const qRedZone = container.querySelector("#trim-q-red-zone");
  const qThreshold = container.querySelector("#trim-q-threshold");
  const adapterBars = container.querySelector("#trim-adapter-bars");
  const statReads = container.querySelector("#trim-stat-reads");
  const statQuality = container.querySelector("#trim-stat-quality");
  const statAdapter = container.querySelector("#trim-stat-adapter");
  const readsChange = container.querySelector("#trim-reads-change");
  const qualityChange = container.querySelector("#trim-quality-change");
  const adapterChange = container.querySelector("#trim-adapter-change");
  const qThresholdSlider = container.querySelector("#q-threshold-slider");
  const qThresholdValue = container.querySelector("#q-threshold-value");
  const trimProgressFill = container.querySelector("#trim-progress-fill");
  const trimProgressLabel = container.querySelector("#trim-progress-label");
  const trimScissors = container.querySelector("#trim-scissors");
  const rawFile = container.querySelector("#trim-raw-file");
  const cleanFile = container.querySelector("#trim-clean-file");

  let isPlaying = true;
  let currentQThreshold = 20;

  // Generate quality data (after trimming - improved quality in tail)
  const totalPositions = 50;
  const qualityDataTrimmed = [];
  for (let pos = 0; pos < totalPositions; pos++) {
    const baseQ = pos < 5 ? 25 + Math.random() * 10 :
                  pos < 15 ? 30 + Math.random() * 8 :
                  pos < 35 ? 28 + Math.random() * 7 :
                  22 + Math.random() * 8 - (pos - 35) * 0.1;
    const q = Math.max(5, Math.min(40, baseQ));
    qualityDataTrimmed.push({
      position: pos + 1,
      q: Math.round(q * 10) / 10,
      isLow: q < currentQThreshold,
    });
  }

  const meanQualityTrimmed = qualityDataTrimmed.map(d => {
    const mean = d.q + (Math.random() - 0.5) * 2;
    return Math.max(5, Math.min(40, Math.round(mean * 10) / 10));
  });

  // Adapter content after trimming (much lower)
  const adapterPositions = 20;
  const adapterAfterTrim = [];
  for (let i = 0; i < adapterPositions; i++) {
    const after = i < 2 ? 0.5 + Math.random() * 2 : Math.random() * 0.5;
    adapterAfterTrim.push(Math.round(after * 10) / 10);
  }

  function renderTrimmedQualityChart() {
    qLines.innerHTML = "";
    qualityDataTrimmed.forEach((d, i) => {
      const line = document.createElement("div");
      line.className = "q-line-point";
      const yPos = 100 - (d.q / 40) * 100;
      line.style.bottom = `${yPos}%`;
      line.style.left = `${(i / (totalPositions - 1)) * 100}%`;
      line.style.background = d.isLow ? "#ff6b6b" : "#4da3ff";
      line.style.boxShadow = d.isLow ? "0 0 6px #ff6b6b" : "0 0 4px #4da3ff";
      line.dataset.pos = d.position;
      line.dataset.q = d.q.toFixed(1);
      qLines.appendChild(line);
    });

    qMean.innerHTML = "";
    meanQualityTrimmed.forEach((q, i) => {
      const point = document.createElement("div");
      point.className = "q-mean-point";
      const yPos = 100 - (q / 40) * 100;
      point.style.bottom = `${yPos}%`;
      point.style.left = `${(i / (totalPositions - 1)) * 100}%`;
      qMean.appendChild(point);
    });

    const lowStart = qualityDataTrimmed.findIndex(d => d.isLow);
    const lowEnd = qualityDataTrimmed.reduce((last, d, i) => d.isLow ? i : last, -1);
    if (lowStart >= 0) {
      qRedZone.style.display = "block";
      qRedZone.style.left = `${(lowStart / (totalPositions - 1)) * 100}%`;
      qRedZone.style.width = `${((lowEnd - lowStart + 1) / (totalPositions - 1)) * 100}%`;
    } else {
      qRedZone.style.display = "none";
    }

    const qY = 100 - (currentQThreshold / 40) * 100;
    qThreshold.style.bottom = `${qY}%`;
    qThreshold.style.display = "block";
  }

  function renderTrimmedAdapterChart() {
    adapterBars.innerHTML = "";
    const maxBars = 10;
    const step = Math.floor(adapterPositions / maxBars);

    for (let i = 0; i < maxBars; i++) {
      const idx = i * step;
      if (idx >= adapterPositions) break;
      const row = document.createElement("div");
      row.className = "adapter-row";

      const afterBar = document.createElement("div");
      afterBar.className = "adapter-bar after";
      afterBar.style.height = `${Math.max(2, adapterAfterTrim[idx] * 6)}px`;
      afterBar.style.background = "rgba(76, 195, 138, 0.7)";
      afterBar.title = `After trim: ${adapterAfterTrim[idx].toFixed(1)}%`;

      row.appendChild(afterBar);
      adapterBars.appendChild(row);
    }
  }

  function updateTrimStats() {
    const totalReads = 24500000;
    const trimmedReads = totalReads - Math.floor(totalReads * 0.03);
    const avgQBefore = 28.5;
    const avgQAfter = (33 + Math.random() * 3).toFixed(1);
    const adapterBefore = 8.5;
    const adapterAfter = (1.0 + Math.random() * 0.8).toFixed(1);

    statReads.textContent = trimmedReads.toLocaleString();
    statQuality.textContent = avgQAfter;
    statAdapter.textContent = adapterAfter + "%";

    readsChange.textContent = `▼ ${((totalReads - trimmedReads) / totalReads * 100).toFixed(1)}%`;
    qualityChange.textContent = `▲ +${(avgQAfter - avgQBefore).toFixed(1)}`;
    adapterChange.textContent = `▼ ${adapterBefore}% → ${adapterAfter}%`;
  }

  // Q-threshold slider interaction
  qThresholdSlider.addEventListener("input", () => {
    currentQThreshold = parseInt(qThresholdSlider.value);
    qThresholdValue.textContent = currentQThreshold;

    qualityDataTrimmed.forEach(d => {
      d.isLow = d.q < currentQThreshold;
    });

    renderTrimmedQualityChart();

    // Animate scissors
    trimScissors.style.transform = `translateX(${currentQThreshold * 2}px)`;
    trimScissors.style.opacity = "1";

    // Update progress
    const trimPercent = Math.round((currentQThreshold / 35) * 100);
    trimProgressFill.style.width = `${trimPercent}%`;
    trimProgressLabel.textContent = `修剪中: Q ≥ ${currentQThreshold} 保留...`;
  });

  // Initial render
  renderTrimmedQualityChart();
  renderTrimmedAdapterChart();
  updateTrimStats();

  // Animate scissors into position
  trimScissors.style.opacity = "0";
  setTimeout(() => {
    trimScissors.style.transition = "all 0.5s ease";
    trimScissors.style.opacity = "1";
    trimScissors.style.transform = `translateX(${currentQThreshold * 2}px)`;
  }, 300);

  // Animate raw → clean file transition
  let trimPhase = 0;
  const trimPhases = [
    { label: "🔍 偵測 low-quality 區段...", progress: 20 },
    { label: "✂️ 裁切 Q < 20 尾部...", progress: 50 },
    { label: "🧹 移除 Adapter 序列...", progress: 75 },
    { label: "✅ 輸出 Clean FASTQ", progress: 100 },
  ];

  function runTrimAnimation() {
    if (!isPlaying) return;
    if (trimPhase < trimPhases.length) {
      const phase = trimPhases[trimPhase];
      trimProgressFill.style.width = `${phase.progress}%`;
      trimProgressLabel.textContent = phase.label;
      trimPhase++;
      setTimeout(runTrimAnimation, 1000);
    }
  }

  setTimeout(runTrimAnimation, 800);

  return () => { isPlaying = false; };
}

function createKaryotypeSVG() {
  const CHROMOSOMES = [
    { label: "1",  size: 248, cen: 0.45 },
    { label: "2",  size: 242, cen: 0.40 },
    { label: "3",  size: 198, cen: 0.47 },
    { label: "4",  size: 190, cen: 0.27 },
    { label: "5",  size: 181, cen: 0.29 },
    { label: "6",  size: 170, cen: 0.35 },
    { label: "7",  size: 159, cen: 0.37 },
    { label: "8",  size: 145, cen: 0.35 },
    { label: "9",  size: 138, cen: 0.36 },
    { label: "10", size: 133, cen: 0.36 },
    { label: "11", size: 135, cen: 0.40 },
    { label: "12", size: 133, cen: 0.39 },
    { label: "13", size: 115, cen: 0.17 },
    { label: "14", size: 107, cen: 0.18 },
    { label: "15", size: 102, cen: 0.19 },
    { label: "16", size: 90,  cen: 0.43 },
    { label: "17", size: 83,  cen: 0.40 },
    { label: "18", size: 80,  cen: 0.30 },
    { label: "19", size: 59,  cen: 0.48 },
    { label: "20", size: 63,  cen: 0.46 },
    { label: "21", size: 48,  cen: 0.25 },
    { label: "22", size: 51,  cen: 0.27 },
    { label: "X",  size: 156, cen: 0.37 },
    { label: "Y",  size: 57,  cen: 0.40 },
  ];

  const ROWS = [
    [0, 1, 2],
    [3, 4],
    [5, 6, 7, 8, 9, 10, 11],
    [12, 13, 14],
    [15, 16, 17],
    [18, 19],
    [20, 21],
    [22, 23],
  ];

  const lerp = (a, b, f) => a + (b - a) * f;

  function halfWidth(t, r) {
    if (t < r) {
      if (t < r * 0.22) return lerp(0.05, 1, t / (r * 0.22));
      if (t < r * 0.80) return 1;
      return lerp(1, 0.16, (t - r * 0.80) / (r * 0.20));
    }
    const u = (t - r) / (1 - r);
    if (u < 0.20) return lerp(0.16, 1, u / 0.20);
    if (u < 0.72) return 1;
    return lerp(1, 0.05, (u - 0.72) / 0.28);
  }

  function chromHeight(size) {
    return 16 + (size / 248) * 88;
  }

  function chromPath(cx, cy, h, w, r) {
    const N = 36;
    const top = cy - h / 2;
    let d = `M ${cx.toFixed(1)} ${top.toFixed(1)}`;
    for (let k = 1; k <= N; k++) {
      const t = k / N;
      d += ` L ${(cx - halfWidth(t, r) * w).toFixed(1)} ${(top + t * h).toFixed(1)}`;
    }
    for (let k = N - 1; k >= 0; k--) {
      const t = k / N;
      d += ` L ${(cx + halfWidth(t, r) * w).toFixed(1)} ${(top + t * h).toFixed(1)}`;
    }
    return d + " Z";
  }

  function chromBands(cx, cy, h, w, r) {
    const top = cy - h / 2;
    const bandH = Math.max(2, Math.min(4.5, h * 0.06));
    const pBands = [0.20, 0.42, 0.68].map(f => f * r);
    const qBands = [0.22, 0.40, 0.58, 0.76, 0.90].map(f => r + f * (1 - r));
    return pBands.concat(qBands).map(t => {
      const y = top + t * h;
      const hw = halfWidth(t, r) * w;
      const bw = Math.max(1.5, hw * 1.4);
      return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(y - bandH / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${bandH.toFixed(1)}" rx="1" fill="#6b64a5" opacity="0.5"/>`;
    }).join("");
  }

  const W = 940;
  const CELL_W = 110;
  const W_MAX = 9;

  const rowLayout = [];
  let yCursor = 30;
  ROWS.forEach((row) => {
    const maxH = Math.max(...row.map(i => chromHeight(CHROMOSOMES[i].size)));
    rowLayout.push({ row, maxH, y: yCursor });
    yCursor += maxH + 28;
  });
  const H = yCursor + 8;

  let shapes = "";
  let bands = "";
  let labels = "";

  rowLayout.forEach(({ row, maxH, y }) => {
    const n = row.length;
    const totalW = n * CELL_W;
    const xStart = (W - totalW) / 2 + CELL_W / 2;
    row.forEach((idx, i) => {
      const chrom = CHROMOSOMES[idx];
      const cx = xStart + i * CELL_W;
      const cy = y + maxH / 2;
      const h = chromHeight(chrom.size);
      const isSex = idx >= 22;
      const color = isSex ? "#ffb84d" : "#c9c2f0";
      const gap = 26;
      const rods = isSex ? [0] : [-gap, gap];

      rods.forEach((ox) => {
        shapes += `<path d="${chromPath(cx + ox, cy, h, W_MAX, chrom.cen)}" fill="${color}" stroke="#8f88cd" stroke-width="0.8" stroke-linejoin="round"/>`;
        bands += chromBands(cx + ox, cy, h, W_MAX, chrom.cen);
        labels += `<text x="${(cx + ox).toFixed(1)}" y="${(y + maxH + 20).toFixed(1)}" text-anchor="middle" font-size="${isSex ? 13 : 12}" font-weight="700" fill="${isSex ? "#ffb84d" : "#8b96ab"}">${chrom.label}</text>`;
      });
    });
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="人類正常核型，23 對染色體">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#0a0e17"/>
      <text x="${W / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="#e6e9f2">人類正常核型 · 46,XY（參考基因體 hg38 / GRCh38）</text>
      ${shapes}
      ${bands}
      ${labels}
    </svg>
  `;
}

function createAlignmentVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual alignment-visual";
  container.innerHTML = `
    <div class="alignment-left">
      <div class="fastqc-panel karyotype-panel">
        <div class="fastqc-panel-header">
          <h3>人類參考基因體 hg38</h3>
          <span class="fastqc-badge">23 對染色體</span>
        </div>
        <div class="karyotype-wrap">${createKaryotypeSVG()}</div>
      </div>
    </div>
    <div class="alignment-right">
      <div class="fastqc-panel">
        <div class="fastqc-panel-header">
          <h3>Read 比對地圖</h3>
          <span class="fastqc-badge ref-badge-lg">hg38 Reference</span>
        </div>
        <div class="alignment-map" id="alignment-map">
           <div class="ref-sequence" id="ref-sequence"></div>
           <div class="reads-container" id="reads-container"></div>
           <div class="alignment-result" id="alignment-result"></div>
           <div class="alignment-legend">
              <span class="legend-item"><span class="legend-dot" style="background:#ff6b6b"></span> A (紅)</span>
              <span class="legend-item"><span class="legend-dot" style="background:#ffa500"></span> C (橙)</span>
              <span class="legend-item"><span class="legend-dot" style="background:#4da3ff"></span> G (藍)</span>
              <span class="legend-item"><span class="legend-dot" style="background:#4cc38a"></span> T (綠)</span>
              <span class="legend-item"><span class="legend-dot" style="background:rgba(255,255,255,0.15)"></span> 不匹配 (灰)</span>
           </div>
         </div>
       </div>
       <div class="fastqc-panel">
         <div class="fastqc-panel-header">
           <h3>比對結果</h3>
           <span class="fastqc-badge">SAM Format</span>
         </div>
       <div class="sam-output" id="sam-output"></div>
       </div>
    </div>
  `;
  return container;
}

function initAlignmentVisualization(container) {
  const refSequence = container.querySelector("#ref-sequence");
  const readsContainer = container.querySelector("#reads-container");
  const alignmentResult = container.querySelector("#alignment-result");
  const samOutput = container.querySelector("#sam-output");
  const alignProgressFill = container.querySelector("#align-progress-fill");
  const alignProgressLabel = container.querySelector("#align-progress-label");

  const refBases = "TGAATTTTGGATTACTAAGGAATTTACAGTACAAAAATGTACTTGTTAACACAGTGACAT";
  const refLength = refBases.length;
  const refStart = 10000001;

  const reads = [
    { id: "Read 1", seq: "TGAATTTTGGATTAC", color: "#ff6b6b", aligned: false, position: -1 },
    { id: "Read 2", seq: "ATTACTAAGGAATTTAC", color: "#4da3ff", aligned: false, position: -1 },
    { id: "Read 3", seq: "AATTTACAGTACAAAAAT", color: "#4cc38a", aligned: false, position: -1 },
    { id: "Read 4", seq: "GTACTTGTTAACAC", color: "#ffb84d", aligned: false, position: -1 },
    { id: "Read 5", seq: "ACACAGTGACAT", color: "#7a6bff", aligned: false, position: -1 },
  ];

  let isPlaying = true;
  let alignedCount = 0;

  function renderReference() {
    refSequence.innerHTML = "";
    const refLabel = document.createElement("div");
    refLabel.className = "ref-label";
    refLabel.textContent = `hg38 chr1: ${refStart.toLocaleString()}–${(refStart + refLength - 1).toLocaleString()}`;
    refSequence.appendChild(refLabel);

    const refBasesEl = document.createElement("div");
    refBasesEl.className = "ref-bases";
    refBases.split("").forEach((base, i) => {
      const baseEl = document.createElement("span");
      baseEl.className = `ref-base base-${base}`;
      baseEl.textContent = base;
      baseEl.dataset.pos = i;
      refBasesEl.appendChild(baseEl);
    });
    refSequence.appendChild(refBasesEl);
  }

  const baseColorMap = { A: "#ff6b6b", C: "#ffa500", G: "#4da3ff", T: "#4cc38a" };

  function renderReads() {
    readsContainer.innerHTML = "";
    reads.forEach((read, idx) => {
      const readEl = document.createElement("div");
      readEl.className = "read-item";
      readEl.draggable = true;
      readEl.dataset.readId = idx;
       readEl.style.borderColor = "#c0c0c0";
       readEl.innerHTML = `
         <span class="read-id">${read.id}</span>
        <span class="read-seq">${read.seq.split("").map(b => `<span style="color:${baseColorMap[b] || '#ccc'}">${b}</span>`).join("")}</span>
      `;

      readEl.addEventListener("dragstart", (e) => {
        readEl.classList.add("dragging");
        e.dataTransfer.setData("text/plain", idx.toString());
      });
      readEl.addEventListener("dragend", () => readEl.classList.remove("dragging"));

      readsContainer.appendChild(readEl);
    });
  }

  refSequence.addEventListener("wheel", (e) => {
    const bases = refSequence.querySelector(".ref-bases");
    if (!bases) return;
    if (bases.scrollWidth <= bases.clientWidth) return;
    if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      e.preventDefault();
      bases.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  refSequence.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  refSequence.addEventListener("drop", (e) => {
    e.preventDefault();
    const readIdx = parseInt(e.dataTransfer.getData("text/plain"));
    if (isNaN(readIdx) || readIdx < 0 || readIdx >= reads.length) return;

    const read = reads[readIdx];
    if (read.aligned) return;

    const bases = refSequence.querySelector(".ref-bases");
    const rect = refSequence.getBoundingClientRect();
    const x = e.clientX - rect.left + (bases ? bases.scrollLeft : 0);
    const pos = Math.round((x / (bases ? bases.scrollWidth : rect.width)) * refLength) - Math.floor(read.seq.length / 2);
    const clampedPos = Math.max(0, Math.min(refLength - read.seq.length, pos));

    read.aligned = true;
    read.position = clampedPos;
    read.matchCount = 0;
    alignedCount++;

    const matchCount = highlightAlignment(read, clampedPos);
    read.matchCount = matchCount;

    const progress = Math.round((alignedCount / reads.length) * 100);
    if (alignProgressFill) alignProgressFill.style.width = `${progress}%`;
    if (alignProgressLabel) alignProgressLabel.textContent = `比對中: ${read.id} → chr1:${refStart + clampedPos} (${matchCount}/${read.seq.length} match)`;

    const readEl = readsContainer.querySelector(`[data-read-id="${readIdx}"]`);
    if (readEl) {
      readEl.style.opacity = "0.3";
      readEl.draggable = false;
      readEl.classList.add("aligned");
    }

    if (alignedCount === reads.length) {
      if (alignProgressLabel) alignProgressLabel.textContent = "✅ 所有 Read 比對完成！";
      renderSAMOutput();
    }
  });

  function highlightAlignment(read, startPos) {
    const baseEls = refSequence.querySelectorAll(".ref-base");
    const complement = { A: "T", T: "A", C: "G", G: "C" };
    let matchCount = 0;

    for (let i = 0; i < read.seq.length; i++) {
      const idx = startPos + i;
      if (idx < 0 || idx >= baseEls.length) continue;
      baseEls[idx].classList.add("aligned-base");
      const refBase = refBases[idx];
      const isMatch = refBase === complement[read.seq[i]];
      if (isMatch) {
        baseEls[idx].style.background = read.color;
        baseEls[idx].style.opacity = "0.7";
        baseEls[idx].style.boxShadow = `0 0 8px ${read.color}`;
        matchCount++;
      } else {
        baseEls[idx].style.background = "rgba(255,255,255,0.15)";
        baseEls[idx].style.opacity = "0.5";
      }
    }

    const indicator = document.createElement("div");
    indicator.className = "alignment-indicator";
    indicator.style.left = `${(startPos / refLength) * 100}%`;
    indicator.style.width = `${Math.max(2, (read.seq.length / refLength) * 100)}%`;
    indicator.style.background = `linear-gradient(90deg, ${read.color} 0%, ${read.color} 100%)`;
    indicator.innerHTML = `<span class="indicator-label">${read.id} (${matchCount}/${read.seq.length})</span>`;
    alignmentResult.appendChild(indicator);

    return matchCount;
  }

  function renderSAMOutput() {
    samOutput.innerHTML = "";
    const header = document.createElement("div");
    header.className = "sam-header";
    header.textContent = "@HD\tVN:1.0\tSO:coordinate";
    samOutput.appendChild(header);

    const header2 = document.createElement("div");
    header2.className = "sam-header";
    header2.textContent = "@SQ\tSN:chr1\tLN:60";
    samOutput.appendChild(header2);

    reads.forEach((read) => {
      if (read.aligned && read.position >= 0) {
        const line = document.createElement("div");
        line.className = "sam-line";
        const endPos = read.position + read.seq.length;
        line.innerHTML = `
          <span class="sam-qname">${read.id}</span>
          <span class="sam-flag">0</span>
          <span class="sam-rname">chr1</span>
          <span class="sam-pos">${refStart + read.position}</span>
          <span class="sam-mapq">60</span>
           <span class="sam-cigar">${read.seq.length}M (${read.matchCount}/${read.seq.length} match)</span>
          <span class="sam-rnext">*</span>
          <span class="sam-pnext">0</span>
          <span class="sam-tlen">${read.seq.length}</span>
          <span class="sam-seq">${read.seq.split("").map(b => `<span style="color:${baseColorMap[b] || '#ccc'}">${b}</span>`).join("")}</span>
          <span class="sam-qual">*</span>
        `;
        samOutput.appendChild(line);
      }
    });
  }

  renderReference();
  renderReads();

  return () => { isPlaying = false; };
}

function createMarkDuplicatesVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual mark-duplicates-visual";
  container.innerHTML = `
    <div class="mark-duplicates-left">
      <div class="fastqc-panel">
        <div class="fastqc-panel-header">
          <h3>Duplicate Reads (SAM Flag 1024)</h3>
          <span class="fastqc-badge">PCR Duplicate</span>
        </div>
        <div class="dup-flag-table" id="dup-flag-table">
          <table class="dup-sam-table">
            <thead>
              <tr>
                <th>QName</th>
                <th>Flag</th>
                <th>RNAME</th>
                <th>POS</th>
                <th>LEN</th>
                <th>Duplicate</th>
              </tr>
            </thead>
            <tbody id="dup-table-body"></tbody>
          </table>
        </div>
      </div>
      <div class="fastqc-panel">
        <div class="fastqc-panel-header">
          <h3>Duplication Rate</h3>
          <span class="fastqc-badge">Per-Library</span>
        </div>
        <div class="dup-rate-chart">
          <div class="rate-legend">
            <span class="rate-legend-item"><span class="rate-dot"></span> Unique Reads</span>
            <span class="rate-legend-item"><span class="rate-dot dup-dot"></span> Duplicate Reads</span>
          </div>
          <div class="rate-histogram" id="rate-histogram"></div>
          <div class="rate-text" id="rate-text">0% / 0 reads</div>
        </div>
      </div>
      <div class="fastqc-panel">
        <div class="fastqc-panel-header">
          <h3>Real Coverage</h3>
          <span class="fastqc-badge">Before / After Dedup</span>
        </div>
        <div class="coverage-panel">
          <div class="coverage-track">
            <div class="cov-label-row">
              <span class="cov-label">Raw Coverage</span>
              <span class="cov-value" id="cov-raw-val">—</span>
            </div>
            <div class="cov-bar-container" id="cov-raw-bars"></div>
          </div>
          <div class="coverage-track">
            <div class="cov-label-row">
              <span class="cov-label">Dedup Coverage</span>
              <span class="cov-value" id="cov-dedup-val">—</span>
            </div>
            <div class="cov-bar-container" id="cov-dedup-bars"></div>
          </div>
        </div>
      </div>
      <div class="fastqc-summary">
        <div class="summary-stat">
          <span class="stat-label">Total Reads</span>
          <span class="stat-value" id="dup-stat-total">—</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Duplicate Reads</span>
          <span class="stat-value" id="dup-stat-dups">—</span>
          <span class="stat-change stat-down" id="dup-stat-rate"></span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Coverage</span>
          <span class="stat-value" id="dup-stat-cov">—</span>
        </div>
      </div>
    </div>
    <div class="mark-duplicates-right">
      <div class="trimming-file-flow">
        <div class="trim-file-box" id="dup-raw-bam">
          <div class="file-icon">📦</div>
          <div class="file-name">sample.bam</div>
          <div class="file-type">Raw BAM</div>
        </div>
        <div class="dup-arrow-container">
          <div class="dup-arrow">→</div>
          <div class="dup-mark-icon" id="dup-mark-icon">📝</div>
        </div>
        <div class="trim-file-box" id="dup-marked-bam">
          <div class="file-icon">📦</div>
          <div class="file-name">sample.dupmarked.bam</div>
          <div class="file-type">Dup-marked BAM</div>
        </div>
      </div>
      <div class="dup-game-panel">
        <h4>Stamp Duplicates 遊戲</h4>
        <p class="tool-desc">點擊相同起始位置與長度的重複 reads，標記 Duplicate Flag (1024)</p>
        <div class="dup-reads-axis" id="dup-reads-axis">
          <div class="axis-track"></div>
          <div class="axis-labels" id="axis-labels"></div>
          <div class="dup-reads-board" id="dup-reads-board"></div>
        </div>
        <div class="dup-game-controls">
          <button class="dup-mark-btn" id="dup-mark-btn" disabled>一鍵標記全部</button>
          <span class="dup-game-hint" id="dup-game-hint">請點擊一個 Duplicate Read 開始</span>
        </div>
      </div>
      <div class="trimming-progress">
        <div class="progress-bar" id="dup-progress-bar">
          <div class="progress-fill" id="dup-progress-fill"></div>
        </div>
        <div class="progress-label" id="dup-progress-label">等待標記重複 reads...</div>
      </div>
    </div>
  `;
  return container;
}

function initMarkDuplicatesVisualization(container) {
  const tableBody = container.querySelector("#dup-table-body");
  const rateHistogram = container.querySelector("#rate-histogram");
  const rateText = container.querySelector("#rate-text");
  const rawBars = container.querySelector("#cov-raw-bars");
  const dedupBars = container.querySelector("#cov-dedup-bars");
  const covRawVal = container.querySelector("#cov-raw-val");
  const covDedupVal = container.querySelector("#cov-dedup-val");
  const statTotal = container.querySelector("#dup-stat-total");
  const statDups = container.querySelector("#dup-stat-dups");
  const statRate = container.querySelector("#dup-stat-rate");
  const statCov = container.querySelector("#dup-stat-cov");
  const readsBoard = container.querySelector("#dup-reads-board");
  const axisLabels = container.querySelector("#axis-labels");
  const markBtn = container.querySelector("#dup-mark-btn");
  const hintEl = container.querySelector("#dup-game-hint");
  const rawBamEl = container.querySelector("#dup-raw-bam");
  const markedBamEl = container.querySelector("#dup-marked-bam");
  const markIcon = container.querySelector("#dup-mark-icon");
  const progressFill = container.querySelector("#dup-progress-fill");
  const progressLabel = container.querySelector("#dup-progress-label");

  const READ_FLAG_DUPLICATE = 1024;
  const refStart = 10000001;
  const refLength = 120;

  let isPlaying = true;
  let markedCount = 0;

  const positions = [
    { start: 5,  len: 60, dup: 1 },
    { start: 10, len: 55, dup: 2 },
    { start: 20, len: 60, dup: 1 },
    { start: 35, len: 50, dup: 2 },
    { start: 50, len: 60, dup: 1 },
    { start: 60, len: 55, dup: 0 },
    { start: 70, len: 50, dup: 1 },
    { start: 80, len: 60, dup: 2 },
    { start: 90, len: 55, dup: 1 },
    { start: 100, len: 50, dup: 0 },
    { start: 5,  len: 55, dup: 0 },
    { start: 15, len: 60, dup: 0 },
    { start: 40, len: 50, dup: 1 },
    { start: 55, len: 60, dup: 0 },
    { start: 78, len: 50, dup: 1 },
  ];

  const colors = ["#4da3ff", "#7a6bff", "#4cc38a", "#ffb84d"];
  let readCounter = 0;
  const reads = [];

  positions.forEach((pos) => {
    readCounter++;
    reads.push({
      id: "READ_" + String(readCounter).padStart(3, "0"),
      start: pos.start,
      length: pos.len,
      seq: generateRandomSequence(pos.len),
      isDuplicate: false,
      isMarked: false,
      color: colors[readCounter % colors.length],
      flag: 0,
      chrPos: refStart + pos.start,
    });

    for (let d = 0; d < pos.dup; d++) {
      readCounter++;
      reads.push({
        id: "READ_" + String(readCounter).padStart(3, "0"),
        start: pos.start,
        length: pos.len,
        seq: generateRandomSequence(pos.len),
        isDuplicate: true,
        isMarked: false,
        color: "#ff6b6b",
        flag: 0,
        chrPos: refStart + pos.start,
      });
    }
  });

  reads.sort((a, b) => a.start - b.start);

  const totalReads = reads.length;
  const dupCount = reads.filter(r => r.isDuplicate).length;
  const dupRate = (dupCount / totalReads) * 100;

  function renderFlagTable() {
    tableBody.innerHTML = "";
    reads.forEach((read, idx) => {
      const row = document.createElement("tr");
      row.classList.add(read.isMarked ? "dup-marked-row" : "dup-normal-row");
      row.dataset.readId = idx;

      const flagVal = read.isMarked ? READ_FLAG_DUPLICATE : 0;
      let dupText = "—";
      if (read.isMarked) {
        dupText = "✓ DUP (1024)";
      } else if (read.isDuplicate) {
        dupText = "⚑ (click to mark)";
      }

      row.innerHTML = `
        <td class="dup-qname" style="color:${read.color}">${read.id}</td>
        <td class="dup-flag">${flagVal}</td>
        <td class="dup-rname">chr1</td>
        <td class="dup-pos">${read.chrPos}</td>
        <td class="dup-len">${read.length}</td>
        <td class="dup-status" style="color:${read.isMarked ? "#ff6b6b" : read.isDuplicate ? "var(--accent-2)" : "var(--text-dim)"}">${dupText}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  function renderRateChart() {
    const uniqueCount = totalReads - dupCount;
    const uniquePct = (uniqueCount / totalReads) * 100;
    const markedSoFar = Math.min(markedCount, dupCount);
    const remainingDup = dupCount - markedSoFar;

    rateHistogram.innerHTML = "";

    const uniqueBar = document.createElement("div");
    uniqueBar.className = "rate-bar-seg";
    uniqueBar.style.height = uniquePct > 0 ? `${uniquePct}%` : "2%";
    uniqueBar.style.background = "rgba(76, 195, 138, 0.8)";
    uniqueBar.title = "Unique: " + uniqueCount + " (" + uniquePct.toFixed(1) + "%)";
    uniqueBar.innerHTML = `<span class="rate-bar-label">${uniquePct.toFixed(1)}%</span>`;
    rateHistogram.appendChild(uniqueBar);

    const dupBar = document.createElement("div");
    dupBar.className = "rate-bar-seg";
    dupBar.style.height = dupRate > 0 ? `${dupRate}%` : "2%";
    dupBar.style.background = "rgba(255, 107, 107, 0.8)";
    dupBar.title = "Duplicate: " + dupCount + " (" + dupRate.toFixed(1) + "%)";
    dupBar.innerHTML = `<span class="rate-bar-label">${dupRate.toFixed(1)}%</span>`;
    rateHistogram.appendChild(dupBar);

    rateText.textContent = dupRate.toFixed(1) + "% duplication · " + dupCount + " / " + totalReads + " reads";
  }

  function renderCoverage() {
    const bins = 12;
    const binSize = Math.ceil(refLength / bins);

    const rawCoverage = new Array(bins).fill(0);
    reads.forEach(read => {
      const startBin = Math.floor(read.start / binSize);
      const endBin = Math.min(bins - 1, Math.floor((read.start + read.length - 1) / binSize));
      for (let b = startBin; b <= endBin; b++) rawCoverage[b] += 1;
    });

    const dedupCoverage = new Array(bins).fill(0);
    reads.forEach(read => {
      if (read.isMarked) return;
      const startBin = Math.floor(read.start / binSize);
      const endBin = Math.min(bins - 1, Math.floor((read.start + read.length - 1) / binSize));
      for (let b = startBin; b <= endBin; b++) dedupCoverage[b] += 1;
    });

    const maxRaw = Math.max(...rawCoverage, 1);
    const maxDedup = Math.max(...dedupCoverage, 1);
    const rawAvg = (rawCoverage.reduce((a, b) => a + b, 0) / bins).toFixed(1);
    const dedupAvg = (dedupCoverage.reduce((a, b) => a + b, 0) / bins).toFixed(1);
    const covReduction = ((parseFloat(rawAvg) - parseFloat(dedupAvg)) / parseFloat(rawAvg) * 100).toFixed(1);

    covRawVal.textContent = "Avg: " + rawAvg + "x";
    covDedupVal.textContent = "Avg: " + dedupAvg + "x";

    rawBars.innerHTML = "";
    rawCoverage.forEach(val => {
      const bar = document.createElement("div");
      bar.className = "cov-bar";
      bar.style.height = (val / maxRaw) * 100 + "%";
      bar.style.background = "rgba(255, 184, 77, 0.7)";
      bar.title = val + "x";
      bar.innerHTML = `<span class="cov-bar-label">${val}</span>`;
      rawBars.appendChild(bar);
    });

    dedupBars.innerHTML = "";
    dedupCoverage.forEach(val => {
      const bar = document.createElement("div");
      bar.className = "cov-bar";
      bar.style.height = val > 0 ? (val / maxDedup) * 100 + "%" : "2%";
      bar.style.background = val === 0 ? "rgba(255, 107, 107, 0.15)" : "rgba(76, 195, 138, 0.7)";
      bar.title = val + "x";
      bar.innerHTML = `<span class="cov-bar-label">${val}</span>`;
      dedupBars.appendChild(bar);
    });

    statCov.textContent = covReduction + "% ↓";
  }

  function renderAxisLabels() {
    axisLabels.innerHTML = "";
    const ticks = [0, 20, 40, 60, 80, 100, 120];
    ticks.forEach(t => {
      const label = document.createElement("span");
      label.className = "axis-tick";
      label.style.left = (t / refLength) * 100 + "%";
      label.textContent = t;
      axisLabels.appendChild(label);
    });
  }

  function renderReadsBoard() {
    readsBoard.innerHTML = "";
    const rows = [];
    reads.forEach(read => {
      const top = read.start * 1.6;
      let placed = false;
      for (const row of rows) {
        const overlap = row.reads.some(r =>
          !(read.start + read.length <= r.start || r.start + r.length <= read.start)
        );
        if (!overlap) {
          row.reads.push(read);
          read._rowTop = row.top;
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push({ top: rows.length * 22, reads: [read] });
        read._rowTop = rows[rows.length - 1].top;
      }
    });

    reads.forEach((read, idx) => {
      const readEl = document.createElement("div");
      readEl.className = "dup-read-item";
      readEl.dataset.readId = idx;

      const relStart = (read.start / refLength) * 100;
      const relWidth = Math.max(2, (read.length / refLength) * 100);

      readEl.style.left = relStart + "%";
      readEl.style.width = relWidth + "%";
      readEl.style.top = read._rowTop + "px";

      if (read.isMarked) {
        readEl.style.background = "rgba(255, 107, 107, 0.25)";
        readEl.style.borderColor = "#ff6b6b";
        readEl.style.opacity = "0.5";
      } else if (read.isDuplicate) {
        readEl.style.background = "rgba(255, 107, 107, 0.15)";
        readEl.style.borderColor = "var(--accent-2)";
      } else {
        readEl.style.background = read.color + "20";
        readEl.style.borderColor = read.color;
      }

      const statusText = read.isMarked ? "DUP 1024" : read.isDuplicate ? "DUPLICATE" : "UNIQUE";
      const statusColor = read.isMarked ? "#ff6b6b" : read.isDuplicate ? "var(--accent-2)" : "var(--text-dim)";

      readEl.innerHTML = `
        <span class="dup-read-id" style="color:${read.color}">${read.id}</span>
        <span class="dup-read-seq" style="color:${read.color}">${read.seq.substring(0, 8)}...</span>
        <span class="dup-read-status" style="color:${statusColor}">${statusText}</span>
      `;

      readEl.addEventListener("click", () => {
        if (read.isMarked) return;
        if (read.isDuplicate) {
          markAsDuplicate(idx);
        }
      });

      readsBoard.appendChild(readEl);
    });
  }

  function markAsDuplicate(idx) {
    const read = reads[idx];
    if (read.isMarked || !read.isDuplicate) return;

    read.isMarked = true;
    read.flag = READ_FLAG_DUPLICATE;
    markedCount++;

    renderFlagTable();
    renderRateChart();
    renderCoverage();
    updateStats();
    updateProgress();
    renderReadsBoard();

    hintEl.textContent = "已標記 " + markedCount + " / " + dupCount + " 個 Duplicates";

    if (markedCount === dupCount) {
      setTimeout(() => {
        progressLabel.textContent = "✅ 所有 Duplicates 已標記完成！";
        markIcon.textContent = "✅";
        markBtn.disabled = true;
        markBtn.textContent = "全部標記完成";
        hintEl.textContent = "🎉 完成！標記進度: 100%";
      }, 300);
    }
  }

  function autoMarkAll() {
    if (markedCount >= dupCount) return;

    progressLabel.textContent = "📝 正在標記所有 PCR Duplicates...";
    markIcon.style.animation = "dupStamp 0.5s ease-in-out infinite";

    const toMark = reads
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.isDuplicate && !r.isMarked)
      .map(({ idx }) => idx);

    let i = 0;
    function markNext() {
      if (i >= toMark.length) {
        markIcon.style.animation = "";
        return;
      }
      markAsDuplicate(toMark[i]);
      i++;
      setTimeout(markNext, 200);
    }

    markNext();
  }

  function updateStats() {
    statTotal.textContent = totalReads;
    statDups.textContent = markedCount;
    const remainingPct = ((dupCount - markedCount) / totalReads * 100).toFixed(1);
    statRate.textContent = remainingPct > 0 ? "- " + remainingPct + "%" : "0%";
  }

  function updateProgress() {
    const pct = (markedCount / dupCount) * 100;
    progressFill.style.width = pct + "%";
    progressLabel.textContent = "標記進度: " + markedCount + " / " + dupCount + " duplicates (" + pct.toFixed(0) + "%)";

    if (markedCount > 0) {
      rawBamEl.classList.add("highlight");
      markIcon.style.opacity = "1";
      setTimeout(() => rawBamEl.classList.remove("highlight"), 800);
    }

    if (markedCount === dupCount) {
      markedBamEl.classList.add("highlight");
    }
  }

  markIcon.style.opacity = "0";
  markIcon.style.transition = "all 0.5s ease";

  const bamPhases = [
    { label: "📦 載入 Raw BAM ...", progress: 20 },
    { label: "🔍 掃描座標與長度 ...", progress: 40 },
    { label: "♻️ 偵測 PCR Duplicates ...", progress: 70 },
    { label: "📝 標記 Duplicate Flag (1024) ...", progress: 100 },
  ];

  let bamPhase = 0;
  function runBamAnimation() {
    if (!isPlaying) return;
    if (bamPhase < bamPhases.length) {
      const phase = bamPhases[bamPhase];
      progressLabel.textContent = phase.label;
      progressFill.style.width = phase.progress + "%";
      bamPhase++;
      setTimeout(runBamAnimation, 700);
    }
  }

  setTimeout(runBamAnimation, 300);

  setTimeout(() => {
    markBtn.disabled = false;
    progressLabel.textContent = "等待標記重複 reads... (" + dupCount + " duplicates found)";
    progressFill.style.width = "0%";
    markIcon.style.opacity = "1";
  }, 3000);

  markBtn.addEventListener("click", autoMarkAll);

  renderFlagTable();
  renderRateChart();
  renderCoverage();
  renderAxisLabels();
  renderReadsBoard();
  updateStats();

  return () => { isPlaying = false; };
}


function createBQSRVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual bqsr-visual";
  container.innerHTML = `
    <div class="bqsr-left">
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>品質分佈圖 (Empirical vs Reported Q-score)</h3>
          <span class="bqsr-badge">校正前 vs 校正後</span>
        </div>
        <div class="bqsr-qc-chart" id="bqsr-qc-chart">
          <div class="qc-axes">
            <div class="qc-y-axis" id="qc-y-axis"></div>
            <div class="qc-x-axis" id="qc-x-axis"></div>
          </div>
          <div class="qc-plot" id="qc-plot">
            <div class="qc-before-points" id="qc-before-points"></div>
            <div class="qc-after-points" id="qc-after-points"></div>
            <div class="qc-ideal-line" id="qc-ideal-line"></div>
            <div class="qc-dbsnp-exclude" id="qc-dbsnp-exclude"></div>
          </div>
        </div>
      </div>
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>已知變異點排除 (dbSNP)</h3>
          <span class="bqsr-badge">Known Variants</span>
        </div>
        <div class="bqsr-dbsnp-panel">
          <div class="dbsnp-intro">
            <p>dbSNP 已知變異位點會從錯誤計算中排除，避免將真實變異誤判為測序錯誤：</p>
          </div>
          <div class="dbsnp-genome-track" id="dbsnp-genome-track"></div>
          <div class="dbsnp-legend">
            <span class="dbsnp-legend-item"><span class="dbsnp-dot" style="background:#4cc38a"></span> 參考鹼基</span>
            <span class="dbsnp-legend-item"><span class="dbsnp-dot" style="background:#ff6b6b"></span> 已知變異 (dbSNP)</span>
            <span class="dbsnp-legend-item"><span class="dbsnp-dot" style="background:#666"></span> 校正錯誤</span>
          </div>
        </div>
      </div>
      <div class="bqsr-summary">
        <div class="summary-stat">
          <span class="stat-label">Reported Q平均</span>
          <span class="stat-value" id="bqsr-stat-reported-before">—</span>
          <span class="stat-change stat-down" id="reported-change"></span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Empirical Q平均</span>
          <span class="stat-value" id="bqsr-stat-empirical-before">—</span>
          <span class="stat-change stat-up" id="empirical-change"></span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">校正後差距</span>
          <span class="stat-value" id="bqsr-stat-gap">—</span>
        </div>
      </div>
    </div>
    <div class="bqsr-right">
      <div class="bqsr-file-flow">
        <div class="bqsr-file-box" id="bqsr-raw-bam">
          <div class="file-icon">📦</div>
          <div class="file-name">sample.dedup.bam</div>
          <div class="file-type">Deduplicated BAM</div>
        </div>
        <div class="bqsr-arrow-container">
          <div class="bqsr-arrow">→</div>
          <div class="bqsr-tool-icon" id="bqsr-cal-icon">⚖️</div>
        </div>
        <div class="bqsr-file-box" id="bqsr-final-bam">
          <div class="file-icon">📦</div>
          <div class="file-name">sample.recal.bam</div>
          <div class="file-type">Analysis-ready BAM</div>
        </div>
      </div>
      <div class="bqsr-balancer">
        <h3>校正滑桿 (BaseRecalibrator)</h3>
        <p class="bqsr-hint">拖動滑桿調整系統偏差，使品質曲線回歸理想校準線 (45°)</p>
        <div class="bqsr-slider-container">
          <label class="bqsr-slider-label">系統偏差因子: <span id="bqsr-bias-value">0</span></label>
          <input type="range" class="bqsr-slider" id="bqsr-bias-slider" min="-5" max="5" value="0" step="0.1">
          <input type="range" class="bqsr-slider" id="bqsr-bias-slider-2" min="-5" max="5" value="0" step="0.1" hidden>
        </div>
        <div class="bqsr-calibration-target">
          <div class="calibration-label">校準進度</div>
          <div class="calibration-bar">
            <div class="calibration-fill" id="bqsr-calibration-fill"></div>
          </div>
          <div class="calibration-text" id="bqsr-calibration-text">等待校準...</div>
        </div>
        <div class="bqsr-tip">
          <small>提示：Reported Q 反映儀器原始判斷，Empirical Q 反映實際錯誤率。完美校準時兩者一致。</small>
        </div>
      </div>
      <button class="bqsr-auto-btn" id="bqsr-auto-btn" type="button">自動校準</button>
    </div>
  `;
  return container;
}

function initBQSRVisualization(container) {
  const beforePoints = container.querySelector("#qc-before-points");
  const afterPoints = container.querySelector("#qc-after-points");
  const idealLine = container.querySelector("#qc-ideal-line");
  const dbsnpExclude = container.querySelector("#qc-dbsnp-exclude");
  const rawBamEl = container.querySelector("#bqsr-raw-bam");
  const finalBamEl = container.querySelector("#bqsr-final-bam");
  const calIcon = container.querySelector("#bqsr-cal-icon");
  const biasSlider = container.querySelector("#bqsr-bias-slider");
  const biasSlider2 = container.querySelector("#bqsr-bias-slider-2");
  const biasValue = container.querySelector("#bqsr-bias-value");
  const calibrationFill = container.querySelector("#bqsr-calibration-fill");
  const calibrationText = container.querySelector("#bqsr-calibration-text");
  const reportedBefore = container.querySelector("#bqsr-stat-reported-before");
  const reportedChange = container.querySelector("#reported-change");
  const empiricalBefore = container.querySelector("#bqsr-stat-empirical-before");
  const empiricalChange = container.querySelector("#empirical-change");
  const gapStat = container.querySelector("#bqsr-stat-gap");
  const genomeTrack = container.querySelector("#dbsnp-genome-track");
  const autoBtn = container.querySelector("#bqsr-auto-btn");

  let isPlaying = true;
  let currentBias = 0;
  let isCalibrated = false;

  const refBases = "TGAATTTTGGATTACTAAGGAATTTACAGTACAAAAATGTACTTGTTAACACAGTGACAT";
  const refLength = refBases.length;
  const refStart = 10000001;

  const BASE_COLORS = { A: "#ff6b6b", T: "#4da3ff", C: "#4cc38a", G: "#ffb84d" };
  const complement = { A: "T", T: "A", C: "G", G: "C" };

  const dbsnpSites = [12, 18, 25, 33, 45, 52, 67, 78, 91];

  const qcData = [];
  const cycles = 50;
  for (let c = 0; c < cycles; c++) {
    const reportedQ = 25 + Math.sin(c * 0.3) * 4 + (c < 10 ? -3 : c > 40 ? -2 : 0);
    const systematicBias = reportedQ - 3 - Math.sin(c * 0.2) * 2;
    const empiricalQ = Math.max(5, systematicBias + (Math.random() - 0.5) * 2);
    qcData.push({ cycle: c + 1, reported: reportedQ, empirical: empiricalQ, hasDbsnp: dbsnpSites.includes(c) });
  }

  const plotWidth = 480;
  const plotHeight = 280;
  const paddingLeft = 50;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingRight = 20;
  const plotInnerW = plotWidth - paddingLeft - paddingRight;
  const plotInnerH = plotHeight - paddingTop - paddingBottom;
  const maxQ = 50;
  const minQ = 0;

  function yToPixel(q) {
    return plotInnerH - ((q - minQ) / (maxQ - minQ)) * plotInnerH;
  }

  function xToPixel(cycle) {
    return (cycle / cycles) * plotInnerW;
  }

  const yAxisLabels = [0, 10, 20, 30, 40, 50];
  const xAxisLabels = [0, 10, 20, 30, 40, 50];

  function renderAxes() {
    idealLine.innerHTML = "";
    yAxisLabels.forEach(q => {
      const yLabel = document.createElement("div");
      yLabel.className = "qc-y-label";
      yLabel.style.bottom = (q / maxQ) * 100 + "%";
      yLabel.textContent = "Q" + q;
      idealLine.appendChild(yLabel);
    });
    xAxisLabels.forEach(cycle => {
      const xLabel = document.createElement("div");
      xLabel.className = "qc-x-label";
      xLabel.style.left = ((cycle / cycles) * 100) + "%";
      xLabel.textContent = cycle;
      idealLine.appendChild(xLabel);
    });
    idealLine.style.left = paddingLeft + "px";
    idealLine.style.top = paddingTop + "px";
    idealLine.style.width = plotInnerW + "px";
    idealLine.style.height = plotInnerH + "px";

    const line = document.createElement("div");
    line.className = "qc-ideal-diagonal";
    line.style.borderBottom = "1px dashed rgba(76, 195, 138, 0.4)";
    line.style.left = "0";
    line.style.top = plotInnerH + "px";
    line.style.width = "100%";
    idealLine.appendChild(line);

    const diagonal = document.createElement("div");
    diagonal.className = "qc-diagonal-line";
    diagonal.style.left = "0";
    diagonal.style.top = plotInnerH + "px";
    diagonal.style.width = "100%";
    diagonal.style.height = "1px";
    diagonal.style.transformOrigin = "0 0";
    diagonal.style.transform = "rotate(-48deg)";
    diagonal.style.background = "rgba(76, 195, 138, 0.6)";
    diagonal.style.position = "absolute";
    idealLine.appendChild(diagonal);

    const label = document.createElement("div");
    label.className = "qc-ideal-label";
    label.textContent = "理想校準線 (45°)";
    label.style.left = plotInnerW + "px";
    label.style.top = "0";
    idealLine.appendChild(label);
  }

  function renderDbSNPExclusion() {
    dbsnpExclude.innerHTML = "";
    dbsnpSites.forEach((c) => {
      const marker = document.createElement("div");
      marker.className = "dbsnp-exclude-marker";
      const px = paddingLeft + xToPixel(c + 1) - 4;
      marker.style.left = px + "px";
      marker.innerHTML = `<div class="dbsnp-exclude-line"></div>`;
      dbsnpExclude.appendChild(marker);
    });

    dbsnpExclude.style.left = paddingLeft + "px";
    dbsnpExclude.style.top = paddingTop + "px";
    dbsnpExclude.style.width = plotInnerW + "px";
    dbsnpExclude.style.height = plotInnerH + "px";
  }

  function renderPoints() {
    beforePoints.innerHTML = "";
    afterPoints.innerHTML = "";

    const recalibratedData = qcData.map((d) => {
      const empiricalError = Math.pow(10, -d.empirical / 10);
      let recalibratedEmpirical = d.reported - currentBias * 2;
      recalibratedEmpirical = Math.max(5, Math.min(50, recalibratedEmpirical));
      return { ...d, recalibratedEmpirical };
    });

    qcData.forEach((d, i) => {
      const beforeEl = document.createElement("div");
      beforeEl.className = "qc-point qc-before";
      const px = paddingLeft + xToPixel(d.cycle);
      const py = yToPixel(d.reported);
      beforeEl.style.left = px + "px";
      beforeEl.style.top = (py + paddingTop) + "px";
      beforeEl.title = `Cycle ${d.cycle}: Reported=${d.reported.toFixed(1)}`;
      beforePoints.appendChild(beforeEl);

      const targetD = recalibratedData[i];
      const afterEl = document.createElement("div");
      afterEl.className = "qc-point qc-after";
      const py2 = yToPixel(targetD.recalibratedEmpirical);
      afterEl.style.left = px + "px";
      afterEl.style.top = (py2 + paddingTop) + "px";
      afterEl.title = `Cycle ${d.cycle}: Empirical=${targetD.recalibratedEmpirical.toFixed(1)} (recalibrated)`;
      afterPoints.appendChild(afterEl);
    });

    const avgReported = qcData.reduce((s, d) => s + d.reported, 0) / qcData.length;
    const avgEmpirical = recalibratedData.reduce((s, d) => s + d.recalibratedEmpirical, 0) / recalibratedData.length;
    const avgEmpiricalBefore = qcData.reduce((s, d) => s + d.empirical, 0) / qcData.length;
    const gap = Math.abs(avgReported - avgEmpirical);
    const gapAfter = Math.abs(avgReported - avgEmpirical);

    reportedBefore.textContent = avgReported.toFixed(1) + " (Q" + Math.round(avgReported) + ")";
    reportedChange.textContent = currentBias !== 0 ? `${currentBias > 0 ? "▲" : "▼"} ${Math.abs(currentBias).toFixed(1)}` : "";
    reportedChange.className = "stat-change " + (currentBias > 0 ? "stat-up" : "stat-down");

    const avgEmpiricalOriginal = qcData.reduce((s, d) => s + d.empirical, 0) / qcData.length;
    empiricalBefore.textContent = avgEmpiricalOriginal.toFixed(1) + " (Q" + Math.round(avgEmpiricalOriginal) + ")";
    const empiricalDiff = avgEmpirical - avgEmpiricalBefore;
    empiricalChange.textContent = empiricalDiff !== 0 ? `${empiricalDiff > 0 ? "▲" : "▼"} ${Math.abs(empiricalDiff).toFixed(1)}` : "";
    empiricalChange.className = "stat-change " + (empiricalDiff > 0 ? "stat-up" : "stat-down");

    gapStat.textContent = "Δ=" + gapAfter.toFixed(1) + " Q";
    gapStat.style.color = gapAfter < 3 ? "#4cc38a" : gapAfter < 6 ? "#ffb84d" : "#ff6b6b";

    const gapPercent = Math.max(0, 100 - (gapAfter / 10) * 100);
    calibrationFill.style.width = gapPercent + "%";
    calibrationText.textContent = gapAfter < 2 ? "✅ 校准完成!" : `校准中... 差距: ${gapAfter.toFixed(1)} Q`;
    calibrationText.className = gapAfter < 2 ? "calibration-text success" : "calibration-text";
  }

  function renderGenomeTrack() {
    genomeTrack.innerHTML = "";
    for (let i = 0; i < refLength; i++) {
      const base = refBases[i];
      const cell = document.createElement("div");
      cell.className = "genome-base";
      cell.style.background = BASE_COLORS[base];
      cell.textContent = base;

      if (dbsnpSites.includes(i)) {
        cell.classList.add("dbsnp-variant");
        cell.style.background = "#ff6b6b";
        cell.title = `dbSNP位点: chr1:${refStart + i}`;
      }

      if (i >= refStart - refStart && i < refStart - refStart + refLength) {
        // OK
      }

      genomeTrack.appendChild(cell);
    }
  }

  biasSlider.addEventListener("input", () => {
    currentBias = parseFloat(biasSlider.value);
    biasValue.textContent = currentBias.toFixed(1);
    renderPoints();
  });

  biasSlider2.addEventListener("input", () => {
    currentBias = parseFloat(biasSlider2.value);
    biasValue.textContent = currentBias.toFixed(1);
    renderPoints();
  });

  function runBamAnimation() {
    if (!isPlaying) return;
    const phases = [
      { label: "📦 載入 Deduplicated BAM...", phase: 1, wait: 600 },
      { label: "⚖️ 執行 BaseRecalibrator...", phase: 2, wait: 700 },
      { label: "📊 建立 Q-score 模型...", phase: 3, wait: 700 },
      { label: "✅ 輸出 Analysis-ready BAM!", phase: 4, wait: 400 },
    ];
    let i = 0;
    function next() {
      if (!isPlaying || i >= phases.length) {
        if (i >= phases.length) {
          finalBamEl.classList.add("highlight");
        }
        return;
      }
      const p = phases[i];
      if (p.phase === 1) rawBamEl.classList.add("highlight");
      if (p.phase === 4) finalBamEl.classList.add("highlight");
      calIcon.style.opacity = p.phase === 2 ? "1" : "0";
      if (p.phase === 2) calIcon.style.animation = "pulse 0.5s ease-in-out infinite";
      setTimeout(() => { i++; next(); }, p.wait);
    }
    setTimeout(next, 300);
  }

  autoBtn.addEventListener("click", () => {
    if (isCalibrated) return;
    let targetBias = -currentBias;
    let steps = 30;
    let step = 0;
    calIcon.style.animation = "spin 0.5s linear infinite";
    function animate() {
      if (step >= steps) {
        isCalibrated = true;
        calIcon.style.animation = "";
        autoBtn.textContent = "重新校准";
        autoBtn.classList.add("calibrated");
        calibrationText.innerHTML = "✅ 校准完成! 所有 Q 值已回歸理想線";
        setTimeout(() => {
          rawBamEl.classList.remove("highlight");
          finalBamEl.classList.add("highlight");
        }, 300);
        return;
      }
      currentBias += targetBias / steps;
      biasSlider.value = currentBias.toFixed(1);
      biasValue.textContent = currentBias.toFixed(1);
      renderPoints();
      step++;
      setTimeout(animate, 50);
    }
    animate();
  });

  calIcon.style.opacity = "0";
  calIcon.style.transition = "all 0.5s ease";

  renderAxes();
  renderDbSNPExclusion();
  renderPoints();
  renderGenomeTrack();
  runBamAnimation();

  return () => { isPlaying = false; };
}


function createMutect2Visualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual mutect2-visual";
  container.innerHTML = `
    <div class="mutect2-left">
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>IGV 雙軌對比圖</h3>
          <span class="bqsr-badge">Tumor vs Matched Normal</span>
        </div>
        <div class="mutect2-igv" id="mutect2-igv">
          <div class="igv-track igv-normal" id="igv-normal-track">
            <div class="igv-track-label">Normal</div>
            <svg class="igv-svg" id="igv-normal-svg" width="100%" height="80"></svg>
          </div>
          <div class="igv-track igv-tumor" id="igv-tumor-track">
            <div class="igv-track-label">Tumor</div>
            <svg class="igv-svg" id="igv-tumor-svg" width="100%" height="80"></svg>
          </div>
          <div class="igv-axis" id="igv-axis"></div>
        </div>
      </div>
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>Somatic Variant 清單</h3>
          <span class="bqsr-badge" id="mutect2-variant-count">0 候選</span>
        </div>
        <div class="mutect2-variants" id="mutect2-variants"></div>
      </div>
    </div>
    <div class="mutect2-right">
      <div class="bqsr-file-flow">
        <div class="bqsr-file-box" id="mutect2-raw-bam">
          <div class="file-icon">📦</div>
          <div class="file-name">sample.recal.bam</div>
          <div class="file-type">Analysis-ready BAM</div>
        </div>
        <div class="bqsr-arrow-container">
          <div class="bqsr-arrow">→</div>
          <div class="mutect2-tool-icon" id="mutect2-mutect-icon">🔍</div>
        </div>
        <div class="bqsr-file-box" id="mutect2-vcf-file">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_raw.vcf</div>
          <div class="file-type">Raw VCF</div>
        </div>
      </div>
      <div class="mutect2-hint">
        <p>點擊 Tumor 軌道上的 reads，可將與 Normal 不同的位置 high-light 為體細胞突變。</p>
      </div>
      <div class="mutect2-progress">
        <div class="progress-bar">
          <div class="progress-fill" id="mutect2-progress-fill"></div>
        </div>
        <div class="progress-label" id="mutect2-progress-label">比對 Tumor vs Normal...</div>
      </div>
    </div>
  `;
  return container;
}

function initMutect2Visualization(container) {
  const normalSvg = container.querySelector("#igv-normal-svg");
  const tumorSvg = container.querySelector("#igv-tumor-svg");
  const axis = container.querySelector("#igv-axis");
  const variantCountEl = container.querySelector("#mutect2-variant-count");
  const variantList = container.querySelector("#mutect2-variants");
  const rawBamEl = container.querySelector("#mutect2-raw-bam");
  const vcfFileEl = container.querySelector("#mutect2-vcf-file");
  const progressFill = container.querySelector("#mutect2-progress-fill");
  const progressLabel = container.querySelector("#mutect2-progress-label");

  const refStart = 10000001;
  const regionLength = 120;

  const BASE_COLORS = { A: "#ff6b6b", T: "#4da3ff", C: "#4cc38a", G: "#ffb84d" };

  const normalReads = [
    { start: 10,  len: 30, seq: "TGAATTTTGGATTACTAAGGAATTTACA" },
    { start: 20,  len: 25, seq: "GAATTTTGGATTACTAAGGAATTTAC" },
    { start: 40,  len: 28, seq: "TTTTGGATTACTAAGGAATTTACAGTAC" },
    { start: 55,  len: 30, seq: "GAATTTACAGTACAAAAATGTACTTG" },
    { start: 75,  len: 25, seq: "TTACAGTACAAAAATGTACTTGTTAA" },
    { start: 90,  len: 28, seq: "GTACAAAAATGTACTTGTTAACACAG" },
  ];

  const tumorReads = [
    { start: 10,  len: 30, seq: "TGAATTTTGGATTACTAAGGAATTTACA", somatic: false },
    { start: 12,  len: 25, seq: "GAATTTTGGATTACTAAGGAATTTA", somatic: false },
    { start: 38,  len: 28, seq: "TTTTGGATTACTAAGGAATTTGAGTAC", somatic: true,  mutPos: [22] },
    { start: 55,  len: 30, seq: "GAATTTACAGTACAAAAATGTACTTG", somatic: false },
    { start: 73,  len: 25, seq: "TTACAGTACAAAAATGTACTTGTTA", somatic: true,  mutPos: [14] },
    { start: 90,  len: 28, seq: "GTACAAAAATGTACTTGTTAACACAG", somatic: false },
    { start: 100, len: 20, seq: "TGTACTTGTTAACACAGTGA", somatic: true,  mutPos: [5] },
  ];

  const somaticVariants = tumorReads
    .filter(r => r.somatic)
    .map(r => ({ ...r, chrPos: refStart + r.start }));

  let discoveredVariants = [];
  let isPlaying = true;

  const svgWidth = 500;
  const trackHeight = 50;
  const readHeight = 16;
  const readSpacing = 8;

  function renderAxis() {
    axis.innerHTML = "";
    axis.style.width = svgWidth + "px";
    for (let i = 0; i <= regionLength; i += 20) {
      const tick = document.createElement("div");
      tick.className = "igv-axis-tick";
      tick.style.left = (i / regionLength * 100) + "%";
      tick.textContent = (refStart + i).toLocaleString();
      axis.appendChild(tick);
    }
  }

  function renderTrack(svg, reads, trackName, isTumor) {
    svg.innerHTML = "";
    svg.setAttribute("width", svgWidth);
    svg.setAttribute("height", trackHeight + 30);

    const defs = document.createElement("defs");
    const filter = document.createElement("filter");
    filter.setAttribute("id", "glow-" + Math.random().toString(36).substr(2, 9));
    const fe = document.createElement("feGaussianBlur");
    fe.setAttribute("stdDeviation", 2);
    fe.setAttribute("result", "coloredBlur");
    const merge = document.createElement("feMerge");
    const mergeNode1 = document.createElement("feMergeNode");
    mergeNode1.setAttribute("in", "coloredBlur");
    const mergeNode2 = document.createElement("feMergeNode");
    mergeNode2.setAttribute("in", "SourceGraphic");
    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);
    filter.appendChild(fe);
    filter.appendChild(merge);
    defs.appendChild(filter);
    svg.appendChild(defs);
    const filterId = filter.getAttribute("id");

    reads.forEach((read, idx) => {
      const y = 8 + (idx * (readHeight + readSpacing));
      const bgWidth = (read.len / regionLength) * svgWidth;
      const bgX = (read.start / regionLength) * svgWidth;

      const bg = document.createElement("rect");
      bg.setAttribute("x", bgX);
      bg.setAttribute("y", y);
      bg.setAttribute("width", bgWidth);
      bg.setAttribute("height", readHeight);
      bg.setAttribute("rx", 2);
      bg.setAttribute("fill", "#1a2535");
      bg.setAttribute("stroke", "#3b4b5f");
      bg.setAttribute("stroke-width", 1);
      svg.appendChild(bg);

      for (let b = 0; b < read.seq.length; b++) {
        const base = read.seq[b];
        const color = BASE_COLORS[base] || "#fff";
        const text = document.createElement("text");
        text.setAttribute("x", bgX + (b / read.len) * bgWidth);
        text.setAttribute("y", y + readHeight / 1.3);
        text.setAttribute("font-size", 7);
        text.setAttribute("font-family", "monospace");
        text.setAttribute("fill", color);
        text.setAttribute("text-anchor", "middle");
        text.textContent = base;

        if (isTumor && read.somatic && read.mutPos && read.mutPos.includes(b)) {
          text.setAttribute("font-weight", "bold");
          text.setAttribute("fill", "#ff6b6b");
          text.setAttribute("filter", "url(#" + filterId + ")");
        }
        svg.appendChild(text);
      }

      const idText = document.createElement("text");
      idText.setAttribute("x", 4);
      idText.setAttribute("y", y + readHeight / 1.3);
      idText.setAttribute("font-size", 7);
      idText.setAttribute("font-family", "monospace");
      idText.setAttribute("fill", isTumor ? "#ff6b6b" : "#4da3ff");
      idText.setAttribute("opacity", 0.7);
      idText.textContent = trackName + (idx + 1);
      svg.appendChild(idText);
    });
  }

  function renderVariants() {
    variantList.innerHTML = "";
    const showable = discoveredVariants.length === 0 ? somaticVariants : discoveredVariants;
    showable.forEach((v, idx) => {
      const item = document.createElement("div");
      item.className = "mutect2-variant-item";

      let mutInfo = "";
      v.mutPos.forEach(pos => {
        const refBase = "ACGT"[Math.floor(Math.random() * 4)];
        const altBase = v.seq[pos];
        mutInfo += `<div class="variant-mut"><span class="variant-pos">chr1:${refStart + v.start + pos}</span> ${refBase}→<span style="color:#ff6b6b;font-weight:700">${altBase}</span></div>`;
      });

      item.innerHTML = `
        <div class="variant-header">
          <span class="variant-id" style="color:#ff6b6b">SOMATIC_${idx + 1}</span>
          <span class="variant-flag" style="color:#4cc38a">PASS</span>
        </div>
        <div class="variant-info">
          <div class="variant-read" style="color:#ff6b6b">Tumor: ${v.seq}</div>
          <div class="variant-pos-info">Position: ${refStart + v.start}-${refStart + v.start + v.len - 1}</div>
          ${mutInfo}
        </div>
      `;
      variantList.appendChild(item);
    });

    variantCountEl.textContent = discoveredVariants.length + " / " + somaticVariants.length + " 已發現";
  }

  function animateDiscovery() {
    if (!isPlaying) return;
    const phases = [
      { label: "📦 載入 Analysis-ready BAM...", time: 800 },
      { label: "🔍 正在比對 Tumor vs Normal...", time: 1000 },
      { label: "⚡ 發現體細胞突變位點...", time: 800 },
      { label: "✅ 輸出 Raw VCF (候選突變)", time: 500 },
    ];

    let i = 0;
    function next() {
      if (!isPlaying || i >= phases.length) {
        if (i >= phases.length) {
          progressLabel.textContent = "✅ 比對完成，發現 " + somaticVariants.length + " 個體細胞突變";
          vcfFileEl.classList.add("highlight");
        }
        return;
      }
      const phase = phases[i];
      progressLabel.textContent = phase.label;
      const progress = ((i + 1) / phases.length) * 100;
      progressFill.style.width = progress + "%";
      if (i === 0) rawBamEl.classList.add("highlight");
      if (i === 2) setTimeout(() => renderVariants(), 500);
      i++;
      setTimeout(next, phase.time);
    }
    setTimeout(next, 300);
  }

  tumorSvg.addEventListener("click", (e) => {
    if (discoveredVariants.length >= somaticVariants.length) return;
    const rect = tumorSvg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relX = (x / svgWidth) * regionLength;
    const clickedRead = tumorReads.find(r => r.start <= relX && relX < r.start + r.len);
    if (clickedRead && clickedRead.somatic) {
      if (!discoveredVariants.includes(clickedRead)) {
        discoveredVariants.push(clickedRead);
        variantCountEl.textContent = discoveredVariants.length + " / " + somaticVariants.length + " 已發現";
        renderVariants();
      }
    }
  });

  renderAxis();
  renderTrack(normalSvg, normalReads, "Normal", false);
  renderTrack(tumorSvg, tumorReads, "Tumor", true);
  renderVariants();
  animateDiscovery();

  return () => { isPlaying = false; };
}

function createGnomadVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual gnomad-visual";
  container.innerHTML = `
    <div class="gnomad-left">
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>VCF 過濾結果</h3>
          <span class="bqsr-badge">gnomAD Population Data</span>
        </div>
        <div class="gnomad-vcf-view" id="gnomad-vcf-view"></div>
      </div>
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>族群頻率分佈</h3>
          <span class="bqsr-badge">gnomAD AF Distribution</span>
        </div>
        <div class="gnomad-af-chart" id="gnomad-af-chart">
          <div class="gnomad-af-bars" id="gnomad-af-bars"></div>
        </div>
      </div>
      <div class="bqsr-summary">
        <div class="summary-stat">
          <span class="stat-label">候選變異總數</span>
          <span class="stat-value" id="gnomad-stat-total">—</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">過濾後剩下</span>
          <span class="stat-value" id="gnomad-stat-pass">—</span>
          <span class="stat-change stat-down" id="gnomad-change"></span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">過濾率</span>
          <span class="stat-value" id="gnomad-stat-rate">—</span>
        </div>
      </div>
    </div>
    <div class="gnomad-right">
      <div class="bqsr-file-flow">
        <div class="bqsr-file-box" id="gnomad-raw-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_raw.vcf</div>
          <div class="file-type">Raw VCF</div>
        </div>
        <div class="bqsr-arrow-container">
          <div class="bqsr-arrow">→</div>
          <div class="gnomad-drag-icon" id="gnomad-drag-icon">🧹</div>
        </div>
        <div class="bqsr-file-box" id="gnomad-filtered-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_germline_filtered.vcf</div>
          <div class="file-type">Germline-filtered VCF</div>
        </div>
      </div>
      <div class="gnomad-hint">
        <p>拖曳 gnomAD 資料庫到 VCF 中，過濾掉天生遺傳變異 (Germline)。</p>
      </div>
      <div class="gnomad-drag-area" id="gnomad-drag-area">
        <div class="gnomad-db-btn" id="gnomad-db-btn" draggable="true">
          <span style="font-size:20px">🧬</span> gnomAD
        </div>
      </div>
      <div class="gnomad-progress">
        <div class="progress-bar">
          <div class="progress-fill" id="gnomad-progress-fill"></div>
        </div>
        <div class="progress-label" id="gnomad-progress-label">等待過濾...</div>
      </div>
    </div>
  `;
  return container;
}

function initGnomadVisualization(container) {
  const vcfView = container.querySelector("#gnomad-vcf-view");
  const afBars = container.querySelector("#gnomad-af-bars");
  const statTotal = container.querySelector("#gnomad-stat-total");
  const statPass = container.querySelector("#gnomad-stat-pass");
  const statChange = container.querySelector("#gnomad-change");
  const statRate = container.querySelector("#gnomad-stat-rate");
  const rawVcfEl = container.querySelector("#gnomad-raw-vcf");
  const filteredVcfEl = container.querySelector("#gnomad-filtered-vcf");
  const dragIcon = container.querySelector("#gnomad-drag-icon");
  const dragArea = container.querySelector("#gnomad-drag-area");
  const dbBtn = container.querySelector("#gnomad-db-btn");
  const progressFill = container.querySelector("#gnomad-progress-fill");
  const progressLabel = container.querySelector("#gnomad-progress-label");

  let isPlaying = true;
  let gnomadDropped = false;
  let filteredCount = 0;

  const variants = [
    { id: "VAR001", pos: "chr1:1000012", ref: "A", alt: "T", af: 0.45,  isGermline: true },
    { id: "VAR002", pos: "chr1:1000023", ref: "C", alt: "G", af: 0.02,  isGermline: false },
    { id: "VAR003", pos: "chr1:1000035", ref: "G", alt: "A", af: 0.38,  isGermline: true },
    { id: "VAR004", pos: "chr1:1000047", ref: "T", alt: "C", af: 0.01,  isGermline: false },
    { id: "VAR005", pos: "chr1:1000058", ref: "A", alt: "C", af: 0.52,  isGermline: true },
    { id: "VAR006", pos: "chr1:1000072", ref: "T", alt: "A", af: 0.03,  isGermline: false },
    { id: "VAR007", pos: "chr1:1000085", ref: "C", alt: "T", af: 0.15,  isGermline: true },
    { id: "VAR008", pos: "chr1:1000098", ref: "G", alt: "T", af: 0.005, isGermline: false },
    { id: "VAR009", pos: "chr1:1000103", ref: "A", alt: "G", af: 0.28,  isGermline: true },
    { id: "VAR010", pos: "chr1:1000115", ref: "T", alt: "G", af: 0.015, isGermline: false },
  ];

  const totalVariants = variants.length;

  function renderVCF() {
    vcfView.innerHTML = "";
    variants.forEach((v, idx) => {
      const row = document.createElement("div");
      row.className = "gnomad-vcf-row" + (v.isGermline ? " germline" : " somatic-pass");
      row.dataset.vid = idx;

      if (gnomadDropped && v.isGermline) {
        row.style.opacity = "0.3";
        row.style.background = "rgba(255, 107, 107, 0.1)";
      }

      row.innerHTML = `
        <span class="vcf-id" style="color:${v.isGermline ? "#ff6b6b" : "#4cc38a"}">${v.id}</span>
        <span class="vcf-pos">${v.pos}</span>
        <span class="vcf-ref">${v.ref}</span>
        <span class="vcf-alt">${v.alt}</span>
        <span class="vcf-af">${v.af.toFixed(3)}</span>
        <span class="vcf-status" style="color:${v.isGermline ? "#ff6b6b" : "#4cc38a"}">${v.isGermline ? "Germline" : "Somatic"}</span>
      `;
      vcfView.appendChild(row);
    });
  }

  function renderAFChart() {
    afBars.innerHTML = "";
    const maxAF = Math.max(...variants.map(v => v.af));
    variants.forEach((v) => {
      const bar = document.createElement("div");
      bar.className = "gnomad-af-bar";
      bar.style.height = (v.af / maxAF * 100) + "%";
      bar.style.background = v.isGermline ? "rgba(255, 107, 107, 0.7)" : "rgba(76, 195, 138, 0.7)";
      const label = document.createElement("div");
      label.className = "gnomad-af-label";
      label.textContent = v.af.toFixed(2);
      label.style.color = v.isGermline ? "#ff6b6b" : "#4cc38a";
      bar.appendChild(label);
      afBars.appendChild(bar);
    });
  }

  function updateStats() {
    const filteredOut = variants.filter(v => v.isGermline && gnomadDropped).length;
    const passCount = totalVariants - filteredOut;
    statTotal.textContent = totalVariants;
    statPass.textContent = passCount;
    statChange.textContent = filteredOut > 0 ? "- " + (filteredOut / totalVariants * 100).toFixed(0) + "%" : "";
    statChange.className = "stat-change " + (filteredOut > 0 ? "stat-down" : "");
    statRate.textContent = filteredOut > 0 ? (filteredOut / totalVariants * 100).toFixed(0) + "%" : "0%";
  }

  dbBtn.addEventListener("dragstart", (e) => {
    dbBtn.classList.add("dragging");
    e.dataTransfer.setData("text/plain", "gnomad");
  });
  dbBtn.addEventListener("dragend", () => dbBtn.classList.remove("dragging"));

  dragArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragArea.classList.add("drag-over");
  });
  dragArea.addEventListener("dragleave", () => dragArea.classList.remove("drag-over"));
  dragArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dragArea.classList.remove("drag-over");
    if (gnomadDropped) return;

    gnomadDropped = true;
    dragIcon.style.opacity = "1";
    progressLabel.textContent = "🧹 開始過濾 Germline 變異...";

    const germlineVariants = variants.filter(v => v.isGermline);
    let i = 0;

    function filterNext() {
      if (i >= germlineVariants.length) {
        filteredVcfEl.classList.add("highlight");
        progressLabel.textContent = "✅ 過濾完成，保留 " + (totalVariants - germlineVariants.length) + " 個 Somatic 變異";
        return;
      }
      const v = germlineVariants[i];
      const row = vcfView.querySelector(".gnomad-vcf-row[data-vid='" + variants.indexOf(v) + "']");
      if (row) {
        row.style.opacity = "0.3";
        row.style.background = "rgba(255, 107, 107, 0.1)";
        const status = row.querySelector(".vcf-status");
        if (status) { status.textContent = "FILTER"; status.style.color = "#ff6b6b"; }
      }
      filteredCount++;
      progressFill.style.width = (filteredCount / totalVariants * 100) + "%";
      progressLabel.textContent = "過濾中: " + filteredCount + "/" + germlineVariants.length + " Germline...";
      i++;
      setTimeout(filterNext, 300);
    }

    filterNext();
  });

  setTimeout(() => {
    if (!gnomadDropped) {
      gnomadDropped = true;
      dragIcon.style.opacity = "1";
      progressLabel.textContent = "🧹 開始過濾 Germline 變異...";
      const germlineVariants = variants.filter(v => v.isGermline);
      let i = 0;
      function filterNext() {
        if (i >= germlineVariants.length) {
          filteredVcfEl.classList.add("highlight");
          progressLabel.textContent = "✅ 過濾完成，保留 " + (totalVariants - germlineVariants.length) + " 個 Somatic 變異";
          return;
        }
        const v = germlineVariants[i];
        const row = vcfView.querySelector(".gnomad-vcf-row[data-vid='" + variants.indexOf(v) + "']");
        if (row) {
          row.style.opacity = "0.3";
          row.style.background = "rgba(255, 107, 107, 0.1)";
          const status = row.querySelector(".vcf-status");
          if (status) { status.textContent = "FILTER"; status.style.color = "#ff6b6b"; }
        }
        filteredCount++;
        progressFill.style.width = (filteredCount / totalVariants * 100) + "%";
        progressLabel.textContent = "過濾中: " + filteredCount + "/" + germlineVariants.length + " Germline...";
        i++;
        setTimeout(filterNext, 300);
      }
      filterNext();
    }
  }, 2000);

  renderVCF();
  renderAFChart();
  updateStats();

  return () => { isPlaying = false; };
}

function createPoNVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual pon-visual";
  container.innerHTML = `
    <div class="pon-left">
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>PoN 噪聲過濾</h3>
          <span class="bqsr-badge">Panel of Normals</span>
        </div>
        <div class="pon-noise-chart" id="pon-noise-chart">
          <div class="pon-noise-content" id="pon-noise-content"></div>
        </div>
      </div>
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>PoN 篩選結果</h3>
          <span class="bqsr-badge" id="pon-variant-count">0 候選</span>
        </div>
        <div class="pon-variants" id="pon-variants"></div>
      </div>
    </div>
    <div class="pon-right">
      <div class="bqsr-file-flow">
        <div class="bqsr-file-box" id="pon-gnomad-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_filtered.vcf</div>
          <div class="file-type">Germline-filtered VCF</div>
        </div>
        <div class="bqsr-arrow-container">
          <div class="bqsr-arrow">→</div>
          <div class="pon-filter-icon" id="pon-filter-icon">🛡️</div>
        </div>
        <div class="bqsr-file-box" id="pon-final-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_pass.vcf</div>
          <div class="file-type">PASS VCF</div>
        </div>
      </div>
      <div class="pon-hint">
        <p>拖曳 PoN 資料庫到 VCF 中，過濾掉平台技術雜訊造成的假陽性。</p>
      </div>
      <div class="pon-drag-area" id="pon-drag-area">
        <div class="pon-db-btn" id="pon-db-btn" draggable="true">
          <span style="font-size:20px">🛡️</span> PoN
        </div>
      </div>
      <div class="pon-progress">
        <div class="progress-bar">
          <div class="progress-fill" id="pon-progress-fill"></div>
        </div>
        <div class="progress-label" id="pon-progress-label">等待過濾...</div>
      </div>
    </div>
  `;
  return container;
}

function initPoNVisualization(container) {
  const noiseChart = container.querySelector("#pon-noise-content");
  const variantCountEl = container.querySelector("#pon-variant-count");
  const variantList = container.querySelector("#pon-variants");
  const gnomadVcfEl = container.querySelector("#pon-gnomad-vcf");
  const finalVcfEl = container.querySelector("#pon-final-vcf");
  const filterIcon = container.querySelector("#pon-filter-icon");
  const dragArea = container.querySelector("#pon-drag-area");
  const dbBtn = container.querySelector("#pon-db-btn");
  const progressFill = container.querySelector("#pon-progress-fill");
  const progressLabel = container.querySelector("#pon-progress-label");

  let isPlaying = true;
  let poNDropped = false;
  let filteredCount = 0;

  const variants = [
    { id: "VAR001", pos: "chr1:1000012", ref: "A", alt: "T", isArtifact: true,  pass: false },
    { id: "VAR002", pos: "chr1:1000023", ref: "C", alt: "G", isArtifact: false, pass: true },
    { id: "VAR003", pos: "chr1:1000035", ref: "G", alt: "A", isArtifact: true,  pass: false },
    { id: "VAR004", pos: "chr1:1000047", ref: "T", alt: "C", isArtifact: false, pass: true },
    { id: "VAR005", pos: "chr1:1000058", ref: "A", alt: "C", isArtifact: true,  pass: false },
    { id: "VAR006", pos: "chr1:1000072", ref: "T", alt: "A", isArtifact: false, pass: true },
    { id: "VAR007", pos: "chr1:1000085", ref: "C", alt: "T", isArtifact: true,  pass: false },
    { id: "VAR008", pos: "chr1:1000098", ref: "G", alt: "T", isArtifact: false, pass: true },
  ];

  function renderNoiseChart() {
    noiseChart.innerHTML = "";
    const barHeight = 30;
    const barGap = 4;

    variants.forEach((v, idx) => {
      const row = document.createElement("div");
      row.className = "noise-bar-row";
      row.style.height = (barHeight + barGap) + "px";

      const noiseType = v.isArtifact ? "平台噪聲" : "真實突變";
      const noiseColor = v.isArtifact ? "#ff6b6b" : "#4cc38a";
      const noiseWidth = v.isArtifact ? "60%" : "30%";

      row.innerHTML = `
        <span class="noise-id">${v.id}</span>
        <span class="noise-bar" style="width:${noiseWidth};background:${noiseColor}">
          <span class="noise-label">${noiseType}</span>
        </span>
      `;
      noiseChart.appendChild(row);
    });
  }

  function renderVariants() {
    variantList.innerHTML = "";
    const passCount = variants.filter(v => v.pass || (!poNDropped && !v.isArtifact)).length;
    variantCountEl.textContent = passCount + " 候選";
    variants.forEach((v, idx) => {
      const item = document.createElement("div");
      item.className = "pon-variant-item";
      const isFiltered = poNDropped && v.isArtifact;
      if (isFiltered) {
        item.style.opacity = "0.3";
        item.style.background = "rgba(255, 107, 107, 0.1)";
      }
      item.innerHTML = `
        <span class="pon-variant-id" style="color:${v.isArtifact ? "#ff6b6b" : "#4cc38a"}">${v.id}</span>
        <span class="pon-variant-pos">${v.pos}</span>
        <span class="pon-variant-ref">${v.ref}→${v.alt}</span>
        <span class="pon-variant-status" style="color:${isFiltered ? "#ff6b6b" : (v.pass ? "#4cc38a" : "#ffb84d")}">
          ${isFiltered ? "FILTER" : (v.pass ? "PASS" : "候選")}
        </span>
      `;
      variantList.appendChild(item);
    });
  }

  dbBtn.addEventListener("dragstart", (e) => {
    dbBtn.classList.add("dragging");
    e.dataTransfer.setData("text/plain", "pon");
  });
  dbBtn.addEventListener("dragend", () => dbBtn.classList.remove("dragging"));

  dragArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragArea.classList.add("drag-over");
  });
  dragArea.addEventListener("dragleave", () => dragArea.classList.remove("drag-over"));
  dragArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dragArea.classList.remove("drag-over");
    if (poNDropped) return;

    poNDropped = true;
    filterIcon.style.opacity = "1";
    progressLabel.textContent = "🛡️ 開始過濾平台噪聲...";

    const artifactVariants = variants.filter(v => v.isArtifact);
    let i = 0;

    function filterNext() {
      if (i >= artifactVariants.length) {
        finalVcfEl.classList.add("highlight");
        progressLabel.textContent = "✅ 過濾完成，保留 " + (variants.length - artifactVariants.length) + " 個 PASS 變異";
        return;
      }
      filteredCount++;
      progressFill.style.width = (filteredCount / variants.length * 100) + "%";
      progressLabel.textContent = "過濾中: " + filteredCount + "/" + artifactVariants.length + " 噪聲...";
      i++;
      setTimeout(filterNext, 300);
    }

    filterNext();
  });

  setTimeout(() => {
    if (!poNDropped) {
      poNDropped = true;
      filterIcon.style.opacity = "1";
      progressLabel.textContent = "🛡️ 開始過濾平台噪聲...";
      const artifactVariants = variants.filter(v => v.isArtifact);
      let i = 0;
      function filterNext() {
        if (i >= artifactVariants.length) {
          finalVcfEl.classList.add("highlight");
          progressLabel.textContent = "✅ 過濾完成，保留 " + (variants.length - artifactVariants.length) + " 個 PASS 變異";
          return;
        }
        filteredCount++;
        progressFill.style.width = (filteredCount / variants.length * 100) + "%";
        progressLabel.textContent = "過濾中: " + filteredCount + "/" + artifactVariants.length + " 噪聲...";
        i++;
        setTimeout(filterNext, 300);
      }
      filterNext();
    }
  }, 2000);

  const bamPhases = [
    { label: "📦 載入 Germline-filtered VCF...", phase: 1, wait: 600 },
    { label: "🧹 比對 Panel of Normals...", phase: 2, wait: 700 },
    { label: "🛡️ 過濾平台技術雜訊...", phase: 3, wait: 800 },
    { label: "✅ 輸出 PASS VCF!", phase: 4, wait: 400 },
  ];
  let bamPhase = 0;
  function runBamAnimation() {
    if (!isPlaying) return;
    if (bamPhase < bamPhases.length) {
      const phase = bamPhases[bamPhase];
      progressLabel.textContent = phase.label;
      progressFill.style.width = ((bamPhase + 1) / bamPhases.length * 100) + "%";
      if (phase.phase === 1) gnomadVcfEl.classList.add("highlight");
      if (phase.phase === 4) finalVcfEl.classList.add("highlight");
      bamPhase++;
      setTimeout(runBamAnimation, phase.wait);
    }
  }
  setTimeout(runBamAnimation, 300);

  filterIcon.style.opacity = "0";
  filterIcon.style.transition = "all 0.5s ease";

  renderNoiseChart();
  renderVariants();

  return () => { isPlaying = false; };
}

/* ===== Stage 4: Filtering — Contamination Visualization ===== */
function createContaminationVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual filter-visual contamination-visual";
  container.innerHTML = `
    <div class="filter-left">
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>VCF 過濾結果</h3>
          <span class="bqsr-badge" id="cont-vcf-count">12 候選</span>
        </div>
        <div class="filter-vcf-table">
          <div class="filter-vcf-head">
            <span>ID</span><span>POS</span><span>REF→ALT</span><span>AF</span><span>FILTER</span>
          </div>
          <div class="filter-vcf-body" id="cont-vcf-body"></div>
        </div>
      </div>
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>污染過濾統計</h3>
          <span class="bqsr-badge" id="cont-stat-badge">等待檢驗</span>
        </div>
        <div class="filter-stats">
          <div class="summary-stat">
            <span class="stat-label">候選變異總數</span>
            <span class="stat-value" id="cont-stat-total">—</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">污染雜訊踢除</span>
            <span class="stat-value" id="cont-stat-removed">—</span>
            <span class="stat-change" id="cont-stat-change"></span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">過濾後保留</span>
            <span class="stat-value" id="cont-stat-pass">—</span>
          </div>
        </div>
      </div>
    </div>
    <div class="filter-right">
      <div class="qc-inspector-bar">
        <span class="qc-avatar">🧑‍🔬</span>
        <div class="qc-meta">
          <strong>品質品管檢驗員</strong>
          <span>QC Inspector · GetPileupSummaries + CalculateContamination</span>
        </div>
      </div>
      <div class="bqsr-file-flow">
        <div class="bqsr-file-box" id="cont-raw-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_raw.vcf</div>
          <div class="file-type">Raw VCF</div>
        </div>
        <div class="bqsr-arrow-container">
          <div class="bqsr-arrow">→</div>
          <div class="cont-tool-icon" id="cont-tool-icon">🧪</div>
        </div>
        <div class="bqsr-file-box" id="cont-out-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_contam_filtered.vcf</div>
          <div class="file-type">Contamination-filtered VCF</div>
        </div>
      </div>
      <div class="bqsr-panel cont-workbench">
        <div class="cont-workbench-header">
          <h4>試管交叉污染測量</h4>
          <span class="cont-meter" id="cont-meter">—</span>
        </div>
        <div class="cont-tubes" id="cont-tubes"></div>
        <div class="cont-threshold">
          <span class="cont-threshold-label">污染門檻：AF &lt; 交叉污染率 → 雜訊</span>
          <div class="cont-threshold-bar" id="cont-threshold-bar">
            <div class="cont-threshold-line" id="cont-threshold-line"></div>
          </div>
        </div>
        <button class="filter-action-btn" id="cont-measure-btn" type="button">🧪 滴入檢體測量污染率</button>
        <button class="filter-action-btn kick" id="cont-kick-btn" type="button" disabled>🗑️ 踢除污染雜訊點位</button>
        <p class="filter-hint" id="cont-hint">測量交叉污染比例，推算出頻率低於污染門檻的雜訊點位並踢除。</p>
      </div>
      <div class="filter-progress">
        <div class="progress-bar"><div class="progress-fill" id="cont-progress-fill"></div></div>
        <div class="progress-label" id="cont-progress-label">等待檢驗...</div>
      </div>
    </div>
  `;
  return container;
}

function initContaminationVisualization(container) {
  const vcfBody = container.querySelector("#cont-vcf-body");
  const vcfCount = container.querySelector("#cont-vcf-count");
  const statTotal = container.querySelector("#cont-stat-total");
  const statRemoved = container.querySelector("#cont-stat-removed");
  const statPass = container.querySelector("#cont-stat-pass");
  const statChange = container.querySelector("#cont-stat-change");
  const statBadge = container.querySelector("#cont-stat-badge");
  const rawVcfEl = container.querySelector("#cont-raw-vcf");
  const outVcfEl = container.querySelector("#cont-out-vcf");
  const toolIcon = container.querySelector("#cont-tool-icon");
  const tubes = container.querySelector("#cont-tubes");
  const meter = container.querySelector("#cont-meter");
  const thresholdBar = container.querySelector("#cont-threshold-bar");
  const thresholdLine = container.querySelector("#cont-threshold-line");
  const measureBtn = container.querySelector("#cont-measure-btn");
  const kickBtn = container.querySelector("#cont-kick-btn");
  const hint = container.querySelector("#cont-hint");
  const progressFill = container.querySelector("#cont-progress-fill");
  const progressLabel = container.querySelector("#cont-progress-label");

  const CONT_THRESHOLD = 0.02; // 2.0% 交叉污染率
  const variants = [
    { id: "VAR001", pos: "chr1:1000023", ref: "C", alt: "T", af: 0.320 },
    { id: "VAR002", pos: "chr1:1000047", ref: "T", alt: "C", af: 0.180 },
    { id: "VAR003", pos: "chr1:1000072", ref: "G", alt: "A", af: 0.051 },
    { id: "VAR004", pos: "chr1:1000085", ref: "C", alt: "T", af: 0.040 },
    { id: "VAR005", pos: "chr1:1000103", ref: "A", alt: "G", af: 0.021 },
    { id: "VAR006", pos: "chr1:1000115", ref: "T", alt: "G", af: 0.016 },
    { id: "VAR007", pos: "chr1:1000128", ref: "C", alt: "A", af: 0.013 },
    { id: "VAR008", pos: "chr1:1000142", ref: "G", alt: "T", af: 0.011 },
    { id: "VAR009", pos: "chr1:1000156", ref: "A", alt: "T", af: 0.009 },
    { id: "VAR010", pos: "chr1:1000169", ref: "T", alt: "C", af: 0.007 },
    { id: "VAR011", pos: "chr1:1000181", ref: "C", alt: "T", af: 0.005 },
    { id: "VAR012", pos: "chr1:1000194", ref: "G", alt: "A", af: 0.004 },
  ];

  const total = variants.length;
  const lowVariants = variants.filter(v => v.af < CONT_THRESHOLD);
  const passVariants = variants.filter(v => v.af >= CONT_THRESHOLD);
  let measured = false;
  let kicked = false;
  let isPlaying = true;

  function renderVCF() {
    vcfBody.innerHTML = "";
    variants.forEach((v) => {
      const isLow = v.af < CONT_THRESHOLD;
      const row = document.createElement("div");
      row.className = "filter-vcf-row";
      row.dataset.vid = v.id;
      if (kicked && isLow) row.classList.add("filter-removed");
      let filterLabel = ".";
      let filterColor = "var(--text-dim)";
      if (kicked && isLow) {
        filterLabel = "contamination";
        filterColor = "#ff6b6b";
      }
      row.innerHTML = `
        <span class="filter-vcf-id">${v.id}</span>
        <span class="filter-vcf-pos">${v.pos}</span>
        <span class="filter-vcf-mut"><span class="filter-vcf-ref">${v.ref}</span>→<span class="filter-vcf-alt">${v.alt}</span></span>
        <span class="filter-vcf-af">${v.af.toFixed(3)}</span>
        <span class="filter-vcf-status" style="color:${filterColor}">${filterLabel}</span>
      `;
      vcfBody.appendChild(row);
    });
    updateCounts();
  }

  function updateCounts() {
    vcfCount.textContent = (kicked ? passVariants.length : total) + " 候選";
    statTotal.textContent = total;
    statRemoved.textContent = kicked ? lowVariants.length : 0;
    statPass.textContent = kicked ? passVariants.length : total;
    const pct = Math.round((lowVariants.length / total) * 100);
    statChange.textContent = kicked ? "- " + pct + "%" : "";
    statChange.className = "stat-change " + (kicked ? "stat-down" : "");
    statBadge.textContent = kicked ? pct + "% 假突變剔除" : "等待檢驗";
  }

  function renderTubes() {
    tubes.innerHTML = "";
    const reps = [
      { label: "Rep 1", pct: 1.9 },
      { label: "Rep 2", pct: 2.1 },
      { label: "Rep 3", pct: 2.0 },
    ];
    reps.forEach((r) => {
      const wrap = document.createElement("div");
      wrap.className = "cont-tube-wrap";
      wrap.innerHTML = `
        <div class="cont-tube">
          <div class="cont-tube-liquid" data-pct="${r.pct}"></div>
          <div class="cont-tube-scale"><span>5%</span><span>2%</span><span>0%</span></div>
        </div>
        <div class="cont-tube-label">${r.label}</div>
      `;
      tubes.appendChild(wrap);
    });
  }

  function renderThresholdBar() {
    thresholdBar.innerHTML = "";
    const maxAF = Math.max(...variants.map(v => v.af));
    variants.forEach((v) => {
      const marker = document.createElement("div");
      marker.className = "cont-site-marker" + (v.af < CONT_THRESHOLD ? " low" : "");
      marker.style.left = (v.af / maxAF) * 100 + "%";
      marker.title = v.id + " AF=" + v.af.toFixed(3);
      thresholdBar.appendChild(marker);
    });
    thresholdLine.style.left = (CONT_THRESHOLD / maxAF) * 100 + "%";
    thresholdBar.appendChild(thresholdLine);
  }

  function measure() {
    if (measured) return;
    measured = true;
    measureBtn.disabled = true;
    measureBtn.textContent = "🧪 測量完成";
    toolIcon.style.opacity = "1";
    toolIcon.style.animation = "pulse 0.5s ease-in-out infinite";
    progressLabel.textContent = "🧪 正在測量交叉污染率...";
    progressFill.style.width = "40%";
    hint.textContent = "偵測交叉污染比例，推算 AF 低於污染門檻的雜訊點位...";

    const liquids = tubes.querySelectorAll(".cont-tube-liquid");
    liquids.forEach((liq, i) => {
      setTimeout(() => {
        liq.style.height = (parseFloat(liq.dataset.pct) / 5) * 100 + "%";
      }, 400 + i * 250);
    });

    setTimeout(() => {
      meter.textContent = "2.0%";
      meter.classList.add("measured");
      toolIcon.style.animation = "";
      thresholdLine.style.display = "block";
      progressFill.style.width = "60%";
      progressLabel.textContent = "交叉污染率 = 2.0%（AF 低於此門檻即為雜訊）";
      kickBtn.disabled = false;
      hint.textContent = "推算出 " + lowVariants.length + " 個 AF 低於 2.0% 的雜訊點位，準備踢除。";
      rawVcfEl.classList.add("highlight");
    }, 1400);
  }

  function kick() {
    if (kicked) return;
    kicked = true;
    kickBtn.disabled = true;
    kickBtn.textContent = "🗑️ 已踢除污染雜訊";
    progressLabel.textContent = "🗑️ 踢除污染雜訊點位...";
    progressFill.style.width = "85%";

    lowVariants.forEach((v, i) => {
      setTimeout(() => {
        const row = vcfBody.querySelector(`.filter-vcf-row[data-vid="${v.id}"]`);
        if (row) {
          row.classList.add("filter-removed");
          const status = row.querySelector(".filter-vcf-status");
          if (status) { status.textContent = "contamination"; status.style.color = "#ff6b6b"; }
        }
      }, 200 + i * 220);
    });

    setTimeout(() => {
      progressFill.style.width = "100%";
      progressLabel.textContent = "✅ 踢除完成！保留 " + passVariants.length + " 個高可信度候選";
      outVcfEl.classList.add("highlight");
      rawVcfEl.classList.remove("highlight");
      hint.textContent = "已踢除 " + lowVariants.length + " 個污染雜訊點位，假突變顯著下降。";
      updateCounts();
    }, 200 + lowVariants.length * 220 + 300);
  }

  renderTubes();
  renderThresholdBar();
  renderVCF();

  measureBtn.addEventListener("click", measure);
  kickBtn.addEventListener("click", kick);

  setTimeout(() => { if (!measured && isPlaying) measure(); }, 2000);
  setTimeout(() => { if (!kicked && isPlaying) kick(); }, 5800);

  return () => { isPlaying = false; };
}

/* ===== Stage 4: Filtering — Read Orientation Bias Visualization ===== */
function createOrientationBiasVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual filter-visual orientation-visual";
  container.innerHTML = `
    <div class="filter-left">
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>VCF 過濾結果</h3>
          <span class="bqsr-badge" id="orient-vcf-count">8 候選</span>
        </div>
        <div class="filter-vcf-table">
          <div class="filter-vcf-head">
            <span>ID</span><span>POS</span><span>REF→ALT</span><span>AF</span><span>FILTER</span>
          </div>
          <div class="filter-vcf-body" id="orient-vcf-body"></div>
        </div>
      </div>
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>方向性偏倚統計</h3>
          <span class="bqsr-badge" id="orient-stat-badge">等待檢驗</span>
        </div>
        <div class="filter-stats">
          <div class="summary-stat">
            <span class="stat-label">候選變異總數</span>
            <span class="stat-value" id="orient-stat-total">—</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">單鏈偏倚偽突變</span>
            <span class="stat-value" id="orient-stat-bias">—</span>
            <span class="stat-change" id="orient-stat-change"></span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">過濾後保留</span>
            <span class="stat-value" id="orient-stat-pass">—</span>
          </div>
        </div>
      </div>
    </div>
    <div class="filter-right">
      <div class="qc-inspector-bar">
        <span class="qc-avatar">🧑‍🔬</span>
        <div class="qc-meta">
          <strong>品質品管檢驗員</strong>
          <span>QC Inspector · LearnReadOrientationModel</span>
        </div>
      </div>
      <div class="bqsr-file-flow">
        <div class="bqsr-file-box" id="orient-raw-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_contam_filtered.vcf</div>
          <div class="file-type">Contamination-filtered VCF</div>
        </div>
        <div class="bqsr-arrow-container">
          <div class="bqsr-arrow">→</div>
          <div class="orient-tool-icon" id="orient-tool-icon">🔬</div>
        </div>
        <div class="bqsr-file-box" id="orient-out-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_orient_filtered.vcf</div>
          <div class="file-type">Orientation-bias-filtered VCF</div>
        </div>
      </div>
      <div class="bqsr-panel orient-workbench">
        <div class="orient-microscope">
          <div class="orient-eyepiece">🔬</div>
          <div class="orient-lens" id="orient-lens"></div>
        </div>
        <div class="orient-slides" id="orient-slides"></div>
        <button class="filter-action-btn kick" id="orient-remove-btn" type="button" disabled>🔬 剔除單向鏈偏倚偽突變</button>
        <p class="filter-hint" id="orient-hint">用顯微鏡觀察 F1/R2 單鏈 C→T（FFPE 氧化損傷）傾向，點擊偏倚偽突變將其標紅剔除。</p>
      </div>
      <div class="filter-progress">
        <div class="progress-bar"><div class="progress-fill" id="orient-progress-fill"></div></div>
        <div class="progress-label" id="orient-progress-label">等待檢驗...</div>
      </div>
    </div>
  `;
  return container;
}

function initOrientationBiasVisualization(container) {
  const vcfBody = container.querySelector("#orient-vcf-body");
  const vcfCount = container.querySelector("#orient-vcf-count");
  const statTotal = container.querySelector("#orient-stat-total");
  const statBias = container.querySelector("#orient-stat-bias");
  const statPass = container.querySelector("#orient-stat-pass");
  const statChange = container.querySelector("#orient-stat-change");
  const statBadge = container.querySelector("#orient-stat-badge");
  const rawVcfEl = container.querySelector("#orient-raw-vcf");
  const outVcfEl = container.querySelector("#orient-out-vcf");
  const toolIcon = container.querySelector("#orient-tool-icon");
  const lens = container.querySelector("#orient-lens");
  const slidesEl = container.querySelector("#orient-slides");
  const removeBtn = container.querySelector("#orient-remove-btn");
  const hint = container.querySelector("#orient-hint");
  const progressFill = container.querySelector("#orient-progress-fill");
  const progressLabel = container.querySelector("#orient-progress-label");

  const variants = [
    { id: "VAR001", pos: "chr1:1000023", ref: "C", alt: "T", af: 0.180, biased: false },
    { id: "VAR002", pos: "chr1:1000047", ref: "T", alt: "C", af: 0.120, biased: false },
    { id: "VAR003", pos: "chr1:1000072", ref: "C", alt: "T", af: 0.075, biased: true },
    { id: "VAR004", pos: "chr1:1000085", ref: "G", alt: "A", af: 0.064, biased: true },
    { id: "VAR005", pos: "chr1:1000103", ref: "C", alt: "T", af: 0.048, biased: false },
    { id: "VAR006", pos: "chr1:1000115", ref: "C", alt: "T", af: 0.039, biased: true },
    { id: "VAR007", pos: "chr1:1000128", ref: "A", alt: "G", af: 0.028, biased: false },
    { id: "VAR008", pos: "chr1:1000142", ref: "G", alt: "T", af: 0.021, biased: false },
  ];

  const total = variants.length;
  const biasedVariants = variants.filter(v => v.biased);
  const passVariants = variants.filter(v => !v.biased);
  let markedCount = 0;
  let removed = false;
  let isPlaying = true;

  function buildReads(v) {
    const ctx = () => {
      const bases = ["A", "C", "G", "T"];
      let s = "";
      for (let i = 0; i < 9; i++) s += bases[Math.floor(Math.random() * 4)];
      return s;
    };
    const fSeq = ctx() + v.alt + ctx();
    const rSeq = ctx() + (v.biased ? v.ref : v.alt) + ctx();
    return { fSeq, rSeq, mutIdx: 9 };
  }

  function strandRow(label, seq, mutIdx, isAlt, color) {
    return `
      <div class="orient-strand-row">
        <span class="orient-strand-label" style="color:${color}">${label}</span>
        <span class="orient-strand-seq">
          ${seq.split("").map((b, i) => {
            if (i === mutIdx) {
              return `<span class="orient-mut-base ${isAlt ? "alt" : "ref"}">${b}</span>`;
            }
            return `<span class="orient-read-base">${b}</span>`;
          }).join("")}
        </span>
      </div>
    `;
  }

  function renderSlides() {
    slidesEl.innerHTML = "";
    variants.forEach((v) => {
      const { fSeq, rSeq, mutIdx } = buildReads(v);
      const slide = document.createElement("div");
      slide.className = "orient-slide" + (v.biased ? " biased" : "");
      slide.dataset.vid = v.id;
      slide.innerHTML = `
        <div class="orient-slide-head">
          <span class="orient-slide-id">${v.id}</span>
          <span class="orient-slide-mut"><span class="filter-vcf-ref">${v.ref}</span>→<span class="filter-vcf-alt">${v.alt}</span> <small>${v.pos}</small></span>
          ${v.biased ? '<span class="orient-bias-badge">⚠ 單鏈偏倚</span>' : '<span class="orient-pass-badge">✓ 雙鏈支援</span>'}
        </div>
        ${strandRow("F1 正鏈", fSeq, mutIdx, true, "#ff8fb1")}
        ${strandRow("R2 反鏈", rSeq, mutIdx, !v.biased, "#4da3ff")}
      `;
      slide.addEventListener("click", () => handleSlideClick(v, slide));
      slidesEl.appendChild(slide);
    });
  }

  function handleSlideClick(v, slide) {
    if (removed) return;
    if (slide.classList.contains("marked")) return;
    if (v.biased) {
      slide.classList.add("marked");
      markedCount++;
      hint.textContent = "已標紅 " + markedCount + "/" + biasedVariants.length + " 個單鏈偏倚偽突變";
      progressFill.style.width = (markedCount / biasedVariants.length) * 100 + "%";
      progressLabel.textContent = "標紅中: " + markedCount + "/" + biasedVariants.length + " 個偏倚偽突變";
      if (markedCount === biasedVariants.length) {
        removeBtn.disabled = false;
        hint.textContent = "🎯 全部單鏈偏倚偽突變已標紅，準備剔除！";
      }
    } else {
      slide.style.animation = "shake 0.4s ease";
      setTimeout(() => (slide.style.animation = ""), 400);
      hint.textContent = "「" + v.id + "」F1/R2 雙鏈都有支援，是真實突變，不需剔除。";
    }
  }

  function renderVCF() {
    vcfBody.innerHTML = "";
    variants.forEach((v) => {
      const row = document.createElement("div");
      row.className = "filter-vcf-row";
      row.dataset.vid = v.id;
      if (removed && v.biased) row.classList.add("filter-removed");
      let filterLabel = ".";
      let filterColor = "var(--text-dim)";
      if (removed && v.biased) {
        filterLabel = "orientation_bias";
        filterColor = "#ff8fb1";
      }
      row.innerHTML = `
        <span class="filter-vcf-id">${v.id}</span>
        <span class="filter-vcf-pos">${v.pos}</span>
        <span class="filter-vcf-mut"><span class="filter-vcf-ref">${v.ref}</span>→<span class="filter-vcf-alt">${v.alt}</span></span>
        <span class="filter-vcf-af">${v.af.toFixed(3)}</span>
        <span class="filter-vcf-status" style="color:${filterColor}">${filterLabel}</span>
      `;
      vcfBody.appendChild(row);
    });
    updateCounts();
  }

  function updateCounts() {
    vcfCount.textContent = (removed ? passVariants.length : total) + " 候選";
    statTotal.textContent = total;
    statBias.textContent = removed ? biasedVariants.length : markedCount;
    statPass.textContent = removed ? passVariants.length : total;
    const pct = Math.round((biasedVariants.length / total) * 100);
    statChange.textContent = removed ? "- " + pct + "%" : "";
    statChange.className = "stat-change " + (removed ? "stat-down" : "");
    statBadge.textContent = removed ? pct + "% 偽突變剔除" : "等待檢驗";
  }

  function removeBiased() {
    if (removed) return;
    removed = true;
    removeBtn.disabled = true;
    removeBtn.textContent = "🔬 已剔除偏倚偽突變";
    toolIcon.style.opacity = "1";
    lens.classList.add("inspecting");
    progressLabel.textContent = "🔬 剔除單鏈偏倚偽突變...";
    progressFill.style.width = "80%";

    biasedVariants.forEach((v, i) => {
      setTimeout(() => {
        const row = vcfBody.querySelector(`.filter-vcf-row[data-vid="${v.id}"]`);
        if (row) {
          row.classList.add("filter-removed");
          const status = row.querySelector(".filter-vcf-status");
          if (status) { status.textContent = "orientation_bias"; status.style.color = "#ff8fb1"; }
        }
      }, 200 + i * 220);
    });

    setTimeout(() => {
      progressFill.style.width = "100%";
      progressLabel.textContent = "✅ 剔除完成！保留 " + passVariants.length + " 個雙鏈支援的真實突變";
      outVcfEl.classList.add("highlight");
      rawVcfEl.classList.remove("highlight");
      lens.classList.remove("inspecting");
      updateCounts();
    }, 200 + biasedVariants.length * 220 + 300);
  }

  renderSlides();
  renderVCF();
  removeBtn.addEventListener("click", removeBiased);

  setTimeout(() => {
    if (!removed && isPlaying) {
      const biasedSlides = slidesEl.querySelectorAll(".orient-slide.biased:not(.marked)");
      biasedSlides.forEach((s, i) => setTimeout(() => s.click(), i * 400));
    }
  }, 2500);
  setTimeout(() => { if (!removed && isPlaying) removeBtn.click(); }, 6500);

  return () => { isPlaying = false; };
}

/* ===== Stage 4: Filtering — FilterMutectCalls Visualization ===== */
function createFilterMutectVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual filter-visual filtermutect-visual";
  container.innerHTML = `
    <div class="filter-left">
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>VCF 過濾結果</h3>
          <span class="bqsr-badge" id="fmc-vcf-count">12 候選</span>
        </div>
        <div class="filter-vcf-table">
          <div class="filter-vcf-head">
            <span>ID</span><span>POS</span><span>REF→ALT</span><span>AF</span><span>FILTER</span>
          </div>
          <div class="filter-vcf-body" id="fmc-vcf-body"></div>
        </div>
      </div>
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>FilterMutectCalls 統計</h3>
          <span class="bqsr-badge">Filtering Statistics</span>
        </div>
        <div class="fmc-stats-list" id="fmc-stats-list"></div>
        <div class="fmc-funnel" id="fmc-funnel"></div>
      </div>
    </div>
    <div class="filter-right">
      <div class="qc-inspector-bar">
        <span class="qc-avatar">🧑‍🔬</span>
        <div class="qc-meta">
          <strong>品質品管檢驗員</strong>
          <span>QC Inspector · FilterMutectCalls</span>
        </div>
      </div>
      <div class="bqsr-file-flow">
        <div class="bqsr-file-box" id="fmc-raw-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_orient_filtered.vcf</div>
          <div class="file-type">Orientation-filtered VCF</div>
        </div>
        <div class="bqsr-arrow-container">
          <div class="bqsr-arrow">→</div>
          <div class="fmc-tool-icon" id="fmc-tool-icon">📋</div>
        </div>
        <div class="bqsr-file-box" id="fmc-out-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_pass.vcf</div>
          <div class="file-type">PASS VCF</div>
        </div>
      </div>
      <div class="bqsr-panel fmc-workbench">
        <div class="fmc-certificate" id="fmc-certificate">
          <div class="fmc-cert-inner">
            <div class="fmc-cert-top">基因偵探事務所</div>
            <div class="fmc-cert-title">Somatic Variant 合格證</div>
            <div class="fmc-cert-pass" id="fmc-cert-pass">PASS</div>
            <div class="fmc-cert-detail">核發單位：FilterMutectCalls</div>
          </div>
        </div>
        <button class="filter-action-btn fmc-stamp-btn" id="fmc-stamp-btn" type="button">
          <span class="fmc-stamp" id="fmc-stamp">PASS</span>
          <span class="fmc-stamp-label">蓋章發證</span>
        </button>
        <p class="filter-hint" id="fmc-hint">壓下蓋章按鈕，為通過所有濾網的變異核發「PASS」合格證。</p>
      </div>
      <div class="filter-progress">
        <div class="progress-bar"><div class="progress-fill" id="fmc-progress-fill"></div></div>
        <div class="progress-label" id="fmc-progress-label">等待核發...</div>
      </div>
    </div>
  `;
  return container;
}

function initFilterMutectVisualization(container) {
  const vcfBody = container.querySelector("#fmc-vcf-body");
  const vcfCount = container.querySelector("#fmc-vcf-count");
  const statsList = container.querySelector("#fmc-stats-list");
  const funnelEl = container.querySelector("#fmc-funnel");
  const rawVcfEl = container.querySelector("#fmc-raw-vcf");
  const outVcfEl = container.querySelector("#fmc-out-vcf");
  const toolIcon = container.querySelector("#fmc-tool-icon");
  const certificate = container.querySelector("#fmc-certificate");
  const stamp = container.querySelector("#fmc-stamp");
  const stampBtn = container.querySelector("#fmc-stamp-btn");
  const hint = container.querySelector("#fmc-hint");
  const progressFill = container.querySelector("#fmc-progress-fill");
  const progressLabel = container.querySelector("#fmc-progress-label");

  const variants = [
    { id: "VAR001", pos: "chr1:1000023", ref: "C", alt: "T", af: 0.180 },
    { id: "VAR002", pos: "chr1:1000047", ref: "T", alt: "C", af: 0.120 },
    { id: "VAR005", pos: "chr1:1000103", ref: "C", alt: "T", af: 0.048 },
    { id: "VAR007", pos: "chr1:1000128", ref: "A", alt: "G", af: 0.028 },
    { id: "VAR008", pos: "chr1:1000142", ref: "G", alt: "T", af: 0.021 },
    { id: "VAR009", pos: "chr1:1000156", ref: "A", alt: "T", af: 0.017 },
    { id: "VAR010", pos: "chr1:1000169", ref: "T", alt: "C", af: 0.013 },
    { id: "VAR011", pos: "chr1:1000181", ref: "C", alt: "T", af: 0.009 },
    { id: "VAR012", pos: "chr1:1000194", ref: "G", alt: "A", af: 0.007 },
    { id: "VAR013", pos: "chr1:1000208", ref: "T", alt: "G", af: 0.005 },
    { id: "VAR014", pos: "chr1:1000221", ref: "C", alt: "A", af: 0.004 },
    { id: "VAR015", pos: "chr1:1000235", ref: "G", alt: "C", af: 0.003 },
  ];

  let stamped = false;
  let isPlaying = true;

  const FMC_STATS = [
    { label: "TOTAL_SITES (原始候選)", value: "1,248", color: "#9fb0c3" },
    { label: "FILTER: contamination", value: "900", color: "#ff6b6b" },
    { label: "FILTER: orientation_bias", value: "301", color: "#ff8fb1" },
    { label: "FILTER: min_allele_fraction", value: "35", color: "#ffb84d" },
    { label: "PASS", value: "12", color: "#4cc38a" },
  ];

  function renderStats() {
    statsList.innerHTML = "";
    FMC_STATS.forEach((s) => {
      const row = document.createElement("div");
      row.className = "fmc-stat-row";
      row.innerHTML = `
        <span class="fmc-stat-label">${s.label}</span>
        <span class="fmc-stat-value" style="color:${s.color}">${s.value}</span>
      `;
      statsList.appendChild(row);
    });
  }

  function renderFunnel() {
    funnelEl.innerHTML = "";
    const stages = [
      { label: "Raw", value: 1248, color: "#9fb0c3" },
      { label: "Contamination", value: 348, color: "#ffb84d" },
      { label: "Orientation bias", value: 47, color: "#ff8fb1" },
      { label: "PASS", value: 12, color: "#4cc38a" },
    ];
    const maxV = 1248;
    stages.forEach((s) => {
      const row = document.createElement("div");
      row.className = "fmc-funnel-row";
      row.innerHTML = `
        <span class="fmc-funnel-label">${s.label}</span>
        <div class="fmc-funnel-track">
          <div class="fmc-funnel-bar" style="width:${((s.value / maxV) * 100).toFixed(1)}%;background:${s.color}"></div>
        </div>
        <span class="fmc-funnel-value">${s.value.toLocaleString()}</span>
      `;
      funnelEl.appendChild(row);
    });
  }

  function renderVCF() {
    vcfBody.innerHTML = "";
    variants.forEach((v) => {
      const row = document.createElement("div");
      row.className = "filter-vcf-row";
      row.dataset.vid = v.id;
      if (stamped) row.classList.add("filter-pass-row");
      const filterLabel = stamped ? "PASS" : "審核中…";
      const filterColor = stamped ? "#4cc38a" : "#ffb84d";
      row.innerHTML = `
        <span class="filter-vcf-id">${v.id}</span>
        <span class="filter-vcf-pos">${v.pos}</span>
        <span class="filter-vcf-mut"><span class="filter-vcf-ref">${v.ref}</span>→<span class="filter-vcf-alt">${v.alt}</span></span>
        <span class="filter-vcf-af">${v.af.toFixed(3)}</span>
        <span class="filter-vcf-status" style="color:${filterColor}">${filterLabel}</span>
      `;
      vcfBody.appendChild(row);
    });
    vcfCount.textContent = variants.length + " 候選" + (stamped ? " · PASS" : "");
  }

  function stampPass() {
    if (stamped) return;
    stamped = true;
    stampBtn.disabled = true;
    toolIcon.style.opacity = "1";
    progressLabel.textContent = "📋 FilterMutectCalls 整合所有濾網...";
    progressFill.style.width = "40%";
    hint.textContent = "蓋章中：整合 germline、PoN、contamination、orientation_bias 等所有濾網結果...";

    stamp.classList.add("stamping");

    setTimeout(() => {
      stamp.classList.remove("stamping");
      stamp.classList.add("stamped");
      certificate.classList.add("certified");
      progressFill.style.width = "100%";
      progressLabel.textContent = "✅ 已核發 PASS 合格證！" + variants.length + " 個高可信度變異通過";
      outVcfEl.classList.add("highlight");
      rawVcfEl.classList.remove("highlight");
      hint.textContent = "所有濾網收斂為 PASS，輸出高精準度的 PASS VCF。";
      renderVCF();
    }, 1300);
  }

  renderStats();
  renderFunnel();
  renderVCF();
  stampBtn.addEventListener("click", stampPass);
  setTimeout(() => { if (!stamped && isPlaying) stampPass(); }, 1800);

  return () => { isPlaying = false; };
}

function createAnnotationVisualization() {
  const container = document.createElement("div");
  container.className = "stage1-visual filter-visual annotation-visual";
  container.innerHTML = `
    <div class="filter-left">
      <div class="bqsr-panel">
        <div class="bqsr-panel-header">
          <h3>變異註釋結果</h3>
          <span class="bqsr-badge" id="ann-vcf-count">6 變異</span>
        </div>
        <div class="filter-vcf-table ann-table">
          <div class="filter-vcf-head ann-head">
            <span>ID</span><span>染色體座標</span><span>REF→ALT</span><span>基因 · 蛋白質</span><span>臨床意義</span>
          </div>
          <div class="filter-vcf-body" id="ann-vcf-body"></div>
        </div>
        <p class="filter-hint">將左側 PASS VCF 變異卡片拖入右方「ANNOVAR / VEP 知識庫資料塔」，取得臨床註釋。</p>
      </div>
      <div class="bqsr-panel ann-report-panel" id="ann-report-panel" hidden>
        <div class="bqsr-panel-header">
          <h3>臨床診斷報告</h3>
          <span class="bqsr-badge" id="ann-report-badge">—</span>
        </div>
        <div class="ann-report" id="ann-report"></div>
      </div>
    </div>
    <div class="filter-right">
      <div class="qc-inspector-bar">
        <span class="qc-avatar">🧑‍🔬</span>
        <div class="qc-meta">
          <strong>生物百科全書檢索員</strong>
          <span>Genomic Curator · ANNOVAR / VEP 知識庫檢索</span>
        </div>
      </div>
      <div class="bqsr-file-flow">
        <div class="bqsr-file-box" id="ann-in-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_pass.vcf</div>
          <div class="file-type">PASS VCF</div>
        </div>
        <div class="bqsr-arrow-container">
          <div class="bqsr-arrow">→</div>
          <div class="ann-tool-icon" id="ann-tool-icon">📚</div>
        </div>
        <div class="bqsr-file-box" id="ann-out-vcf">
          <div class="file-icon">📄</div>
          <div class="file-name">somatic_annotated.vcf</div>
          <div class="file-type">Annotated VCF / ClinVar Report</div>
        </div>
      </div>
      <div class="bqsr-panel ann-tower-panel">
        <div class="ann-tower-header">
          <h4>ANNOVAR / VEP 知識庫資料塔</h4>
          <span class="ann-tower-status" id="ann-tower-status">等待變異卡片…</span>
        </div>
        <div class="ann-tower" id="ann-tower">
          <div class="ann-tower-receiver">⬇ 拖曳變異卡片至此</div>
          <div class="ann-tower-floors">
            <div class="ann-tower-floor" data-floor="0"><span class="ann-floor-name">ANNOVAR</span><span class="ann-floor-desc">基因 / 轉錄本註釋</span></div>
            <div class="ann-tower-floor" data-floor="1"><span class="ann-floor-name">VEP</span><span class="ann-floor-desc">蛋白質結構影響</span></div>
            <div class="ann-tower-floor" data-floor="2"><span class="ann-floor-name">ClinVar / COSMIC</span><span class="ann-floor-desc">臨床意義分級</span></div>
            <div class="ann-tower-floor" data-floor="3"><span class="ann-floor-name">DrugBank / OncoKB</span><span class="ann-floor-desc">藥物靶向建議</span></div>
          </div>
        </div>
        <button class="filter-action-btn" id="ann-batch-btn" type="button">📚 批次檢索全部變異</button>
        <p class="filter-hint" id="ann-hint">把變異點卡片拖入知識庫資料塔，檢索蛋白質影響與臨床藥物建議。</p>
      </div>
      <div class="bqsr-panel ann-out-panel">
        <div class="bqsr-panel-header">
          <h3>知識庫輸出</h3>
          <span class="bqsr-badge" id="ann-out-count">0 筆</span>
        </div>
        <div class="ann-out-cards" id="ann-out-cards"></div>
      </div>
      <div class="filter-progress">
        <div class="progress-bar"><div class="progress-fill" id="ann-progress-fill"></div></div>
        <div class="progress-label" id="ann-progress-label">等待檢索...</div>
      </div>
    </div>
  `;
  return container;
}

function initAnnotationVisualization(container) {
  const vcfBody = container.querySelector("#ann-vcf-body");
  const vcfCount = container.querySelector("#ann-vcf-count");
  const reportPanel = container.querySelector("#ann-report-panel");
  const reportBadge = container.querySelector("#ann-report-badge");
  const report = container.querySelector("#ann-report");
  const toolIcon = container.querySelector("#ann-tool-icon");
  const tower = container.querySelector("#ann-tower");
  const floors = tower.querySelectorAll(".ann-tower-floor");
  const status = container.querySelector("#ann-tower-status");
  const batchBtn = container.querySelector("#ann-batch-btn");
  const outCards = container.querySelector("#ann-out-cards");
  const outCount = container.querySelector("#ann-out-count");
  const progressFill = container.querySelector("#ann-progress-fill");
  const progressLabel = container.querySelector("#ann-progress-label");

  const VARIANTS = [
    {
      id: "VAR001", pos: "chr7:55249071", ref: "C", alt: "T", af: 0.342,
      gene: "EGFR", transcript: "NM_005228.5", protein: "p.L858R",
      effect: "錯義", effectType: "missense",
      clin: "Pathogenic", clinSource: "ClinVar",
      impact: "受體活化結構域關鍵錯義，導致 EGFR 酪胺酸激酶持續活化",
      sift: "Damaging", polyphen: "Probably_damaging",
      drug: { name: "Osimertinib", brand: "Tagrisso", line: "第一線標靶", note: "NCCN 首選 EGFR 活化突變治療" },
    },
    {
      id: "VAR002", pos: "chr7:55241603", ref: "G", alt: "A", af: 0.181,
      gene: "EGFR", transcript: "NM_005228.5", protein: "p.T790M",
      effect: "錯義", effectType: "missense",
      clin: "Pathogenic", clinSource: "ClinVar",
      impact: "活化結構域門控殘基取代，為第一／二代 TKI 治療之抗藥突變",
      sift: "Damaging", polyphen: "Probably_damaging",
      drug: { name: "Osimertinib", brand: "Tagrisso", line: "抗藥後治療", note: "可克服 T790M 抗藥突變" },
    },
    {
      id: "VAR003", pos: "chr7:55242415", ref: "T", alt: "C", af: 0.073,
      gene: "EGFR", transcript: "NM_005228.5", protein: "p.G719S",
      effect: "錯義", effectType: "missense",
      clin: "Pathogenic", clinSource: "ClinVar",
      impact: "N 端活化結構域罕見活化突變，仍對 TKI 具敏感性",
      sift: "Damaging", polyphen: "Probably_damaging",
      drug: { name: "Afatinib", brand: "Gilotrif", line: "第一線標靶", note: "適用 G719X 等罕見 EGFR 突變" },
    },
    {
      id: "VAR004", pos: "chr12:25398285", ref: "C", alt: "T", af: 0.209,
      gene: "KRAS", transcript: "NM_033360.4", protein: "p.G12D",
      effect: "錯義", effectType: "missense",
      clin: "Pathogenic", clinSource: "COSMIC",
      impact: "KRAS 活化密碼子 12 突變，常與 EGFR 標靶抗藥相關",
      sift: "Damaging", polyphen: "Probably_damaging",
      drug: { name: "尚無直接標靶", brand: "—", line: "預後參考", note: "KRAS G12D 變異可能影響 EGFR TKI 療效" },
    },
    {
      id: "VAR005", pos: "chr17:7578406", ref: "C", alt: "T", af: 0.154,
      gene: "TP53", transcript: "NM_000546.6", protein: "p.R342*",
      effect: "無義", effectType: "nonsense",
      clin: "Pathogenic", clinSource: "ClinVar",
      impact: "提前終止產生截短蛋白，喪失腫瘤抑制功能",
      sift: "—", polyphen: "—",
      drug: { name: "無直接標靶", brand: "—", line: "預後評估", note: "TP53 喪失功能與較差預後相關" },
    },
    {
      id: "VAR006", pos: "chr9:21970952", ref: "C", alt: "T", af: 0.028,
      gene: "CDKN2A", transcript: "NM_000077.5", protein: "p.V63V",
      effect: "同義", effectType: "synonymous",
      clin: "VUS", clinSource: "ClinVar",
      impact: "同義變異不改變胺基酸序列，臨床意義待確認",
      sift: "—", polyphen: "—",
      drug: { name: "尚無標靶", brand: "—", line: "觀察追蹤", note: "VUS 變異暫不影響治療決策" },
    },
  ];

  const annotated = {};
  let queue = [];
  let processing = false;
  let isPlaying = true;

  function updateProgress(pct, label) {
    progressFill.style.width = pct + "%";
    progressLabel.textContent = label;
  }

  function renderVCF() {
    vcfBody.innerHTML = "";
    VARIANTS.forEach((v) => {
      const isDone = !!annotated[v.id];
      const row = document.createElement("div");
      row.className = "filter-vcf-row ann-row" + (isDone ? " annotated" : "");
      row.draggable = !isDone;
      row.dataset.vid = v.id;
      const geneCell = isDone
        ? `<span class="ann-gene">${v.gene}</span><span class="ann-protein">${v.protein}</span><span class="ann-effect ${v.effectType}">${v.effect}</span>`
        : `<span class="ann-empty">—</span>`;
      const clinCell = isDone
        ? `<span class="ann-clin ${v.clin === "Pathogenic" ? "pathogenic" : "vus"}">${v.clin} <span class="ann-clin-src">(${v.clinSource})</span></span>`
        : `<span class="ann-empty">—</span>`;
      row.innerHTML = `
        <span class="filter-vcf-id">${v.id}</span>
        <span class="filter-vcf-pos">${v.pos}</span>
        <span class="filter-vcf-mut"><span class="filter-vcf-ref">${v.ref}</span>→<span class="filter-vcf-alt">${v.alt}</span></span>
        <span class="ann-cell">${geneCell}</span>
        <span class="ann-cell">${clinCell}</span>
      `;
      row.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", v.id);
        e.dataTransfer.effectAllowed = "copy";
        row.classList.add("dragging");
      });
      row.addEventListener("dragend", () => row.classList.remove("dragging"));
      vcfBody.appendChild(row);
    });
  }

  function renderOutputCards() {
    const done = VARIANTS.filter((v) => annotated[v.id]);
    outCards.innerHTML = "";
    if (!done.length) {
      outCards.innerHTML = `<div class="ann-out-empty">將變異卡片拖入知識庫資料塔，蛋白質影響與藥物建議將顯示於此。</div>`;
      return;
    }
    done.forEach((v) => {
      const card = document.createElement("div");
      card.className = "ann-out-card";
      card.innerHTML = `
        <div class="ann-out-card-head">
          <span class="ann-gene">${v.gene}</span>
          <span class="ann-protein">${v.protein}</span>
          <span class="ann-effect ${v.effectType}">${v.effect}</span>
        </div>
        <div class="ann-out-id">${v.id} · ${v.pos} ${v.ref}→${v.alt} · ${v.clin} (${v.clinSource})</div>
        <div class="ann-out-subtitle">蛋白質結構影響</div>
        <div class="ann-out-impact">${v.impact}</div>
        <div class="ann-out-metrics">SIFT: ${v.sift} · PolyPhen: ${v.polyphen}</div>
        <div class="ann-out-subtitle">臨床藥物建議</div>
        <div class="ann-drug-line"><span class="ann-drug-name">${v.drug.name}</span><span class="ann-drug-brand">${v.drug.brand}</span><span class="ann-drug-line-tag">${v.drug.line}</span></div>
        <div class="ann-out-note">${v.drug.note}</div>
      `;
      outCards.appendChild(card);
    });
  }

  function renderReport() {
    const n = Object.keys(annotated).length;
    reportBadge.textContent = n + " / " + VARIANTS.length + " 已註釋";
    if (n === 0) { reportPanel.hidden = true; return; }
    reportPanel.hidden = false;
    const patho = VARIANTS.filter((v) => annotated[v.id] && v.clin === "Pathogenic");
    const vus = VARIANTS.filter((v) => annotated[v.id] && v.clin === "VUS");
    const drugs = VARIANTS.filter((v) => annotated[v.id] && v.drug.name !== "無直接標靶" && v.drug.name !== "尚無標靶");
    report.innerHTML = `
      <div class="ann-report-head">患者 NGS 臨床檢驗報告</div>
      <div class="ann-report-row"><span class="ann-report-label">檢出基因</span><span class="ann-report-val">${patho.map((v) => v.gene).join(" · ") || "—"}</span></div>
      <div class="ann-report-row"><span class="ann-report-label">臨床意義</span><span class="ann-report-val"><span class="ann-clin pathogenic">Pathogenic</span> × ${patho.length} ${vus.length ? `<span class="ann-clin vus">VUS</span> × ${vus.length}` : ""}</span></div>
      <div class="ann-report-row"><span class="ann-report-label">標靶藥物</span><span class="ann-report-val">${drugs.map((d) => `<span class="ann-drug-pill">${d.drug.name} (${d.drug.brand})</span>`).join(" ") || "尚無可用標靶"}</span></div>
      <div class="ann-report-row ann-report-note">${patho.some((v) => v.drug.name === "Osimertinib") ? "結論：EGFR 活化突變陽性，建議 Osimertinib 第一線標靶治療。" : "結論：結合病理與臨床綜合評估。"}</div>
    `;
  }

  function updateCounts() {
    const n = Object.keys(annotated).length;
    vcfCount.textContent = n + " / " + VARIANTS.length + " 已註釋";
    outCount.textContent = n + " 筆";
    updateProgress(Math.round((n / VARIANTS.length) * 100), n === VARIANTS.length ? "全部註釋完成 ✓" : n ? "檢索 " + n + " / " + VARIANTS.length : "等待檢索...");
    renderReport();
  }

  function lightFloors() {
    floors.forEach((f, i) => { setTimeout(() => { f.classList.add("on"); }, i * 200); });
  }
  function unlightFloors() {
    floors.forEach((f) => f.classList.remove("on"));
  }

  function enqueue(vid) {
    if (annotated[vid] || queue.includes(vid)) return;
    queue.push(vid);
    if (!processing) processQueue();
  }

  function processQueue() {
    if (!queue.length) { processing = false; return; }
    processing = true;
    const vid = queue.shift();
    const v = VARIANTS.find((x) => x.id === vid);
    toolIcon.classList.add("visible");
    status.textContent = "連線中 · " + v.gene + " " + v.protein + "…";
    status.classList.add("busy");
    tower.classList.add("connecting");
    lightFloors();
    setTimeout(() => {
      annotated[vid] = true;
      tower.classList.remove("connecting");
      status.classList.remove("busy");
      status.textContent = "註釋完成 ✓";
      unlightFloors();
      renderVCF();
      renderOutputCards();
      updateCounts();
      setTimeout(() => processQueue(), 180);
    }, 1050);
  }

  tower.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    tower.classList.add("drag-over");
  });
  tower.addEventListener("dragleave", (e) => {
    if (!tower.contains(e.relatedTarget)) tower.classList.remove("drag-over");
  });
  tower.addEventListener("drop", (e) => {
    e.preventDefault();
    tower.classList.remove("drag-over");
    const vid = e.dataTransfer.getData("text/plain");
    if (vid) enqueue(vid);
  });

  batchBtn.addEventListener("click", () => {
    VARIANTS.forEach((v) => { if (!annotated[v.id]) enqueue(v.id); });
  });

  renderVCF();
  renderOutputCards();
  updateCounts();

  const ids = VARIANTS.map((v) => v.id);
  setTimeout(() => { if (isPlaying) enqueue(ids[0]); }, 2000);
  ids.forEach((vid, i) => {
    if (i === 0) return;
    setTimeout(() => { if (isPlaying) enqueue(vid); }, 2000 + i * 1300);
  });

  return () => { isPlaying = false; };
}

const SCENARIO_TEXT =
  "今天我們收到了一位患者的 DNA 檢體，你的任務是從這 30 億個鹼基字母中，找出導致疾病的「微小突變」。";

const workflowList = document.getElementById("workflow-list");
const overview = document.getElementById("overview");
const detail = document.getElementById("detail");
const detailContent = document.getElementById("detail-content");
const backBtn = document.getElementById("back-btn");

const viewHome = document.getElementById("view-home");
const viewApp = document.getElementById("view-app");
const startBtn = document.getElementById("start-btn");
const startHint = document.getElementById("start-hint");
const patientBadge = document.getElementById("patient-badge");
const homeBtn = document.getElementById("home-btn");

const taskOverlay = document.getElementById("task-overlay");
const taskSlides = document.querySelectorAll(".task-slide");
const taskDots = document.getElementById("task-dots");
const taskPrev = document.getElementById("task-prev");
const taskNext = document.getElementById("task-next");

let activeCard = null;
let firstCard = null;
let selectedPatient = null;
let currentSlide = 0;
let currentStage = 0;
const cardsByStage = [];

function colorFromStage(stageIndex) {
  return STAGE_COLORS[stageIndex % STAGE_COLORS.length];
}

function renderSidebar() {
  workflowList.innerHTML = "";
  WORKFLOW.forEach((stage, si) => {
    const color = colorFromStage(si);
    const stageEl = document.createElement("div");
    stageEl.className = "stage";
    cardsByStage[si] = [];

    const titleEl = document.createElement("div");
    titleEl.className = "stage-title";
    const numEl = document.createElement("span");
    numEl.className = "stage-num";
    numEl.textContent = si + 1;
    numEl.style.background = color;
    titleEl.appendChild(numEl);
    titleEl.insertAdjacentText("beforeend", `${stage.zh} — ${stage.title}`);
    stageEl.appendChild(titleEl);

    const stepsEl = document.createElement("div");
    stepsEl.className = "stage-steps";

    stage.steps.forEach((step, stepIdx) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "tool-card";

      const iconEl = document.createElement("div");
      iconEl.className = "tool-icon";
      if (step.icon) {
        const img = document.createElement("img");
        img.src = step.icon;
        img.alt = "";
        iconEl.appendChild(img);
      } else {
        const span = document.createElement("span");
        span.className = "no-img";
        span.textContent = (stepIdx + 1).toString();
        span.style.color = color;
        iconEl.appendChild(span);
      }

      const textEl = document.createElement("div");
      textEl.className = "tool-text";
      const nameEl = document.createElement("div");
      nameEl.className = "tool-name";
      nameEl.textContent = step.name;
      const descEl = document.createElement("div");
      descEl.className = "tool-desc";
      descEl.textContent = step.en;
      textEl.appendChild(nameEl);
      textEl.appendChild(descEl);

      card.appendChild(iconEl);
      card.appendChild(textEl);

      card.addEventListener("click", () => showDetail(si, stepIdx, card));
      if (si === 0 && stepIdx === 0) firstCard = card;
      cardsByStage[si].push(card);
      stepsEl.appendChild(card);
    });

    stageEl.appendChild(stepsEl);
    workflowList.appendChild(stageEl);
  });
}

function showDetail(si, stepIdx, card) {
  if (activeCard) activeCard.classList.remove("active");
  activeCard = card;
  card.classList.add("active");

  const stage = WORKFLOW[si];
  const step = stage.steps[stepIdx];
  const color = colorFromStage(si);

  if (si === 0) {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    let visualContainer, initFn;
    if (step.visualType === "bcl-raw") {
      visualContainer = createBCLRawVisualization();
      initFn = initBCLRawVisualization;
    } else if (step.visualType === "basecalling") {
      visualContainer = createBasecallingVisualization();
      initFn = initBasecallingVisualization;
    } else if (step.visualType === "demultiplexing") {
      visualContainer = createDemultiplexingVisualization();
      initFn = initDemultiplexingVisualization;
    }
    detailContent.appendChild(visualContainer);
    initFn(visualContainer);
  } else if (si === 1 && step.visualType === "fastqc") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createFastQCVisualization();
    detailContent.appendChild(visualContainer);
    initFastQCVisualization(visualContainer);
  } else if (si === 1 && step.visualType === "trimming") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createTrimmingVisualization();
    detailContent.appendChild(visualContainer);
    initTrimmingVisualization(visualContainer);
  } else if (si === 1 && step.visualType === "alignment") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createAlignmentVisualization();
    detailContent.appendChild(visualContainer);
    initAlignmentVisualization(visualContainer);
  } else if (si === 1 && step.visualType === "mark-duplicates") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createMarkDuplicatesVisualization();
    detailContent.appendChild(visualContainer);
    initMarkDuplicatesVisualization(visualContainer);
  } else if (si === 1 && step.visualType === "bqsr") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createBQSRVisualization();
    detailContent.appendChild(visualContainer);
    initBQSRVisualization(visualContainer);
  } else if (si === 2 && step.visualType === "mutect2") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createMutect2Visualization();
    detailContent.appendChild(visualContainer);
    initMutect2Visualization(visualContainer);
  } else if (si === 2 && step.visualType === "gnomad") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createGnomadVisualization();
    detailContent.appendChild(visualContainer);
    initGnomadVisualization(visualContainer);
  } else if (si === 2 && step.visualType === "pon") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createPoNVisualization();
    detailContent.appendChild(visualContainer);
    initPoNVisualization(visualContainer);
  } else if (si === 3 && step.visualType === "contamination") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createContaminationVisualization();
    detailContent.appendChild(visualContainer);
    initContaminationVisualization(visualContainer);
  } else if (si === 3 && step.visualType === "orientation-bias") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createOrientationBiasVisualization();
    detailContent.appendChild(visualContainer);
    initOrientationBiasVisualization(visualContainer);
  } else if (si === 3 && step.visualType === "filter-mutect") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createFilterMutectVisualization();
    detailContent.appendChild(visualContainer);
    initFilterMutectVisualization(visualContainer);
  } else if (si === 4 && step.visualType === "annotation") {
    detailContent.innerHTML = "";
    detailContent.classList.add("full-width");
    const visualContainer = createAnnotationVisualization();
    detailContent.appendChild(visualContainer);
    initAnnotationVisualization(visualContainer);
  } else {
    detailContent.classList.remove("full-width");
    let bulletsHtml = "";
    if (step.bullets && step.bullets.length) {
      bulletsHtml =
        `<h3>重點</h3><ul>` + step.bullets.map((b) => `<li>${b}</li>`).join("") + `</ul>`;
    }

    detailContent.innerHTML = `
      <div class="detail-card">
        <span class="badge" style="background:${color}">${si + 1}. ${stage.zh}</span>
        <h2>${step.name}</h2>
        <div class="en">${step.en}</div>
        <p class="desc">${step.desc}</p>
        <h3>輸入 / 輸出</h3>
        <div class="io">
          <div class="io-box">
            <span class="io-label">輸入 (Input)</span>
            ${step.input}
          </div>
          <div class="io-box">
            <span class="io-label">輸出 (Output)</span>
            ${step.output}
          </div>
        </div>
        ${bulletsHtml}
      </div>
    `;
  }

  overview.hidden = true;
  detail.hidden = false;
  document.getElementById("main-panel").scrollTop = 0;
}

function showOverview() {
  if (activeCard) {
    activeCard.classList.remove("active");
    activeCard = null;
  }
  detail.hidden = true;
  overview.hidden = false;
}

backBtn.addEventListener("click", showOverview);

/* ===== Overview flowchart ===== */
const FLOW_OVERVIEW = [
  {
    zh: "數據下機與拆碼",
    en: "Data Basecalling & Demultiplexing",
    color: 0,
    items: [
      { num: "1", name: "Illumina MiSeq/HiSeq 產生原始檔", en: "Sequencer 輸出 BCL", si: 0, step: 0, out: "BCL" },
      { num: "2", name: "Basecalling (bcl2fastq)", en: "光訊號 → 鹼基文字", si: 0, step: 1, out: "Raw FASTQ" },
      { num: "3", name: "Demultiplexing", en: "Index 比對分樣本", si: 0, step: 2, out: "Sample FASTQ" },
    ],
  },
  {
    zh: "前處理",
    en: "Pre-processing",
    color: 1,
    items: [
      { num: "1", name: "FastQC 品質檢測", en: "FASTQ & FastQC", si: 1, step: 0 },
      { num: "2", name: "修剪與過濾", en: "fastp / Trimmomatic 裁接頭與低品質", si: 1, step: 1, out: "乾淨的 FASTQ" },
      { num: "3", name: "序列比對", en: "Alignment (hg38 / GRCh38)", si: 1, step: 2, out: "Raw BAM" },
      { num: "4", name: "Mark Duplicates", en: "GATK Picard – 修正 PCR 偏差", si: 1, step: 3 },
      { num: "5", name: "BQSR + dbSNP", en: "GATK BaseRecalibrator – 校正 Q 值", si: 1, step: 4, out: "Analysis-ready BAM" },
    ],
  },
  {
    zh: "變異檢測 (Somatic Mutect2)",
    en: "Variant Calling",
    color: 2,
    items: [
      { num: "1", name: "GATK Mutect2 原始呼叫", en: "Tumor vs Matched Normal", si: 2, step: 0 },
    ],
    branches: [
      { num: "", name: "Germline Filtering", en: "gnomAD 擋天生遺傳變異", si: 2, step: 1 },
      { num: "", name: "Panel of Normals", en: "PoN 擋平台與技術雜訊", si: 2, step: 2 },
    ],
    out: "Raw VCF",
  },
  {
    zh: "過濾",
    en: "Filtering",
    color: 3,
    items: [
      { num: "1", name: "Contamination Estimation", en: "計算交叉污染率", si: 3, step: 0 },
      { num: "2", name: "Read Orientation Bias Filtering", en: "剔除 FFPE / 氧化損傷假突變", si: 3, step: 1 },
      { num: "3", name: "FilterMutectCalls", en: "整合所有網 → PASS 標籤", si: 3, step: 2, out: "PASS VCF" },
    ],
  },
  {
    zh: "註釋",
    en: "Annotation",
    color: 4,
    items: [
      { num: "1", name: "VEP / ANNOVAR", en: "VCF → 臨床與蛋白質影響資訊", si: 4, step: 0, out: "變異報告" },
    ],
  },
];

function flowNodeHtml(item, color, isSub) {
  const stroke = isSub ? "var(--accent-2)" : color;
  const chip = isSub ? "var(--accent-2)" : color;
  return (
    `<div class="flow-node${isSub ? " sub" : ""}" data-si="${item.si}" data-step="${item.step}"` +
    ` style="border-left-color:${stroke}">` +
    `<span class="fn-num" style="background:${chip}">${item.num || "＋"}</span>` +
    `<div class="fn-body"><div class="fn-name">${item.name}</div>` +
    `<div class="fn-en">${item.en}</div></div></div>`
  );
}

function renderOverviewFlow() {
  const container = document.getElementById("flow-overview");
  container.innerHTML = "";
  const flow = document.createElement("div");
  flow.className = "flow";

  FLOW_OVERVIEW.forEach((stage, idx) => {
    const color = STAGE_COLORS[stage.color % STAGE_COLORS.length];
    const sec = document.createElement("div");
    sec.className = "flow-stage";

    const heading = document.createElement("div");
    heading.className = "flow-stage-heading";
    heading.style.background = color;
    heading.innerHTML =
      `<span class="fs-num">${idx + 1}</span>${stage.zh}<span style="opacity:.75">· ${stage.en}</span>`;
    sec.appendChild(heading);

    const col = document.createElement("div");
    col.className = "flow-stage-col";

    stage.items.forEach((item) => {
      col.appendChild(
        stringToNode(flowNodeHtml(item, color) + (item.out ? `<div class="flow-out">→ ${item.out}</div>` : ""))
      );
      col.appendChild(flowArrow());
    });

    if (stage.branches) {
      col.appendChild(flowLabelHtml());
      const branch = document.createElement("div");
      branch.className = "flow-branch";
      branch.innerHTML =
        flowNodeHtml(stage.branches[0], color, true) + flowNodeHtml(stage.branches[1], color, true);
      col.appendChild(branch);
      col.appendChild(flowMerge());
      if (stage.out) col.appendChild(flowOut(stage.out));
    } else {
      col.lastChild && col.lastChild.remove();
    }

    sec.appendChild(col);
    flow.appendChild(sec);
  });

  container.appendChild(flow);

  container.querySelectorAll(".flow-node").forEach((node) => {
    node.addEventListener("click", () => {
      const si = parseInt(node.dataset.si, 10);
      const step = parseInt(node.dataset.step, 10);
      const card = cardsByStage[si] && cardsByStage[si][step];
      if (card) showDetail(si, step, card);
    });
  });
}

function flowArrow() {
  const el = document.createElement("div");
  el.className = "flow-arrow";
  return el;
}

function flowMerge() {
  const el = document.createElement("div");
  el.className = "flow-arrow flow-merge";
  return el;
}

function flowLabelHtml() {
  const el = document.createElement("div");
  el.className = "flow-split-label";
  el.textContent = "結合";
  return el;
}

function flowOut(label) {
  const el = document.createElement("div");
  el.className = "flow-out";
  el.textContent = "→ " + label;
  return el;
}

function stringToNode(html) {
  const t = document.createElement("template");
  t.innerHTML = html;
  const children = Array.from(t.content.childNodes);
  if (children.length === 1) return children[0];
  const wrap = document.createElement("div");
  wrap.append(...children);
  return wrap;
}

/* ===== 主頁：情境文字打字機效果 ===== */
function typewriter(el, text, speed = 55) {
  let i = 0;
  function tick() {
    if (i <= text.length) {
      el.innerHTML = text.slice(0, i) + '<span class="cursor"></span>';
      i++;
      setTimeout(tick, speed);
    }
  }
  tick();
}

/* ===== 主頁：患者選擇 ===== */
function renderPatients() {
  const list = document.getElementById("patient-list");
  list.innerHTML = "";
  PATIENTS.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className = "patient-card";
    card.tabIndex = 0;
    card.dataset.index = idx;

    const avatar = document.createElement("div");
    avatar.className = "patient-avatar";
    avatar.textContent = p.name.charAt(0);
    avatar.style.background = p.color;

    const meta = document.createElement("div");
    meta.className = "patient-meta";
    meta.innerHTML =
      `<div class="patient-name">${p.name} <span class="age">${p.age} 歲</span></div>` +
      `<span class="patient-cancer">${p.cancer} · ${p.cancerEn}</span>`;

    const arrow = document.createElement("div");
    arrow.className = "patient-arrow";
    arrow.textContent = ">";

    card.appendChild(avatar);
    card.appendChild(meta);
    card.appendChild(arrow);

    card.addEventListener("click", () => selectPatient(card, idx));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") selectPatient(card, idx);
    });
    list.appendChild(card);
  });
}

function selectPatient(card, idx) {
  document.querySelectorAll(".patient-card").forEach((c) => c.classList.remove("selected"));
  card.classList.add("selected");
  selectedPatient = PATIENTS[idx];
  startBtn.disabled = false;
  startHint.textContent = `已選擇：${selectedPatient.name}（${selectedPatient.age} 歲，${selectedPatient.cancer}）`;
}

/* ===== 次頁：任務卡片 ===== */
function renderTaskDots() {
  taskDots.innerHTML = "";
  taskSlides.forEach((s, i) => {
    const slideStage = parseInt(s.dataset.stage, 10);
    if (slideStage > currentStage) return;
    const dot = document.createElement("span");
    if (i === currentSlide) dot.classList.add("active");
    taskDots.appendChild(dot);
  });
}

function goToSlide(n) {
  const total = taskSlides.length;
  currentSlide = Math.max(0, Math.min(total - 1, n));
  const slideStage = parseInt(taskSlides[currentSlide].dataset.stage, 10);
  if (slideStage > currentStage) {
    currentStage = slideStage;
  } else if (slideStage < currentStage) {
    let foundHigher = false;
    for (let i = currentSlide + 1; i < total; i++) {
      if (parseInt(taskSlides[i].dataset.stage, 10) >= currentStage) {
        foundHigher = true;
        break;
      }
    }
    if (!foundHigher) {
      currentStage = slideStage;
    }
  }
  taskSlides.forEach((s, i) => {
    const sStage = parseInt(s.dataset.stage, 10);
    s.classList.toggle("active", i === currentSlide && sStage <= currentStage);
  });
  renderTaskDots();
  taskPrev.disabled = currentSlide === 0;
  taskNext.textContent = currentSlide === total - 1 ? "了解任務，開始操作！" : "下一步";
  taskNext.classList.toggle("final", currentSlide === total - 1);
}

function openTask() {
  currentSlide = 0;
  currentStage = 0;
  taskOverlay.hidden = false;
  taskOverlay.classList.remove("closing");
  goToSlide(0);
}

function closeTask() {
  taskOverlay.classList.add("closing");
  setTimeout(() => {
    taskOverlay.hidden = true;
    startStage1();
  }, 380);
}

function startStage1() {
  showDetail(0, 0, firstCard);
  if (firstCard) {
    firstCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    firstCard.classList.add("pulse");
    setTimeout(() => firstCard.classList.remove("pulse"), 3200);
  }
}

const congratsPopup = document.getElementById("congrats-popup");
const congratsClose = document.getElementById("congrats-close");

function showCongratsPopup() {
  congratsPopup.hidden = false;
}

function hideCongratsPopup() {
  congratsPopup.hidden = true;
}

congratsClose.addEventListener("click", () => {
  hideCongratsPopup();
  goToSlide(currentSlide + 1);
});

taskPrev.addEventListener("click", () => goToSlide(currentSlide - 1));
taskNext.addEventListener("click", () => {
  if (currentSlide === taskSlides.length - 1) {
    closeTask();
  } else if (currentSlide === 7) {
    showCongratsPopup();
  } else {
    goToSlide(currentSlide + 1);
  }
});

/* ===== 開始 / 回首頁 ===== */
startBtn.addEventListener("click", () => {
  if (!selectedPatient) return;
  patientBadge.textContent = `檢體：${selectedPatient.name}（${selectedPatient.age} 歲，${selectedPatient.cancer}）`;
  viewHome.hidden = true;
  viewApp.hidden = false;
  openTask();
});

homeBtn.addEventListener("click", () => {
  viewApp.hidden = true;
  viewHome.hidden = false;
  showOverview();
});

renderPatients();
renderTaskDots();
typewriter(document.getElementById("scenario-text"), SCENARIO_TEXT);
renderSidebar();
renderOverviewFlow();
